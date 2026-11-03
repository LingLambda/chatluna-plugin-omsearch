import { Schema } from '@chatluna/schema'
import { defineProvider } from '../utils'

interface SearxngResponse {
  results?: { title?: string; url: string; content?: string; publishedDate?: string | null }[]
  answers?: (string | { answer?: string })[]
  suggestions?: string[]
  unresponsive_engines?: [string, string][]
}

/** SearXNG has no week window; `week` widens to `month`. */
const TIME_RANGE = { day: 'day', week: 'month', month: 'month', year: 'year' } as const

export default defineProvider({
  id: 'searxng',
  label: 'SearXNG（自托管）',
  fields: Schema.object({
    endpoint: Schema.string()
      .role('url')
      .required()
      .label('实例地址')
      .description('例如 http://127.0.0.1:8080。实例需在 settings.yml 的 search.formats 中启用 json。'),
    language: Schema.string().label('语言').description('例如 zh-CN、en；留空使用实例默认值。'),
    categories: Schema.string().label('分类').description('逗号分隔，例如 general,news；留空使用实例默认值。'),
    engines: Schema.string().label('引擎').description('逗号分隔，例如 google,bing；留空使用实例默认值。'),
    username: Schema.string().label('Basic 用户名').description('实例前有 Basic 认证时填写。'),
    password: Schema.string().role('secret').label('Basic 密码')
  }),
  async search(ctx, config, params) {
    const data = await ctx.http.get<SearxngResponse>(`${config.endpoint.replace(/\/+$/, '')}/search`, {
      params: {
        q: params.query,
        format: 'json',
        language: config.language,
        categories: config.categories,
        engines: config.engines,
        time_range: params.recency && TIME_RANGE[params.recency]
      },
      headers:
        config.username === undefined
          ? {}
          : { Authorization: `Basic ${Buffer.from(`${config.username}:${config.password ?? ''}`).toString('base64')}` },
      signal: params.signal
    })
    const results = data.results ?? []
    const failed = data.unresponsive_engines ?? []
    if (results.length === 0 && failed.length > 0) {
      throw new Error(`上游引擎无响应：${failed.map(([engine, reason]) => `${engine}(${reason})`).join(', ')}`)
    }
    const answer = data.answers?.[0]
    return {
      answer: typeof answer === 'string' ? answer : answer?.answer,
      sources: results.slice(0, params.limit).map((item) => ({
        title: item.title ?? item.url,
        url: item.url,
        snippet: item.content,
        date: item.publishedDate ?? undefined
      })),
      related: data.suggestions
    }
  }
})
