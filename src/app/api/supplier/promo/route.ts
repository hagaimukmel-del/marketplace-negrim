import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { PROMO_WEEK_EXCL_VAT } from '@/lib/supplier-plans'
import { bookableWeeks, isSunday, weekLabel } from '@/lib/promo-weeks'
import { isTestName, sendEmail } from '@/lib/email'
import { PROMO_REQUEST_EMAIL, promoRequestHtml, promoRequestSubject } from '@/lib/emails/promo-request'
import { money } from '@/lib/app/format'

/**
 * A supplier books a week of "מוצר השבוע" for one of their products (T-024).
 *
 * The booking waits for the operator's approval in /admin/promotions. One live
 * booking per week is enforced by the database (a partial unique index), so
 * two suppliers picking the same week at once cannot both get it. The price is
 * snapshotted on the row; billing happens outside the site. The owner is
 * emailed about each new booking.
 */
export async function POST(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const week = typeof body.week_start === 'string' ? body.week_start : ''
  const productId = typeof body.product_id === 'string' ? body.product_id : ''
  if (!isSunday(week) || !bookableWeeks().includes(week)) {
    return NextResponse.json({ error: 'אפשר להזמין שבוע מהשבוע הבא ועד 12 שבועות קדימה' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: offer } = await supabase
    .from('supplier_offers')
    .select('id')
    .eq('supplier_id', supplier.id)
    .eq('product_id', productId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!offer) return NextResponse.json({ error: 'אפשר לקדם רק מוצר שאתה מוכר ומוצג לנגרים' }, { status: 400 })

  const { data, error } = await supabase
    .from('promo_weeks')
    .insert({ week_start: week, supplier_id: supplier.id, product_id: productId, price_excl_vat: PROMO_WEEK_EXCL_VAT })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'השבוע הזה כבר נתפס. בחר שבוע אחר.' }, { status: 409 })
    console.error('Promo booking failed:', error)
    return NextResponse.json({ error: 'ההזמנה לא נשמרה' }, { status: 500 })
  }

  // Best-effort: the booking is saved and shows in /admin/promotions either way.
  const { data: product } = await supabase.from('products').select('name_he').eq('id', productId).maybeSingle()
  const mail = {
    supplierName: supplier.company_name,
    contactName: supplier.contact_name,
    phone: supplier.phone,
    productName: product?.name_he ?? 'מוצר',
    weekText: weekLabel(week),
    priceText: money(PROMO_WEEK_EXCL_VAT),
  }
  await sendEmail({
    to: PROMO_REQUEST_EMAIL,
    subject: promoRequestSubject(mail),
    html: promoRequestHtml(mail),
    isTest: isTestName(supplier.company_name),
  }).catch((err) => console.error('Promo request email failed:', err))

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

/** Cancels the supplier's own booking while it still waits for approval. */
export async function DELETE(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const { data } = await getSupabaseAdmin()
    .from('promo_weeks')
    .update({ status: 'cancelled', decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('supplier_id', supplier.id)
    .eq('status', 'requested')
    .select('id')
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'אפשר לבטל רק בקשה שעוד לא אושרה' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
