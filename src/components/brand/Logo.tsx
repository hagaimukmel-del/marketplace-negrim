/**
 * The Nagarim mark and wordmark.
 *
 * Drawn as inline SVG rather than an image file, so it is sharp at every size,
 * costs no request, and takes its colours from the surface it sits on: on a
 * light page the two bars are navy, on a dark one they are white. The band
 * that makes the N is always the same amber — that is the part people remember.
 *
 * The geometry is the one in /public/brand and src/app/icon.svg, on a 100-unit
 * grid, so every copy of the logo is literally the same shape.
 */

export const BRAND = {
  navy: '#1E2A3B',
  navyDeep: '#172131',
  white: '#F8FAFC',
  amber: '#F29A12',
  amberDeep: '#DC6F0C',
  amberLight: '#F6BE3A',
} as const

function Band() {
  return (
    <>
      <polygon points="36.5,30 50,30 63.5,75 50,75" fill="url(#nagarim-band)" />
      <polygon points="43.25,30 50,30 63.5,75 56.75,75" fill={BRAND.amberLight} opacity="0.35" />
    </>
  )
}

function Gradient() {
  return (
    <defs>
      <linearGradient id="nagarim-band" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={BRAND.amber} />
        <stop offset="1" stopColor={BRAND.amberDeep} />
      </linearGradient>
    </defs>
  )
}

/**
 * The N on its own.
 * `tile` draws it on the navy rounded square — the app icon. Without a tile it
 * is just the letter, and `onDark` decides whether the bars are white or navy.
 */
export function LogoMark({
  size = 32,
  tile = true,
  onDark = false,
  className,
}: {
  size?: number
  tile?: boolean
  onDark?: boolean
  className?: string
}) {
  const bars = tile || onDark ? BRAND.white : BRAND.navy
  return (
    <svg
      viewBox={tile ? '0 0 100 100' : '20 20 60 60'}
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className={className}
    >
      <Gradient />
      {tile && (
        <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="24" fill={BRAND.navy} stroke="#334155" strokeWidth="1.5" />
      )}
      <rect x="22.5" y="22.5" width="14" height="55" rx="3" fill={bars} />
      <rect x="63.5" y="22.5" width="14" height="55" rx="3" fill={bars} />
      <Band />
    </svg>
  )
}

/**
 * Mark plus "NAGARIM / B2B MARKETPLACE".
 *
 * Always laid out left to right, as the brand is, even inside the Hebrew page.
 * The tagline drops away on a phone header where the space belongs to the cart.
 */
export default function Logo({
  size = 'md',
  onDark = false,
  tagline = true,
  compact = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  onDark?: boolean
  /** 'always', or true to show it from the sm breakpoint up. */
  tagline?: boolean | 'always'
  /** On a phone show only the mark; the word appears from the sm breakpoint. */
  compact?: boolean
  className?: string
}) {
  const scale = { sm: { mark: 30, word: 'text-[17px]', tag: 'text-[8px]' }, md: { mark: 40, word: 'text-[22px]', tag: 'text-[9.5px]' }, lg: { mark: 56, word: 'text-[32px]', tag: 'text-[12px]' } }[size]

  return (
    <span dir="ltr" aria-label="Nagarim — שוק הנגרים" role="img" className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={scale.mark} tile />
      <span className={`${compact ? 'hidden sm:flex' : 'flex'} flex-col leading-none`} aria-hidden>
        <span
          className={`${scale.word} font-extrabold tracking-[0.02em]`}
          style={{ color: onDark ? BRAND.white : BRAND.navy, fontFamily: 'ui-sans-serif, "Segoe UI", system-ui, Arial, sans-serif' }}
        >
          NAGARIM
        </span>
        {tagline && (
          <span
            className={`${scale.tag} mt-[3px] font-bold tracking-[0.32em] ${tagline === 'always' ? '' : 'hidden sm:block'}`}
            style={{ color: BRAND.amberDeep, fontFamily: 'ui-sans-serif, "Segoe UI", system-ui, Arial, sans-serif' }}
          >
            B2B MARKETPLACE
          </span>
        )}
      </span>
    </span>
  )
}
