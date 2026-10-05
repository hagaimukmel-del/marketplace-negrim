import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/carpenter/contact-supplier
 *
 * Send a message/request to a supplier
 * Types: quote_request, inquiry, support
 */
export async function POST(request: NextRequest) {
  try {
    const carpenter = await getSessionCarpenter()
    if (!carpenter) {
      return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
    }

    const body = await request.json()
    const { supplierId, action, message, productId } = body

    if (!supplierId || !action || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'supplierId, action, and message required' },
        { status: 400 }
      )
    }

    // Mirrors the check constraint on supplier_contact_requests.action_type
    if (!['quote_request', 'inquiry', 'support'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Log the supplier contact request
    const { error: logError } = await supabase.from('supplier_contact_requests').insert({
      carpenter_id: carpenter.id,
      supplier_id: supplierId,
      action_type: action,
      message: message.trim().slice(0, 1000),
      product_id: productId || null,
    })

    if (logError) {
      console.error('Failed to log contact request:', logError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // TODO: Send email notification to supplier
    // const { data: supplier } = await supabase
    //   .from('suppliers')
    //   .select('email')
    //   .eq('id', supplierId)
    //   .maybeSingle()
    //
    // if (supplier?.email) {
    //   await sendEmailToSupplier(supplier.email, carpenter, action, message)
    // }

    return NextResponse.json(
      {
        success: true,
        message: 'הודעתך נשלחה לספק',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Contact supplier error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
