import { Schema } from '@chatluna/schema'
import type { ProviderDefinition, Recency, SearchProvider } from './types'

export function defineProvider<F extends Schema>(def: ProviderDefinition<F>): SearchProvider {
  return {
    id: def.id,
    label: def.label,
    schema: Schema.intersect([Schema.object({ type: Schema.const(def.id).required() }), def.fields]),
    search: (ctx, entry, params) => def.search(ctx, def.fields.parse(entry), params)
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export function bearer(key: string) {
  return { Authorization: `Bearer ${key}` }
}

const RECENCY_DAYS: Record<Recency, number> = { day: 1, week: 7, month: 30, year: 365 }

/** `YYYY-MM-DD` of the start of the recency window, for providers that only take absolute dates. */
export function recencyStart(recency: Recency) {
  return new Date(Date.now() - RECENCY_DAYS[recency] * 86_400_000).toISOString().slice(0, 10)
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  middot: '·',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™'
}

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? match
    const point = code[1] === 'x' || code[1] === 'X' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10)
    return Number.isNaN(point) ? match : String.fromCodePoint(point)
  })
}

/** Plain text from an HTML fragment: tags dropped, entities decoded, whitespace collapsed. */
export function plainText(html: string | undefined) {
  if (html === undefined) return undefined
  const text = decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
  return text === '' ? undefined : text
}
