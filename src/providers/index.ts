import type { SearchProvider } from '../types'
import baidu from './baidu'
import bocha from './bocha'
import brave from './brave'
import duckduckgo from './duckduckgo'
import exa from './exa'
import firecrawl from './firecrawl'
import jina from './jina'
import kagi from './kagi'
import metaso from './metaso'
import perplexity from './perplexity'
import searxng from './searxng'
import serper from './serper'
import tavily from './tavily'
import zhipu from './zhipu'

/** Order here is only the order of the type picker in the config UI. */
export const providers: readonly SearchProvider[] = [
  tavily,
  brave,
  exa,
  jina,
  firecrawl,
  kagi,
  serper,
  perplexity,
  bocha,
  zhipu,
  metaso,
  baidu,
  searxng,
  duckduckgo
]
