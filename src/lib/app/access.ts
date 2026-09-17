import 'server-only'

import { isAdmin } from '@/lib/admin-auth'

/**
 * The switch for the new purchasing app at /app.
 *
 * While it is false the app is visible only to the operator, on the live site
 * and with live data, so it can be reviewed exactly as a carpenter will see it.
 * Carpenters keep the existing screens. Flipping this to true — together with
 * the redirects from the old carpenter routes — is the launch.
 */
export const APP_LIVE = false

/**
 * APP_PREVIEW_OPEN=true opens it without the operator login. It is set only in
 * the local .env.local, which points at the staging database — never on Vercel.
 */
export async function canUseApp(): Promise<boolean> {
  if (APP_LIVE) return true
  if (process.env.APP_PREVIEW_OPEN === 'true' && process.env.NODE_ENV !== 'production') return true
  return isAdmin()
}
