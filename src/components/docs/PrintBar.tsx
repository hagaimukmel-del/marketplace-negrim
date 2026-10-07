'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'

/** Print / save as PDF, and the way back. Hidden on paper. */
export default function PrintBar({ back, backLabel, count }: { back: string; backLabel: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-2.5 print:hidden">
      <Link href={back} className="text-sm font-semibold text-stone-700">
        → {backLabel}
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-stone-900 px-4 text-sm font-bold text-white"
      >
        <Printer size={16} /> {count > 1 ? `הדפסה / PDF (${count} מסמכים)` : 'הדפסה / PDF'}
      </button>
    </div>
  )
}
