'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { NO_FILTERS, applyFilters, type CatalogFilters, type FilterOptions } from '@/lib/app/catalog-filters'
import type { AppProduct } from '@/lib/app/products'

/**
 * The catalogue's filters, as a sheet from the bottom on a phone and a dialog
 * on a desktop. Changes stay a draft until "הצג", which says how many products
 * the draft leaves, so nobody applies a filter that empties the list by
 * surprise. Only sections with something to choose between are shown.
 */
export default function FilterSheet({
  products,
  options,
  value,
  showPrices,
  myRegions,
  onApply,
  onClose,
}: {
  products: AppProduct[]
  options: FilterOptions
  value: CatalogFilters
  showPrices: boolean
  myRegions: string[]
  onApply: (next: CatalogFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  const shown = applyFilters(products, draft).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const toggle = (key: 'suppliers' | 'regions' | 'brands', item: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(item) ? d[key].filter((x) => x !== item) : [...d[key], item] }))
  const setPrice = (key: 'minPrice' | 'maxPrice', raw: string) => {
    const n = raw.trim() === '' ? null : Number(raw)
    setDraft((d) => ({ ...d, [key]: n != null && Number.isFinite(n) && n >= 0 ? n : null }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,20,28,.42)] md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="סינון מוצרים"
        className="flex max-h-[88dvh] w-full flex-col rounded-t-[22px] bg-white md:max-h-[80vh] md:w-[520px] md:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hair px-4 py-3">
          <h3 className="m-0 text-[19px] font-bold">סינון</h3>
          <button type="button" onClick={onClose} aria-label="סגירה" className="grid h-10 w-10 place-items-center rounded-full text-muted">
            <X size={22} />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto px-4 py-4">
          {showPrices && (
            <Section title="מחיר ליחידה" note="לפני מע״מ, לפי היחידה של המוצר (ק״ג, ליטר, יחידה)">
              {options.priceRanges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.priceRanges.map((range) => (
                    <Toggle
                      key={range.label}
                      active={draft.minPrice === range.min && draft.maxPrice === range.max}
                      onClick={() =>
                        setDraft((d) =>
                          d.minPrice === range.min && d.maxPrice === range.max ? { ...d, minPrice: null, maxPrice: null } : { ...d, minPrice: range.min, maxPrice: range.max }
                        )
                      }
                    >
                      <bdi className="tnum">{range.label}</bdi>
                    </Toggle>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <PriceInput label="מ־" value={draft.minPrice} onChange={(raw) => setPrice('minPrice', raw)} />
                <span className="text-muted">–</span>
                <PriceInput label="עד" value={draft.maxPrice} onChange={(raw) => setPrice('maxPrice', raw)} />
              </div>
            </Section>
          )}

          {options.imageSplit && (
            <Section title="תמונה">
              <div className="flex flex-wrap gap-2">
                <Toggle active={draft.withImage} onClick={() => setDraft((d) => ({ ...d, withImage: !d.withImage }))}>
                  רק מוצרים עם תמונה
                </Toggle>
              </div>
            </Section>
          )}

          {options.regions.length > 0 && (
            <Section title="אזור הספק" note="איפה הספק נמצא או לאן הוא מספק">
              <div className="flex flex-wrap gap-2">
                {options.regions.map((region) => (
                  <Toggle key={region.key} active={draft.regions.includes(region.key)} onClick={() => toggle('regions', region.key)}>
                    {region.name}
                    {myRegions.includes(region.key) && <small className="font-normal opacity-80"> · שלך</small>}
                  </Toggle>
                ))}
              </div>
            </Section>
          )}

          {options.suppliers.length > 0 && (
            <Section title="ספק">
              <div className="grid gap-1">
                {options.suppliers.map((supplier) => (
                  <CheckRow key={supplier.id} checked={draft.suppliers.includes(supplier.id)} onChange={() => toggle('suppliers', supplier.id)} count={supplier.count}>
                    {supplier.name}
                  </CheckRow>
                ))}
              </div>
            </Section>
          )}

          {options.brands.length > 0 && (
            <Section title="מותג">
              <div className="flex flex-wrap gap-2">
                {options.brands.map((brand) => (
                  <Toggle key={brand.name} active={draft.brands.includes(brand.name)} onClick={() => toggle('brands', brand.name)}>
                    <bdi>{brand.name}</bdi> <small className="tnum font-normal opacity-70">{brand.count}</small>
                  </Toggle>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="flex gap-2 border-t border-hair px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => setDraft({ ...NO_FILTERS, sort: draft.sort })}
            className="h-12 shrink-0 rounded-[11px] border-[1.5px] border-hair bg-white px-4 font-bold"
          >
            נקה הכול
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={shown === 0}
            className="h-12 flex-1 rounded-[11px] bg-brand px-4 font-bold text-navy hover:bg-brand-hover disabled:bg-[#EFE9E0] disabled:text-faint"
          >
            {shown === 0 ? 'אין מוצרים כאלה' : <>הצג <span className="tnum">{shown}</span> מוצרים</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <div>
        <h4 className="m-0 text-[15.5px] font-bold">{title}</h4>
        {note && <p className="m-0 text-[13px] text-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1 rounded-full border px-3.5 text-[14px] font-semibold ${active ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'}`}
    >
      {children}
    </button>
  )
}

function CheckRow({ checked, onChange, count, children }: { checked: boolean; onChange: () => void; count: number; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-[1.5px] ${checked ? 'border-navy bg-navy text-white' : 'border-hair bg-white'}`} aria-hidden>
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="flex-1 text-[15px]">{children}</span>
      <span className="tnum text-[13px] text-muted">{count}</span>
    </label>
  )
}

function PriceInput({ label, value, onChange }: { label: string; value: number | null; onChange: (raw: string) => void }) {
  return (
    <label className="relative flex-1">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="₪"
        aria-label={`מחיר ${label}`}
        className="tnum h-12 w-full rounded-[10px] border-[1.5px] border-hair bg-white pe-3 ps-10 text-base"
      />
    </label>
  )
}
