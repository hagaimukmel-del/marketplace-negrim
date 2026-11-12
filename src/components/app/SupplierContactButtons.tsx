'use client'

import Link from 'next/link'
import { MessageCircle, Phone } from 'lucide-react'
import ContactLink from './ContactLink'
import { contactMessage, type ContactSource, type SupplierContact } from '@/lib/supplier-contact'

const WHATSAPP = 'inline-flex h-12 items-center justify-center gap-2 rounded-[11px] bg-ok px-4 text-[15.5px] font-bold text-white hover:brightness-95'
const CALL = 'inline-flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white px-4 text-[15.5px] font-bold text-navy'

/**
 * WhatsApp and call to the supplier, the main action on the product and
 * supplier pages (owner, 2026-11-12). Only a registered carpentry gets the
 * numbers (`contact`); a visitor sees the same button, which leads to a short
 * registration and back to this page (`joinHref`). Nothing renders when the
 * supplier has no number to reach.
 *
 * WhatsApp opens the carpentry's own app with a prepared message; the site
 * sends nothing. Each press is counted for the supplier.
 */
export default function SupplierContactButtons({
  supplierId,
  contact,
  joinHref,
  source,
  product,
  justJoined = false,
}: {
  supplierId: string
  /** The numbers, for a registered carpentry; null for a visitor or a supplier with none. */
  contact: SupplierContact | null
  /** For a visitor, when this supplier has a number: the registration that returns here. */
  joinHref: string | null
  source: ContactSource
  product?: { id: string; name: string }
  /** Back from registration through the button: say that it now works. */
  justJoined?: boolean
}) {
  if (contact) {
    const track = { supplierId, source, productId: product?.id }
    const text = contactMessage(product ? { productId: product.id, productName: product.name } : null)
    return (
      <div className="grid gap-1.5">
        {justJoined && <p className="m-0 text-[14px] font-semibold text-ok-ink">נרשמת. עכשיו אפשר לפנות לספק ישירות:</p>}
        <div className={`grid max-w-md gap-2 ${contact.whatsapp && contact.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {contact.whatsapp && (
            <ContactLink channel="whatsapp" phone={contact.whatsapp} text={text} track={track} className={WHATSAPP}>
              <MessageCircle size={19} aria-hidden /> וואטסאפ לספק
            </ContactLink>
          )}
          {contact.phone && (
            <ContactLink channel="phone" phone={contact.phone} track={track} ariaLabel={`חיוג לספק, ${contact.phone}`} className={contact.whatsapp ? CALL : WHATSAPP}>
              <Phone size={18} aria-hidden /> חיוג
              <span className="tnum hidden whitespace-nowrap font-semibold lg:inline" dir="ltr">{contact.phone}</span>
            </ContactLink>
          )}
        </div>
      </div>
    )
  }
  if (!joinHref) return null
  return (
    <div className="grid gap-1.5">
      <div className="grid max-w-md grid-cols-2 gap-2">
        <Link href={joinHref} className={WHATSAPP}>
          <MessageCircle size={19} aria-hidden /> וואטסאפ לספק
        </Link>
        <Link href={joinHref} className={CALL}>
          <Phone size={18} aria-hidden /> חיוג לספק
        </Link>
      </div>
      <p className="m-0 text-[13.5px] text-muted">פנייה ישירה לספק פתוחה לנגריות רשומות. ההרשמה חינם ולוקחת דקה.</p>
    </div>
  )
}
