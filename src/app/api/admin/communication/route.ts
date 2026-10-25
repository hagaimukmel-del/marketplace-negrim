import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { processOutbox } from '@/lib/outbox'
import { rungKey } from '@/lib/reminder-rules'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The operator's actions on "בריאות תקשורת" (communication plan, step 6):
 *   resend      put a failed or bounced mail back in the outbox and send it now
 *   unsuppress  let the site mail an address again (it was fixed, or the
 *               bounce was a one-off on the receiving side)
 *   handled     the operator called the supplier about a waiting order or
 *               quote: the reminder ladder stops for it
 * Re-checks the admin cookie itself, like every admin route.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const supabase = getSupabaseAdmin()

  if (body?.action === 'resend') {
    const id = typeof body.id === 'string' && UUID.test(body.id) ? body.id : null
    if (!id) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 })
    const { data: row } = await supabase.from('email_outbox').select('id, to_email').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'המייל לא נמצא' }, { status: 404 })
    const { data: blocked } = await supabase.from('email_suppressions').select('email').eq('email', row.to_email.toLowerCase()).maybeSingle()
    if (blocked) return NextResponse.json({ error: 'הכתובת חסומה כי מיילים אליה חזרו. בטלו את החסימה קודם, אם היא תוקנה.' }, { status: 409 })

    const { error } = await supabase
      .from('email_outbox')
      .update({ status: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(), locked_at: null, last_error: null })
      .eq('id', id)
      .in('status', ['failed', 'bounced', 'pending', 'skipped'])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const result = await processOutbox({ ids: [id] })
    return NextResponse.json({ ok: true, sent: result.sent > 0 })
  }

  if (body?.action === 'unsuppress') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) return NextResponse.json({ error: 'חסרה כתובת' }, { status: 400 })
    const { error } = await supabase.from('email_suppressions').delete().eq('email', email)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body?.action === 'handled') {
    const subject = body.subject === 'order' || body.subject === 'quote' ? (body.subject as 'order' | 'quote') : null
    const id = typeof body.id === 'string' && UUID.test(body.id) ? body.id : null
    if (!subject || !id) return NextResponse.json({ error: 'פריט לא תקין' }, { status: 400 })
    const keys = [...([1, 2, 3] as const).map((rung) => rungKey(subject, id, rung)), `${subject}:${id}:handled`]
    const { error } = await supabase.from('reminder_log').upsert(keys.map((key) => ({ key })), { onConflict: 'key', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
}
