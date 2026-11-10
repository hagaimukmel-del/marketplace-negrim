import { Briefcase, Clock, ShieldCheck } from 'lucide-react'

/**
 * What carpentries and suppliers see while דרושים is closed (JOBS_BOARD_OPEN).
 *
 * The plan (owner, 2026-11-10): a carpentry's request for a worker is not
 * published to other carpentries, so nobody poaches anybody's staff. It goes,
 * with the carpentry's consent, to a staffing company that works with the site.
 * No company is signed yet, so this page explains what is coming.
 */
const STEPS = [
  ['ממלאים בקשת עובד', 'תפקיד, מיקום, ימי עבודה ושכר. פחות מדקה.'],
  ['הבקשה לא מתפרסמת', 'נגריות אחרות לא רואות אותה, ואף אחד לא רואה את הטלפון שלכם.'],
  ['עוברת לחברת כוח אדם', 'רק באישור שלכם, לחברה שעובדת עם נגרים B2B ומתמחה בעובדים לנגריות.'],
  ['מועמדים מגיעים אליכם', 'החברה מאתרת מועמדים ופונה אליכם ישירות. ב"הבקשות שלי" רואים את מצב כל בקשה.'],
] as const

export default function JobsComingSoon() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="rounded-2xl border border-hair bg-white p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-brand">
          <Briefcase size={28} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">דרושים</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">צריכים נגר ייצור, מפעיל CNC או מתקין? מבקשים עובד דרך האתר, בלי לפרסם את זה לכל הענף.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-brand-soft px-3 py-2 text-sm font-bold text-brand-ink">
          <Clock size={15} />
          בהמשך
        </p>
      </div>

      <section className="rounded-2xl border border-hair bg-white p-5">
        <h2 className="m-0 text-lg font-bold text-ink">איך זה יעבוד</h2>
        <ol className="m-0 mt-3 grid list-none gap-3 p-0">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">{index + 1}</span>
              <span>
                <b className="block text-[15px] text-ink">{title}</b>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-navy-soft p-3 text-sm text-navy">
          <ShieldCheck size={17} className="mt-0.5 shrink-0" />
          הפרטים עוברים לחברת כוח האדם רק אחרי שאתם מאשרים זאת בטופס. בלי אישור, הבקשה לא נשלחת.
        </p>
      </section>
    </div>
  )
}
