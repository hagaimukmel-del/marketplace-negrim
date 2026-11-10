import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { isAdmin } from '@/lib/admin-auth'
import { jobsBoardOpen } from '@/lib/jobs-server'
import { jobExpiry, readJobInput, type JobInput } from '@/lib/jobs'

/** Far above honest use, low enough to stop a flood. */
const POSTS_PER_DAY = 5
const OPEN_MAX = 20

/**
 * Who is posting: a carpentry from /app/jobs or a supplier from /supplier/jobs.
 * The side is named by the page, because the operator can hold both cookies;
 * the id always comes from that side's session, never from the request.
 */
async function sessionOwner(side: unknown): Promise<{ column: 'carpenter_id' | 'supplier_id'; id: string } | NextResponse> {
  // Closed while under construction; the operator can still try it.
  if (!jobsBoardOpen() && !(await isAdmin())) {
    return NextResponse.json({ error: 'דרושים עוד בבנייה' }, { status: 403 })
  }
  if (side === 'supplier') {
    const supplier = await getSessionSupplier()
    if (!supplier) return NextResponse.json({ error: 'צריך להיות ספק מאושר' }, { status: 401 })
    const refused = await refuseAdminWriteFor(supplier)
    if (refused) return refused
    return { column: 'supplier_id', id: supplier.id }
  }
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  return { column: 'carpenter_id', id: carpenter.id }
}

/** Post an ad. It belongs to whoever is in the session. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as (JobInput & { side?: unknown }) | null
    if (!body) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })

    const owner = await sessionOwner(body.side)
    if (owner instanceof NextResponse) return owner

    const now = new Date()
    const fields = readJobInput(body, now)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const [{ count: today }, { count: open }] = await Promise.all([
      supabase
        .from('job_posts')
        .select('id', { count: 'exact', head: true })
        .eq(owner.column, owner.id)
        .gt('created_at', new Date(now.getTime() - 86_400_000).toISOString()),
      supabase
        .from('job_posts')
        .select('id', { count: 'exact', head: true })
        .eq(owner.column, owner.id)
        .eq('status', 'open')
        .gt('expires_at', now.toISOString()),
    ])
    if ((today ?? 0) >= POSTS_PER_DAY) {
      return NextResponse.json({ error: `עד ${POSTS_PER_DAY} מודעות ביום` }, { status: 429 })
    }
    if ((open ?? 0) >= OPEN_MAX) {
      return NextResponse.json({ error: `עד ${OPEN_MAX} מודעות פתוחות. סגרו מודעה ישנה ב"המודעות שלי"` }, { status: 429 })
    }

    const { data, error } = await supabase
      .from('job_posts')
      .insert({ [owner.column]: owner.id, ...fields, expires_at: jobExpiry(now) })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Job post create failed:', err)
    return NextResponse.json({ error: 'הפרסום נכשל' }, { status: 500 })
  }
}

/**
 * The owner's one-tap actions: close the ad (found someone) or keep it up for
 * another 30 days. Filtered on the owner, so somebody else's id matches nothing.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })

    const owner = await sessionOwner(body.side)
    if (owner instanceof NextResponse) return owner

    const now = new Date()
    const update =
      body.action === 'close'
        ? { status: 'closed', closed_at: now.toISOString(), updated_at: now.toISOString() }
        : body.action === 'extend'
          ? { status: 'open', closed_at: null, expires_at: jobExpiry(now), updated_at: now.toISOString() }
          : null
    if (!update) return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })

    const { data, error } = await getSupabaseAdmin()
      .from('job_posts')
      .update(update)
      .eq('id', body.id)
      .eq(owner.column, owner.id)
      .neq('status', 'removed')
      .select('id, expires_at')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'המודעה לא נמצאה' }, { status: 404 })

    return NextResponse.json({ ok: true, expires_at: data.expires_at })
  } catch (err) {
    console.error('Job post update failed:', err)
    return NextResponse.json({ error: 'הפעולה נכשלה' }, { status: 500 })
  }
}
