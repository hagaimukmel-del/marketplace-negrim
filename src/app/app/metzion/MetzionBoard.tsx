'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Gift, ListChecks, Plus, Recycle, Search, SlidersHorizontal, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { REGIONS, regionName } from '@/lib/regions'
import {
  METZION_CATEGORIES,
  METZION_CONDITIONS,
  categoryLabel,
  conditionLabel,
  postedAgo,
  type MetzionCard,
} from '@/lib/metzion'
import ListingSheet from './ListingSheet'

type Sort = 'new' | 'price_low' | 'price_high'
type Deal = 'all' | 'sale' | 'free'

function CardImage({ src, alt }: { src: string | undefined; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-wood-soft text-[#D9CFC1]">
        <Recycle size={32} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="aspect-[4/3] w-full bg-wood-soft object-cover" />
  )
}

function Card({ card, onOpen }: { card: MetzionCard; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-hair bg-white text-start transition-shadow hover:shadow-md"
    >
      <span className="relative block">
        <CardImage src={card.images[0]} alt={card.title} />
        {card.dealType === 'free' && (
          <span className="absolute top-2 start-2 flex items-center gap-1 rounded-full bg-ok px-2.5 py-1 text-xs font-bold text-white">
            <Gift size={12} />
            בחינם
          </span>
        )}
        {card.mine && (
          <span className="absolute top-2 end-2 rounded-full bg-navy/80 px-2 py-0.5 text-[11px] font-semibold text-white">
            המודעה שלך
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col p-3">
        <span className="line-clamp-2 font-bold leading-snug text-ink">{card.title}</span>
        <span className="mt-1 text-xs text-muted">
          {conditionLabel(card.condition)} · {card.quantity.toLocaleString('he-IL')} {card.unit}
        </span>
        <span className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="tnum font-bold text-ink">
            {card.dealType === 'free' ? (
              <span className="text-brand-ink">למסירה</span>
            ) : (
              <>
                {formatIls(card.pricePerUnit!)}
                <span className="text-xs font-normal text-muted"> ל{card.unit}</span>
              </>
            )}
          </span>
          <span className="truncate text-[11px] text-muted">
            {card.city} · {postedAgo(card.createdAt)}
          </span>
        </span>
      </span>
    </button>
  )
}

/**
 * The board: search first, then a few filters, then photos.
 *
 * On a phone the filters fold behind one button so the listings start above the
 * fold. Price is a sort, not a range — a board of dozens of listings does not
 * need sliders.
 */
export default function MetzionBoard({ cards, canPost }: { cards: MetzionCard[]; canPost: boolean }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [region, setRegion] = useState<string>('all')
  const [condition, setCondition] = useState<string>('all')
  const [deal, setDeal] = useState<Deal>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = cards.filter((card) => {
      if (category !== 'all' && card.category !== category) return false
      if (region !== 'all' && !card.regions.includes(region)) return false
      if (condition !== 'all' && card.condition !== condition) return false
      if (deal !== 'all' && card.dealType !== deal) return false
      if (!q) return true
      return [card.title, card.description, card.city, categoryLabel(card.category)].some((field) =>
        field?.toLowerCase().includes(q)
      )
    })
    if (sort === 'new') return list
    // Free items count as zero, so they lead "cheapest first" and trail the other way.
    const price = (card: MetzionCard) => card.pricePerUnit ?? 0
    return list.slice().sort((a, b) => (sort === 'price_low' ? price(a) - price(b) : price(b) - price(a)))
  }, [cards, query, category, region, condition, deal, sort])

  const activeFilters = [category, region, condition, deal].filter((value) => value !== 'all').length
  const open = cards.find((card) => card.id === openId) ?? null

  const clear = () => {
    setCategory('all')
    setRegion('all')
    setCondition('all')
    setDeal('all')
  }

  const selectClass = 'h-11 w-full rounded-[11px] border border-hair bg-white px-2 text-sm'

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink md:text-[28px]">
            <Recycle size={22} className="text-brand-ink" />
            מציאון
          </h1>
          <p className="mt-0.5 text-sm text-muted">אל תזרוק — אולי נגר אחר צריך בדיוק את זה.</p>
        </div>
        {canPost && (
          <div className="flex gap-2">
            <Link
              href="/app/metzion/mine"
              className="flex h-11 items-center gap-1.5 rounded-[11px] border border-hair bg-white px-3 text-sm font-semibold text-ink"
            >
              <ListChecks size={16} />
              המודעות שלי
            </Link>
            <Link
              href="/app/metzion/new"
              className="flex h-11 items-center gap-1.5 rounded-[11px] bg-brand px-4 text-sm font-bold text-navy"
            >
              <Plus size={17} />
              פרסם
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-faint"
            style={{ insetInlineStart: '0.75rem' }}
          />
          <input
            id="metzion-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="מה מחפשים? MDF, מסור, ידיות…"
            aria-label="חיפוש במציאון"
            className="h-12 w-full rounded-xl border border-hair bg-white ps-10 pe-3"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          className={`relative flex h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${
            filtersOpen || activeFilters ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
          }`}
        >
          <SlidersHorizontal size={17} />
          <span className="hidden sm:inline">סינון</span>
          {activeFilters > 0 && (
            <span className="tnum flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Deal type is the one choice most people make first, so it stays out. */}
      <div className="flex gap-2">
        {(
          [
            ['all', 'הכל'],
            ['sale', 'למכירה'],
            ['free', 'למסירה בחינם'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDeal(key)}
            aria-pressed={deal === key}
            className={`h-9 rounded-full border px-3.5 text-sm font-semibold ${
              deal === key ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtersOpen && (
        <div className="grid gap-3 rounded-xl border border-hair bg-white p-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium text-muted">קטגוריה</span>
            <select id="metzion-category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="all">הכל</option>
              {METZION_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">אזור</span>
            <select id="metzion-region" value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass}>
              <option value="all">כל הארץ</option>
              {REGIONS.map((item) => (
                <option key={item.key} value={item.key}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">מצב</span>
            <select id="metzion-condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={selectClass}>
              <option value="all">הכל</option>
              {METZION_CONDITIONS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">מיון</span>
            <select id="metzion-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectClass}>
              <option value="new">החדשות ראשונות</option>
              <option value="price_low">מחיר: מהזול</option>
              <option value="price_high">מחיר: מהיקר</option>
            </select>
          </label>
          {activeFilters > 0 && (
            <button type="button" onClick={clear} className="flex h-9 items-center gap-1 text-sm font-semibold text-muted sm:col-span-4">
              <X size={15} />
              נקה סינון
            </button>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-hair bg-white p-10 text-center">
          <Recycle size={40} className="mx-auto text-[#D9CFC1]" />
          <p className="mt-3 text-lg font-bold text-ink">המציאון עוד ריק</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            יש לך עודף MDF, קופסת צירים שלא נגמרה או מכונה שעומדת בצד? תהיה הראשון.
          </p>
          {canPost && (
            <Link href="/app/metzion/new" className="mt-5 inline-flex h-12 items-center gap-2 rounded-[11px] bg-brand px-6 font-bold text-navy">
              <Plus size={18} />
              פרסם מודעה ראשונה
            </Link>
          )}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-hair bg-white p-8 text-center">
          <p className="font-semibold text-ink">אין מודעות שמתאימות</p>
          <button type="button" onClick={() => { clear(); setQuery('') }} className="mt-2 text-sm font-semibold text-brand-ink underline">
            להציג הכל
          </button>
        </div>
      ) : (
        <>
          <p className="tnum text-xs text-muted">
            {shown.length} מודעות
            {region !== 'all' && ` ב${regionName(region)}`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((card) => (
              <Card key={card.id} card={card} onOpen={() => setOpenId(card.id)} />
            ))}
          </div>
        </>
      )}

      {open && <ListingSheet card={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}
