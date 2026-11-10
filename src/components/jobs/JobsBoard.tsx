'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Briefcase, ListChecks, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/app/ui'
import { JOB_REGIONS, jobRegionName, jobScopeName, type JobCard } from '@/lib/jobs'
import JobPostCard from './JobPostCard'

type Side = 'all' | 'carpenter' | 'supplier'

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-sm font-bold ${
        on ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * The board: every live ad, from carpentries and from suppliers. Filters run
 * in the browser: a board of dozens of ads does not need a round trip.
 */
export default function JobsBoard({
  cards,
  newHref,
  mineHref,
  now,
}: {
  cards: JobCard[]
  newHref: string
  mineHref: string
  now: number
}) {
  const [side, setSide] = useState<Side>('all')
  const [region, setRegion] = useState('')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((card) => {
      if (side !== 'all' && card.side !== side) return false
      if (region && card.region !== region) return false
      if (!q) return true
      return [card.role, card.businessName, card.location, card.description, jobRegionName(card.region), jobScopeName(card.scope)].some((field) =>
        field?.toLowerCase().includes(q)
      )
    })
  }, [cards, side, region, query])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-6">
      <PageHeader
        icon={Briefcase}
        title="דרושים"
        subtitle="משרות בנגריות ואצל ספקים"
        actions={
          <>
            <Link href={mineHref} className="flex h-11 items-center gap-1.5 rounded-[11px] border border-hair bg-white px-3 text-sm font-bold text-ink">
              <ListChecks size={16} />
              המודעות שלי
            </Link>
            <Link href={newHref} className="flex h-11 items-center gap-1.5 rounded-[11px] bg-brand px-3.5 text-sm font-extrabold text-navy hover:bg-brand-hover">
              <Plus size={16} />
              מודעה חדשה
            </Link>
          </>
        }
      />

      <nav aria-label="סינון" className="grid gap-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip on={side === 'all'} onClick={() => setSide('all')}>
            הכל
          </Chip>
          <Chip on={side === 'carpenter'} onClick={() => setSide('carpenter')}>
            נגריות
          </Chip>
          <Chip on={side === 'supplier'} onClick={() => setSide('supplier')}>
            ספקים
          </Chip>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip on={!region} onClick={() => setRegion('')}>
            כל האזורים
          </Chip>
          {JOB_REGIONS.map((item) => (
            <Chip key={item.key} on={region === item.key} onClick={() => setRegion(item.key)}>
              {item.name}
            </Chip>
          ))}
        </div>
        <label className="relative block max-w-md">
          <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי תפקיד או מקום"
            aria-label="חיפוש"
            className="h-11 w-full rounded-[11px] border border-hair bg-white ps-10 pe-3 text-[15px] placeholder:text-faint"
          />
        </label>
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-hair bg-white p-8 text-center text-muted">
          {cards.length ? 'אין מודעות שמתאימות לסינון.' : 'עוד אין מודעות בלוח.'}
          <div className="mt-3">
            <Link href={newHref} className="font-bold text-brand-ink underline">
              מחפשים עובד? פרסמו מודעה
            </Link>
          </div>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-3 p-0 md:grid-cols-2">
          {shown.map((card) => (
            <li key={card.id}>
              <JobPostCard card={card} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
