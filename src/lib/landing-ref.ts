/**
 * Where a visitor came from, read from the link they opened: `?ref=` when we
 * wrote the link ourselves, or the usual `utm_source` / `utm_medium` /
 * `utm_campaign` when a link was built for a post or an ad. The result is a
 * short label such as `whatsapp/personal` that travels with the visitor to
 * the sign-up form and the operator's email. It is never trusted for anything
 * but that label, so it is cut down to a safe alphabet and length.
 */

type Params = Record<string, string | string[] | undefined>

const MAX = 60

function clean(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return ''
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9֐-׿._-]/g, '')
    .slice(0, 30)
}

export function landingRef(params: Params): string | null {
  const ref = clean(params.ref)
  if (ref) return ref.slice(0, MAX)
  const parts = [clean(params.utm_source), clean(params.utm_medium), clean(params.utm_campaign)].filter(Boolean)
  return parts.length ? parts.join('/').slice(0, MAX) : null
}

/** A label that came back from the browser, e.g. in the sign-up form's body. */
export function cleanRef(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .split('/')
    .map((part) => clean(part))
    .filter(Boolean)
    .join('/')
    .slice(0, MAX)
  return cleaned || null
}
