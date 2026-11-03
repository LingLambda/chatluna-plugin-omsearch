import { Schema } from '@chatluna/schema'
import { clamp, defineProvider, plainText } from '../utils'

interface BraveResponse {
  web?: {
    results?: { title?: string; url: string; description?: string; page_age?: string; age?: string }[]
  }
}

const FRESHNESS = { day: 'pd', week: 'pw', month: 'pm', year: 'py' } as const

export default defineProvider({
  id: 'brave',
  label: 'Brave Search',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('在 https://api-dashboard.search.brave.com 获取。'),
    safesearch: Schema.union([
      Schema.const('off').description('关闭'),
      Schema.const('moderate').description('适中'),
      Schema.const('strict').description('严格')
    ])
      .default('moderate')
      .label('安全搜索')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.get<BraveResponse>('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: params.query,
        count: clamp(params.limit, 1, 20),
        safesearch: config.safesearch,
        freshness: params.recency && FRESHNESS[params.recency]
      },
      headers: { Accept: 'application/json', 'X-Subscription-Token': config.apiKey },
      signal: params.signal
    })
    return {
      sources: (data.web?.results ?? []).map((item) => ({
        title: plainText(item.title) ?? item.url,
        url: item.url,
        snippet: plainText(item.description),
        date: item.page_age ?? item.age
      }))
    }
  }
})
