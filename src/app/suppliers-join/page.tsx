import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import {
  Building2,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  Store,
  Tag,
  Truck,
} from 'lucide-react'
import Logo from '@/components/brand/Logo'
import SupplierCard from '@/components/app/SupplierCard'
import { loadProducts } from '@/lib/app/catalog-server'
import { loadPublicSuppliers, type PublicSupplier } from '@/lib/app/suppliers-public'
import { landingRef } from '@/lib/landing-ref'
import { whatsappUrl } from '@/lib/phone'
import {
  BILLING_STARTS_LABEL,
  SUPPLIER_AGREEMENT_MONTHS,
  SUPPLIER_ANNUAL_EXCL_VAT,
  SUPPLIER_MONTHLY_EXCL_VAT,
} from '@/lib/supplier-plans'

export const dynamic = 'force-dynamic'

const TITLE = 'ספקים לנגריות: עמוד ספק והזמנות רכש מנגריות — נגרים B2B'
const DESCRIPTION =
  'יש לכם כבר אתר. כאן נגר שמחפש מוצר מגיע אליכם: עמוד ספק עם לוגו, מחיר B2B לנגריות רשומות, הזמנות רכש כתובות ווואטסאפ ישיר. בלי עמלה על הזמנות.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/suppliers-join' },
  openGraph: { title: 'ספקים לנגריות? בואו להיות איפה שנגרים מחפשים', description: DESCRIPTION, url: '/suppliers-join' },
}

/**
 * The supplier landing page (owner, 2026-11-12): a public page to send a
 * supplier in a personal message or post in a group, to bring a second
 * supplier onto the site (T-002).
 *
 * Every claim here is something the site does today (CLAUDE.md §0): the public
 * supplier page (PR 78), WhatsApp and calls from registered carpentries when
 * the supplier gave a number (PR 79-80), purchase orders by email with a
 * confirm link, price or quote request per supplier, price list import. Page
 * views counted for the supplier are not shown to it yet, so the page does not
 * promise them; nor does it promise a number of carpentries or orders. The
 * price comes from `lib/supplier-plans.ts` only.
 *
 * Measurement without a migration: Vercel Web Analytics counts visits (once it
 * is switched on in the Vercel project), and the link's `ref` / `utm_*`
 * travels to the sign-up form, the operator's email and the WhatsApp text.
 */

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const PAINS: { yours: string; here: string }[] = [
  {
    yours: 'מגיע אליו מי שכבר מכיר את השם שלכם.',
    here: 'נגר מחפש מוצר, ״דבק PUR״ או ״מסילה״, ומגיע לספק שמוכר אותו.',
  },
  {
    yours: 'מחיר לצרכן, או ״התקשרו לקבלת מחיר״.',
    here: 'מחיר B2B לפני מע״מ שרק נגריות רשומות רואות. או בקשת הצעת מחיר, אם זה מה שמתאים לכם.',
  },
  {
    yours: 'הזמנה בטלפון, ופרטים שנשארים בעל פה.',
    here: 'הזמנת רכש כתובה שמגיעה במייל, עם כפתור אישור. ונגר שמעדיף לדבר שולח וואטסאפ או מתקשר ישר אליכם.',
  },
]

const GETS: { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <Store size={22} />,
    title: 'עמוד ספק משלכם',
    text: 'לוגו, עיר, מה אתם מוכרים, לאן אתם מספקים, קטלוגים להורדה וכל המוצרים שלכם. קישור אחד שאפשר לשלוח ללקוחות.',
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'וואטסאפ וטלפון ישירות אליכם',
    text: 'נגרייה רשומה פונה אליכם בלחיצה, בלי מתווך. אתם בוחרים אם להציג מספר.',
  },
  {
    icon: <Send size={22} />,
    title: 'הזמנות רכש מסודרות',
    text: 'ההזמנה מגיעה למייל עם כל הפריטים, הכמויות והמחירים, ואתם מאשרים בלחיצה.',
  },
  {
    icon: <Tag size={22} />,
    title: 'מחיר או הצעת מחיר',
    text: 'מציגים מחיר לפני מע״מ לנגריות רשומות, או מקבלים בקשות להצעת מחיר. אתם מחליטים.',
  },
  {
    icon: <FileSpreadsheet size={22} />,
    title: 'שולחים אקסל, אנחנו מעלים',
    text: 'את המחירון הראשון אנחנו מעלים בשבילכם. אחר כך מעדכנים לבד מקובץ, עם אפשרות לבטל.',
  },
  {
    icon: <Building2 size={22} />,
    title: 'אתם המוכרים',
    text: 'אתם קובעים תנאי תשלום, מספקים ומוציאים חשבונית לנגר. האתר לא נוגע בכסף של הסחורה.',
  },
]

