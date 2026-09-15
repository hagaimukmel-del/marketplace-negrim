import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName, sendEmail } from '@/lib/email'
import { raffleWinHtml, raffleWinSubject } from '@/lib/emails/raffle-win'

/**
 * Draw a winner among the carpenters.
 *
 * The pool is built here, on the server, from the database — not from the list
 * the browser happened to be showing — and the pick uses a cryptographic random
 * number, so nobody can nudge the result. Every draw is written down with the
 * size of the pool it came from, which is what makes "the site chose" true.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const includeTest = body.include_test === true
    const onlyMarketing = body.only_marketing === true
    const prize =
      typeof body.prize === 'string' && body.prize.trim() ? body.prize.trim().slice(0, 200) : null

    const supabase = getSupabaseAdmin()
    const { data: carpenters, error } = await supabase
      .from('carpenters')
      .select('id, business_name, email, marketing_consent')
      .eq('is_active', true)
      .limit(10000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pool = (carpenters ?? []).filter(
      (row) =>
        (includeTest || !isTestName(row.business_name)) &&
        (!onlyMarketing || row.marketing_consent)
    )

    if (pool.length === 0) {
      return NextResponse.json(
        { error: 'אין נגריות פעילות שעומדות בתנאים של ההגרלה' },
        { status: 409 }
      )
    }

    const winner = pool[randomInt(pool.length)]

    const { data: draw, error: insertError } = await supabase
      .from('raffle_draws')
      .insert({
        carpenter_id: winner.id,
        winner_name: winner.business_name,
        winner_email: winner.email,
        prize,
        pool_size: pool.length,
        included_test: includeTest,
      })
      .select('id, carpenter_id, winner_name, winner_email, prize, pool_size, included_test, drawn_at, notified_at')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ ok: true, draw }, { status: 201 })
  } catch (err) {
    console.error('Raffle draw failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Tell the winner. A separate step from the draw, so the operator can decide on
 * the prize, or check who won, before anything reaches a real inbox.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (typeof body.id !== 'string') {
      return NextResponse.json({ error: 'חסרה הגרלה' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: draw } = await supabase
      .from('raffle_draws')
      .select('id, winner_name, winner_email, prize')
      .eq('id', body.id)
      .maybeSingle()

    if (!draw) return NextResponse.json({ error: 'ההגרלה לא נמצאה' }, { status: 404 })
    if (!draw.winner_email) {
      return NextResponse.json(
        { error: 'לזוכה אין מייל במערכת — צריך להתקשר אליו' },
        { status: 409 }
      )
    }

    const result = await sendEmail({
      to: draw.winner_email,
      subject: raffleWinSubject(),
      html: raffleWinHtml({ winnerName: draw.winner_name, prize: draw.prize }),
      isTest: isTestName(draw.winner_name),
    })

    if (!result.sent) {
      return NextResponse.json({ error: 'המייל לא נשלח. נסה שוב מאוחר יותר.' }, { status: 502 })
    }

    const notifiedAt = new Date().toISOString()
    await supabase.from('raffle_draws').update({ notified_at: notifiedAt }).eq('id', draw.id)

    return NextResponse.json({ ok: true, notified_at: notifiedAt })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
