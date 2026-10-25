/**
 * A notification's link is a path in this site. Anything else (an absolute
 * URL, a protocol-relative `//host`) falls back, so a stored link can never
 * send someone off the site.
 */
export function safeSitePath(link: string | null | undefined, fallback: string): string {
  return typeof link === 'string' && /^\/(?![/\\])/.test(link) ? link : fallback
}

/**
 * Where to go after signing in, from a `next` query value: only a path inside
 * the given area (`/app` or `/supplier`), so a crafted link cannot bounce
 * someone off the site or into the other side's screens.
 */
export function safeNext(next: string | null | undefined, area: '/app' | '/supplier'): string | null {
  const path = safeSitePath(next, '')
  return path === area || path.startsWith(`${area}/`) || path.startsWith(`${area}?`) ? path : null
}
