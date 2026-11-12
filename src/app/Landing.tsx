import Link from 'next/link'
import { ChevronLeft, Handshake, LayoutGrid, Recycle, RotateCcw, Search, Send, Store, Tag } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import { WORK_FREE_UNTIL } from '@/lib/work'

/**
 * The front door for someone who is not signed in: a search that works before
 * registering, the three things a carpentry does here (products and
 * suppliers, work between carpentries, the Metzion), how an order works, and
 * one way in: free registration. Suppliers
 * keep their own section at the end (product review, 2026-11-11).
 *
 * Static on purpose — no database read — so it is fast and cannot break. Every
 * claim here must be on CLAUDE.md §0's "safe to advertise as live" list; the
 * search assistant is keyword matching, so it is never called AI here.
 */

const FEATURES: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: <Search size={22} />, title: 'חיפוש בעברית', text: 'כותבים מה צריך, ומוצאים את המוצר עם מחיר הספק לפני מע״מ או בקשת הצעת מחיר ממנו.' },
  { icon: <Send size={22} />, title: 'הזמנת רכש ישירה לספק', text: 'ההזמנה נשלחת ישר לספק. הוא מאשר, מספק ומוציא לכם חשבונית.' },
  { icon: <Tag size={22} />, title: 'מחירי B2B', text: 'מחיר לפני מע״מ או הצעת מחיר מהספק, אחרי הרשמה חינם.' },
  { icon: <RotateCcw size={22} />, title: 'הזמנה חוזרת', text: 'מה שהזמנתם בפעם שעברה, שוב בלחיצה אחת.' },
]

