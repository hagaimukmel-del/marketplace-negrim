'use client'

/**
 * Remembers which carpenter is using this browser.
 *
 * The token in /o/[token] is the whole identity, but it only existed for as
 * long as that page was open. The moment someone followed a link to the
 * catalogue they became anonymous again: the order they then placed carried no
 * carpenter_id, never appeared in their own order history, and never fed the
 * "what you ordered last time" list that the offer page is built around.
 *
 * Storing it here keeps the identity across the whole visit. It is not a
 * credential in the security sense — anyone holding the token already has full
 * access to that carpenter's page, by design — so localStorage is the right
 * weight for it. Every server-side use still re-resolves the token against the
 * database rather than trusting anything the browser says about who it is.
 */

const KEY = 'negrim-carpenter-token'

export function rememberCarpenter(token: string): void {
  try {
    if (token) localStorage.setItem(KEY, token)
  } catch {
    // Private browsing, or site data blocked. The visit still works; it just
    // will not be attributed.
  }
}

export function getCarpenterToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function forgetCarpenter(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
