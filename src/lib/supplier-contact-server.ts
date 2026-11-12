import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { contactOf, type ContactRow, type SupplierContact } from './supplier-contact'

/**
 * The contact numbers of the given suppliers, keyed by id; a supplier with no
 * usable number is left out. Read only for a viewer who may contact (the page
 * decides), so a visitor's page never carries a number.
 *
 * A database without migration 20261112130000 has no confirmed numbers yet:
 * the read falls back to the business phone alone.
 */
export async function loadSupplierContacts(supplierIds: string[]): Promise<Map<string, SupplierContact>> {
  const ids = [...new Set(supplierIds)]
  const contacts = new Map<string, SupplierContact>()
  if (ids.length === 0) return contacts

  const supabase = getSupabaseAdmin()
  const full = await supabase
    .from('suppliers')
    .select('id, phone, contact_phone, whatsapp_phone, contact_confirmed_at')
    .in('id', ids)
    .eq('status', 'approved')
  let rows: (ContactRow & { id: string })[] | null = full.data
  if (full.error) {
    const fallback = await supabase.from('suppliers').select('id, phone').in('id', ids).eq('status', 'approved')
    rows = fallback.data
  }
  for (const row of rows ?? []) {
    const contact = contactOf(row)
    if (contact) contacts.set(row.id, contact)
  }
  return contacts
}

/** What the supplier console shows and edits; ready is false before the migration. */
export interface ContactSettings {
  ready: boolean
  confirmedAt: string | null
  phone: string | null
  whatsapp: string | null
}

export async function loadContactSettings(supplierId: string, businessPhone: string | null): Promise<ContactSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from('suppliers')
    .select('contact_phone, whatsapp_phone, contact_confirmed_at')
    .eq('id', supplierId)
    .maybeSingle()
  if (error || !data) {
    const shown = contactOf({ phone: businessPhone })
    return { ready: false, confirmedAt: null, phone: shown?.phone ?? null, whatsapp: shown?.whatsapp ?? null }
  }
  const shown = contactOf({ phone: businessPhone, ...data })
  return { ready: true, confirmedAt: data.contact_confirmed_at, phone: shown?.phone ?? null, whatsapp: shown?.whatsapp ?? null }
}
