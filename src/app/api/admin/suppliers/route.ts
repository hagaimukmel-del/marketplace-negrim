import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'

type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

const LOGO_BUCKET = 'supplier-logos'
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']

const DECISIONS = ['approved', 'rejected', 'pending'] as const
type Decision = (typeof DECISIONS)[number]

function isDecision(value: unknown): value is Decision {
  return typeof value === 'string' && (DECISIONS as readonly string[]).includes(value)
}

function trimmed(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, max) : null
}

/** Last nine digits, so one business cannot arrive twice under a different format. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : null
}

/** ח.פ / ע.מ is nine digits; eight is accepted because older numbers exist. */
function normaliseBusinessId(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 8 || digits.length === 9 ? digits : null
}

function optionalNumber(
  value: unknown,
  { integer = false }: { integer?: boolean } = {}
): number | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 'invalid'
  if (integer && !Number.isInteger(parsed)) return 'invalid'
  return parsed
}

/**
 * Open a supplier from the console.
 *
 * The first suppliers are recruited by phone and by meeting, not by filling in
 * a web form, so the operator needs to be able to set one up himself. One
 * created here is approved by definition - he created it - and is marked
 * source = 'admin' so inbound applications stay distinguishable later.
 *
 * Note that a supplier with no offers is invisible to carpenters: creating one
 * records the relationship, it does not put anything in the catalogue.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const companyName = trimmed(body.company_name, 120)
    if (!companyName) {
      return NextResponse.json({ error: 'צריך שם חברה' }, { status: 400 })
    }

    const businessId =
      typeof body.business_id === 'string' ? normaliseBusinessId(body.business_id) : null
    if (!businessId) {
      return NextResponse.json({ error: 'ח.פ / ע.מ צריך להיות 9 ספרות' }, { status: 400 })
    }

    const email = trimmed(body.email, 160)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    const phoneRaw = trimmed(body.phone, 40)
    const phoneKey = phoneRaw ? normalisePhone(phoneRaw) : null
    if (phoneRaw && !phoneKey) {
      return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
    }

    const minOrder = optionalNumber(body.min_order_value_excl_vat)
    if (minOrder === 'invalid') {
      return NextResponse.json({ error: 'מינימום הזמנה לא תקין' }, { status: 400 })
    }

    const leadTime = optionalNumber(body.default_lead_time_days, { integer: true })
    if (leadTime === 'invalid') {
      return NextResponse.json({ error: 'זמן אספקה לא תקין' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('suppliers')
      .insert({
        company_name: companyName,
        business_id: businessId,
        contact_name: trimmed(body.contact_name, 120),
        phone: phoneRaw,
        phone_key: phoneKey,
        email,
        city: trimmed(body.city, 80),
        address: trimmed(body.address, 200),
        sells_note: trimmed(body.sells_note, 600),
        min_order_value_excl_vat: minOrder,
        default_lead_time_days: leadTime,
        pickup_address: trimmed(body.pickup_address, 200),
        // Opened by the operator, so there is nobody left to approve it.
        status: 'approved',
        is_verified: true,
        source: 'admin',
        decided_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'ח.פ או טלפון כאלה כבר רשומים אצל ספק אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Supplier create failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

/**
 * Decide on an application, or edit a supplier's details.
 *
 * Both live here because both are one PATCH on one row, and the screen presents
 * them as one card. `is_verified` is kept in step with `status` because older
 * code still reads the boolean, and two fields disagreeing about whether a
 * supplier is real is the sort of split that only surfaces months later.
 *
 * `business_id` is editable only here, never by the supplier: it is the unique
 * key, so a supplier able to change it could collide with another or walk away
 * from a rejection.
 *
 * A multipart body is a logo upload instead - same route because it is the same
 * row, and the content type says which.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') ?? ''

    // ---- logo upload ----------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const id = form.get('id')
      const file = form.get('file')

      if (typeof id !== 'string' || !(file instanceof File)) {
        return NextResponse.json({ error: 'חסר מזהה ספק או קובץ' }, { status: 400 })
      }
      if (!LOGO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'קובץ תמונה בלבד (JPG, PNG, WEBP, SVG)' },
          { status: 415 }
        )
      }
      if (file.size > LOGO_MAX_BYTES) {
        return NextResponse.json({ error: 'הקובץ גדול מ-2MB' }, { status: 413 })
      }

      const supabase = getSupabaseAdmin()
      const extension = file.type.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg')
      // The id keeps one logo per supplier; the timestamp busts any CDN copy
      // of the one it replaces.
      const path = `${id}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)

      const { error } = await supabase
        .from('suppliers')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ ok: true, logo_url: publicUrl })
    }

    // ---- field edit -----------------------------------------------------
    const body = await request.json()
    if (typeof body.id !== 'string') {
      return NextResponse.json({ error: 'חסר מזהה ספק' }, { status: 400 })
    }

    const update: SupplierUpdate = { updated_at: new Date().toISOString() }

    // ---- the decision ----
    if (body.status !== undefined) {
      if (!isDecision(body.status)) {
        return NextResponse.json({ error: 'החלטה לא תקינה' }, { status: 400 })
      }
      update.status = body.status
      update.is_verified = body.status === 'approved'
      update.decided_at = body.status === 'pending' ? null : new Date().toISOString()
    }

    // ---- the details ----
    if (body.company_name !== undefined) {
      const companyName = trimmed(body.company_name, 120)
      if (!companyName) {
        return NextResponse.json({ error: 'צריך שם חברה' }, { status: 400 })
      }
      update.company_name = companyName
    }

    if (body.business_id !== undefined) {
      const businessId = normaliseBusinessId(String(body.business_id))
      if (!businessId) {
        return NextResponse.json({ error: 'ח.פ / ע.מ צריך להיות 9 ספרות' }, { status: 400 })
      }
      update.business_id = businessId
    }

    if (body.email !== undefined) {
      const email = trimmed(body.email, 160)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
      }
      update.email = email
    }

    if (body.phone !== undefined) {
      const phoneRaw = trimmed(body.phone, 40)
      const phoneKey = phoneRaw ? normalisePhone(phoneRaw) : null
      if (phoneRaw && !phoneKey) {
        return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
      }
      update.phone = phoneRaw
      update.phone_key = phoneKey
    }

    // Explicit null clears it; the UI sends that from "הסר לוגו".
    if (body.logo_url === null) update.logo_url = null

    if (body.contact_name !== undefined) update.contact_name = trimmed(body.contact_name, 120)
    if (body.city !== undefined) update.city = trimmed(body.city, 80)
    if (body.address !== undefined) update.address = trimmed(body.address, 200)
    if (body.pickup_address !== undefined) update.pickup_address = trimmed(body.pickup_address, 200)
    if (body.sells_note !== undefined) update.sells_note = trimmed(body.sells_note, 600)

    if (body.min_order_value_excl_vat !== undefined) {
      const minOrder = optionalNumber(body.min_order_value_excl_vat)
      if (minOrder === 'invalid') {
        return NextResponse.json({ error: 'מינימום הזמנה לא תקין' }, { status: 400 })
      }
      update.min_order_value_excl_vat = minOrder
    }

    if (body.default_lead_time_days !== undefined) {
      const leadTime = optionalNumber(body.default_lead_time_days, { integer: true })
      if (leadTime === 'invalid') {
        return NextResponse.json({ error: 'זמן אספקה לא תקין' }, { status: 400 })
      }
      update.default_lead_time_days = leadTime
    }

    const { error } = await getSupabaseAdmin().from('suppliers').update(update).eq('id', body.id)

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'ח.פ או טלפון כאלה כבר רשומים אצל ספק אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
