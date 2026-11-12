import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const UUID = /^[0-9a-f-]{36}$/i

/**
 * A registered carpentry pressed WhatsApp or call to a supplier on a product
 * or supplier page (product review 2026-11-12).
 *
 * Sent with sendBeacon as the phone app opens, so nothing waits for it and a
 * failure is silent. One row per press, with where and about which product, so
 * a supplier can be shown how often carpentries reached it. On a database
 * without migration 20261112130000 the row is kept without those two.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const [{ id }, body] = await Promise.all([params, request.json().catch(() => null)])
  const channel = body?.channel === 'whatsapp' || body?.channel === 'phone' ? (body.channel as 'whatsapp' | 'phone') : null
  const source = body?.source === 'product' || body?.source === 'supplier' ? (body.source as 'product' | 'supplier') : null
  if (!channel || !source || !UUID.test(id)) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  const productId = source === 'product' && typeof body?.productId === 'string' && UUID.test(body.productId) ? body.productId : null

  const supabase = getSupabaseAdmin()
  const { data: supplier } = await supabase.from('suppliers').select('id').eq('id', id).eq('status', 'approved').maybeSingle()
  if (!supplier) return NextResponse.json({ error: 'הספק לא נמצא' }, { status: 404 })

  const base = { carpenter_id: carpenter.id, supplier_id: supplier.id, channel }
  const { error } = await supabase.from('contact_clicks').insert({ ...base, source, product_id: productId })
  if (error) {
    const { error: plain } = await supabase.from('contact_clicks').insert(base)
    if (plain) console.error('[contact] click not recorded', plain)
  }
  return NextResponse.json({ ok: true })
}
