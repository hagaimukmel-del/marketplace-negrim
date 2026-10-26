import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.ADMIN_SECRET = 'test-secret-at-least-16-chars'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}))
const admin = { signedIn: false }
vi.mock('./admin-auth', () => ({ isAdmin: async () => admin.signedIn }))
vi.mock('./supabase-admin', () => ({ getSupabaseAdmin: () => ({}) }))

const { buildSupplierCookie, getSupplierId } = await import('./supplier-auth')
const { isAdminLookingAtSupplier, refuseAdminWriteFor } = await import('./admin-scope')

const signIn = (cookie: { name: string; value: string }) => jar.set(cookie.name, cookie.value)

/** A cookie in the shape minted before the door was recorded. */
function legacyCookie(supplierId: string) {
  const key = createHmac('sha256', process.env.ADMIN_SECRET!).update('supplier-session.v1').digest()
  const payload = `${supplierId}.${Date.now() + 60_000}`
  return { name: 'negrim_supplier', value: `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}` }
}

beforeEach(() => {
  jar.clear()
  admin.signedIn = false
})

describe('supplier console: owner or operator looking', () => {
  it('the owner signed in through his own link edits, even with the admin cookie', async () => {
    signIn(buildSupplierCookie('S1', 'own'))
    admin.signedIn = true
    expect(await isAdminLookingAtSupplier()).toBe(false)
    expect(await refuseAdminWriteFor({ source: 'self' })).toBeNull()
  })

  it('a session opened from the admin is read-only on a self-run supplier', async () => {
    signIn(buildSupplierCookie('S1', 'admin'))
    admin.signedIn = true
    expect((await refuseAdminWriteFor({ source: 'self' }))?.status).toBe(403)
  })

  it('stays read-only after the admin cookie lapses', async () => {
    signIn(buildSupplierCookie('S1', 'admin'))
    expect(await isAdminLookingAtSupplier()).toBe(true)
  })

  it('the operator still edits suppliers he runs', async () => {
    signIn(buildSupplierCookie('S1', 'admin'))
    admin.signedIn = true
    expect(await refuseAdminWriteFor({ source: 'admin' })).toBeNull()
  })

  it('an old cookie counts as the operator only while the admin cookie is there', async () => {
    signIn(legacyCookie('S1'))
    expect(await getSupplierId()).toBe('S1')
    expect(await isAdminLookingAtSupplier()).toBe(false)
    admin.signedIn = true
    expect(await isAdminLookingAtSupplier()).toBe(true)
  })

  it('an admin session cannot be relabelled as the owner', async () => {
    const [id, expiry, , signature] = buildSupplierCookie('S1', 'admin').value.split('.')
    jar.set('negrim_supplier', [id, expiry, 'own', signature].join('.'))
    expect(await getSupplierId()).toBeNull()
  })
})
