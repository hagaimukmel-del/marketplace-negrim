'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoMark } from '@/components/brand/Logo'

const SEEN_KEY = 'nagarim:welcome-seen'
const FEEDBACK_EMAIL = 'nagarim.b2b@gmail.com'

/**
 * Areas the welcome is not for: the operator's console, the supplier's
 * console (the "free for everyone" line is written to carpenters), and the
 * printable purchase-order and quote documents.
 */
const SKIP_PREFIXES = ['/admin', '/supplier', '/doc']

function seenThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage blocked: the popup may show again on the next page, never worse.
  }
}

/**
 * The launch-period welcome, shown once per visit to new and returning
 * visitors alike. "Once per visit" is sessionStorage: it survives moving
 * between pages and is gone when the tab closes, so the next visit sees it
 * again. It sits under the terms gate (z-60), so someone who still has to
 * accept the terms does that first and meets the welcome after.
 */
export default function WelcomePopup({ workOpen = false }: { workOpen?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  const skipped = SKIP_PREFIXES.some((prefix) => pathname?.startsWith(prefix))

  useEffect(() => {
    if (skipped || seenThisVisit()) return
    // Read after mount: sessionStorage does not exist on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true)
  }, [skipped])

  useEffect(() => {
    if (!open) return
    button.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        markSeen()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    markSeen()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      className="fixed inset-0 z-[55] flex items-end justify-center bg-stone-900/60 sm:items-center sm:p-4 print:hidden"
    >
      <div className="w-full rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center sm:max-w-md sm:rounded-2xl">
        <div className="flex flex-col items-center gap-2">
          <LogoMark size={48} />
          <span className="text-xs font-bold tracking-[0.2em] text-muted" dir="ltr">
            NAGARIM B2B
          </span>
        </div>

        <h2 id="welcome-title" className="mt-4 text-2xl font-extrabold text-ink">
          ברוכים הבאים לנגרים! 🪵
        </h2>
        <p className="mt-1 text-lg font-bold text-brand-ink">בונים כאן משהו גדול. ביחד.</p>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-stone-700">
          <p>אנחנו בתקופת הרצה, וזה בדיוק הזמן שלכם להיכנס, להכיר ולהשפיע.</p>
          <div className="rounded-lg bg-brand-soft px-3 py-2 text-attn">
            <p className="font-bold">האתר חינם לכולם! מוזמנים להירשם.</p>
            <p className="mt-1 text-sm">
              גם{' '}
              <Link href="/app/work" onClick={close} className="font-bold underline">
                נגרים עובדים ביחד
              </Link>
              , המקום לשיתופי פעולה בין נגריות, פתוח לכולם ללא תשלום עד ינואר 2027
              {workOpen ? '.' : '. הלוח נפתח בקרוב, ואפשר כבר להצטרף.'}
            </p>
          </div>
          <p>יש לכם רעיון לשיפור? משהו חסר או לא עובד כמו שצריך? אנחנו כאן ומקשיבים.</p>
          <p>
            <a href={`mailto:${FEEDBACK_EMAIL}`} dir="ltr" className="font-semibold text-navy underline">
              {FEEDBACK_EMAIL}
            </a>
          </p>
          <p>יאללה, בואו נבנה קהילה חזקה, מקצועית ומשתלמת לכולנו!</p>
        </div>

        <button
          ref={button}
          type="button"
          onClick={close}
          className="mt-5 h-12 w-full rounded-lg bg-brand text-lg font-extrabold text-ink hover:bg-brand-hover"
        >
          יאללה, מתחילים!
        </button>
      </div>
    </div>
  )
}
