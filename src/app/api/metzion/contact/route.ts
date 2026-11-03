import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { ownerOf } from '@/lib/metzion'

/**
 * The phone behind a listing, on request.
 *
 * Kept out of the board's payload on purpose: a page full of phone numbers is
 * a harvesting target. Asking for one costs a tap, needs a registered carpenter,
 * and only answers for a listing that is live and whose owner (carpenter or
 * supplier) is not blocked.
 */
export async function GET(request: NextRequest) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  if (!carpenter && !admin) {
    return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })

  const { data } = await getSupabaseAdmin()
    .from('metzion_listings')
    .select('contact_name, contact_phone, status, expires_at, carpenters(is_active), suppliers(company_name, status)')
    .eq('id', id)
    .maybeSingle()

  const live = data && data.status === 'active' && new Date(data.expires_at).getTime() > Date.now() && ownerOf(data).live

  if (!live) return NextResponse.json({ error: 'המודעה כבר לא פעילה' }, { status: 404 })

  return NextResponse.json({ name: data.contact_name, phone: data.contact_phone })
}
