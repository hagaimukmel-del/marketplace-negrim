/**
 * Israeli VAT, in one place.
 *
 * It used to be `* 1.18` written inline in cart-context and then divided back
 * out again in the cart and checkout pages, which meant the rate lived in five
 * files and the excl-VAT figure — the one a carpenter actually thinks in and
 * the one the order stores — was derived from the incl-VAT one rather than the
 * other way round.
 *
 * Prices are stored and reasoned about EXCLUDING VAT. VAT is display only: the
 * supplier issues the invoice, and an order here is a purchase order, not a tax
 * document. The rate is snapshotted onto each order as `orders.vat_rate`, so
 * changing this constant never restates an order already placed.
 */
export const VAT_RATE = 0.18

/** Round to agorot. Money should not carry floating-point tails. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function vatAmount(subtotalExclVat: number, rate: number = VAT_RATE): number {
  return round2(subtotalExclVat * rate)
}

export function withVat(subtotalExclVat: number, rate: number = VAT_RATE): number {
  return round2(subtotalExclVat * (1 + rate))
}

/** "₪1,250.00" — grouped, two decimals, as prices are quoted in the trade. */
export function formatIls(value: number): string {
  return `₪${value.toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
