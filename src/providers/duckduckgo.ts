import { Schema } from '@chatluna/schema'
import { clamp, decodeEntities, defineProvider, plainText } from '../utils'
import type { SearchSource } from '../types'

const DF = { day: 'd', week: 'w', month: 'm', year: 'y' } as const

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: 'https://html.duckduckgo.com/'
}

/** Result links are wrapped as `//duckduckgo.com/l/?uddg=<target>`; ads point at `y.js`. */
function targetOf(href: string) {
  const url = new URL(decodeEntities(href), 'https://duckduckgo.com')
  if (url.pathname === '/y.js') return undefined
  return url.searchParams.get('uddg') ?? url.href
}

function parseResults(html: string, limit: number): SearchSource[] {
  const anchors = [...html.matchAll(/<a\b([^>]*\bclass="result__a"[^>]*)>([\s\S]*?)<\/a>/g)]
  return anchors
    .flatMap((anchor, index) => {
      const href = /\bhref="([^"]*)"/.exec(anchor[1]!)?.[1]
      const url = href === undefined ? undefined : targetOf(href)
      if (url === undefined) return []
      const block = html.slice(anchor.index, anchors[index + 1]?.index)
      const snippet = /<(?:a|div)\b[^>]*\bclass="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/.exec(block)?.[1]
      return [{ title: plainText(anchor[2]) ?? url, url, snippet: plainText(snippet) }]
    })
    .slice(0, limit)
}

export default defineProvider({
  id: 'duckduckgo',
  label: 'DuckDuckGo（免 Key）',
  fields: Schema.object({
    region: Schema.string()
      .default('wt-wt')
      .label('地区')
      .description('DuckDuckGo kl 参数，例如 cn-zh、us-en；wt-wt 表示不限地区。数据中心 IP 容易触发人机验证，建议放在回退链末尾。')
  }),
  async search(ctx, config, params) {
    const html = await ctx.http.post<string>(
      'https://html.duckduckgo.com/html/',
      new URLSearchParams({ q: params.query, kl: config.region, ...(params.recency && { df: DF[params.recency] }) }),
      {
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
        signal: params.signal
      }
    )
    if (html.includes('anomaly-modal')) throw new Error('DuckDuckGo 触发了人机验证（当前 IP 被限流）')
    if (html.includes('class="no-results"')) return { sources: [] }
    const sources = parseResults(html, clamp(params.limit, 1, 20))
    if (sources.length === 0) throw new Error('DuckDuckGo 页面结构无法解析')
    return { sources }
  }
})
