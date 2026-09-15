import Link from 'next/link'
import { LogoMark } from '@/components/brand/Logo'

/** The links every public page owes its visitors, kept out of the way. */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 px-4 py-5 pb-24 sm:pb-5">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <LogoMark size={18} />© שוק הנגרים
        </span>
        <Link href="/terms" className="hover:text-stone-800 hover:underline">
          תקנון ותנאי שימוש
        </Link>
        <Link href="/terms#privacy" className="hover:text-stone-800 hover:underline">
          מדיניות פרטיות
        </Link>
        <Link href="/supplier/join" className="hover:text-stone-800 hover:underline">
          ספקים
        </Link>
      </div>
    </footer>
  )
}
