import { Schema } from '@chatluna/schema'
import { bearer, clamp, defineProvider } from '../utils'

interface ZhipuResponse {
  search_result?: { title?: string; link: string; content?: string; publish_date?: string }[]
}

const RECENCY = { day: 'oneDay', week: 'oneWeek', month: 'oneMonth', year: 'oneYear' } as const

/** The API rejects longer queries. */
const MAX_QUERY = 70

export default defineProvider({
  id: 'zhipu',
  label: '智谱 Web Search',
  fields: Schema.object({
    apiKey: Schema.string()
      .role('secret')
      .required()
      .label('API Key')
      .description('在 https://bigmodel.cn/usercenter/proj-mgmt/apikeys 获取。'),
    engine: Schema.union([
      Schema.const('search_std').description('智谱基础版'),
      Schema.const('search_pro').description('智谱高阶版'),
      Schema.const('search_pro_sogou').description('搜狗'),
      Schema.const('search_pro_quark').description('夸克')
    ])
      .default('search_std')
      .label('搜索引擎'),
    contentSize: Schema.union([
      Schema.const('medium').description('medium（摘要）'),
      Schema.const('high').description('high（更详细的正文）')
    ])
      .default('medium')
      .label('内容长度')
  }),
  async search(ctx, config, params) {
    if (params.query.length > MAX_QUERY) throw new Error(`智谱搜索的查询不能超过 ${MAX_QUERY} 个字符`)
    const data = await ctx.http.post<ZhipuResponse>(
      'https://open.bigmodel.cn/api/paas/v4/web_search',
      {
        search_query: params.query,
        search_engine: config.engine,
        search_intent: false,
        count: clamp(params.limit, 1, 50),
        content_size: config.contentSize,
        search_recency_filter: params.recency === undefined ? 'noLimit' : RECENCY[params.recency]
      },
      { headers: bearer(config.apiKey), signal: params.signal }
    )
    return {
      sources: (data.search_result ?? []).map((item) => ({
        title: item.title ?? item.link,
        url: item.link,
        snippet: item.content,
        date: item.publish_date
      }))
    }
  }
})
