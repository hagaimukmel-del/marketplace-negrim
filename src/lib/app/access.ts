import 'server-only'

import { isAdmin } from '@/lib/admin-auth'

/**
 * The switch for the new purchasing app at /app.
 *
 * Launched 18.09.2026: the app is the carpenter site, and the old carpenter
 * routes redirect here (next.config.ts). Setting this back to false hides it
 * from everyone but the operator — the old screens are gone, so that is a
 * maintenance switch, not a way back.
 */
export const APP_LIVE = true

/**
 * APP_PREVIEW_OPEN=true opens it without the operator login. It is set only in
 * the local .env.local, which points at the staging database — never on Vercel.
 */
export async function canUseApp(): Promise<boolean> {
  if (APP_LIVE) return true
  if (process.env.APP_PREVIEW_OPEN === 'true' && process.env.NODE_ENV !== 'production') return true
  return isAdmin()
}
