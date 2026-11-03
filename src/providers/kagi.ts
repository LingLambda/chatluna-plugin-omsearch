import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider, recencyStart } from '../utils'

interface KagiItem {
  url?: string
  title?: string
  snippet?: string
  time?: string
  props?: { question?: string }
}

interface KagiResponse {
  data?: {
    search?: KagiItem[]
    direct_answer?: KagiItem[]
    related_search?: KagiItem[]
  }
}

export default defineProvider({
  id: 'kagi',
  label: 'Kagi',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://kagi.com/api/keys 获取。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<KagiResponse>(
      'https://kagi.com/api/v1/search',
      {
        query: params.query,
        workflow: 'search',
        limit: clamp(params.limit, 1, 40),
        filters: params.recency && { after: recencyStart(params.recency) }
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    const direct = data.data?.direct_answer?.[0]
    return {
      answer: direct?.snippet ?? direct?.title,
      sources: (data.data?.search ?? []).flatMap((item) =>
        item.url === undefined ? [] : [{ title: item.title ?? item.url, url: item.url, snippet: item.snippet, date: item.time }]
      ),
      related: (data.data?.related_search ?? []).flatMap((item) => {
        const question = item.props?.question ?? item.title
        return question === undefined ? [] : [question]
      })
    }
  }
})
