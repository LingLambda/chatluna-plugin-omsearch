import type { Context } from 'cordis'
import type { Schema } from '@chatluna/schema'
import type {} from '@cordisjs/plugin-http'

export type Recency = 'day' | 'week' | 'month' | 'year'

/** What every provider receives; `signal` already carries the per-provider timeout. */
export interface SearchParams {
  readonly query: string
  readonly limit: number
  readonly recency?: Recency | undefined
  readonly signal: AbortSignal
}

export interface SearchSource {
  readonly title: string
  readonly url: string
  readonly snippet?: string | undefined
  readonly date?: string | undefined
}

/** The unified answer shape every provider normalizes into. */
export interface SearchResult {
  readonly answer?: string | undefined
  readonly sources: readonly SearchSource[]
  readonly related?: readonly string[] | undefined
}

export interface SearchResponse extends SearchResult {
  /** Label of the configured entry that produced the result. */
  readonly provider: string
  /** Entries that were tried before it and why they were skipped. */
  readonly failures: readonly string[]
}

export interface SearchProvider {
  readonly id: string
  readonly label: string
  /** Tagged branch for the config union: `{ type: const(id), ...fields }`. */
  readonly schema: Schema
  search(ctx: Context, entry: unknown, params: SearchParams): Promise<SearchResult>
}

/** `F` is the provider's field schema; `ReturnType<F>` is the validated config it yields. */
export interface ProviderDefinition<F extends Schema> {
  readonly id: string
  readonly label: string
  /** Provider-specific fields; validated against the stored entry before every call. */
  readonly fields: F
  search(ctx: Context, config: ReturnType<F>, params: SearchParams): Promise<SearchResult>
}
