import Link from 'next/link'
import { ArrowRight, Lock, MessageSquare } from 'lucide-react'
import { regionName } from '@/lib/regions'
import { jobTypeName, shortDate } from '@/lib/work'
import { getWorkViewer, loadJob } from '@/lib/work-server'
import { PosterLine, headline } from '../Board'
import ComingSoon from '../ComingSoon'
import ReportJob from './ReportJob'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'פרטי עבודה — נגרים עובדים ביחד' }

const STATUS_NOTE: Record<string, string> = {
  closed: 'העבודה נסגרה.',
  removed: 'העבודה הוסרה מהלוח.',
  paused: 'העבודה הושהתה עד בדיקה, בעקבות דיווחים.',
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="m-0 font-semibold text-ink">{value}</dd>
    </div>
  )
}

/**
 * One job. The poster's name comes from the server only for members, the
 * poster and the operator. Answering the job ("אני מעוניין") opens a private
 * conversation, which is phase 2; until then the button says so.
 */
export default async function WorkJobPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getWorkViewer()
  if (!viewer.open && !viewer.admin) {
    return <ComingSoon signedIn={Boolean(viewer.carpenter)} hasProfile={Boolean(viewer.profile)} />
  }

  const { id } = await params
  const job = viewer.carpenter || viewer.admin ? await loadJob(viewer, id) : null

  if (!job) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-hair bg-white p-8 text-center">
        <p className="font-bold text-ink">העבודה כבר לא בלוח.</p>
        <Link href="/app/work" className="mt-3 inline-block font-semibold text-[#0B5A5A] underline">
          ללוח העבודות
        </Link>
      </div>
    )
  }

  const statusNote = !job.live ? (STATUS_NOTE[job.status] ?? 'העבודה ירדה מהלוח במועד שלה.') : null

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
      <Link href="/app/work" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowRight size={16} />
        ללוח העבודות
      </Link>

      {statusNote && <p className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">{statusNote}</p>}

      <article className="rounded-2xl border border-hair bg-white p-5">
        <span className="rounded-md bg-[#E2F0EF] px-2 py-0.5 text-[13px] font-bold text-[#0E5E5E]">{jobTypeName(job.jobType)}</span>
        <h1 className="mt-2 text-xl font-extrabold text-ink">{headline(job)}</h1>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <Detail label="אזור" value={regionName(job.region)} />
          <Detail label="ביצוע עד" value={shortDate(job.dueDate)} />
          <Detail label="כמות / היקף" value={job.quantity} />
          {job.material && <Detail label="חומר" value={job.material} />}
        </dl>

        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-stone-800">{job.description}</p>

        {job.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.imageUrl} alt="תמונת העבודה" className="mt-4 max-h-96 w-full rounded-xl object-contain bg-stone-100" />
        )}
      </article>

      <section className="rounded-2xl border border-hair bg-white p-4">
        <PosterLine job={job} />
        {!job.poster && <p className="mt-1 text-sm text-muted">שם הנגרייה מוצג לנגריות עם פרופיל יכולות.</p>}
      </section>

      {job.mine ? (
        <Link href="/app/work/mine" className="flex h-12 items-center justify-center rounded-[11px] border border-hair bg-white font-bold text-ink">
          לסגירת העבודה: העבודות שלי
        </Link>
      ) : viewer.member ? (
        <div className="rounded-2xl border border-[#8CC9C2] bg-[#E2F0EF] p-4 text-center">
          <button type="button" disabled className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-[#0E5E5E] font-bold text-white opacity-50">
            <MessageSquare size={18} />
            אני מעוניין
          </button>
          <p className="mt-2 mb-0 text-sm text-[#0B5A5A]">פנייה בשיחה פרטית בתוך האתר תיפתח בקרוב.</p>
        </div>
      ) : viewer.carpenter ? (
        <div className="rounded-2xl border border-[#8CC9C2] bg-[#E2F0EF] p-4 text-center">
          <p className="m-0 flex items-center justify-center gap-2 font-bold text-[#0B5A5A]">
            <Lock size={16} />
            כדי לפנות לעבודה ממלאים פרופיל יכולות
          </p>
          <p className="mt-1 mb-3 text-sm text-[#0B5A5A]">בתקופת ההשקה ללא תשלום.</p>
          <Link href="/app/work/profile" className="inline-flex h-12 items-center rounded-[11px] bg-[#0E5E5E] px-6 font-bold text-white">
            למילוי פרופיל
          </Link>
        </div>
      ) : null}

      {viewer.carpenter && !job.mine && job.live && <ReportJob jobId={job.id} />}
    </div>
  )
}
