import type { SessionCarpenter } from '@/lib/carpenter-auth'
import type { DocParty } from '@/components/docs/PurchaseDocument'

/** Stored as the last nine digits; people read it with the leading 0. */
export function displayPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  return /^\d{9}$/.test(phone) ? `0${phone}` : phone
}

/** The carpentry as it appears on its own quotes and purchase orders. */
export function buyerOf(carpenter: SessionCarpenter, address: string | null): DocParty {
  return {
    name: carpenter.business_name,
    lines: [carpenter.contact_name ?? '', displayPhone(carpenter.phone) ?? '', address ?? carpenter.city ?? ''],
  }
}
