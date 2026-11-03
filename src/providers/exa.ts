import { Schema } from '@chatluna/schema'
import { clamp, defineProvider, recencyStart } from '../utils'

interface ExaResponse {
  results?: { title?: string | null; url: string; publishedDate?: string | null; text?: string; summary?: string }[]
}

export default defineProvider({
  id: 'exa',
  label: 'Exa',
  fields: Schema.object({
    apiKey: Schema.string().role('secret').required().label('API Key').description('在 https://dashboard.exa.ai 获取。'),
    mode: Schema.union([
      Schema.const('auto').description('auto（自动选择）'),
      Schema.const('fast').description('fast（低延迟）'),
      Schema.const('neural').description('neural（语义检索）')
    ])
      .default('auto')
      .label('检索模式')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.post<ExaResponse>(
      'https://api.exa.ai/search',
      {
        query: params.query,
        type: config.mode,
        numResults: clamp(params.limit, 1, 25),
        contents: { text: { maxCharacters: 1000 } },
        startPublishedDate: params.recency && `${recencyStart(params.recency)}T00:00:00.000Z`
      },
      { headers: { 'x-api-key': config.apiKey }, signal: params.signal }
    )
    return {
      sources: (data.results ?? []).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.summary ?? item.text,
        date: item.publishedDate ?? undefined
      }))
    }
  }
})