const STEPS: [string, string][] = [
  ['ממלאים טופס קצר', 'שם העסק, ח.פ, טלפון ומייל. כשתי דקות'],
  ['מאשרים אתכם', 'אנחנו עוברים על הפרטים וחוזרים אליכם'],
  ['שולחים מחירון', 'אקסל או מה שיש לכם, ואנחנו מעלים'],
  ['העמוד שלכם באוויר', 'נגריות מוצאות, פונות ומזמינות'],
]

function joinHref(ref: string | null): string {
  return ref ? `/supplier/join?ref=${encodeURIComponent(ref)}` : '/supplier/join'
}

function whatsappHref(ref: string | null): string | null {
  const text = `היי, ראיתי את הדף לספקים בנגרים B2B ואשמח לשמוע פרטים.${ref ? ` (${ref})` : ''}`
  return whatsappUrl(process.env.SUPPLIER_LEADS_WHATSAPP, text)
}

/** The suppliers on the site today, for the real examples. A failed read just hides the block. */
async function liveSuppliers(): Promise<PublicSupplier[]> {
  try {
    return await loadPublicSuppliers(await loadProducts({ showPrices: false }))
  } catch (err) {
    console.error('suppliers-join: supplier list failed:', err)
    return []
  }
}

function Ctas({ source, whatsapp, tone = 'light' }: { source: string | null; whatsapp: string | null; tone?: 'light' | 'dark' }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ok px-6 text-base font-bold text-white hover:brightness-95"
        >
          <MessageCircle size={19} /> דברו איתנו בוואטסאפ
        </a>
      )}
      <Link
        href={joinHref(source)}
        className={
          whatsapp
            ? `inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border-[1.5px] px-6 text-base font-bold ${
                tone === 'dark' ? 'border-white/40 text-white hover:bg-white/10' : 'border-navy/25 bg-white text-navy hover:border-navy'
              }`
            : 'inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-brand px-6 text-base font-bold text-navy shadow-[0_6px_16px_rgba(242,154,18,.28)] hover:bg-brand-hover'
        }
      >
        הצטרפות בטופס קצר
        <ChevronLeft size={18} strokeWidth={2.4} />
      </Link>
    </div>
  )
}

