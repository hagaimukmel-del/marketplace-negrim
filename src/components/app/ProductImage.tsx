'use client'

import { useState } from 'react'
import CategoryGlyph from './CategoryGlyph'

/**
 * The product's photo where the supplier has uploaded one, otherwise the
 * category's glyph on the wood tile the catalogue has always shown. Google
 * Drive share links are skipped outright: they never render when hot-linked
 * and only fail after a long wait (see /o/[token]).
 */
export default function ProductImage({
  src,
  icon,
  size,
  glyph,
  className = '',
}: {
  src: string | null
  icon: string | null
  /** Tailwind size and radius classes for the tile. */
  size: string
  glyph: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const usable = Boolean(src) && !src!.includes('drive.google.com') && !failed

  if (!usable) {
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center bg-wood-soft text-[#7A5A3A] ${size} ${className}`}>
        <CategoryGlyph icon={icon} size={glyph} />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 border border-hair bg-white object-contain ${size} ${className}`}
    />
  )
}
