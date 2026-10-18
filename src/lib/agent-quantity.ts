/**
 * The quantity a carpenter writes in an agent message: "דבק PUR 20 ק״ג",
 * "3 ארגזים ברגים". Client-safe: no database.
 *
 * Only a number followed by a unit word counts. A bare number is left alone,
 * because in this catalogue it is far more often a model number (PUR 501,
 * KS 351) than a quantity.
 */

/** A base unit (see lib/catalog), or 'pack' for "ארגז", "דלי", "חבילה". */
export type QuantityUnit = 'unit' | 'kg' | 'liter' | 'meter' | 'sqm' | 'pack'

export interface WrittenQuantity {
  amount: number
  unit: QuantityUnit
  /** As written, for the answer: "20 ק״ג". */
  text: string
}

// Longer forms first, so "מ״ר" is never read as "מ" and "ליטרים" not as "ליטר"
const UNIT_WORDS: [string, QuantityUnit][] = [
  ['יחידות', 'unit'], ['יחידה', 'unit'], ['יח׳', 'unit'], ["יח'", 'unit'], ['יח', 'unit'], ['units', 'unit'], ['pcs', 'unit'],
  ['קילוגרם', 'kg'], ['קילו', 'kg'], ['ק״ג', 'kg'], ['ק"ג', 'kg'], ['קג', 'kg'], ['kg', 'kg'],
  ['ליטרים', 'liter'], ['ליטר', 'liter'], ['liters', 'liter'], ['liter', 'liter'],
  ['מ״ר', 'sqm'], ['מ"ר', 'sqm'], ['מטר רבוע', 'sqm'], ['sqm', 'sqm'],
  ['מטרים', 'meter'], ['מטר', 'meter'], ['meters', 'meter'], ['meter', 'meter'],
  ['ארגזים', 'pack'], ['ארגז', 'pack'], ['קרטונים', 'pack'], ['קרטון', 'pack'], ['חבילות', 'pack'], ['חבילה', 'pack'],
  ['אריזות', 'pack'], ['אריזה', 'pack'], ['דליים', 'pack'], ['דלי', 'pack'], ['שקים', 'pack'], ['שק', 'pack'],
  ['פחים', 'pack'], ['פח', 'pack'], ['גלונים', 'pack'], ['גלון', 'pack'],
]

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const QUANTITY = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${UNIT_WORDS.map(([word]) => escape(word)).join('|')})(?![א-תa-z])`,
  'i'
)

export function parseQuantity(message: string): WrittenQuantity | null {
  const match = message.match(QUANTITY)
  if (!match) return null
  const amount = Number(match[1])
  if (!(amount > 0) || amount > 100000) return null
  const word = match[2].toLowerCase()
  const unit = UNIT_WORDS.find(([form]) => form.toLowerCase() === word)?.[1]
  return unit ? { amount, unit, text: match[0].trim() } : null
}

export interface CartQuantity {
  /** In base units: whole packs, at least the supplier's minimum. */
  quantity: number
  /** The written quantity could not be used, so this is the default (one pack or the minimum). */
  ignored: boolean
}

/**
 * What goes into the cart for a written quantity: whole packs, never less
 * than the supplier's minimum. A quantity in another unit than the product's
 * (kg for a product sold per unit) is ignored rather than guessed.
 */
export function cartQuantity(
  written: WrittenQuantity | null,
  offer: { baseUnit: string; packQty: number | null; minOrderQty: number }
): CartQuantity {
  const step = offer.packQty && offer.packQty > 0 ? offer.packQty : 1
  const minimum = Math.max(offer.minOrderQty || 1, step)
  const round = (amount: number) => Math.ceil(Math.max(amount, minimum) / step) * step
  if (!written) return { quantity: round(minimum), ignored: false }
  if (written.unit === 'pack') return { quantity: round(written.amount * step), ignored: false }
  if (written.unit === offer.baseUnit) return { quantity: round(written.amount), ignored: false }
  return { quantity: round(minimum), ignored: true }
}

/** "₪24 לק״ג", "₪0.96 ליח׳". price_excl_vat is already per base unit: never divide it by pack_qty. */
export function formatUnitPrice(price: number, unit: string): string {
  const perUnit = Number.isInteger(price) ? price.toString() : price.toFixed(2)
  return `₪${perUnit} ל${unit}`
}
