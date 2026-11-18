/**
 * A supplier's own price on an offer, as a request sends it (migration
 * 20261118120000). The price is optional: a supplier may list a product
 * without one, and carpenters then ask for a quote (src/lib/catalog.ts
 * isQuoteOffer). Client-safe, no database access.
 *
 * - undefined: the field was not sent, leave the price as it is.
 * - null:      sent empty, the offer has no price.
 * - a number:  per base unit, excl. VAT, above zero, rounded to agorot.
 * - 'invalid': anything else.
 */
export function readOfferPrice(value: unknown): number | null | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) return 'invalid'
  return Math.round(price * 100) / 100
}
