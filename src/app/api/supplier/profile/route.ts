import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { PAYMENT_TERMS } from '@/app/supplier/types'
import type { Database } from '@/lib/database.types'

type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

const LOGO_BUCKET = 'supplier-logos'
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/** Last nine digits, so one business cannot arrive twice under a different format. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : null
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
 * A supplier edits their own business details and trading terms.
 *
 * Which supplier is never taken from the request — only from the session, and
 * only if that supplier is still approved. Only the fields actually sent are
 * touched, so the details form and the terms form can each save on their own.
 *
 * The company number is not editable here at all. It is the identity the
 * operator approved, and the entity that invoices the carpenter; a supplier who
 * could change it could turn into a different company after approval.
 */
export async function PATCH(request: NextRequest) {
  const supplier = await getSessionSupplier()
  if (!supplier) {
    return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const contentType = request.headers.get('content-type') ?? ''

    // ---- logo upload --------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 })
      }
      if (!LOGO_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'קובץ תמונה בלבד (JPG, PNG, WEBP, SVG)' }, { status: 415 })
      }
      if (file.size > LOGO_MAX_BYTES) {
        return NextResponse.json({ error: 'הקובץ גדול מ-2MB' }, { status: 413 })
      }

      const extension = file.type.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg')
      const path = `${supplier.id}/${Date.now()}.${extension}`

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
        .eq('id', supplier.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ ok: true, logo_url: publicUrl })
    }

    // ---- field edit -----------------------------------------------------
    const body = await request.json()
    const update: SupplierUpdate = { updated_at: new Date().toISOString() }

    if ('company_name' in body) {
      const name = text(body.company_name, 120)
      if (!name) return NextResponse.json({ error: 'צריך שם חברה' }, { status: 400 })
      update.company_name = name
    }

    if ('phone' in body) {
      const raw = text(body.phone, 40)
      const phoneKey = raw ? normalisePhone(raw) : null
      if (!raw || !phoneKey) {
        return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
      }
      const { data: clash } = await supabase
        .from('suppliers')
        .select('id')
        .eq('phone_key', phoneKey)
        .neq('id', supplier.id)
        .maybeSingle()
      if (clash) {
        return NextResponse.json(
          { error: 'מספר הטלפון הזה כבר רשום אצל ספק אחר' },
          { status: 409 }
        )
      }
      update.phone = raw
      update.phone_key = phoneKey
    }

    if ('email' in body) {
      const email = text(body.email, 160)?.toLowerCase() ?? null
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
      }
      update.email = email
    }

    if ('contact_name' in body) update.contact_name = text(body.contact_name, 120)
    if ('address' in body) update.address = text(body.address, 200)
    if ('city' in body) update.city = text(body.city, 80)
    if ('pickup_address' in body) update.pickup_address = text(body.pickup_address, 200)
    if ('sells_note' in body) update.sells_note = text(body.sells_note, 600)
    if (body.logo_url === null) update.logo_url = null

    if ('min_order_value_excl_vat' in body) {
      const value = optionalNumber(body.min_order_value_excl_vat)
      if (value === 'invalid') {
        return NextResponse.json({ error: 'מינימום הזמנה לא תקין' }, { status: 400 })
      }
      update.min_order_value_excl_vat = value
    }

    if ('default_lead_time_days' in body) {
      const value = optionalNumber(body.default_lead_time_days, { integer: true })
      if (value === 'invalid') {
        return NextResponse.json({ error: 'זמן אספקה לא תקין' }, { status: 400 })
      }
      update.default_lead_time_days = value
    }

    if ('payment_terms' in body) {
      if (!Array.isArray(body.payment_terms)) {
        return NextResponse.json({ error: 'תנאי תשלום לא תקינים' }, { status: 400 })
      }
      const allowed = PAYMENT_TERMS as readonly string[]
      const terms = (body.payment_terms as unknown[]).filter(
        (term): term is string => typeof term === 'string' && allowed.includes(term)
      )
      update.payment_terms = [...new Set(terms)]
    }

    const { error } = await supabase.from('suppliers').update(update).eq('id', supplier.id)

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'הפרטים האלה כבר רשומים אצל ספק אחר' : error.message },
        { status: duplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Supplier profile update failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
