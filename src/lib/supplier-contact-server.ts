import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { contactOf, type ContactRow, type SupplierContact } from './supplier-contact'

/**
 * The contact numbers of the given suppliers, keyed by id; a supplier with no
 * usable number is left out. Read only for a viewer who may contact (the page
 * decides), so a visitor's page never carries a number.
 *
 * A database without migration 20261112130000 has no numbers yet: nobody is
 * shown, and the pages keep the in-site question.
 */
export async function loadSupplierContacts(supplierIds: string[]): Promise<Map<string, SupplierContact>> {
  const ids = [...new Set(supplierIds)]
  const contacts = new Map<string, SupplierContact>()
  if (ids.length === 0) return contacts

  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select('id, contact_phone, whatsapp_phone, contact_confirmed_at')
    .in('id', ids)
    .eq('status', 'approved')
  for (const row of (data ?? []) as (ContactRow & { id: string })[]) {
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

export async function loadContactSettings(supplierId: string): Promise<ContactSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from('suppliers')
    .select('contact_phone, whatsapp_phone, contact_confirmed_at')
    .eq('id', supplierId)
    .maybeSingle()
  if (error || !data) return { ready: false, confirmedAt: null, phone: null, whatsapp: null }
  const shown = contactOf(data)
  return { ready: true, confirmedAt: data.contact_confirmed_at, phone: shown?.phone ?? null, whatsapp: shown?.whatsapp ?? null }
}
