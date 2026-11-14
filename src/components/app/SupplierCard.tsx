import Link from 'next/link'
import { Building2, ChevronLeft, MapPin, MessageCircle } from 'lucide-react'
import SupplierLogo from './SupplierLogo'
import ContactLink from './ContactLink'
import { contactMessage } from '@/lib/supplier-contact'
import type { PublicSupplier } from '@/lib/app/suppliers-public'

/**
 * One supplier in the supplier list and above search results: logo, name,
 * city and what it sells, linking to its page. Public fields only.
 *
 * `whatsapp` is the mobile the supplier chose in its console, passed only for
 * a registered carpentry (the page decides, as on the supplier page): the card
 * then carries a WhatsApp button to the supplier (owner, 2026-11-14). The
 * button sits beside the link, not inside it, so the two never nest.
 */
export default function SupplierCard({ supplier, whatsapp }: { supplier: PublicSupplier; whatsapp?: string | null }) {
  return (
    <div className="grid gap-2.5 rounded-2xl border border-hair bg-white p-3.5 hover:border-wood">
      <Link href={`/app/suppliers/${supplier.id}`} className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-hair bg-white text-muted">
          {supplier.logoUrl ? <SupplierLogo url={supplier.logoUrl} size={44} /> : <Building2 size={22} />}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <b className="text-[16px] leading-snug text-ink">{supplier.name}</b>
          {supplier.city && (
            <span className="inline-flex items-center gap-1 text-[13px] text-muted">
              <MapPin size={13} /> {supplier.city}
            </span>
          )}
          {supplier.about && <span className="line-clamp-2 text-[14px] leading-relaxed text-muted">{supplier.about}</span>}
        </span>
        <ChevronLeft size={18} className="mt-1 shrink-0 text-faint" />
      </Link>
      {whatsapp && (
        <ContactLink
          channel="whatsapp"
          phone={whatsapp}
          text={contactMessage(null)}
          track={{ supplierId: supplier.id, source: 'supplier' }}
          ariaLabel={`וואטסאפ ל${supplier.name}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[11px] bg-ok px-4 text-[15px] font-bold text-white hover:brightness-95 sm:w-fit"
        >
          <MessageCircle size={18} aria-hidden /> וואטסאפ לספק
        </ContactLink>
      )}
    </div>
  )
}
