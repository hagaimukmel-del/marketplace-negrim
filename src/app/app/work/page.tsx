import Link from 'next/link'
import { FileText, Handshake, Lock, Mail, MapPin, MessageSquare, Send } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'

export const metadata = { title: 'נגרים עובדים ביחד · בקרוב — שוק הנגרים' }

const FEEDBACK_EMAIL = 'nagarim.b2b@gmail.com'

/** The closed list of job types the board will take (the spec, 15.10). */
const JOB_TYPES = ['חיתוך / CNC', 'קנטים', 'צביעה וריסוס', 'ייצור חזיתות', 'ייצור גופים', 'הרכבה והתקנה', 'עזרה בפרויקט']

const STEPS = [
  {
    icon: <Send size={20} />,
    title: 'מפרסמים עבודה',
    text: 'סוג העבודה, אזור, כמות, מועד ותמונה. בלי פרטי לקוח ובלי מחיר.',
  },
  {
    icon: <Mail size={20} />,
    title: 'נגרייה מתאימה פונה',
    text: 'נגריות מהאזור שעושות בדיוק את זה מקבלות מייל, ופונות אליכם.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'מתאמים בשיחה פרטית',
    text: 'הודעות, תמונות ו־PDF בתוך האתר. את הטלפון משתפים רק כשרוצים.',
  },
]

/**
 * "נגרים עובדים ביחד" before it exists: what is coming, in the service's own
 * teal, so a carpenter who meets the name in the welcome popup or on the home
 * screen finds out what it is. Static on purpose: there is no board yet, no
 * table and nothing to sign up for beyond registering on the site. When the
 * board ships, this route becomes the board.
 */
export default async function WorkComingSoonPage() {
  const carpenter = await getSessionCarpenter()

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-5">
      <section className="overflow-hidden rounded-2xl bg-[#0E5E5E] px-5 py-6 text-white md:px-8 md:py-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/15">
            <Handshake size={20} />
          </span>
          <span className="text-sm font-bold text-[#BFE3DF]">נגרים עובדים ביחד</span>
          <span className="ms-auto rounded-full bg-brand px-3 py-1 text-sm font-extrabold text-navy">בקרוב</span>
        </div>
        <h1 className="mt-4 text-[26px] leading-tight font-extrabold md:text-3xl">
          יש לכם עבודה ואין ידיים? יש לכם מכונה פנויה?
        </h1>
        <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-[#D7EEEB]">
          לוח עבודות בין נגריות. נגרייה שצריכה עזרה בעבודה מפרסמת אותה, ונגרייה מתאימה מהאזור פונה ומתאמת איתה ישירות.
        </p>
      </section>

      <section aria-labelledby="work-how" className="grid gap-2.5">
        <h2 id="work-how" className="text-lg font-bold text-ink">
          איך זה יעבוד
        </h2>
        <ol className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-hair bg-white p-4">
              <span className="flex items-center gap-2 text-[#0E5E5E]">
                {step.icon}
                <span className="text-xs font-bold text-muted">שלב {i + 1}</span>
              </span>
              <b className="mt-2 block text-[15.5px] text-ink">{step.title}</b>
              <span className="text-sm text-muted">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="work-sample" className="grid gap-2.5">
        <h2 id="work-sample" className="text-lg font-bold text-ink">
          ככה תיראה עבודה בלוח
        </h2>
        <article className="relative rounded-2xl border border-hair bg-white p-4" aria-label="דוגמה לעבודה">
          <span className="absolute -top-2.5 end-4 rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-bold text-stone-600">דוגמה</span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="rounded-md bg-[#E2F0EF] px-2 py-0.5 text-[13px] font-bold text-[#0E5E5E]">חיתוך / CNC</span>
            <span className="text-[12.5px] text-muted">לפני שעה</span>
          </div>
          <b className="mt-2 block text-[17px] text-ink">40 לוחות MDF 18 מ״מ לחיתוך לפי קובץ</b>
          <p className="mt-1 text-sm text-muted">הדרום · ביצוע עד 28.10</p>
          <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3 text-[13.5px] text-muted">
            <Lock size={14} />
            נגרייה באזור הדרום
          </div>
        </article>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="סוגי עבודות">
          {JOB_TYPES.map((type) => (
            <li key={type} className="rounded-full border border-[#8CC9C2] bg-[#E2F0EF] px-3 py-1 text-sm font-semibold text-[#0B5A5A]">
              {type}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2.5 md:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-hair bg-white p-4">
          <MapPin size={20} className="mt-0.5 shrink-0 text-[#0E5E5E]" />
          <p className="m-0 text-sm text-muted">
            <b className="block text-[15px] text-ink">מתחילים מאשדוד דרומה</b>
            אשדוד, אשקלון, קריית מלאכי, קריית גת, שדרות, נתיבות, אופקים, באר שבע ודימונה.
          </p>
        </div>
        <div className="flex gap-3 rounded-xl border border-hair bg-white p-4">
          <FileText size={20} className="mt-0.5 shrink-0 text-[#0E5E5E]" />
          <p className="m-0 text-sm text-muted">
            <b className="block text-[15px] text-ink">רק נגריות רשומות</b>
            רק עבודות אמיתיות שצריכות עזרה. בלי פרסומות ובלי ספאם.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#8CC9C2] bg-[#E2F0EF] p-5 text-center">
        {carpenter ? (
          <p className="m-0 text-[15.5px] font-bold text-[#0B5A5A]">אתם כבר רשומים. כשהלוח ייפתח, הוא יופיע כאן ובמסך הבית.</p>
        ) : (
          <>
            <p className="m-0 text-[15.5px] font-bold text-[#0B5A5A]">הלוח ייפתח לנגריות רשומות. ההרשמה לאתר ללא תשלום.</p>
            <Link href="/join" className="mt-3 inline-flex h-12 items-center rounded-[11px] bg-brand px-6 font-bold text-navy hover:bg-brand-hover">
              הרשמה, פחות מדקה
            </Link>
          </>
        )}
        <p className="mt-3 mb-0 text-sm text-[#0B5A5A]">
          יש לכם עבודה שהייתם מפרסמים כבר היום? כתבו לנו ונעזור לכם:{' '}
          <a href={`mailto:${FEEDBACK_EMAIL}`} dir="ltr" className="font-semibold underline">
            {FEEDBACK_EMAIL}
          </a>
        </p>
      </section>
    </div>
  )
}
