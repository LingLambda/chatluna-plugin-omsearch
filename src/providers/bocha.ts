import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface BochaResponse {
  code?: number
  msg?: string | null
  data?: {
    webPages?: {
      value?: { name?: string; url: string; snippet?: string; summary?: string; datePublished?: string }[]
    }
  }
}

const FRESHNESS = { day: 'oneDay', week: 'oneWeek', month: 'oneMonth', year: 'oneYear' } as const

export default defineProvider({
  id: 'bocha',
  label: '博查 Bocha',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://open.bochaai.com 获取。'),
    summary: Schema.boolean().default(true).label('返回长摘要').description('开启后每条结果附带更完整的正文摘要。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<BochaResponse>(
      'https://api.bochaai.com/v1/web-search',
      {
        query: params.query,
        count: clamp(params.limit, 1, 50),
        summary: config.summary,
        freshness: params.recency === undefined ? 'noLimit' : FRESHNESS[params.recency]
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    if (data.code !== undefined && data.code !== 200) throw new Error(data.msg ?? `博查返回错误码 ${data.code}`)
    return {
      sources: (data.data?.webPages?.value ?? []).map((item) => ({
        title: item.name ?? item.url,
        url: item.url,
        snippet: item.summary ?? item.snippet,
        date: item.datePublished
      }))
    }
  }
})
