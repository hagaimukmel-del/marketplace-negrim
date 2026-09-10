import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { notifyNewOrder } from '@/lib/notify-order'
import { sendEmail, siteUrl } from '@/lib/email'
import { newOrderHtml, newOrderSubject, type NewOrderEmail } from '@/lib/emails/new-order'

/**
 * Fire one email without placing an order.
 *
 * The slow loop — order through the cart, wait, check the inbox — is the right
 * way to test delivery once. It is the wrong way to test wording, and nobody
 * iterates on a template that costs a fake order each time.
 *
 * With an order id it sends that order's real notification, which is the honest
 * end-to-end test. Without one it sends a sample, so the template can be judged
 * before any order exists.
 */
const SAMPLE: NewOrderEmail = {
  orderId: '00000000-0000-0000-0000-000000000000',
  supplierId: '00000000-0000-0000-0000-000000000000',
  orderNumber: 'ORD-לדוגמה',
  carpenterName: 'נגרות כהן ובניו',
  contactName: 'דב כהן',
  phone: '050-1234567',
  city: 'תל אביב',
  address: 'התעשייה 4',
  paymentTerms: 'שוטף+30',
  notes: 'אפשר לספק ביום ראשון בבוקר',
  lines: [
    {
      product_name_he: 'דבק PUR 270/7 שקוף',
      quantity: 2,
      unit_price_excl_vat: 1250,
      line_total_excl_vat: 2500,
    },
    {
      product_name_he: 'קלינר Q1924 ניקוי EVA',
      quantity: 1,
      unit_price_excl_vat: 89,
      line_total_excl_vat: 89,
    },
  ],
  subtotalExclVat: 2589,
}

/**
 * The sample email as HTML, so it can be looked at in a browser instead of
 * being posted somewhere and fished out of an inbox.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return new NextResponse(`<!doctype html><meta charset="utf-8">${newOrderHtml(SAMPLE)}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configured = {
    provider: Boolean(process.env.RESEND_API_KEY),
    testRecipient: process.env.EMAIL_TEST_RECIPIENT ?? null,
    from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev (ברירת מחדל)',
    site: siteUrl(),
  }

  try {
    const body = await request.json().catch(() => ({}))
    const orderId = typeof body.order_id === 'string' ? body.order_id : null

    if (orderId) {
      const { data: order } = await getSupabaseAdmin()
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle()

      if (!order) return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })

      await notifyNewOrder(order.id)
      return NextResponse.json({
        ok: true,
        mode: 'real-order',
        ...configured,
        message: configured.provider
          ? 'נשלח. בדוק את תיבת הדואר.'
          : 'לא נשלח — אין עדיין מפתח Resend. התוכן נרשם ביומן השרת.',
      })
    }

    // A sample goes to the test inbox, or to the operator's own configured one.
    const to = process.env.EMAIL_TEST_RECIPIENT
    if (!to) {
      return NextResponse.json(
        { error: 'לא הוגדר EMAIL_TEST_RECIPIENT, ואין לאן לשלוח בדיקה' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject: `[בדיקה] ${newOrderSubject(SAMPLE)}`,
      html: newOrderHtml(SAMPLE),
    })

    return NextResponse.json({
      ok: true,
      mode: 'sample',
      ...configured,
      sent: result.sent,
      message: result.sent
        ? `נשלח אל ${to}.`
        : result.reason === 'no-provider'
          ? 'לא נשלח — אין עדיין מפתח Resend. התוכן נרשם ביומן השרת.'
          : `השליחה נכשלה: ${result.error ?? 'סיבה לא ידועה'}`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
