import Link from 'next/link'
import { Handshake, Lock, MessageSquare, Plus, UserRound, Users } from 'lucide-react'
import { PageHeader } from '@/components/app/ui'
import { REGIONS, regionName } from '@/lib/regions'
import { JOB_TYPES, WORK_FREE_UNTIL, ago, connectedLabel, daysLeft, jobTypeName, shortDate, type BoardJob } from '@/lib/work'

function href(region: string, type: string): string {
  const params = new URLSearchParams()
  if (region) params.set('region', region)
  if (type) params.set('type', type)
  const query = params.toString()
  return query ? `/app/work?${query}` : '/app/work'
}

function Chip({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      href={to}
      aria-current={active ? 'true' : undefined}
      className={`flex h-9 shrink-0 items-center rounded-full border px-3 text-sm font-semibold ${
        active ? 'border-[#0E5E5E] bg-[#0E5E5E] text-white' : 'border-hair bg-white text-ink'
      }`}
    >
      {label}
    </Link>
  )
}

/** The card's headline: how much of what. The type is the badge above it. */
export function headline(job: Pick<BoardJob, 'quantity' | 'material'>): string {
  return job.material ? `${job.quantity} · ${job.material}` : job.quantity
}

export function PosterLine({ job }: { job: BoardJob }) {
  if (job.poster) {
    return (
      <span className="flex items-center gap-2 text-[13.5px] text-ink">
        <UserRound size={14} className="text-[#0E5E5E]" />
        <b>{job.poster.businessName}</b>
        {job.poster.city && <span className="text-muted">· {job.poster.city}</span>}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2 text-[13.5px] text-muted">
      <Lock size={14} />
      נגרייה באזור {regionName(job.region)}
    </span>
  )
}

/**
 * The board: filters by region and type as links, so the server reads them
 * and a filtered board can be shared or bookmarked. Who posted shows only to
 * members; for everyone else the server never sent it.
 */
export default function Board({
  jobs,
  region,
  type,
  member,
  signedIn,
  preview,
  unread = 0,
  connected = null,
  now,
}: {
  jobs: BoardJob[]
  region: string
  type: string
  member: boolean
  signedIn: boolean
  preview: boolean
  /** Work conversations waiting for this carpentry. */
  unread?: number
  /** How many carpentries are connected: a number only, never who. */
  connected?: number | null
  now: number
}) {
  const today = new Date(now)
  const connectedText = connectedLabel(connected)
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4">
      {preview && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          תצוגת מנהל: הלוח עוד סגור לנגריות (WORK_BOARD_OPEN).
        </p>
      )}

      <PageHeader
        icon={Handshake}
        tone="teal"
        title="נגרים עובדים ביחד"
        subtitle={
          <>
            לוח עבודות בין נגריות
            {connectedText && (
              <span className="tnum mt-0.5 flex items-center gap-1 text-[13px] text-[#0B5A5A]">
                <Users size={14} aria-hidden />
                {connectedText}
              </span>
            )}
          </>
        }
        actions={
          signedIn && (
          <>
            <Link
              href="/app/work/profile"
              aria-label="הפרופיל שלי"
              className="flex h-10 items-center gap-1 rounded-[11px] border border-hair bg-white px-3 text-sm font-semibold text-ink"
            >
              <UserRound size={16} />
              <span className="hidden sm:inline">פרופיל</span>
            </Link>
            <Link
              href="/app/work/messages"
              aria-label={unread ? `שיחות, ${unread} לא נקראו` : 'שיחות'}
              className="relative flex h-10 items-center gap-1 rounded-[11px] border border-hair bg-white px-3 text-sm font-semibold text-ink"
            >
              <MessageSquare size={16} />
              שיחות
              {unread > 0 && (
                <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-[#0E5E5E] px-1 text-[11px] font-bold text-white">{unread}</span>
              )}
            </Link>
            <Link href="/app/work/mine" className="flex h-10 items-center rounded-[11px] border border-hair bg-white px-3 text-sm font-semibold text-ink">
              העבודות שלי
            </Link>
            <Link
              href={member ? '/app/work/new' : '/app/work/profile'}
              className="flex h-10 items-center gap-1 rounded-[11px] bg-[#0E5E5E] px-3 text-sm font-bold text-white hover:bg-[#0B4F4F]"
            >
              <Plus size={16} />
              פרסום
            </Link>
          </>
          )
        }
      />

      {signedIn && !member && (
        <div className="rounded-xl border border-[#8CC9C2] bg-[#E2F0EF] p-3 text-sm text-[#0B5A5A]">
          <b>אתם צופים בלבד.</b> כדי לראות מי מפרסם ולפרסם עבודה, ממלאים פרופיל יכולות. {WORK_FREE_UNTIL}.{' '}
          <Link href="/app/work/profile" className="font-bold underline">
            למילוי פרופיל
          </Link>
        </div>
      )}

      <nav aria-label="סינון" className="grid gap-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip to={href('', type)} active={!region} label="כל האזורים" />
          {REGIONS.map((item) => (
            <Chip key={item.key} to={href(item.key, type)} active={region === item.key} label={item.name} />
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip to={href(region, '')} active={!type} label="כל סוגי העבודה" />
          {JOB_TYPES.map((item) => (
            <Chip key={item.key} to={href(region, item.key)} active={type === item.key} label={item.name} />
          ))}
        </div>
      </nav>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-hair bg-white p-8 text-center text-muted">
          {region || type ? 'אין כרגע עבודות פתוחות שמתאימות לסינון.' : 'אין כרגע עבודות פתוחות בלוח.'}
          {member && (
            <div className="mt-3">
              <Link href="/app/work/new" className="font-bold text-[#0B5A5A] underline">
                יש לכם עבודה שצריכה עזרה? פרסמו אותה
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {jobs.map((job) => {
            const left = daysLeft(job.expiresAt, today)
            return (
              <li key={job.id}>
                <Link href={`/app/work/${job.id}`} className="block rounded-2xl border border-hair bg-white p-4 hover:border-[#8CC9C2]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="rounded-md bg-[#E2F0EF] px-2 py-0.5 text-[13px] font-bold text-[#0E5E5E]">{jobTypeName(job.jobType)}</span>
                    <span className="text-[12.5px] text-muted">
                      {job.mine && <b className="me-2 text-[#0B5A5A]">שלכם</b>}
                      {ago(job.createdAt, today)}
                    </span>
                  </div>
                  <b className="mt-2 block text-[17px] text-ink">{headline(job)}</b>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-700">{job.description}</p>
                  <p className="tnum mt-1 text-sm text-muted">
                    {regionName(job.region)} · ביצוע עד {shortDate(job.dueDate)}
                    {left <= 7 && ` · יורדת מהלוח בעוד ${left === 0 ? 'פחות מיום' : `${left} ימים`}`}
                  </p>
                  <div className="mt-3 border-t border-hair pt-3">
                    <PosterLine job={job} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
