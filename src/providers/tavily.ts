import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface TavilyResponse {
  answer?: string | null
  results?: { title?: string; url: string; content?: string; published_date?: string }[]
}

export default defineProvider({
  id: 'tavily',
  label: 'Tavily',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://app.tavily.com 获取。'),
    depth: Schema.union([
      Schema.const('basic').description('basic（1 credit）'),
      Schema.const('advanced').description('advanced（2 credits，更相关）')
    ])
      .default('basic')
      .label('搜索深度'),
    answer: Schema.boolean().default(false).label('附带 AI 摘要').description('让 Tavily 额外生成一段简短回答。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<TavilyResponse>(
      'https://api.tavily.com/search',
      {
        query: params.query,
        max_results: clamp(params.limit, 1, 20),
        search_depth: config.depth,
        include_answer: config.answer,
        time_range: params.recency
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    return {
      answer: data.answer ?? undefined,
      sources: (data.results ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.content,
        date: item.published_date
      }))
    }
  }
})
