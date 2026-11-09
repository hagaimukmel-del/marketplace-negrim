import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { runPromoSocial } from '@/lib/promo-social'

/**
 * The operator sends this week's social-post mail now, from /admin/promotions:
 * to see it before Sunday's run, or again after changing the week's product.
 */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  const result = await runPromoSocial(new Date(), { force: true })
  if (result.sent) return NextResponse.json({ ok: true })
  if (result.reason === 'no-promo') return NextResponse.json({ error: 'אין מוצר שבוע מאושר לשבוע הזה' }, { status: 404 })
  return NextResponse.json({ error: 'המייל לא נשלח' }, { status: 502 })
}
