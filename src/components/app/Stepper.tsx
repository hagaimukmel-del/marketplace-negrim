'use client'

import { Minus, Plus } from 'lucide-react'

/**
 * Quantity in packs. The value shown is packs; `onChange` receives packs too —
 * the caller turns them into base units, because only it knows the pack size.
 */
export default function Stepper({
  value,
  onChange,
  min = 0,
  small = false,
  tone = 'plain',
  label,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  small?: boolean
  /** 'cart' draws it green: this product is already in the order. */
  tone?: 'plain' | 'cart'
  label: string
}) {
  const size = small ? 'h-[34px] w-[34px]' : 'h-11 w-11'
  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-xl border-[1.5px] bg-white ${tone === 'cart' ? 'border-ok' : 'border-hair'}`}
      onClick={(e) => e.preventDefault()}
    >
      <button type="button" className={`${size} grid place-items-center text-navy`} aria-label={`הוסף — ${label}`} onClick={() => onChange(value + 1)}>
        <Plus size={small ? 16 : 18} strokeWidth={2.4} />
      </button>
      <output className={`tnum text-center font-bold ${small ? 'min-w-[26px] text-[15px]' : 'min-w-[34px] text-base'} ${tone === 'cart' ? 'text-ok-ink' : ''}`}>{value}</output>
      <button
        type="button"
        className={`${size} grid place-items-center text-navy disabled:opacity-40`}
        aria-label={`הפחת — ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={small ? 16 : 18} strokeWidth={2.4} />
      </button>
    </span>
  )
}
