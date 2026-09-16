'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Pencil, Plus, Recycle, RefreshCw, Trash2 } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { daysLeft } from '@/lib/metzion'

export interface MyListing {
  id: string
  title: string
  dealType: string
  pricePerUnit: number | null
  quantity: number
  unit: string
  image: string | null
  status: string
  expiresAt: string
  createdAt: string
  soldAt: string | null
  removedByAdmin: boolean
}

type Group = 'active' | 'expired' | 'sold'

function groupOf(listing: MyListing): Group | null {
  if (listing.status === 'sold') return 'sold'
  if (listing.status !== 'active') return null
  return daysLeft(listing.expiresAt) > 0 ? 'active' : 'expired'
}

/**
 * The carpenter's own listings, and the three things they come here to do:
 * extend one that is about to expire, mark one as sold, or fix a detail.
 *
 * No email reminder when a listing nears its end — the carpenter sees it here,
 * with the days left, next time they come in.
 */
export default function MyListings({ listings, notice }: { listings: MyListing[]; notice: 'created' | 'saved' | null }) {
  const router = useRouter()
  const [group, setGroup] = useState<Group>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (listing: MyListing, action: 'extend' | 'sold' | 'remove') => {
    if (action === 'remove' && !confirm(`להסיר את "${listing.title}" מהמציאון?`)) return
    if (action === 'sold' && !confirm(`לסמן את "${listing.title}" כנמכר? המודעה תרד מהלוח.`)) return
    setBusyId(listing.id)
    setError(null)
    try {
      const response = await fetch('/api/metzion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listing.id, action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusyId(null)
    }
  }

  const counts = {
    active: listings.filter((item) => groupOf(item) === 'active').length,
    expired: listings.filter((item) => groupOf(item) === 'expired').length,
    sold: listings.filter((item) => groupOf(item) === 'sold').length,
  }
  const shown = listings.filter((item) => groupOf(item) === group)
  const removedByAdmin = listings.filter((item) => item.status === 'removed' && item.removedByAdmin)

  const TABS: { key: Group; label: string }[] = [
    { key: 'active', label: 'פעילות' },
    { key: 'expired', label: 'פג תוקף' },
    { key: 'sold', label: 'נמכרו' },
  ]

  return (
    <div className="space-y-4 pb-6">
      <Link href="/carpenter/metzion" className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-stone-600">
        <ArrowRight size={15} />
        למציאון
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">המודעות שלי</h1>
        <Link href="/carpenter/metzion/new" className="flex h-11 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white">
          <Plus size={17} />
          מודעה חדשה
        </Link>
      </div>

      {notice && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          <CheckCircle2 size={17} />
          {notice === 'created' ? 'המודעה פורסמה ונמצאת עכשיו במציאון.' : 'השינויים נשמרו.'}
        </p>
      )}

      {removedByAdmin.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {removedByAdmin.length === 1 ? 'מודעה אחת הוסרה' : `${removedByAdmin.length} מודעות הוסרו`} על ידי צוות האתר. לשאלות — צרו קשר.
        </p>
      )}

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setGroup(tab.key)}
            aria-pressed={group === tab.key}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${
              group === tab.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
            }`}
          >
            {tab.label}
            <span className="tnum text-xs opacity-60">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
          <Recycle size={34} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm text-stone-600">
            {group === 'active' ? 'אין לך מודעות פעילות.' : group === 'expired' ? 'אין מודעות שפג תוקפן.' : 'עוד לא סימנת מודעה כנמכרה.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((listing) => {
            const left = daysLeft(listing.expiresAt)
            const busy = busyId === listing.id
            return (
              <li key={listing.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="flex gap-3 p-3">
                  {listing.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-300">
                      <Recycle size={24} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug text-stone-900">{listing.title}</p>
                    <p className="tnum mt-0.5 text-sm text-stone-600">
                      {listing.dealType === 'free' ? 'למסירה בחינם' : `${formatIls(listing.pricePerUnit!)} ל${listing.unit}`} ·{' '}
                      {listing.quantity.toLocaleString('he-IL')} {listing.unit}
                    </p>
                    {group === 'active' && (
                      <p className={`tnum mt-1 text-xs font-semibold ${left <= 7 ? 'text-amber-700' : 'text-stone-500'}`}>
                        עוד {left} ימים בלוח
                      </p>
                    )}
                    {group === 'expired' && <p className="mt-1 text-xs font-semibold text-red-700">ירדה מהלוח — אפשר להאריך</p>}
                    {group === 'sold' && listing.soldAt && (
                      <p className="mt-1 text-xs text-emerald-800">
                        נמכר ב-{new Date(listing.soldAt).toLocaleDateString('he-IL')}
                      </p>
                    )}
                  </div>
                </div>
                {group !== 'sold' && (
                  <div className="flex flex-wrap gap-2 border-t border-stone-100 bg-stone-50 px-3 py-2">
                    {(group === 'expired' || left <= 14) && (
                      <button type="button" onClick={() => act(listing, 'extend')} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
                        <RefreshCw size={15} />
                        הארך ב-60 יום
                      </button>
                    )}
                    {group === 'active' && (
                      <button type="button" onClick={() => act(listing, 'sold')} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50">
                        <CheckCircle2 size={15} />
                        נמכר / נמסר
                      </button>
                    )}
                    <Link href={`/carpenter/metzion/${listing.id}/edit`} className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700">
                      <Pencil size={15} />
                      ערוך
                    </Link>
                    <button type="button" onClick={() => act(listing, 'remove')} disabled={busy} className="ms-auto flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 size={15} />
                      הסר
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
