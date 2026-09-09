'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  /** Shown as a badge. Omitted or zero renders nothing. */
  count?: number
}

/**
 * Every item looked identical, so the console never told you which screen you
 * were on. The pending-order count sits here too: it is the number the console
 * gets opened for, and it was previously only visible after clicking through.
 */
export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {items.map((item) => {
        // '/admin' is a prefix of every other route, so it only matches exactly.
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              active
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {item.label}
            {item.count ? (
              <span
                className={`tnum rounded-full px-1.5 text-xs font-bold ${
                  active ? 'bg-white text-stone-900' : 'bg-emerald-700 text-white'
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
