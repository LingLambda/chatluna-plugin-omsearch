import { Schema } from '@chatluna/schema'
import { clamp, defineProvider } from '../utils'

interface SerperResponse {
  answerBox?: { answer?: string; snippet?: string }
  organic?: { title?: string; link: string; snippet?: string; date?: string }[]
  relatedSearches?: { query: string }[]
}

const TBS = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m', year: 'qdr:y' } as const

export default defineProvider({
  id: 'serper',
  label: 'Serper（Google）',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://serper.dev 获取。'),
    gl: Schema.string().label('国家/地区').description('Google gl 参数，例如 cn、us；留空由 Serper 决定。'),
    hl: Schema.string().label('界面语言').description('Google hl 参数，例如 zh-cn、en；留空由 Serper 决定。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<SerperResponse>(
      'https://google.serper.dev/search',
      {
        q: params.query,
        num: clamp(params.limit, 1, 100),
        gl: config.gl,
        hl: config.hl,
        tbs: params.recency && TBS[params.recency]
      },
      { headers: { 'X-API-KEY': config.apiKey }, signal: params.signal }
    )
    return {
      answer: data.answerBox?.answer ?? data.answerBox?.snippet,
      sources: (data.organic ?? []).map((item) => ({
        title: item.title ?? item.link,
        url: item.link,
        snippet: item.snippet,
        date: item.date
      })),
      related: (data.relatedSearches ?? []).map((item) => item.query)
    }
  }
})
