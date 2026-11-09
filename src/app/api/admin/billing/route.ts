import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-scope'
import { monthToDate, parsePayment, parsePlan } from '@/lib/billing-rules'

const NOT_READY = 'טבלאות החיובים עוד לא קיימות במסד הנתונים (מיגרציה 20261109140000)'

/** Postgres "relation does not exist": the migration has not run here yet. */
function missingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

/**
 * The operator records a payment from a supplier (admin billing report).
 * Body: see parsePayment in lib/billing-rules.ts. Nothing is charged here:
 * billing happens outside the site, this only writes down what arrived.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parsePayment(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  const { data, error } = await getSupabaseAdmin()
    .from('supplier_payments')
    .insert({
      supplier_id: input.supplierId,
      kind: input.kind,
      amount_excl_vat: input.amount,
      paid_on: input.paidOn,
      covers_from: monthToDate(input.coversFrom),
      covers_months: input.coversMonths,
      installment_no: input.installmentNo,
      installments_total: input.installmentsTotal,
      method: input.method,
      note: input.note,
    })
    .select('id')
    .single()

  if (missingTable(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 })
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'השמירה נכשלה' }, { status: 500 })

  await logAdminAction({
    action: 'record_supplier_payment',
    supplierId: input.supplierId,
    targetId: data.id,
    details: { kind: input.kind, amount_excl_vat: input.amount, paid_on: input.paidOn, covers_from: input.coversFrom, covers_months: input.coversMonths },
  })
  return NextResponse.json({ ok: true, id: data.id })
}

/** Removes a payment recorded by mistake. Body: `{ id }`. */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('supplier_payments')
    .delete()
    .eq('id', id)
    .select('id, supplier_id, kind, amount_excl_vat, paid_on')
    .maybeSingle()

  if (missingTable(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'התשלום לא נמצא' }, { status: 404 })

  await logAdminAction({
    action: 'delete_supplier_payment',
    supplierId: data.supplier_id,
    targetId: data.id,
    details: { kind: data.kind, amount_excl_vat: data.amount_excl_vat, paid_on: data.paid_on },
  })
  return NextResponse.json({ ok: true })
}

/**
 * The operator sets a supplier's subscription: monthly amount (0 = exempt),
 * first month and optional last month. `{ supplier_id, reset: true }` goes
 * back to the default (list price from billing start or approval).
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parsePlan(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { supplierId, plan } = parsed.value

  const supabase = getSupabaseAdmin()
  const { error } = plan
    ? await supabase.from('supplier_billing').upsert({
        supplier_id: supplierId,
        monthly_excl_vat: plan.monthly,
        starts_month: monthToDate(plan.startsMonth),
        ends_month: plan.endsMonth ? monthToDate(plan.endsMonth) : null,
        note: plan.note,
        updated_at: new Date().toISOString(),
      })
    : await supabase.from('supplier_billing').delete().eq('supplier_id', supplierId)

  if (missingTable(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction({
    action: plan ? 'set_supplier_plan' : 'reset_supplier_plan',
    supplierId,
    details: plan ? { monthly_excl_vat: plan.monthly, starts_month: plan.startsMonth, ends_month: plan.endsMonth } : {},
  })
  return NextResponse.json({ ok: true })
}
