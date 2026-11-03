import { Context } from 'cordis'
import { Schema } from '@chatluna/schema'
import { defineTool } from '@chatluna/tool'
import type {} from '@cordisjs/plugin-http'
import { providers } from './providers'
import { formatResponse, searchChain, type ProviderEntry } from './search'
import type { Recency } from './types'

export type * from './types'
export { providers } from './providers'
export { formatResponse, searchChain, type ChainOptions, type ProviderEntry } from './search'

export const name = 'omsearch'

export interface Config {
  providers: ProviderEntry[]
  limit: number
  timeout: number
}

export const Config: Schema<Config> = Schema.object({
  providers: Schema.array(
    Schema.intersect([
      Schema.object({
        type: Schema.union(providers.map((provider) => Schema.const(provider.id).description(provider.label)))
          .required()
          .label('搜索服务'),
        enabled: Schema.boolean().default(true).label('启用').description('关闭后保留配置，但不参与搜索。')
      }),
      Schema.union(providers.map((provider) => provider.schema))
      // "添加一项" seeds a new row from this default. Without a `type`, no union branch
      // matches and SchemaForm renders every provider's fields at once.
    ]).default({ type: providers[0]!.id, enabled: true })
  )
    .default([])
    .label('搜索服务（回退链）')
    .description(
      '只有在这里添加并启用的服务会被使用。搜索时按列表顺序依次尝试，前一个出错、超时或没有结果时自动换下一个；拖动条目调整优先级。同一种服务可以添加多次（例如多个 API Key）。'
    ),
  limit: Schema.natural().min(1).max(20).default(8).label('默认结果数').description('模型没有指定数量时返回的条数。'),
  timeout: Schema.natural()
    .role('ms')
    .min(1000)
    .default(20_000)
    .label('单个服务超时')
    .description('单个服务超过这个时间未返回即视为失败，转到下一个服务。')
}).description('联网搜索：统一的 web_search 工具，按顺序在多个搜索服务之间自动回退。')

export const inject = ['tools', 'http']

export function apply(ctx: Context, config: Config) {
  ctx.tools.define(
    defineTool({
      name: 'web_search',
      // The host's JSON Schema projection drops per-field descriptions, so argument guidance lives here.
      description:
        'Search the web. Returns numbered sources (title, URL, snippet, date) and sometimes a short answer. ' +
        'Use it for current events, facts that may have changed, or anything you are unsure about. ' +
        'Arguments: `query` is written like a search-engine query (quoted phrases and site: work on most engines); ' +
        '`recency` (day | week | month | year) keeps only recent results; ' +
        `\`limit\` caps the number of results (1-20, default ${config.limit}).`,
      args: Schema.args({
        query: Schema.string().description('Search query'),
        recency: Schema.union(['day', 'week', 'month', 'year'])
          .optional()
          .description('Only return results from the last day, week, month or year'),
        limit: Schema.natural()
          .min(1)
          .max(20)
          .optional()
          .description(`Maximum number of results (default ${config.limit})`)
      }),
      traits: { effect: 'read', parallel: true },
      async run(input: { query: string; recency?: Recency | undefined; limit?: number | undefined }, call) {
        const response = await searchChain(ctx, config.providers, {
          query: input.query,
          limit: input.limit ?? config.limit,
          recency: input.recency,
          signal: call.signal,
          timeout: config.timeout
        })
        return formatResponse(response)
      },
      render: {
        result: (input, value) => ({
          kind: 'web',
          title: input.query,
          content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }]
        })
      }
    })
  )
}
