import { Briefcase, Hammer } from 'lucide-react'

/** What carpentries and suppliers see while דרושים is closed (JOBS_BOARD_OPEN). */
export default function JobsComingSoon() {
  return (
    <div className="rounded-2xl border border-hair bg-white p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-brand">
        <Briefcase size={28} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-ink">דרושים</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">
        לוח משרות לנגריות ולספקים: נגרי ייצור, מפעילי CNC, מתקינים, נהגים ומחסנאים. נגריות וספקים יפרסמו כאן מודעות ויראו את המודעות של כולם.
      </p>
      <p className="mt-5 inline-flex items-center gap-2 rounded-[11px] bg-brand-soft px-3 py-2 text-sm font-bold text-brand-ink">
        <Hammer size={15} />
        בבנייה. נפתח בקרוב
      </p>
    </div>
  )
}
