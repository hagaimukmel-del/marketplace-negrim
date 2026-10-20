import 'server-only'

import { randomBytes } from 'node:crypto'

/**
 * "כניסה עם גוגל" for carpentries whose registered email is a Google account.
 *
 * Plain OAuth 2.0 / OpenID Connect against Google, no library: send the
 * browser to Google with a random `state` held in a short cookie, take the
 * code back, swap it for an ID token, and read the verified email out of it.
 * The email is then matched to a carpentry exactly like the login form does.
 * Google signing someone in never creates a carpentry; registration stays
 * /join, with its terms and delivery address.
 *
 * Off until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set. Each host the
 * site runs on needs `<origin>/carpenter/google/callback` registered as an
 * authorised redirect URI in the Google Cloud console.
 */

export const STATE_COOKIE = 'negrim_google_state'

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function callbackUrl(requestUrl: string): string {
  return new URL('/carpenter/google/callback', requestUrl).toString()
}

export function newState(): string {
  return randomBytes(24).toString('base64url')
}

export function authorizeUrl(requestUrl: string, state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: callbackUrl(requestUrl),
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  }).toString()
  return url.toString()
}

interface IdTokenClaims {
  iss?: string
  aud?: string
  exp?: number
  email?: string
  email_verified?: boolean | string
}

/**
 * The verified email in an ID token, or null.
 *
 * The token comes straight from Google's token endpoint over TLS, in answer
 * to our own client secret, so OpenID Connect (Core §3.1.3.7) lets the
 * signature check be skipped; the claims are still checked.
 */
export function verifiedEmail(idToken: string, now = Date.now()): string | null {
  const payload = idToken.split('.')[1]
  if (!payload) return null

  let claims: IdTokenClaims
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as IdTokenClaims
  } catch {
    return null
  }

  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return null
  if (!claims.aud || claims.aud !== process.env.GOOGLE_CLIENT_ID) return null
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < now) return null
  if (claims.email_verified !== true && claims.email_verified !== 'true') return null
  return typeof claims.email === 'string' && claims.email.includes('@') ? claims.email.toLowerCase() : null
}

/** Swap the code Google handed back for the signed-in account's verified email. */
export async function exchangeCode(code: string, requestUrl: string): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: callbackUrl(requestUrl),
      grant_type: 'authorization_code',
    }),
  })
  if (!response.ok) return null
  const data = (await response.json()) as { id_token?: string }
  return data.id_token ? verifiedEmail(data.id_token) : null
}
