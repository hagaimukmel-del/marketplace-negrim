/**
 * Reading an order sentence for the agent chat (T-003): "הזמן לי לוח לבן
 * וצירים, 20 יחידות, העדפה לספק X". Client-safe: no database. The agent
 * decides with the catalogue search whether the sentence is one product or
 * several; this file only cuts it up.
 */
import { normalize } from './catalog-search'
import { parseQuantity, type WrittenQuantity } from './agent-quantity'

export interface RequestItem {
  /** The words to search for this item. */
  query: string
  quantity: WrittenQuantity | null
}

// "העדפה לספק X", "מעדיף את X", "אצל X", "מהספק X", "מספק X": the rest of the clause names the supplier
const PREFERENCE = /(?:^|[\s,])(?:עם\s+)?(?:העדפה\s+ל(?:ספק\s+)?|(?:מעדיף|מעדיפה|מעדיפים)\s+(?:את\s+)?(?:הספק\s+)?|אצל\s+(?:הספק\s+)?|מהספק\s+|מספק\s+|prefer\s+)([^,.\n]+)/i

export interface SupplierPreference {
  supplierName: string
  /** The message without the preference clause, to search with. */
  rest: string
}

/**
 * A supplier the carpenter asked for by name, out of the suppliers that sell
 * in the catalogue. Only with a preference word ("העדפה", "מעדיף", "אצל",
 * "מספק"): a bare supplier name stays a search word, as in the search bar.
 */
export function supplierPreference(message: string, supplierNames: string[]): SupplierPreference | null {
  const match = message.match(PREFERENCE)
  if (!match) return null
  const named = normalize(match[1])
  if (!named) return null
  // The longest name the clause mentions, so "איתמיר" never wins over "איתמיר דבקים"
  const supplierName = [...new Set(supplierNames)]
    .filter((name) => {
      const normalized = normalize(name)
      return normalized && (named.includes(normalized) || normalized.includes(named))
    })
    .sort((a, b) => b.length - a.length)[0]
  if (!supplierName) return null
  return { supplierName, rest: message.replace(match[0], ' ').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '') }
}

/** Words that join items in Hebrew order talk: "וגם", "ועוד", "+". */
const JOINERS = /\s*(?:,|،|\n|;|\+|\s&\s|\sוגם\s|\sועוד\s|\sand\s|\s(?:וכן)\s)\s*/i

/** Words that take a ו prefix but are not a new item ("ולבן" is a colour of the item before it). */
const NOT_A_NEW_ITEM = /^ו(?:לבן|שחור|אפור|חום|שקוף|בהיר|כהה|גדול|קטן|ארוך|קצר|חזק|מהיר|עבה|דק)/

/**
 * The parts of a message that may each be a product: split on commas and
 * joiners, then on a word that starts with ו ("לוח לבן וצירים"). A part that
 * is only a quantity ("20 יחידות") belongs to the part before it, and to every
 * item that part was split into.
 */
export function splitItems(message: string): RequestItem[] {
  const clauses = message.split(JOINERS).map((clause) => clause.trim()).filter(Boolean)
  const items: RequestItem[] = []
  let group: RequestItem[] = []
  for (const clause of clauses) {
    const quantity = parseQuantity(clause)
    const words = clause.replace(quantity?.text ?? '', ' ').trim()
    if (!normalize(words) || /^(?:של|כל אחד|מכל אחד|כל אחת|מכל אחת|מכל סוג)$/.test(normalize(words))) {
      // Only a quantity: it applies to the clause before it
      if (quantity) for (const item of group) item.quantity ??= quantity
      continue
    }
    group = []
    let current: string[] = []
    for (const word of words.split(/\s+/)) {
      if (current.length > 0 && word.length >= 3 && word.startsWith('ו') && !word.startsWith('וו') && !NOT_A_NEW_ITEM.test(word)) {
        group.push({ query: current.join(' '), quantity: null })
        current = [word.slice(1)]
      } else {
        current.push(word)
      }
    }
    if (current.length) group.push({ query: current.join(' '), quantity: null })
    for (const item of group) item.quantity = quantity
    items.push(...group)
  }
  return items
}

/**
 * A short follow-up that narrows the last search: "ובלבן?", "ושל בלום".
 * Returns the combined query, or null when the message is a new search.
 */
export function refineQuery(previous: string | null, message: string): string | null {
  if (!previous) return null
  const text = message.trim().replace(/[?!.]+$/, '')
  if (!/^ו\S/.test(text) || text.split(/\s+/).length > 3) return null
  return `${previous} ${text.slice(1).replace(/^(?:של|גם|ב)\s+/, '')}`.trim()
}
