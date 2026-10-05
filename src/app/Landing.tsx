import Link from 'next/link'
import { Check, ChevronLeft, Recycle, RotateCcw, Search, Send, Store, Tag } from 'lucide-react'
import Logo from '@/components/brand/Logo'

/**
 * The front door for someone who is not signed in: what the site is, how an
 * order works, and the two ways in (register, or look at the catalogue).
 *
 * Static on purpose — no database read — so it is fast and cannot break. Every
 * claim here must be on CLAUDE.md §0's "safe to advertise as live" list; the
 * search assistant is keyword matching, so it is never called AI here.
 */

const FEATURES: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: <Search size={22} />, title: 'חיפוש בעברית', text: 'כותבים מה צריך, ומקבלים את המוצר עם מחיר הספק לפני מע״מ.' },
  { icon: <Send size={22} />, title: 'הזמנת רכש ישירה לספק', text: 'ההזמנה נשלחת ישר לספק. הוא מאשר, מספק ומוציא לכם חשבונית.' },
  { icon: <Tag size={22} />, title: 'מחירי B2B', text: 'מחירים לפני מע״מ, גלויים אחרי הרשמה חינם.' },
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

function SecondaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/app/catalog"
      className={`inline-flex h-12 items-center justify-center rounded-xl border-[1.5px] border-hair bg-white px-6 text-base font-bold text-navy hover:border-wood ${className}`}
    >
      לצפייה בקטלוג
    </Link>
  )
}

/** An illustration of one order's path, drawn in the app's own style. No real data. */
function OrderPreview() {
  const steps = ['נשלחה לספק', 'הספק אישר', 'סופקה']
  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-hidden>
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-wood-soft" />
      <div className="rounded-2xl border border-hair bg-white p-5 shadow-[0_12px_32px_rgba(30,42,59,.10)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-navy-soft px-2.5 py-0.5 text-[13px] font-bold text-navy">הזמנת רכש</span>
          <span className="text-[13px] text-muted">לפני מע״מ</span>
        </div>
        <div className="mt-3 grid gap-2">
          {['דבק PU לעץ', 'לכה פוליאוריתן', 'מדלל לניקוי'].map((name) => (
            <div key={name} className="flex items-center gap-2.5 rounded-xl bg-warm px-3 py-2.5 text-[15px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-wood" />
              {name}
            </div>
          ))}
        </div>
        <ol className="m-0 mt-4 grid list-none gap-2 p-0">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-2.5 text-[14.5px]">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${i < 2 ? 'bg-ok text-white' : 'border-2 border-hair bg-white'}`}>
                {i < 2 && <Check size={14} strokeWidth={3} />}
              </span>
              <span className={i < 2 ? 'font-semibold text-ink' : 'text-faint'}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-warm text-ink">
      <header className="sticky top-0 z-30 border-b border-hair/70 bg-warm/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 md:px-7">
          <Link href="/" aria-label="נגרים B2B — דף הבית">
            <Logo size="sm" compact />
          </Link>
          <span className="flex-1" />
          <nav className="hidden items-center gap-5 text-[15px] font-semibold text-muted md:flex" aria-label="ניווט">
            <a href="#how" className="hover:text-ink">איך זה עובד</a>
            <Link href="/app/catalog" className="hover:text-ink">קטלוג</Link>
            <a href="#suppliers" className="hover:text-ink">לספקים</a>
          </nav>
          <Link href="/join" className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white">
            כניסה
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:px-7 md:pb-20 md:pt-16">
          <div>
            <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-attn">לנגריות בישראל</span>
            <h1 className="m-0 mt-4 text-[34px] font-extrabold leading-[1.15] tracking-tight text-navy text-balance md:text-[48px]">
              מזמינים חומרים לנגרייה, ישירות מהספק
            </h1>
            <p className="m-0 mt-4 max-w-[520px] text-lg leading-relaxed text-muted">
              מוצאים את המוצר, שולחים הזמנת רכש, והספק מאשר, מספק ומוציא לכם חשבונית. בלי טלפונים ובלי הודעות שהולכות לאיבוד.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta />
              <SecondaryCta />
            </div>
            <p className="m-0 mt-3 text-sm text-faint">ההרשמה לוקחת פחות מדקה. מחירים מוצגים אחרי ההרשמה.</p>
          </div>
          <OrderPreview />
        </section>

        {/* What you get */}
        <section className="border-y border-hair bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
            <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">מה מקבלים</h2>
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
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">איך זה עובד</h2>
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

        {/* Catalogue today + Metzion */}
        <section className="mx-auto grid max-w-[1120px] gap-4 px-4 pb-14 md:grid-cols-2 md:px-7">
          <Link href="/app/catalog" className="group rounded-2xl border border-hair bg-white p-6 hover:border-wood">
            <h3 className="m-0 text-xl font-bold text-navy">הקטלוג</h3>
            <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-muted">
              היום בעיקר דבקים וחומרי גימור, ועוד קטגוריות נפתחות עם כל ספק שמצטרף.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-brand-ink">
              לצפייה בקטלוג <ChevronLeft size={17} />
            </span>
          </Link>
          <Link href="/app/metzion" className="group rounded-2xl border border-[#E6D6C2] bg-wood-soft p-6">
            <span className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-[#6B4E2E]">
                <Recycle size={22} />
              </span>
              <h3 className="m-0 text-xl font-bold">המציאון</h3>
            </span>
            <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#6B4E2E]">
              עודפי חומרים ומכונות מנגרים לנגרים. העסקה נעשית ישירות ביניכם.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-[#6B4E2E]">
              למציאון <ChevronLeft size={17} />
            </span>
          </Link>
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
              href="/supplier/join"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-6 font-bold text-navy hover:bg-slate-100"
            >
              הצטרפות כספק
              <ChevronLeft size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </section>

        {/* Closing call */}
        <section className="mx-auto max-w-[1120px] px-4 py-16 text-center md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">מוכנים להזמנה הראשונה?</h2>
          <p className="m-0 mt-2 text-[16px] text-muted">הרשמה חינם, בלי התחייבות.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryCta />
            <SecondaryCta />
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
