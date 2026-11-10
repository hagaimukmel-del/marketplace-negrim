import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen, ownerLive } from '@/lib/jobs-server'

/**
 * The phone behind an ad, on request. Kept out of the board's payload: a page
 * full of phone numbers is a harvesting target. Needs a signed-in carpentry or
 * supplier, and answers only for an ad that is live.
 */
export async function GET(request: NextRequest) {
  const [carpenter, supplier, admin] = await Promise.all([getSessionCarpenter(), getSessionSupplier(), isAdmin()])
  if (!jobsBoardOpen() && !admin) {
    return NextResponse.json({ error: 'דרושים ייפתח בהמשך' }, { status: 403 })
  }
  if (!carpenter && !supplier && !admin) {
    return NextResponse.json({ error: 'צריך להיות נגרייה או ספק רשומים' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })

  const { data } = await getSupabaseAdmin()
    .from('job_posts')
    .select('contact_phone, business_name, status, expires_at, carpenters(is_active), suppliers(status)')
    .eq('id', id)
    .maybeSingle()

  const live = data && data.status === 'open' && new Date(data.expires_at).getTime() > Date.now() && ownerLive(data)
  if (!live) return NextResponse.json({ error: 'המודעה כבר לא פעילה' }, { status: 404 })

  return NextResponse.json({ name: data.business_name, phone: data.contact_phone })
}
