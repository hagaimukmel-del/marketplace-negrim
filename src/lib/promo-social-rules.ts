/**
 * The weekly "מוצר השבוע" social post by mail (owner, 2026-11-09), as rules.
 *
 * Every Sunday at 07:00 Israel time the owner gets one email with this week's
 * promoted product and ready-to-paste text for the social networks. It covers
 * any approved booking, whether the supplier booked it or the operator set it.
 *
 * Vercel crons run in UTC, so vercel.json schedules Sunday 04:00 and 05:00
 * UTC; only the run that lands in 07:00 Israel time sends (summer or winter).
 */

export const SOCIAL_TIME_ZONE = 'Asia/Jerusalem'
export const SOCIAL_WEEKDAY = 'Sun'
export const SOCIAL_HOUR = 7

/** True during Sunday 07:00–07:59 in Israel, whatever the season. */
export function isSocialHour(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOCIAL_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  return weekday === SOCIAL_WEEKDAY && hour === SOCIAL_HOUR
}

/** The key the mail is claimed under in reminder_log, so a week's booking is mailed once. */
export function socialKey(weekId: string): string {
  return `promo-social:${weekId}`
}

export interface SocialPostInput {
  productName: string
  supplierName: string
  brand: string | null
  /** Shown only when the supplier asked for the price on the card. */
  priceText: string | null
  url: string
}

/** Two ready-to-paste posts: a short one for Instagram and stories, a longer one for Facebook and WhatsApp. */
export function socialPosts(p: SocialPostInput): { short: string; long: string } {
  const name = p.brand && !p.productName.includes(p.brand) ? `${p.productName} (${p.brand})` : p.productName
  const price = p.priceText ? `\n${p.priceText} לפני מע״מ` : ''
  const short = `מוצר השבוע שלנו: ${name}\nמבית ${p.supplierName}${price}\nלהזמנה ישירה מהספק: ${p.url}\n\n#מוצר_השבוע #נגרים_B2B #נגרות`
  const long =
    `מוצר השבוע בנגרים B2B\n\n` +
    `השבוע אנחנו מציגים את ${name} מבית ${p.supplierName}.${price}\n\n` +
    `נגריות רשומות מזמינות ישירות מהספק דרך האתר, והספק מאשר, מספק ומוציא חשבונית.\n` +
    `ההרשמה לנגריות בחינם.\n\n` +
    `לפרטים ולהזמנה: ${p.url}`
  return { short, long }
}
