/**
 * A notification's link is a path in this site. Anything else (an absolute
 * URL, a protocol-relative `//host`) falls back, so a stored link can never
 * send someone off the site.
 */
export function safeSitePath(link: string | null | undefined, fallback: string): string {
  return typeof link === 'string' && /^\/(?![/\\])/.test(link) ? link : fallback
}
