import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isTestName, sendEmail } from '@/lib/email'
import { supplierQuestionHtml, supplierQuestionSubject } from '@/lib/emails/supplier-question'
import { startThread } from '@/lib/messages'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/carpenter/contact-supplier
 *
 * A carpenter's question to a supplier, from "שאלה לספק" in the agent chat.
 * Stored in supplier_contact_requests (shown in the supplier console) and
 * emailed to the supplier with the carpenter's phone, so the answer goes
 * straight between them. Types: quote_request, inquiry, support.
 *
 * It also opens a message thread (T-025), so the supplier can answer inside
 * the site. Best-effort: a database without the messages tables still logs
 * and emails the question.
 */
export async function POST(request: NextRequest) {
  try {
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
    }

    const body = await request.json()
    const { supplierId, action, message, productId } = body

    if (typeof supplierId !== 'string' || !UUID.test(supplierId) || !action || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'supplierId, action, and message required' },
        { status: 400 }
      )
    }
    if (productId != null && (typeof productId !== 'string' || !UUID.test(productId))) {
      return NextResponse.json({ error: 'invalid productId' }, { status: 400 })
    }

    // Mirrors the check constraint on supplier_contact_requests.action_type
    if (!['quote_request', 'inquiry', 'support'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    // Each question is an email in a supplier's inbox
    if (!checkRateLimit(carpenter.id, 'supplierQuestion').allowed) {
      return NextResponse.json({ error: 'שלחת הרבה שאלות בשעה האחרונה. נסה שוב מאוחר יותר.' }, { status: 429 })
    }

    const supabase = getSupabaseAdmin()

    const [{ data: supplier }, { data: product }, { data: contact }] = await Promise.all([
      supabase.from('suppliers').select('id, company_name, email, status').eq('id', supplierId).maybeSingle(),
      productId
        ? supabase.from('products').select('name_he').eq('id', productId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('carpenters').select('email, email_verified_at').eq('id', carpenter.id).maybeSingle(),
    ])

    // Only a supplier carpenters can buy from can be asked
    if (!supplier || supplier.status !== 'approved') {
      return NextResponse.json({ error: 'הספק לא זמין' }, { status: 404 })
    }

    const question = message.trim().slice(0, 1000)

    const { data: logged, error: logError } = await supabase.from('supplier_contact_requests').insert({
      carpenter_id: carpenter.id,
      supplier_id: supplier.id,
      action_type: action,
      message: question,
      product_id: productId || null,
    }).select('id').single()

    if (logError) {
      console.error('Failed to log contact request:', logError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    await startThread(
      { side: 'carpenter', id: carpenter.id },
      { supplierId: supplier.id, productId: productId || null, contactRequestId: logged.id, body: question, notify: false }
    ).catch((err) => console.error('Contact supplier: thread not opened', err))

    // The question is saved and shows in the supplier console; a failed email
    // must not tell the carpenter it was lost
    let emailed = false
    if (supplier.email) {
      // A reply goes to the carpenter only once they have proved the address
      const carpenterEmail = contact?.email_verified_at ? contact.email : null
      const details = {
        carpenterName: carpenter.business_name,
        contactName: carpenter.contact_name,
        phone: carpenter.phone,
        city: carpenter.city,
        carpenterEmail,
        productName: product?.name_he ?? null,
        question,
      }
      const result = await sendEmail({
        to: supplier.email,
        subject: supplierQuestionSubject(details),
        html: supplierQuestionHtml(details),
        isTest: isTestName(carpenter.business_name, supplier.company_name),
        replyTo: carpenterEmail,
      })
      emailed = result.sent
    }

    return NextResponse.json({ success: true, emailed }, { status: 201 })
  } catch (err) {
    console.error('Contact supplier error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
