'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'
import CategoryGlyph from './CategoryGlyph'

/**
 * The product's photo where the supplier has uploaded one, otherwise the
 * category's glyph on the wood tile the catalogue has always shown. Google
 * Drive share links are skipped outright: they never render when hot-linked
 * and only fail after a long wait (see /o/[token]).
 *
 * With `zoom`, a real photo opens full size on tap or click. The glyph tile has
 * nothing to enlarge, so with `href` it stays a way into the product page.
 */
export default function ProductImage({
  src,
  icon,
  size,
  glyph,
  className = '',
  zoom,
  href,
  wrap = '',
}: {
  src: string | null
  icon: string | null
  /** Tailwind size and radius classes for the tile. */
  size: string
  glyph: number
  className?: string
  /** The product's name: makes a real photo open full size, and labels it. */
  zoom?: string
  /** Where the tile leads when there is no photo to enlarge. */
  href?: string
  /** Classes for the link or button around the tile, e.g. `block w-full` for a card photo. */
  wrap?: string
}) {
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const usable = Boolean(src) && !src!.includes('drive.google.com') && !failed

  if (!usable) {
    const tile = (
      <span aria-hidden className={`grid shrink-0 place-items-center bg-wood-soft text-[#7A5A3A] ${size} ${className}`}>
        <CategoryGlyph icon={icon} size={glyph} />
      </span>
    )
    return href ? (
      <Link href={href} tabIndex={-1} aria-hidden className={`shrink-0 ${wrap}`}>
        {tile}
      </Link>
    ) : (
      tile
    )
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt={zoom ?? ''}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 border border-hair bg-white object-contain ${size} ${className}`}
    />
  )
  if (!zoom) return img

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`הגדלת התמונה של ${zoom}`}
        className={`group relative shrink-0 cursor-zoom-in ${wrap}`}
      >
        {img}
        <span aria-hidden className="absolute bottom-1.5 end-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-navy shadow-sm group-hover:bg-white">
          <ZoomIn size={17} strokeWidth={2.4} />
        </span>
      </button>
      {open && <Lightbox src={src!} name={zoom} onClose={() => setOpen(false)} />}
    </>
  )
}

/** The photo as large as the screen allows. Closes on ✕, Escape, or a tap outside it. */
function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={onClose}
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(15,20,28,.82)] p-4 pt-16"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="סגירה"
        className="absolute end-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white text-navy shadow-lg"
      >
        <X size={22} />
      </button>
      <figure className="m-0 grid max-w-full justify-items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="max-h-[78dvh] max-w-[min(92vw,900px)] rounded-2xl bg-white object-contain p-2" />
        <figcaption className="max-w-[min(92vw,900px)] text-center text-[15px] font-semibold text-white">{name}</figcaption>
      </figure>
    </div>,
    document.body
  )
}