const STEPS: [string, string][] = [
  ['מוצאים', 'בחיפוש או בקטגוריות'],
  ['מוסיפים להזמנה', 'המערכת מציעה ספק, ואפשר להחליף'],
  ['שולחים', 'הזמנת רכש אחת לכל ספק'],
  ['מקבלים', 'הספק מאשר, מספק ומוציא חשבונית'],
]

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/join"
      className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-brand px-6 text-base font-bold text-navy shadow-[0_6px_16px_rgba(242,154,18,.28)] hover:bg-brand-hover ${className}`}
    >
      הרשמה חינם
      <ChevronLeft size={18} strokeWidth={2.4} />
    </Link>
  )
}

/** The three ways a carpentry uses the site, each a card that opens its area. */
const PATHS: { href: string; icon: React.ReactNode; title: string; text: string; cta: string; tone: string; iconTone: string; ctaTone: string }[] = [
  {
    href: '/app/catalog',
    icon: <LayoutGrid size={24} />,
    title: 'מוצרים וספקים',
    text: 'מוצאים מוצר, רואים מחיר ספק לפני מע״מ ושולחים הזמנת רכש ישר לספק.',
    cta: 'לקטלוג',
    tone: 'border-hair bg-white hover:border-wood',
    iconTone: 'bg-navy-soft text-navy',
    ctaTone: 'text-brand-ink',
  },
  {
    href: '/app/work',
    icon: <Handshake size={24} />,
    title: 'נגרים עובדים ביחד',
    text: `צריך עזרה בפרויקט? יש לך זמן פנוי או מכונה שיכולה לעזור לנגרייה אחרת? כאן עובדים ביחד. ${WORK_FREE_UNTIL}.`,
    cta: 'ללוח העבודות',
    tone: 'border-[#BFDCD9] bg-[#EEF7F6] hover:border-[#0E5E5E]',
    iconTone: 'bg-[#0E5E5E] text-white',
    ctaTone: 'text-[#0B4F4F]',
  },
  {
    href: '/app/metzion',
    icon: <Recycle size={24} />,
    title: 'מציאון',
    text: 'עודפי חומרים, פרזול ומכונות מנגרים לנגרים. מוכרים, מוסרים או מוצאים מציאה.',
    cta: 'למציאון',
    tone: 'border-[#E6D6C2] bg-wood-soft hover:border-wood',
    iconTone: 'bg-white text-[#6B4E2E]',
    ctaTone: 'text-[#6B4E2E]',
  },
]

export default function Landing() {
  return (
    <div className="min-h-dvh bg-warm text-ink">
      <header className="sticky top-0 z-30 border-b border-hair/70 bg-warm/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1120px] items-center gap-3 px-4 md:h-20 md:px-7">
          <Link href="/" aria-label="נגרים B2B — דף הבית">
            <Logo size="md" tagline="always" />
          </Link>
          <span className="flex-1" />
          <nav className="hidden items-center gap-5 text-[15px] font-semibold text-muted md:flex" aria-label="ניווט">
            <Link href="/app/catalog" className="hover:text-ink">קטלוג</Link>
            <Link href="/app/suppliers" className="hover:text-ink">ספקים</Link>
            <Link href="/app/work" className="hover:text-ink">נגרים עובדים ביחד</Link>
            <Link href="/app/metzion" className="hover:text-ink">מציאון</Link>
            <a href="#suppliers" className="hover:text-ink">לספקים</a>
          </nav>
          <Link href="/join" className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white">
            כניסה
          </Link>
        </div>
      </header>

      <main>
        {/* Hero: who it is for, the one way in, then the three paths */}
        <section className="mx-auto max-w-[1120px] px-4 pb-12 pt-10 md:px-7 md:pb-16 md:pt-14">
          <div className="max-w-[640px]">
            <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-attn">לנגריות בישראל</span>
            <h1 className="m-0 mt-4 text-[36px] font-extrabold leading-[1.15] tracking-tight text-navy text-balance md:text-[52px]">
              הנגרייה שלך מחוברת
            </h1>
            <p className="m-0 mt-4 text-lg leading-relaxed text-muted">
              מוצרים וספקים, עבודות בין נגריות ומציאות מהשטח. הכול במקום אחד.
            </p>
            {/* Search first: anyone may look before registering (owner, 2026-11-12) */}
            <form action="/app/catalog" className="relative mt-7" role="search">
              <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                name="q"
                type="search"
                placeholder="מה אתה צריך? מוצר, מותג או ספק"
                aria-label="חיפוש מוצרים וספקים"
                className="h-[52px] w-full rounded-xl border-[1.5px] border-hair bg-white ps-11 pe-[92px] text-base placeholder:text-faint"
              />
              <button type="submit" className="absolute end-1.5 top-1/2 h-10 -translate-y-1/2 rounded-[10px] bg-navy px-4 text-[15px] font-bold text-white">
                חיפוש
              </button>
            </form>
            <div className="mt-4">
              <PrimaryCta className="w-full sm:w-auto" />
            </div>
            <p className="m-0 mt-3 text-sm text-faint">ההרשמה חינם ולוקחת פחות מדקה.</p>
          </div>

          <ul className="m-0 mt-10 grid list-none gap-3 p-0 md:grid-cols-3 md:gap-4">
            {PATHS.map((path) => (
              <li key={path.href}>
                <Link href={path.href} className={`flex h-full flex-col rounded-2xl border p-5 ${path.tone}`}>
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${path.iconTone}`}>{path.icon}</span>
                  <h2 className="m-0 mt-3 text-xl font-extrabold text-navy">{path.title}</h2>
                  <p className="m-0 mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{path.text}</p>
                  <span className={`mt-4 inline-flex items-center gap-1 text-[15px] font-bold ${path.ctaTone}`}>
                    {path.cta} <ChevronLeft size={17} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* What you get */}
        <section className="border-y border-hair bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
            <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">בהזמנת חומרים</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3.5 rounded-2xl border border-hair bg-warm p-4 sm:block sm:p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-navy">{f.icon}</span>
                  <div>
                    <h3 className="m-0 text-[17px] font-bold sm:mt-3">{f.title}</h3>
                    <p className="m-0 mt-1 text-[15px] leading-relaxed text-muted">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-14 md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">איך הזמנה עובדת</h2>
          <ol className="m-0 mt-6 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-hair bg-white p-4 md:p-5">
                <span className="tnum grid h-8 w-8 place-items-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
                <b className="mt-3 block text-[17px]">{title}</b>
                <span className="text-[15px] text-muted">{text}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-5 text-[15px] text-muted">
            הספק הוא המוכר: הוא קובע את תנאי התשלום ומוציא את החשבונית. האתר לא גובה תשלום על סחורה.
          </p>
        </section>

        {/* Suppliers */}
        <section id="suppliers" className="scroll-mt-20 bg-navy text-white">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-7">
            <div className="max-w-[600px]">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-brand">
                <Store size={18} /> לספקים
              </span>
              <h2 className="m-0 mt-2 text-2xl font-extrabold md:text-[30px]">הזמנות רכש מסודרות מנגריות</h2>
              <p className="m-0 mt-2 text-[16px] leading-relaxed text-slate-300">
                מעלים מחירון, מקבלים הזמנות במייל עם קישור לאישור, וממשיכים לספק ולהוציא חשבונית כמו היום.
              </p>
            </div>
            <Link
              href="/suppliers-join?ref=home"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-6 font-bold text-navy hover:bg-slate-100"
            >
              מה ספק מקבל
              <ChevronLeft size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </section>

        {/* Closing call */}
        <section className="mx-auto max-w-[1120px] px-4 py-16 text-center md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">מצטרפים?</h2>
          <p className="m-0 mt-2 text-[16px] text-muted">הרשמה חינם, בלי התחייבות.</p>
          <div className="mt-6 flex justify-center">
            <PrimaryCta />
          </div>
        </section>
      </main>

      <footer className="border-t border-hair">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-6 text-[13px] text-faint md:px-7">
          <span>© נגרים B2B · שוק הנגרים</span>
          <Link href="/terms" className="hover:text-ink">תקנון ותנאי שימוש</Link>
          <Link href="/terms#privacy" className="hover:text-ink">מדיניות פרטיות</Link>
          <Link href="/supplier/join" className="hover:text-ink">ספקים</Link>
          <Link href="/join" className="hover:text-ink">כניסה</Link>
        </div>
      </footer>
    </div>
  )
}
