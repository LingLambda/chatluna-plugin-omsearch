import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface JinaResponse {
  data?: { title?: string; url: string; description?: string; date?: string }[]
}

export default defineProvider({
  id: 'jina',
  label: 'Jina Search',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://jina.ai 获取。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.get<JinaResponse>(`https://s.jina.ai/${encodeURIComponent(params.query)}`, {
      params: { count: clamp(params.limit, 1, 20) },
      headers: { ...bearer(config.apiKey), Accept: 'application/json', 'X-Respond-With': 'no-content' },
      signal: params.signal
    })
    return {
      sources: (data.data ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.description,
        date: item.date
      }))
    }
  }
})
