'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Store } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

/**
 * The supplier's header: who you are, and the way out.
 *
 * Navigation between screens lives in the app's own tabs, so this stays thin.
 * The sign-out exists from the first day because the alternative is what we
 * once shipped for the carpenters — a long session and no way to end it.
 */
export default function SupplierNav({ company, logo }: { company: string; logo: string | null }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const signOut = async () => {
    if (!confirm('לצאת מהחשבון במכשיר הזה?')) return
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
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link href="/supplier" aria-label="שוק הנגרים — ממשק הספק" className="shrink-0">
          <LogoMark size={30} />
        </Link>
        <span className="h-6 w-px shrink-0 bg-stone-200" aria-hidden />
        <Link href="/supplier" className="flex min-w-0 items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg border border-stone-200 bg-white object-contain p-0.5"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Store size={17} />
            </span>
          )}
          <span className="truncate font-bold text-stone-900">{company}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          ספק
        </span>

        <button
          type="button"
          onClick={signOut}
          disabled={leaving}
          className="ms-auto flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">{leaving ? 'יוצא…' : 'יציאה'}</span>
        </button>
      </div>
    </nav>
  )
}
