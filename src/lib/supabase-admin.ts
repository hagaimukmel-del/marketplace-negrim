import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Supabase client holding the service role key.
 *
 * The service role bypasses row level security, so this client can read and
 * write the tables migration 0002 closed to the public key: orders,
 * order_items, suppliers, and the rest of the business records.
 *
 * It must never reach the browser. The `server-only` import above makes a
 * client component that imports this file fail at build time rather than
 * shipping the key in the bundle.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment. Note the missing
 * NEXT_PUBLIC_ prefix — that is what keeps it server-side.
 */

let cached: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Copy the secret key from the Supabase ' +
        'dashboard (Settings -> API Keys -> Secret keys) into .env.local. It is ' +
        'required because migration 0002 made orders and suppliers server-only.'
    )
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return cached
}
