import Link from 'next/link'
import { Building2, ChevronLeft, MapPin } from 'lucide-react'
import SupplierLogo from './SupplierLogo'
import type { PublicSupplier } from '@/lib/app/suppliers-public'

/**
 * One supplier in the supplier list and above search results: logo, name,
 * city and what it sells, linking to its page. Public fields only.
 */
export default function SupplierCard({ supplier }: { supplier: PublicSupplier }) {
  return (
    <Link href={`/app/suppliers/${supplier.id}`} className="flex items-start gap-3 rounded-2xl border border-hair bg-white p-3.5 hover:border-wood">
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
  )
}
