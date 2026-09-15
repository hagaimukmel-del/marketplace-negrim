import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Who the supplier is.
 *
 * The same shape the carpenters use, and for the same reason: a supplier will
 * not create a password to update a price list, and waiting on an account
 * system meant the console built for them stayed unreachable. Approving
 * somebody and leaving them at a locked door is worse than not approving them.
 *
 * It is a stronger credential than the carpenter's, though, and treated as one.
 * A carpenter's link shows their own prices; a supplier's link edits what the
 * whole marketplace pays. So: only an APPROVED supplier can mint a session, the
 * status is re-read from the database on every use rather than trusted from the
 * cookie — so a rejected supplier loses access the moment they are rejected,
 * however long their cookie still has to run.
 */

const COOKIE = 'negrim_supplier'
const PURPOSE = 'supplier-session.v1'

/**
 * Six months, the same as a carpenter. It was thirty days, and in practice that
 * meant a supplier went through email, link and sign-in again every month — the
 * slowest part of the whole flow, repeated for nothing. Access is still
 * re-checked against the database on every request, which is what actually
 * protects against a supplier who should no longer be let in.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * Derived from ADMIN_SECRET with its own label, so one of these can never
 * verify as an admin cookie, a carpenter session, or an order-confirmation
 * link. Different label, different key.
 */
function key(): Buffer {
  const value = process.env.ADMIN_SECRET
  if (!value || value.length < 16) {
    throw new Error(
      'ADMIN_SECRET is missing or too short (needs 16+ characters). Add it to .env.local.'
    )
  }
  return createHmac('sha256', value).update(PURPOSE).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', key()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function buildSupplierCookie(supplierId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `${supplierId}.${expiresAt}`
  return {
    name: COOKIE,
    value: `${payload}.${sign(payload)}`,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function clearSupplierCookie() {
  return { ...buildSupplierCookie('x'), value: '', maxAge: 0 }
}

/** The supplier id this browser has proved. Signature and expiry only. */
export async function getSupplierId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null

  const [supplierId, expiresAt, signature] = parts
  const expiry = Number(expiresAt)
  if (!supplierId || !Number.isFinite(expiry) || expiry < Date.now()) return null

  try {
    return safeEqual(signature, sign(`${supplierId}.${expiresAt}`)) ? supplierId : null
  } catch {
    return null
  }
}

export interface SessionSupplier {
  id: string
  token: string
  company_name: string
  business_id: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  pickup_address: string | null
  min_order_value_excl_vat: number | null
  default_lead_time_days: number | null
  logo_url: string | null
  sells_note: string | null
}

const COLUMNS =
  'id, token, company_name, business_id, contact_name, phone, email, city, address, ' +
  'pickup_address, min_order_value_excl_vat, default_lead_time_days, logo_url, sells_note'

/**
 * The supplier behind the cookie, re-read every time.
 *
 * The signature proves which id the browser holds; it cannot prove the supplier
 * is still approved. A rejected supplier must stop being able to edit prices
 * the moment they are rejected, not months later when their cookie lapses.
 */
export async function getSessionSupplier(): Promise<SessionSupplier | null> {
  const id = await getSupplierId()
  if (!id) return null

  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select(COLUMNS)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()

  return (data as SessionSupplier | null) ?? null
}

/** Resolve an entry link. Only an approved supplier gets a session. */
export async function resolveSupplierToken(token: string): Promise<SessionSupplier | null> {
  const trimmed = token.trim()
  if (!trimmed) return null

  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select(COLUMNS)
    .eq('token', trimmed)
    .eq('status', 'approved')
    .maybeSingle()

  return (data as SessionSupplier | null) ?? null
}
