'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, ClipboardList, ShoppingCart, CircleUser, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { forgetCarpenter } from '@/lib/carpenter-session'
import { formatIls } from '@/lib/vat'

const LINKS = [
  { href: '/carpenter/catalog', label: 'קטלוג', Icon: LayoutGrid },
  { href: '/carpenter/orders', label: 'הזמנות', Icon: ClipboardList },
]

export interface CarpenterSession {
  name: string
  token: string
}

/**
 * The identity here comes from the layout, which read the signed cookie on the
 * server. It used to come from localStorage, which was the browser's own
 * opinion — and the browser's opinion is not what decides whether a price is
 * shown, so the two could disagree and the header would say the wrong thing.
 */
export default function CarpenterNav({ session }: { session: CarpenterSession | null }) {
  const cart = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  /**
   * Both halves, or it is not a sign-out.
   *
   * The cookie is what the server checks; the token in localStorage is what
   * the checkout attaches to an order. Clearing one and not the other leaves
   * someone half signed in — no prices, but still placing orders under the
   * previous carpenter's name.
   */
  const signOut = async () => {
    setLeaving(true)
    try {
      await fetch('/api/carpenter/session', { method: 'DELETE' })
    } catch {
      // Offline. The local half still goes, and the cookie expires on its own.
    }
    forgetCarpenter()
    cart.clearCart()
    router.replace('/carpenter/catalog')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        {/* The spacer lives on this group, not on the join link — that link is
            narrower on a phone, and hanging the spacing off it collapsed the
            whole bar at mobile width. */}
        <div className="me-auto flex min-w-0 items-baseline gap-3">
          <Link href="/carpenter/catalog" className="font-bold text-stone-900">
            שוק הנגרים
          </Link>
          {/* Someone browsing the public catalogue has no link of their own
              yet. This is the only way for them to get one. */}
          {session ? (
            <>
              <Link
                href="/carpenter/account"
                className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-800"
              >
                <CircleUser size={16} className="shrink-0" />
                <span className="hidden truncate sm:inline">{session.name}</span>
                <span className="sm:hidden">האזור שלי</span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={leaving}
                title="יציאה מהחשבון"
                aria-label="יציאה מהחשבון"
                className="flex shrink-0 items-center gap-1 text-xs text-stone-400 hover:text-stone-700 disabled:opacity-50"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{leaving ? 'יוצא…' : 'יציאה'}</span>
              </button>
            </>
          ) : (
            <Link
              href="/join"
              className="whitespace-nowrap text-sm font-medium text-emerald-800 underline underline-offset-4"
            >
              <span className="sm:hidden">קישור אישי</span>
              <span className="hidden sm:inline">קבל קישור אישי</span>
            </Link>
          )}
        </div>

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
