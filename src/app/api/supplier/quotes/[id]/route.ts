import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { isTestName } from '@/lib/email'
import { notify } from '@/lib/notifications'
import { postSystemMessage } from '@/lib/messages'
import { unitLabel } from '@/lib/catalog'
import { money } from '@/lib/app/format'
import { QUOTE_MAX_VALID_DAYS, israelDate, quantityText, validLabel } from '@/lib/quotes'
import { quoteAnswerHtml, quoteAnswerSubject } from '@/lib/emails/quote'

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * POST /api/supplier/quotes/[id] — the supplier answers a carpentry's quote
 * request (T-023): a unit price excl. VAT per base unit and the date it holds
 * until, or a decline. One answer per request: a different price is a new
 * request. The carpentry is emailed either way.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supplier = await getSessionSupplier()
  if (!supplier) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  const refused = await refuseAdminWriteFor(supplier)
  if (refused) return refused

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 600) : null
  const today = israelDate()

  let update: { status: string; quoted_unit_price_excl_vat: number | null; valid_until: string | null }
  if (body.action === 'answer') {
    const price = Math.round(Number(body.unit_price) * 100) / 100
    const validUntil = typeof body.valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.valid_until) ? body.valid_until : ''
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
    if (!validUntil || validUntil < today || validUntil > addDays(today, QUOTE_MAX_VALID_DAYS)) {
      return NextResponse.json({ error: `תוקף ההצעה: מהיום ועד ${QUOTE_MAX_VALID_DAYS} ימים קדימה` }, { status: 400 })
    }
    update = { status: 'quoted', quoted_unit_price_excl_vat: price, valid_until: validUntil }
  } else if (body.action === 'decline') {
    update = { status: 'declined', quoted_unit_price_excl_vat: null, valid_until: null }
  } else {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: rows, error } = await supabase
    .from('quote_requests')
    .update({ ...update, supplier_note: note, answered_at: new Date().toISOString() })
    .eq('id', id)
    .eq('supplier_id', supplier.id)
    // Answered once: the carpentry may already have the price in its cart.
    .eq('status', 'requested')
    .select('carpenter_id, quantity, product_id, carpenters(business_name, email, email_verified_at), products(name_he, base_unit)')
  if (error) return NextResponse.json({ error: 'התשובה לא נשמרה' }, { status: 500 })
  const row = rows?.[0]
  if (!row) return NextResponse.json({ error: 'כבר ענית על הבקשה הזו, או שהנגרייה ביטלה אותה' }, { status: 409 })

  const carpenter = row.carpenters as unknown as { business_name: string; email: string | null; email_verified_at: string | null } | null
  const product = row.products as unknown as { name_he: string; base_unit: string } | null
  // Under the carpentry's bell always; by email only to an address it proved,
  // like every other mail to them.
  const mailTo = carpenter?.email && carpenter.email_verified_at ? carpenter.email : null
  if (product) {
    const { data: offer } = await supabase
      .from('supplier_offers')
      .select('pack_label, pack_qty')
      .eq('product_id', row.product_id)
      .eq('supplier_id', supplier.id)
      .limit(1)
      .maybeSingle()
    const quantity = Number(row.quantity)
    const unit = unitLabel(product.base_unit)
    const details = {
      supplierName: supplier.company_name,
      productName: product.name_he,
      quantityText: quantityText(quantity, unit, offer?.pack_label ?? null, offer?.pack_qty == null ? null : Number(offer.pack_qty)),
      unitPriceText: update.quoted_unit_price_excl_vat != null ? `${money(update.quoted_unit_price_excl_vat)} ל${unit}` : null,
      totalText: update.quoted_unit_price_excl_vat != null ? money(update.quoted_unit_price_excl_vat * quantity) : null,
      validUntilText: update.valid_until ? validLabel(update.valid_until) : null,
      supplierNote: note,
    }
    const answered = update.status === 'quoted'
    await postSystemMessage(
      { quoteRequestId: id },
      (answered ? `הספק נתן הצעה: ${details.unitPriceText}, בתוקף עד ${details.validUntilText}` : 'הספק לא נתן הצעה לבקשה הזו') +
        (note ? `. הערת הספק: ${note}` : '')
    )
    await notify({
      to: { side: 'carpenter', id: row.carpenter_id },
      kind: answered ? 'quote_answered' : 'quote_declined',
      title: answered ? `הצעת מחיר מ${supplier.company_name}` : `${supplier.company_name} לא נתן הצעה`,
      body: answered
        ? `${product.name_he} · ${details.unitPriceText} · בתוקף עד ${details.validUntilText}`
        : `${product.name_he}${note ? ` · ${note}` : ''}`,
      link: '/app/quotes',
      quoteRequestId: id,
      email: mailTo
        ? {
            to: mailTo,
            subject: quoteAnswerSubject(details),
            html: quoteAnswerHtml(details),
            isTest: isTestName(carpenter?.business_name, supplier.company_name),
          }
        : null,
    })
  }
  const emailed = Boolean(mailTo)

  return NextResponse.json({ ok: true, emailed })
}
