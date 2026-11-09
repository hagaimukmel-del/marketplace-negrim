import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-scope'
import { currentWeek } from '@/lib/promo-weeks'
import { parseAdminPromoCreate, parseAdminPromoEdit } from '@/lib/promo-admin-rules'

const WEEK_TAKEN = 'השבוע הזה כבר תפוס. אפשר לערוך את הפרסום הקיים או להחליף אותו.'

/** The supplier sells this product and it is shown to carpenters: a promotion never shows something nobody can order. */
async function hasLiveOffer(supplierId: string, productId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('supplier_offers')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

/**
 * The operator approves or rejects a "מוצר השבוע" booking (T-024).
 * Body: `{ id, action: 'approve' | 'reject', note? }`. A rejection frees the
 * week for others and shows the note to the supplier. Only a booking that is
 * still waiting can be decided, and an approved one can still be withdrawn.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const action = body.action
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) || null : null
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('promo_weeks')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', note, decided_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', action === 'approve' ? ['requested'] : ['requested', 'approved'])
    .select('id, supplier_id, week_start')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'הבקשה כבר טופלה' }, { status: 409 })

  await logAdminAction({
    action: action === 'approve' ? 'approve_promo_week' : 'reject_promo_week',
    supplierId: data.supplier_id,
    targetId: data.id,
    details: { week_start: data.week_start, note },
  })
  return NextResponse.json({ ok: true })
}

/**
 * The operator sets a week by hand, at a supplier's request (T-024).
 * Body: `{ supplier_id, product_id, week_start, show_price?, price_excl_vat?,
 * note?, replace? }`. The booking is approved at once. A week already held by
 * another booking answers 409, unless `replace` is set: then that booking is
 * cancelled and this one takes its place.
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parseAdminPromoCreate(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  if (!(await hasLiveOffer(input.supplierId, input.productId))) {
    return NextResponse.json({ error: 'אפשר לקדם רק מוצר שהספק מוכר ומוצג לנגרים' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  let replaced: { id: string; supplier_id: string; status: string; note: string | null } | null = null
  if (input.replace) {
    const { data: holder, error } = await supabase
      .from('promo_weeks')
      .select('id, supplier_id, status, note')
      .eq('week_start', input.weekStart)
      .in('status', ['requested', 'approved'])
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (holder) {
      const { error: cancelError } = await supabase
        .from('promo_weeks')
        .update({ status: 'cancelled', decided_at: now, note: 'הוחלף ידנית באדמין' })
        .eq('id', holder.id)
      if (cancelError) return NextResponse.json({ error: cancelError.message }, { status: 500 })
      replaced = holder
    }
  }

  const { data, error } = await supabase
    .from('promo_weeks')
    .insert({
      week_start: input.weekStart,
      supplier_id: input.supplierId,
      product_id: input.productId,
      status: 'approved',
      price_excl_vat: input.price,
      note: input.note,
      decided_at: now,
      // Only sent when asked for, so a booking still saves before migration 20261011150000.
      ...(input.showPrice ? { show_price: true } : {}),
    })
    .select('id')
    .single()

  if (error) {
    // Put back what was cancelled, so a failed replace leaves the week as it was.
    if (replaced) {
      await supabase.from('promo_weeks').update({ status: replaced.status, note: replaced.note }).eq('id', replaced.id)
    }
    if (error.code === '23505') return NextResponse.json({ error: WEEK_TAKEN, taken: true }, { status: 409 })
    console.error('Admin promo booking failed:', error)
    return NextResponse.json({ error: 'הפרסום לא נשמר' }, { status: 500 })
  }

  if (replaced) {
    await logAdminAction({
      action: 'replace_promo_week',
      supplierId: replaced.supplier_id,
      targetId: replaced.id,
      details: { week_start: input.weekStart, replaced_by: data.id },
    })
  }
  await logAdminAction({
    action: 'set_promo_week',
    supplierId: input.supplierId,
    targetId: data.id,
    details: {
      week_start: input.weekStart,
      product_id: input.productId,
      show_price: input.showPrice,
      price_excl_vat: input.price,
      note: input.note,
    },
  })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

/**
 * The operator changes a booking that has not ended, at the supplier's request:
 * the product (one the same supplier sells), the week, the price on the card,
 * or the price of the week. Body: `{ id, product_id?, week_start?, show_price?,
 * price_excl_vat? }`.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parseAdminPromoEdit(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  const supabase = getSupabaseAdmin()
  const { data: booking } = await supabase
    .from('promo_weeks')
    .select('id, supplier_id, product_id, week_start, status')
    .eq('id', input.id)
    .maybeSingle()
  if (!booking || !['requested', 'approved'].includes(booking.status) || booking.week_start < currentWeek()) {
    return NextResponse.json({ error: 'אפשר לשנות רק פרסום שעוד לא הסתיים' }, { status: 404 })
  }
  if (input.productId && input.productId !== booking.product_id && !(await hasLiveOffer(booking.supplier_id, input.productId))) {
    return NextResponse.json({ error: 'אפשר לקדם רק מוצר שהספק מוכר ומוצג לנגרים' }, { status: 400 })
  }

  const changes: { product_id?: string; week_start?: string; show_price?: boolean; price_excl_vat?: number } = {}
  if (input.productId) changes.product_id = input.productId
  if (input.weekStart) changes.week_start = input.weekStart
  if (input.showPrice !== undefined) changes.show_price = input.showPrice
  if (input.price !== undefined) changes.price_excl_vat = input.price

  const { data, error } = await supabase
    .from('promo_weeks')
    .update(changes)
    .eq('id', booking.id)
    .in('status', ['requested', 'approved'])
    .select('id')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: WEEK_TAKEN, taken: true }, { status: 409 })
    console.error('Admin promo edit failed:', error)
    return NextResponse.json({ error: 'השינוי לא נשמר' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'אפשר לשנות רק פרסום שעוד לא הסתיים' }, { status: 404 })

  await logAdminAction({
    action: 'edit_promo_week',
    supplierId: booking.supplier_id,
    targetId: booking.id,
    details: { before: { product_id: booking.product_id, week_start: booking.week_start }, ...changes },
  })
  return NextResponse.json({ ok: true })
}
