import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const DECISIONS = ['approved', 'rejected', 'pending'] as const
type Decision = (typeof DECISIONS)[number]

function isDecision(value: unknown): value is Decision {
  return typeof value === 'string' && (DECISIONS as readonly string[]).includes(value)
}

/**
 * Approve or reject a supplier application.
 *
 * `is_verified` is kept in step with the decision because the rest of the code
 * predates `status` and still reads the boolean; leaving the two to disagree
 * would be the sort of split that only shows up as a bug months later.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (typeof body.id !== 'string') {
      return NextResponse.json({ error: 'חסר מזהה ספק' }, { status: 400 })
    }
    if (!isDecision(body.status)) {
      return NextResponse.json({ error: 'החלטה לא תקינה' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from('suppliers')
      .update({
        status: body.status,
        is_verified: body.status === 'approved',
        decided_at: body.status === 'pending' ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
