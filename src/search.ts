import type { Context } from 'cordis'
import { providers } from './providers'
import type { Recency, SearchResponse } from './types'

export interface ProviderEntry {
  readonly type: string
  readonly enabled: boolean
}

export interface ChainOptions {
  readonly query: string
  readonly limit: number
  readonly recency?: Recency | undefined
  readonly signal: AbortSignal
  /** Per-provider ceiling in ms; the chain advances when it is hit. */
  readonly timeout: number
}

const SNIPPET_MAX = 300
const RELATED_MAX = 5

async function reasonOf(ctx: Context, error: unknown) {
  if (ctx.http.isError(error) && error.response !== undefined) {
    const body = await error.response.text().catch(() => '')
    const detail = body.replace(/\s+/g, ' ').trim().slice(0, 200)
    return detail === '' ? `HTTP ${error.response.status}` : `HTTP ${error.response.status}: ${detail}`
  }
  if (!(error instanceof Error)) return String(error)
  if (error.name === 'TimeoutError') return '请求超时'
  // Network failures wrap the useful part (ECONNRESET, ENOTFOUND, TLS…) in `cause`.
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message
}

/** Tries enabled entries in configured order; the first non-empty result wins. */
export async function searchChain(
  ctx: Context,
  entries: readonly ProviderEntry[],
  options: ChainOptions
): Promise<SearchResponse> {
  const failures: string[] = []
  for (const [index, entry] of entries.entries()) {
    if (!entry.enabled) continue
    const provider = providers.find((item) => item.id === entry.type)
    if (provider === undefined) continue
    const shared = entries.filter((item) => item.type === entry.type).length > 1
    const label = shared ? `${provider.label} #${index + 1}` : provider.label
    try {
      const result = await provider.search(ctx, entry, {
        query: options.query,
        limit: options.limit,
        recency: options.recency,
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(options.timeout)])
      })
      if (result.sources.length > 0 || result.answer !== undefined) return { ...result, provider: label, failures }
      failures.push(`${label}: 无结果`)
    } catch (error) {
      options.signal.throwIfAborted()
      const reason = await reasonOf(ctx, error)
      ctx.logger.warn('%s failed: %s', label, reason)
      failures.push(`${label}: ${reason}`)
    }
  }
  if (failures.length === 0) throw new Error('没有启用任何搜索服务，请在 omsearch 插件配置中添加并启用至少一个搜索服务。')
  throw new Error(`所有搜索服务均失败：${failures.join('；')}`)
}

/** Model-facing text: answer, numbered sources, related queries, then the serving provider. */
export function formatResponse(response: SearchResponse) {
  const lines: string[] = []
  if (response.answer !== undefined) lines.push(response.answer, '')
  for (const [index, source] of response.sources.entries()) {
    lines.push(source.date === undefined ? `[${index + 1}] ${source.title}` : `[${index + 1}] ${source.title} (${source.date})`)
    lines.push(`    ${source.url}`)
    if (source.snippet !== undefined) {
      const snippet = source.snippet.replace(/\s+/g, ' ')
      lines.push(`    ${snippet.length > SNIPPET_MAX ? `${snippet.slice(0, SNIPPET_MAX - 1)}…` : snippet}`)
    }
  }
  const related = response.related?.slice(0, RELATED_MAX) ?? []
  if (related.length > 0) lines.push('', `Related: ${related.join(' | ')}`)
  lines.push('', `Search provider: ${response.provider}`)
  return lines.join('\n')
}