/** A drawing of a supplier page, labelled as such, so no business is invented. */
function SupplierPageSketch() {
  return (
    <div aria-hidden className="rounded-2xl border border-hair bg-white p-4 shadow-[0_10px_30px_rgba(30,42,59,.08)]">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-wood bg-wood-soft text-[11px] font-bold text-[#6B4E2E]">
          הלוגו שלכם
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-lg text-ink">שם העסק שלכם</b>
          <span className="inline-flex items-center gap-1 text-[13px] text-muted">
            <MapPin size={13} /> העיר שלכם
          </span>
          <p className="m-0 mt-1 text-[14px] leading-relaxed text-muted">מה אתם מוכרים, במשפט או שניים.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-navy-soft px-2.5 py-1 text-navy">
          <Truck size={13} /> לאן אתם מספקים
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-navy-soft px-2.5 py-1 text-navy">
          <FileText size={13} /> קטלוג להורדה
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[11px] bg-ok text-[14px] font-bold text-white">
          <MessageCircle size={16} /> וואטסאפ
        </span>
        <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[11px] border border-hair text-[14px] font-bold text-ink">
          <Phone size={16} /> חיוג
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {['המוצר הראשון שלכם', 'המוצר השני'].map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border border-hair p-2.5">
            <span className="h-10 w-10 shrink-0 rounded-lg bg-warm" />
            <span className="flex-1 text-[14px] font-semibold text-ink">{name}</span>
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[12.5px] font-bold text-attn">מחיר לפני מע״מ</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function SuppliersJoinPage({ searchParams }: PageProps) {
  const ref = landingRef(await searchParams)
  const whatsapp = whatsappHref(ref)
  const suppliers = await liveSuppliers()

  return (
    <div dir="rtl" className="min-h-dvh bg-warm text-ink">
      {/* Vercel Web Analytics, without the npm package (its peer dependencies clash
          with vitest's). Counts nothing until Web Analytics is on in the project. */}
      <Script id="va-queue" strategy="afterInteractive">
        {'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };'}
      </Script>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />

      <header className="border-b border-hair/70 bg-warm">
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center gap-3 px-4 md:px-7">
          <Link href="/" aria-label="נגרים B2B — דף הבית">
            <Logo size="md" tagline="always" />
          </Link>
          <span className="flex-1" />
          <Link href={joinHref(ref)} className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white">
            הצטרפות כספק
          </Link>
        </div>
      </header>

      <main>
        {/* Hero: the supplier's own objection first */}
        <section className="mx-auto grid max-w-[1120px] gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.15fr_1fr] md:items-center md:px-7 md:pt-14">
          <div>
            <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-attn">לספקים שמוכרים לנגריות</span>
            <h1 className="m-0 mt-4 text-[34px] font-extrabold leading-[1.15] tracking-tight text-navy text-balance md:text-[48px]">
              יש לכם כבר אתר. הנגרים עדיין מתקשרים.
            </h1>
            <p className="m-0 mt-4 text-lg leading-relaxed text-muted">
              נגרים B2B הוא המקום שבו נגריות מחפשות מוצר ומזמינות ישר מהספק. עמוד ספק משלכם, מחיר B2B לנגריות
              רשומות, הזמנות רכש כתובות, ווואטסאפ ישיר אליכם. בלי עמלה על הזמנות.
            </p>
            <div className="mt-7">
              <Ctas source={ref} whatsapp={whatsapp} />
            </div>
            <p className="m-0 mt-3 text-sm text-faint">החיוב מתחיל ב{BILLING_STARTS_LABEL}. עד אז אין תשלום.</p>
          </div>
          <SupplierPageSketch />
        </section>

        {/* "But I already have a website" */}
        <section className="border-y border-hair bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
            <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">״אבל יש לי כבר אתר״</h2>
            <p className="m-0 mt-2 max-w-[640px] text-[16px] leading-relaxed text-muted">
              מצוין. זה לא במקום האתר שלכם. זו עוד דלת, לקהל אחד בלבד: נגריות שמחפשות מה לקנות.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {PAINS.map((pain) => (
                <div key={pain.here} className="rounded-2xl border border-hair bg-warm p-4 md:p-5">
                  <span className="text-[13px] font-bold text-faint">באתר שלכם</span>
                  <p className="m-0 mt-1 text-[15px] leading-relaxed text-muted">{pain.yours}</p>
                  <span className="mt-3 block text-[13px] font-bold text-brand-ink">בנגרים B2B</span>
                  <p className="m-0 mt-1 text-[15.5px] font-semibold leading-relaxed text-ink">{pain.here}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you actually get */}
        <section className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">מה מקבלים</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GETS.map((get) => (
              <div key={get.title} className="flex gap-3.5 rounded-2xl border border-hair bg-white p-4 md:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-soft text-navy">{get.icon}</span>
                <div>
                  <h3 className="m-0 text-[17px] font-bold">{get.title}</h3>
                  <p className="m-0 mt-1 text-[15px] leading-relaxed text-muted">{get.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Real supplier pages, live from the site */}
        {suppliers.length > 0 && (
          <section className="border-y border-hair bg-white">
            <div className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
              <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">ככה זה נראה באמת</h2>
              <p className="m-0 mt-2 text-[16px] text-muted">ספקים שכבר באתר. היכנסו לעמוד וראו מה נגר רואה.</p>
              <ul className="m-0 mt-6 grid list-none gap-3 p-0 md:grid-cols-2">
                {suppliers.slice(0, 4).map((supplier) => (
                  <li key={supplier.id}>
                    <SupplierCard supplier={supplier} />
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-4 inline-flex items-center gap-1.5 text-[15px] text-muted">
                <Search size={16} /> נגר שמחפש באתר מוצר שאתם מוכרים יגיע גם לעמוד שלכם.
              </p>
            </div>
          </section>
        )}

        {/* How to join */}
        <section className="mx-auto max-w-[1120px] px-4 py-14 md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">איך מצטרפים</h2>
          <ol className="m-0 mt-6 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-hair bg-white p-4 md:p-5">
                <span className="tnum grid h-8 w-8 place-items-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
                <b className="mt-3 block text-[17px]">{title}</b>
                <span className="text-[15px] text-muted">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Price */}
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:px-7">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-brand">
                <Tag size={18} /> מחיר
              </span>
              <h2 className="m-0 mt-2 text-2xl font-extrabold md:text-[30px]">מנוי אחד, בלי עמלה</h2>
              <p className="m-0 mt-2 text-[16px] leading-relaxed text-slate-300">
                אותו מחיר לכל ספק, בלי קשר למספר המוצרים או ההזמנות. החיוב מתחיל ב{BILLING_STARTS_LABEL}, נעשה מחוץ
                לאתר בחשבונית ישירה, ולא נגבה דבר לפני שהסכמתם.
              </p>
            </div>
            <div className="rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/15">
              <div className="flex items-baseline gap-2">
                <span className="tnum text-[44px] font-extrabold leading-none">{SUPPLIER_MONTHLY_EXCL_VAT.toLocaleString('he-IL')} ₪</span>
                <span className="text-slate-300">לחודש, לפני מע״מ</span>
              </div>
              <p className="m-0 mt-2 text-[15px] text-slate-300">
                הסכם שנתי ל-{SUPPLIER_AGREEMENT_MONTHS} חודשים ({SUPPLIER_ANNUAL_EXCL_VAT.toLocaleString('he-IL')} ₪ לשנה, לפני מע״מ).
                הפרטים ב<Link href="/terms/suppliers" className="underline underline-offset-2 hover:text-white">נספח הספקים</Link>.
              </p>
              <div className="mt-5">
                <Ctas source={ref} whatsapp={whatsapp} tone="dark" />
              </div>
            </div>
          </div>
        </section>

        {/* Closing call */}
        <section className="mx-auto max-w-[1120px] px-4 py-16 text-center md:px-7">
          <h2 className="m-0 text-2xl font-extrabold text-navy md:text-[30px]">בואו להיות איפה שנגרים מחפשים</h2>
          <p className="m-0 mt-2 text-[16px] text-muted">שתי דקות של טופס, ואנחנו חוזרים אליכם.</p>
          <div className="mt-6 flex justify-center">
            <Ctas source={ref} whatsapp={whatsapp} />
          </div>
        </section>
      </main>

      <footer className="border-t border-hair">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-6 text-[13px] text-faint md:px-7">
          <span>© נגרים B2B · שוק הנגרים</span>
          <Link href="/terms" className="hover:text-ink">תקנון ותנאי שימוש</Link>
          <Link href="/terms/suppliers" className="hover:text-ink">נספח הספקים</Link>
          <Link href="/app/suppliers" className="hover:text-ink">הספקים באתר</Link>
          <Link href="/supplier/join" className="hover:text-ink">כניסת ספקים</Link>
        </div>
      </footer>
    </div>
  )
}
