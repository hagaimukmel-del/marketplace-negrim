import Link from 'next/link'
import { Lock } from 'lucide-react'

/**
 * What a visitor who has not registered gets in place of a product page or
 * search results. Nothing about the products or suppliers is read for it.
 */
export default function CatalogLocked() {
  return (
    <div className="rounded-2xl border border-hair bg-white p-6 text-center md:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-wood-soft text-navy">
        <Lock size={26} />
      </span>
      <h2 className="mt-4 text-xl font-extrabold text-ink">המחירים, הספקים וההזמנה פתוחים לנגריות רשומות</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
        ההרשמה חינם ולוקחת דקה. אחריה רואים כל מוצר, את הספקים שמוכרים אותו ואת המחירים לפני מע״מ.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/join" className="inline-flex h-12 items-center rounded-[11px] bg-brand px-6 font-bold text-navy">
          הרשמה חינם / כניסה
        </Link>
        <Link href="/app/catalog" className="inline-flex h-12 items-center rounded-[11px] border-[1.5px] border-hair bg-white px-5 font-bold">
          לרשימת הקטגוריות
        </Link>
      </div>
      <p className="mt-4 text-[13.5px] text-muted">
        ספק?{' '}
        <Link href="/supplier/join" className="font-semibold text-brand-ink">
          כניסה לספקים
        </Link>
      </p>
    </div>
  )
}
