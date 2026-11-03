import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface PerplexityResponse {
  results?: { title?: string; url: string; snippet?: string; date?: string | null }[]
}

export default defineProvider({
  id: 'perplexity',
  label: 'Perplexity Search',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('在 https://www.perplexity.ai/account/api 获取。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<PerplexityResponse>(
      'https://api.perplexity.ai/search',
      {
        query: params.query,
        max_results: clamp(params.limit, 1, 20),
        search_recency_filter: params.recency
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    return {
      sources: (data.results ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.snippet,
        date: item.date ?? undefined
      }))
    }
  }
})
