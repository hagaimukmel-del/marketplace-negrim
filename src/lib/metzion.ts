/**
 * The Metzion vocabulary — shared by the board, the form, the API and admin, so
 * a category or a condition is spelled one way everywhere.
 */

export const METZION_CATEGORIES = [
  { key: 'raw', label: 'חומרי גלם' },
  { key: 'hardware', label: 'פרזול' },
  { key: 'products', label: 'מוצרים' },
  { key: 'machines', label: 'מכונות וציוד' },
  { key: 'other', label: 'אחר' },
] as const

export const METZION_CONDITIONS = [
  { key: 'new', label: 'חדש' },
  { key: 'new_boxed', label: 'חדש באריזה' },
  { key: 'used', label: 'משומש' },
  { key: 'surplus', label: 'עודף מחומר גלם' },
  { key: 'finished', label: 'מוצר מוגמר' },
  { key: 'other', label: 'אחר' },
] as const

export const METZION_UNITS = ['יח׳', 'לוח', 'מ״ר', 'מטר', 'ק״ג', 'ליטר', 'קרטון', 'סט'] as const

export const METZION_REPORT_REASONS = [
  { key: 'not_available', label: 'הפריט כבר לא קיים' },
  { key: 'misleading_price', label: 'מחיר מטעה' },
  { key: 'inappropriate', label: 'תוכן לא מתאים' },
  { key: 'duplicate', label: 'מודעה כפולה' },
  { key: 'spam', label: 'חשד לספאם' },
] as const

export const METZION_LIFETIME_DAYS = 60
export const METZION_MAX_IMAGES = 6

export type MetzionCategory = (typeof METZION_CATEGORIES)[number]['key']
export type MetzionCondition = (typeof METZION_CONDITIONS)[number]['key']
export type MetzionReportReason = (typeof METZION_REPORT_REASONS)[number]['key']
export type DealType = 'sale' | 'free'

export function isCategory(value: unknown): value is MetzionCategory {
  return METZION_CATEGORIES.some((item) => item.key === value)
}
export function isCondition(value: unknown): value is MetzionCondition {
  return METZION_CONDITIONS.some((item) => item.key === value)
}
export function isReportReason(value: unknown): value is MetzionReportReason {
  return METZION_REPORT_REASONS.some((item) => item.key === value)
}

export function categoryLabel(key: string): string {
  return METZION_CATEGORIES.find((item) => item.key === key)?.label ?? key
}
export function conditionLabel(key: string): string {
  return METZION_CONDITIONS.find((item) => item.key === key)?.label ?? key
}
export function reportReasonLabel(key: string): string {
  return METZION_REPORT_REASONS.find((item) => item.key === key)?.label ?? key
}

/** What a card on the board carries. Never the phone: that is fetched on a tap. */
export interface MetzionCard {
  id: string
  title: string
  description: string | null
  category: string
  condition: string
  dealType: DealType
  quantity: number
  unit: string
  pricePerUnit: number | null
  city: string
  regions: string[]
  images: string[]
  createdAt: string
  expiresAt: string
  mine: boolean
}

export function daysLeft(expiresAt: string, now = Date.now()): number {
  return Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000)
}

// Phone display and the WhatsApp link live in lib/phone.ts, shared with orders and quotes.
export { formatPhone, telUrl, whatsappUrl } from './phone'

/** How long ago, in words a carpenter would use. */
export function postedAgo(createdAt: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  if (days < 14) return 'לפני שבוע'
  return `לפני ${Math.floor(days / 7)} שבועות`
}
