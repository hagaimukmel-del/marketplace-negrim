import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const admin = vi.hoisted(() => ({ yes: false, read: vi.fn() }))

vi.mock('@/lib/admin-auth', () => ({ isAdmin: async () => admin.yes }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    admin.read()
    throw new Error('read the database')
  },
}))

const specs = await import('./specs/route')
const link = await import('./link/route')

describe('product knowledge reads are for the operator only', () => {
  for (const [name, GET] of [['specs', specs.GET], ['link', link.GET]] as const) {
    it(`${name}: a visitor gets 401 and nothing is read`, async () => {
      admin.yes = false
      const response = await GET(new NextRequest(`http://localhost/api/admin/product-knowledge/${name}?product_id=p1`))
      expect(response.status).toBe(401)
      expect(admin.read).not.toHaveBeenCalled()
    })
  }
})
