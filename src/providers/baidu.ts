import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface BaiduResponse {
  code?: number | string
  message?: string
  references?: {
    title?: string
    url: string
    content?: string
    snippet?: string
    date?: string
  }[]
}

/** Qianfan has no one-day window; `day` widens to the shortest one it offers. */
const RECENCY = { day: 'week', week: 'week', month: 'month', year: 'year' } as const

export default defineProvider({
  id: 'baidu',
  label: '百度千帆 AI 搜索',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('千帆 AppBuilder API Key，在 https://console.bce.baidu.com/iam/#/iam/apikey/list 获取。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<BaiduResponse>(
      'https://qianfan.baidubce.com/v2/ai_search/web_search',
      {
        messages: [{ role: 'user', content: params.query }],
        search_source: 'baidu_search_v2',
        resource_type_filter: [{ type: 'web', top_k: clamp(params.limit, 1, 50) }],
        search_recency_filter: params.recency && RECENCY[params.recency]
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    if (data.references === undefined && data.code !== undefined) {
      throw new Error(data.message ?? `百度千帆返回错误码 ${data.code}`)
    }
    return {
      sources: (data.references ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.snippet ?? item.content,
        date: item.date
      }))
    }
  }
})
