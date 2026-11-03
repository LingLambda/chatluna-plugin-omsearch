import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider, recencyStart } from '../utils'

interface DeepSeekResponse {
  results?: { title: string; url: string; snippet: string; summary: string; date: string | null }[]
}

/** The API counts Unicode characters and rejects longer queries. */
const MAX_QUERY = 128

export default defineProvider({
  id: 'deepseek',
  label: 'DeepSeek Search',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('在 https://platform.deepseek.com/api_keys 获取。')
  }),
  async search(ctx, config, params) {
    // No dedicated recency field; the documented `after:` operator takes an absolute date.
    const query = params.recency === undefined ? params.query : `${params.query} after:${recencyStart(params.recency)}`
    if ([...query].length > MAX_QUERY) throw new Error(`DeepSeek 搜索的查询不能超过 ${MAX_QUERY} 个字符`)
    const data = await ctx.http.post<DeepSeekResponse>(
      'https://api.deepseek.com/v1/tools/search',
      { query, count: clamp(params.limit, 1, 50) },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    return {
      sources: (data.results ?? []).map((item) => ({
        title: item.title || item.url,
        url: item.url,
        snippet: item.summary || item.snippet || undefined,
        date: item.date ?? undefined
      }))
    }
  }
})
