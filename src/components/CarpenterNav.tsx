'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, ClipboardList, ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIls } from '@/lib/vat'

const LINKS = [
  { href: '/carpenter/catalog', label: 'קטלוג', Icon: LayoutGrid },
  { href: '/carpenter/orders', label: 'הזמנות', Icon: ClipboardList },
]

export default function CarpenterNav() {
  const cart = useCart()
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link href="/carpenter/catalog" className="me-auto font-bold text-stone-900">
          שוק הנגרים
        </Link>

        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
                active ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Icon size={17} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}

        {/* The cart shows its running total, not just a count: the number a
            carpenter is deciding on is the money, and it is excl VAT. */}
        <Link
          href="/carpenter/cart"
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <ShoppingCart size={17} />
          {cart.totalItems > 0 ? (
            <span className="tnum">{formatIls(cart.subtotalExclVat)}</span>
          ) : (
            <span className="hidden sm:inline">עגלה</span>
          )}
        </Link>
      </div>
    </nav>
  )
}
