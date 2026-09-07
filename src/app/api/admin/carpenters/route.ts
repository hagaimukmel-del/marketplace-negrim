import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Bulk import of the WhatsApp list.
 *
 * Accepts pasted text: one carpenter per line, comma or tab separated, as
 * `business name, contact, phone, city`. Only the business name is required —
 * a list exported from a phone rarely has more than a name and a number.
 *
 * Phone is the identity for de-duplication, normalised to digits so that
 * 050-123-4567, 0501234567 and +972501234567 are recognised as one business.
 * Re-importing an updated list therefore refreshes rows instead of creating a
 * second link for someone who already has one.
 */

/** Last 9 digits, so local and +972 forms collapse to the same key. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 9) return null
  return digits.slice(-9)
}

interface ParsedRow {
  business_name: string
  contact_name: string | null
  phone: string | null
  city: string | null
}

function parseList(text: string): { rows: ParsedRow[]; skipped: number } {
  const records: string[][] = parse(text, {
    delimiter: [',', '\t', ';'],
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  })

  const rows: ParsedRow[] = []
  let skipped = 0

  for (const record of records) {
    const [name, contact, phone, city] = record.map((value) => (value ?? '').trim())
    if (!name) {
      skipped += 1
      continue
    }
    // Tolerate a header line without making the operator delete it first.
    if (/^(שם|business|name|נגריה|נגרייה)$/i.test(name)) {
      skipped += 1
      continue
    }
    rows.push({
      business_name: name,
      contact_name: contact || null,
      phone: phone ? normalisePhone(phone) : null,
      city: city || null,
    })
  }

  return { rows, skipped }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { text } = await request.json()
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'לא הודבקה רשימה' }, { status: 400 })
    }

    const { rows: parsed, skipped } = parseList(text)
    if (parsed.length === 0) {
      return NextResponse.json({ error: 'לא נמצאו שורות תקינות' }, { status: 400 })
    }

    // Collapse repeats inside the paste itself before touching the database.
    // A contact list exported from a phone always contains the same number
    // more than once, and without this each copy became its own carpenter with
    // its own link — so one business would get two different links, and a
    // later re-import would only ever refresh one of them.
    const seen = new Map<string, ParsedRow>()
    const withoutPhone: ParsedRow[] = []
    for (const row of parsed) {
      if (row.phone) seen.set(row.phone, row)
      else withoutPhone.push(row)
    }
    const rows = [...seen.values(), ...withoutPhone]
    const duplicates = parsed.length - rows.length

    const supabase = getSupabaseAdmin()

    // Match on phone so a re-import updates rather than duplicates. Rows with
    // no phone can only be inserted; there is nothing to match them on.
    const phones = rows.map((row) => row.phone).filter((p): p is string => Boolean(p))
    const { data: existing } = phones.length
      ? await supabase.from('carpenters').select('id, phone').in('phone', phones)
      : { data: [] }

    const idByPhone = new Map((existing ?? []).map((row) => [row.phone, row.id]))

    const toInsert = rows.filter((row) => !row.phone || !idByPhone.has(row.phone))
    const toUpdate = rows.filter((row) => row.phone && idByPhone.has(row.phone))

    let inserted = 0
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('carpenters').insert(toInsert).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted = data?.length ?? 0
    }

    for (const row of toUpdate) {
      await supabase
        .from('carpenters')
        .update({
          business_name: row.business_name,
          contact_name: row.contact_name,
          city: row.city,
        })
        .eq('id', idByPhone.get(row.phone!)!)
    }

    return NextResponse.json({
      ok: true,
      inserted,
      updated: toUpdate.length,
      skipped,
      duplicates,
    })
  } catch (err) {
    console.error('Carpenter import failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
