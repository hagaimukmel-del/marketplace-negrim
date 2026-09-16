'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, Recycle, RotateCcw, Trash2, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { daysLeft, reportReasonLabel } from '@/lib/metzion'

export interface AdminListing {
  id: string
  title: string
  dealType: string
  pricePerUnit: number | null
  quantity: number
  unit: string
  city: string
  image: string | null
  status: string
  expiresAt: string
  createdAt: string
  soldAt: string | null
  removedReason: string | null
  owner: string
  ownerActive: boolean
}

export interface AdminReport {
  id: string
  listingId: string
  reason: string
  note: string | null
  createdAt: string
  reporter: string
}

type Filter = 'live' | 'expired' | 'sold' | 'removed' | 'all'

function stateOf(listing: AdminListing): Exclude<Filter, 'all'> {
  if (listing.status === 'sold') return 'sold'
  if (listing.status === 'removed') return 'removed'
  return daysLeft(listing.expiresAt) > 0 ? 'live' : 'expired'
}

const STATE_LABEL: Record<Exclude<Filter, 'all'>, { label: string; tone: string }> = {
  live: { label: 'בלוח', tone: 'bg-emerald-100 text-emerald-900' },
  expired: { label: 'פג תוקף', tone: 'bg-stone-200 text-stone-700' },
  sold: { label: 'נמכר', tone: 'bg-sky-100 text-sky-900' },
  removed: { label: 'הוסר', tone: 'bg-red-100 text-red-800' },
}

function date(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : '—'
}

/**
 * Moderating the board: open reports first, since they are the only thing here
 * that asks for a decision, then every listing with its state.
 */
export default function MetzionAdmin({ listings, reports }: { listings: AdminListing[]; reports: AdminReport[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('live')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings])
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { live: 0, expired: 0, sold: 0, removed: 0, all: listings.length }
    listings.forEach((listing) => (result[stateOf(listing)] += 1))
    return result
  }, [listings])
  const shown = filter === 'all' ? listings : listings.filter((listing) => stateOf(listing) === filter)

  const send = async (key: string, body: Record<string, unknown>) => {
    setBusy(key)
    setError(null)
    try {
      const response = await fetch('/api/admin/metzion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  const remove = (listing: AdminListing, reason: string) => {
    if (!confirm(`להסיר את "${listing.title}" מהמציאון?`)) return
    void send(listing.id, { action: 'remove', listing_id: listing.id, reason })
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'live', label: 'בלוח' },
    { key: 'expired', label: 'פג תוקף' },
    { key: 'sold', label: 'נמכרו' },
    { key: 'removed', label: 'הוסרו' },
    { key: 'all', label: 'הכל' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <Recycle size={21} className="text-emerald-700" />
          מציאון
        </h1>
        <p className="tnum mt-1 text-sm text-stone-600">
          {counts.live} בלוח · {counts.sold} נמכרו · {counts.expired} פג תוקף · {counts.removed} הוסרו
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Flag size={15} className="text-red-700" />
          דיווחים פתוחים ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">אין דיווחים שמחכים לטיפול.</p>
        ) : (
          reports.map((report) => {
            const listing = byId.get(report.listingId)
            return (
              <div key={report.id} className="rounded-xl border border-red-200 bg-white p-3">
                <div className="flex gap-3">
                  {listing?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">{listing?.title ?? 'מודעה'}</p>
                    <p className="text-xs text-stone-500">
                      של {listing?.owner ?? '—'} · דיווח של {report.reporter} · {date(report.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-red-800">{reportReasonLabel(report.reason)}</p>
                    {report.note && <p className="mt-0.5 text-sm text-stone-700">{report.note}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing && listing.status !== 'removed' && (
                    <button type="button" onClick={() => remove(listing, reportReasonLabel(report.reason))} disabled={busy !== null} className="flex h-10 items-center gap-1.5 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
                      <Trash2 size={15} />
                      הסר את המודעה
                    </button>
                  )}
                  <button type="button" onClick={() => send(report.id, { action: 'dismiss_report', report_id: report.id })} disabled={busy !== null} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50">
                    <X size={15} />
                    המודעה תקינה — סגור דיווח
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                filter === item.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              {item.label}
              <span className="tnum text-xs opacity-60">{counts[item.key]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-600">אין מודעות כאן.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {shown.map((listing) => {
              const state = STATE_LABEL[stateOf(listing)]
              return (
                <div key={listing.id} className="flex items-center gap-3 border-b border-stone-100 p-3 last:border-b-0">
                  {listing.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-lg bg-stone-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900">{listing.title}</p>
                    <p className="tnum truncate text-xs text-stone-500">
                      {listing.owner}
                      {!listing.ownerActive && ' (חסום)'} · {listing.city} ·{' '}
                      {listing.dealType === 'free' ? 'בחינם' : `${formatIls(listing.pricePerUnit!)} ל${listing.unit}`} · פורסם {date(listing.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                  {listing.status === 'removed' ? (
                    <button type="button" onClick={() => send(listing.id, { action: 'restore', listing_id: listing.id })} disabled={busy !== null} aria-label="החזר ללוח" title="החזר ללוח" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-40">
                      <RotateCcw size={16} />
                    </button>
                  ) : listing.status === 'active' ? (
                    <button type="button" onClick={() => remove(listing, 'manual')} disabled={busy !== null} aria-label="הסר" title="הסר" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span className="w-9 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
