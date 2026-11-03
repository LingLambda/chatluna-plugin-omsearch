# chatluna-plugin-omsearch

chatluna的搜索插件集成，支持大部分主流搜索服务。

给模型提供一个统一的 `web_search` 工具。你在配置里按顺序添加搜索服务，搜索时依次尝试：前一个出错、超时或没有结果，就自动换下一个。

## 支持的搜索服务

| 类型 | 服务 | 需要 |
| --- | --- | --- |
| 国际 | Tavily、Brave Search、Exa、Jina Search、Firecrawl、Kagi、Serper（Google）、Perplexity Search | API Key（Firecrawl 自建实例可不填） |
| 国内 | 博查 Bocha、智谱 Web Search、DeepSeek Search、秘塔 Metaso、百度千帆 AI 搜索 | API Key |
| 自托管 / 免 Key | SearXNG、DuckDuckGo | SearXNG 实例地址；DuckDuckGo 无需配置 |

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `providers` | `[]` | 回退链。只有添加并启用的服务才会被使用，列表顺序就是尝试顺序。同一种服务可以添加多次（例如多个 API Key）。 |
| `providers[].type` | — | 搜索服务类型，决定下面出现哪些字段。 |
| `providers[].enabled` | `true` | 关闭后保留配置，但不参与搜索。 |
| `limit` | `8` | 模型没有指定数量时返回的条数（1–20）。 |
| `timeout` | `20000` | 单个服务的超时（毫秒），超时后转到下一个服务。 |

没有启用任何服务时，`web_search` 会返回明确的错误，提示去配置。

```yaml
- id: omsearch
  name: chatluna-plugin-omsearch
  config:
    providers:
      - type: bocha
        apiKey: sk-...
      - type: tavily
        apiKey: tvly-...
      - type: searxng
        endpoint: http://127.0.0.1:8080
```

## 工具

`web_search({ query, recency?, limit? })`

- `query`：搜索词，大多数引擎支持引号短语和 `site:`。
- `recency`：`day` / `week` / `month` / `year`。没有对应时间窗的服务会放宽到最接近的一档（SearXNG 的 week → month，百度的 day → week）；DeepSeek 通过在查询末尾追加 `after:YYYY-MM-DD` 实现；秘塔、Jina 不支持时间过滤。
- `limit`：1–20，超出单个服务上限时按该服务上限截断。

返回编号结果（标题、链接、摘要、日期），部分服务（Tavily、Kagi、Serper、SearXNG）会附带一段简短回答，末尾注明实际返回结果的服务。

## 注意

- 智谱搜索的查询不能超过 70 个字符，DeepSeek 不能超过 128 个字符（含 `recency` 追加的 `after:` 条件），超出时直接跳到下一个服务。
- DuckDuckGo 通过抓取 HTML 页面实现，数据中心或共享出口 IP 容易被它的人机验证拦截，建议放在回退链末尾。
- 依赖宿主的 `tools`（`@chatluna/tool`）和 `http`（`@cordisjs/plugin-http`）服务。

## 许可

MIT
