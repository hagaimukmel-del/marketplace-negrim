import type { AppProduct } from './app/products'

/**
 * The one catalogue search. The search bar (/app/catalog?q=) and the agent
 * chat (lib/procurement-agent) both call searchProducts, so a word finds the
 * same products wherever the carpenter types it. Client-safe: no database.
 */

const HEBREW_PREFIXES = ['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ']
const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }

/** Groups of words that mean the same product. Written as people type them; normalized below. */
const SYNONYM_GROUPS: string[][] = [
  ['דבק', 'glue', 'adhesive'],
  ['קנט', 'קאנט', 'edge'],
  ['לכה', 'פוליש', 'varnish', 'lacquer'],
  ['ציר', 'פנטה', 'hinge'],
  ['בורג', 'ברג', 'screw'],
  ['מסילה', 'מסיל', 'slide'],
  ['מגירה', 'drawer'],
  ['סיליקון', 'silicone'],
  ['מדלל', 'טינר', 'thinner'],
  ['ניקוי', 'מנקה', 'קלינר', 'cleaner'],
  ['פוליאוריתן', 'פוליאוריטן', 'pu'],
  ['בלום', 'blum'],
  ['הטיש', 'hettich'],
  ['גראס', 'grass'],
]

/** Words that say what someone wants, not what they want. */
const STOPWORDS = new Set(
  [
    'אני', 'צריך', 'צריכה', 'צריכים', 'רוצה', 'מחפש', 'מחפשת', 'תן', 'תני', 'תביא', 'לי', 'יש', 'לכם',
    'של', 'את', 'עם', 'בשביל', 'עבור', 'משהו', 'איזה', 'איזו', 'בבקשה', 'גם', 'עוד', 'קצת', 'הכי', 'טוב',
    'i', 'need', 'want', 'the', 'a', 'an', 'for', 'some', 'please',
  ].map(normalize)
)

/** Quantities and units: they score when they match but are never required. */
const OPTIONAL_WORDS = new Set(
  ['קג', 'קילו', 'ליטר', 'ליטרים', 'מטר', 'יח', 'יחידות', 'ארגז', 'ארגזים', 'חבילה', 'חבילות', 'kg', 'l', 'm'].map(normalize)
)

/** Lowercase, no niqqud or geresh, final letters folded, punctuation to spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[״׳"'`]/g, '')
    .replace(/[ךםןףץ]/g, (ch) => FINAL_LETTERS[ch])
    .replace(/[^0-9a-zא-ת.]+/g, ' ')
    .trim()
}

const SYNONYMS = new Map<string, string[]>()
for (const group of SYNONYM_GROUPS) {
  const words = group.map(normalize)
  for (const word of words) SYNONYMS.set(word, words)
}

/** The forms a typed word may appear in: itself, without a prefix letter, singular, and its synonyms. */
function variantsOf(token: string): string[] {
  const forms = new Set([token])
  if (token.length >= 4 && HEBREW_PREFIXES.includes(token[0])) forms.add(token.slice(1))
  for (const form of [...forms]) {
    if (form.length >= 5 && (form.endsWith('ימ') || form.endsWith('ות'))) forms.add(form.slice(0, -2))
  }
  for (const form of [...forms]) for (const synonym of SYNONYMS.get(form) ?? []) forms.add(synonym)
  return [...forms]
}

interface QueryToken {
  variants: string[]
  required: boolean
}

function tokensOf(query: string): QueryToken[] {
  return normalize(query)
    .split(' ')
    .filter((word) => word && !STOPWORDS.has(word) && (word.length > 1 || /\d/.test(word)))
    .map((word) => ({ variants: variantsOf(word), required: !OPTIONAL_WORDS.has(word) && !/^\d+(\.\d+)?$/.test(word) }))
}

const FIELD_WEIGHTS = { name: 3, mpn: 3, brand: 2, supplier: 1, attributes: 1 } as const

export interface SearchResult {
  products: AppProduct[]
  /** No product matched every word, so these match only some of them. */
  partial: boolean
}

/**
 * Products that match every word of the query, best first; when none does,
 * the ones matching the most words, marked partial. An empty query matches nothing.
 */
export function searchProducts(products: AppProduct[], query: string): SearchResult {
  const tokens = tokensOf(query)
  if (!tokens.some((token) => token.required)) {
    // Only quantities or filler words: fall back to the words themselves
    if (!tokens.length) return { products: [], partial: false }
    tokens.forEach((token) => (token.required = true))
  }
  const required = tokens.filter((token) => token.required).length
  const exactMpn = normalize(query).replace(/\s+/g, '')

  const scored = products.map((product) => {
    const fields: [keyof typeof FIELD_WEIGHTS, string][] = [
      ['name', normalize(product.name)],
      ['mpn', normalize(product.mpn ?? '')],
      ['brand', normalize(product.brand ?? '')],
      ['supplier', normalize(product.offers.map((offer) => offer.supplierName).join(' '))],
      ['attributes', normalize(product.attributes.map(([, value]) => value).join(' '))],
    ]
    let score = 0
    let matched = 0
    for (const token of tokens) {
      let best = 0
      for (const [field, text] of fields) {
        if (text && token.variants.some((variant) => text.includes(variant))) best = Math.max(best, FIELD_WEIGHTS[field])
      }
      if (best) {
        score += best
        if (token.required) matched++
      }
    }
    if (exactMpn && normalize(product.mpn ?? '').replace(/\s+/g, '') === exactMpn) score += 10
    const inStock = product.offers.some((offer) => offer.inStock)
    return { product, score, matched, inStock }
  })

  const rank = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.matched - a.matched || b.score - a.score || Number(b.inStock) - Number(a.inStock) || a.product.name.localeCompare(b.product.name, 'he')

  const full = scored.filter((row) => row.matched === required).sort(rank)
  if (full.length) return { products: full.map((row) => row.product), partial: false }
  const some = scored.filter((row) => row.matched > 0).sort(rank)
  return { products: some.map((row) => row.product), partial: some.length > 0 }
}
