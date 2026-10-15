import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getWorkViewer } from '@/lib/work-server'
import { OPEN_JOBS_MAX, POSTS_PER_DAY, isCloseOutcome, jobExpiry, readJobFields } from '@/lib/work'
import type { Database } from '@/lib/database.types'

type JobUpdate = Database['public']['Tables']['work_jobs']['Update']

const BUCKET = 'work-images'
const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Post a job.
 *
 * Only a member may post (during the launch: any carpentry with a profile),
 * and only once the board is open. The job belongs to the carpentry in the
 * session, never to an id in the request. One photo at most, not required:
 * a job is described by its type, size and date, and a photo can give the
 * client away.
 */
export async function POST(request: NextRequest) {
  const now = new Date()
  const viewer = await getWorkViewer(now)
  const carpenter = viewer.carpenter
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  if (!viewer.open) return NextResponse.json({ error: 'הלוח עוד לא נפתח' }, { status: 403 })
  if (!viewer.member) return NextResponse.json({ error: 'כדי לפרסם צריך למלא פרופיל יכולות' }, { status: 403 })

  try {
    const form = await request.formData()
    const fields = readJobFields(Object.fromEntries(form), now)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

    const files = form.getAll('image').filter((entry): entry is File => entry instanceof File && entry.size > 0)
    if (files.length > 1) return NextResponse.json({ error: 'תמונה אחת לכל היותר' }, { status: 400 })
    const file = files[0] ?? null
    if (file && !TYPES.includes(file.type)) return NextResponse.json({ error: 'תמונה בפורמט JPG, PNG או WEBP בלבד' }, { status: 400 })
    if (file && file.size > MAX_BYTES) return NextResponse.json({ error: 'תמונה עד 5MB' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Far above honest use: a carpentry posting more than this is a flood.
    const [{ count: today }, { count: open }] = await Promise.all([
      supabase
        .from('work_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('carpenter_id', carpenter.id)
        .gt('created_at', new Date(now.getTime() - 86_400_000).toISOString()),
      supabase
        .from('work_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('carpenter_id', carpenter.id)
        .eq('status', 'open')
        .gt('expires_at', now.toISOString()),
    ])
    if ((today ?? 0) >= POSTS_PER_DAY) {
      return NextResponse.json({ error: `עד ${POSTS_PER_DAY} עבודות ביום. אפשר להמשיך מחר.` }, { status: 429 })
    }
    if ((open ?? 0) >= OPEN_JOBS_MAX) {
      return NextResponse.json({ error: `יש לכם ${OPEN_JOBS_MAX} עבודות פתוחות. סגרו עבודה כדי לפרסם חדשה.` }, { status: 429 })
    }

    const id = randomUUID()
    let imageUrl: string | null = null
    let imagePath: string | null = null
    if (file) {
      const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
      imagePath = `${carpenter.id}/${id}/${Date.now()}.${extension}`
      const { error } = await supabase.storage.from(BUCKET).upload(imagePath, file, { contentType: file.type })
      if (error) return NextResponse.json({ error: `העלאת התמונה נכשלה: ${error.message}` }, { status: 500 })
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl
    }

    const { error } = await supabase.from('work_jobs').insert({
      id,
      carpenter_id: carpenter.id,
      ...fields,
      image_url: imageUrl,
      expires_at: jobExpiry(fields.due_date, now).toISOString(),
    })
    if (error) {
      if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    console.error('Work job create failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הפרסום נכשל' }, { status: 500 })
  }
}

/**
 * The poster closes their job (and says how it ended) or takes it down.
 * Filtered on the owner, so somebody else's id matches nothing. Allowed
 * without a live subscription: a carpentry whose term ended can still tidy up.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getWorkViewer()
  const carpenter = viewer.carpenter
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'חסרה עבודה' }, { status: 400 })

    const now = new Date().toISOString()
    let update: JobUpdate
    switch (body.action) {
      case 'close':
        if (!isCloseOutcome(body.outcome)) return NextResponse.json({ error: 'צריך לבחור איך זה נגמר' }, { status: 400 })
        update = { status: 'closed', close_outcome: body.outcome, closed_at: now, updated_at: now }
        break
      case 'remove':
        update = { status: 'removed', removed_reason: 'owner', updated_at: now }
        break
      default:
        return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('work_jobs')
      .update(update)
      .eq('id', body.id)
      .eq('carpenter_id', carpenter.id)
      .in('status', ['open', 'paused'])
      .select('id')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'העבודה לא נמצאה או שכבר נסגרה' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Work job update failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הפעולה נכשלה' }, { status: 500 })
  }
}
