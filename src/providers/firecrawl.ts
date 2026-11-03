import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface FirecrawlResponse {
  success?: boolean
  error?: string
  data?: { web?: { title?: string; url: string; description?: string }[] }
}

const TBS = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m', year: 'qdr:y' } as const

export default defineProvider({
  id: 'firecrawl',
  label: 'Firecrawl',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .label('API Key')
      .description('在 https://firecrawl.dev 获取；自建实例未开启鉴权时可留空。'),
    endpoint: Schema.string()
      .role('url')
      .default('https://api.firecrawl.dev')
      .label('服务地址')
      .description('自建 Firecrawl 时改成你的实例地址。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<FirecrawlResponse>(
      `${config.endpoint.replace(/\/+$/, '')}/v2/search`,
      {
        query: params.query,
        limit: clamp(params.limit, 1, 100),
        sources: [{ type: 'web' }],
        tbs: params.recency && TBS[params.recency]
      },
      { headers: config.apiKey === undefined ? {} : bearer(config.apiKey), signal: params.signal }
    )
    if (data.success === false) throw new Error(data.error ?? 'Firecrawl 返回失败')
    return {
      sources: (data.data?.web ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.description
      }))
    }
  }
})
