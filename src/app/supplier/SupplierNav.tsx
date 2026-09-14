'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Store } from 'lucide-react'

/**
 * The supplier's header. Deliberately thin: this console has one screen, and a
 * nav with one item in it is furniture.
 *
 * The sign-out exists from the first day because the alternative is what we
 * shipped for the carpenters — a thirty-day session and no way to end it.
 */
export default function SupplierNav({ company }: { company: string }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const signOut = async () => {
    setLeaving(true)
    try {
      await fetch('/api/supplier/session', { method: 'DELETE' })
    } catch {
      // Offline. The cookie expires by itself.
    }
    router.replace('/supplier/join')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link href="/supplier" className="flex min-w-0 items-center gap-2">
          <Store size={17} className="shrink-0 text-stone-400" />
          <span className="truncate font-bold text-stone-900">{company}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
          ספק
        </span>

        <button
          type="button"
          onClick={signOut}
          disabled={leaving}
          className="ms-auto flex shrink-0 items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-50"
        >
          <LogOut size={15} />
          {leaving ? 'יוצא…' : 'יציאה'}
        </button>
      </div>
    </nav>
  )
}
