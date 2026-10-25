import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { postSystemMessage } from '@/lib/messages'

const LINE: Record<'whatsapp' | 'phone', string> = {
  whatsapp: 'הנגרייה פנתה לספק בוואטסאפ, מחוץ לאתר.',
  phone: 'הנגרייה התקשרה לספק.',
}

/**
 * The carpentry pressed WhatsApp or call on one of its orders (step 4).
 *
 * Sent with sendBeacon as the phone app opens, so nothing waits for it and a
 * failure is silent. Records the press, and leaves one line in the order's
 * conversation at most once an hour per channel, so a few presses in a row are
 * one line, not five.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const [{ id }, body] = await Promise.all([params, request.json().catch(() => null)])
  const channel = body?.channel === 'whatsapp' || body?.channel === 'phone' ? (body.channel as 'whatsapp' | 'phone') : null
  if (!channel) return NextResponse.json({ error: 'ערוץ לא מוכר' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: order } = await supabase.from('orders').select('id, supplier_id').eq('id', id).eq('carpenter_id', carpenter.id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recent, error: readError } = await supabase
    .from('contact_clicks')
    .select('id')
    .eq('order_id', order.id)
    .eq('channel', channel)
    .gte('created_at', hourAgo)
    .limit(1)
  const { error } = await supabase
    .from('contact_clicks')
    .insert({ carpenter_id: carpenter.id, supplier_id: order.supplier_id, order_id: order.id, channel })
  if (error) console.error('[contact] click not recorded', error)

  // Without the table (production before the migration) there is no record to
  // dedupe on, so no line either: better silent than one per press.
  if (!readError && !error && (recent ?? []).length === 0) await postSystemMessage({ orderId: order.id }, LINE[channel])
  return NextResponse.json({ ok: true })
}
