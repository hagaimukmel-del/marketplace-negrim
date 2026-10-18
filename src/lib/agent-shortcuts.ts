/**
 * Requests the agent chat answers itself, before searching. Kept narrow on
 * purpose: "הזמנה של דבק", "קטלוג דבקים" or "גלגלי עגלה" are product
 * searches and must reach the agent. Client-safe: no database.
 */

export const PREVIOUS_PRODUCTS = /בפעם שעברה|כמו בפעם|זה שקניתי|מה קניתי/
export const ORDER_HISTORY = /ההזמנות שלי|הזמנות קודמות|היסטוריית הזמנות|מה הזמנתי|my orders|order history/i

const PAGES: [RegExp, string][] = [
  [/^(ה)?מציאון$/, '/app/metzion'],
  [/^(ה)?עגלה( שלי)?$/, '/app/order'],
  [/^(ה)?(פרופיל|הפרטים שלי|החשבון שלי)$/, '/app/account'],
  [/^(ה)?הזמנות$/, '/app/orders'],
  [/^(ה)?קטלוג$/, '/app/catalog'],
]

const GO_TO = /^(איפה|קח אותי|תעביר אותי|תפתח|פתח|עבור|go to|where is|where)\s*(ל|אל |את )?/i

/**
 * "קח אותי לעגלה", "איפה המציאון?", or the page name alone ("עגלה"): a
 * request to go somewhere. Anything with other words in it is a search.
 */
export function pageFor(text: string): string | null {
  const bare = text.trim().replace(/[?!.,״"]+/g, '').replace(/\s+/g, ' ')
  const target = bare.replace(GO_TO, '').trim()
  return PAGES.find(([pattern]) => pattern.test(target))?.[1] ?? null
}
