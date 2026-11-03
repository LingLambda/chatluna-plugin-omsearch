import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface MetasoResponse {
  webpages?: { title?: string; link: string; snippet?: string; summary?: string; date?: string }[]
}

export default defineProvider({
  id: 'metaso',
  label: '秘塔 Metaso',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('在 https://metaso.cn/search-api/api-keys 获取。'),
    summary: Schema.boolean().default(false).label('返回 AI 摘要').description('开启后每条结果附带秘塔生成的摘要。')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<MetasoResponse>(
      'https://metaso.cn/api/v1/search',
      {
        q: params.query,
        scope: 'webpage',
        size: clamp(params.limit, 1, 50),
        includeSummary: config.summary,
        conciseSnippet: true
      },
      { headers: { ...bearer(config.apiKey), Accept: 'application/json' }, signal: params.signal }
    )
    return {
      sources: (data.webpages ?? []).map((item) => ({
        title: item.title ?? item.link,
        url: item.link,
        snippet: item.summary ?? item.snippet,
        date: item.date
      }))
    }
  }
})
