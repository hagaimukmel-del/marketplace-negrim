import { describe, expect, it } from 'vitest'
import { safeNext, safeSitePath } from './notification-links'

describe('safeSitePath', () => {
  it('keeps a path in the site', () => {
    expect(safeSitePath('/app/orders/1', '/x')).toBe('/app/orders/1')
    expect(safeSitePath('/supplier?tab=orders', '/x')).toBe('/supplier?tab=orders')
  })

  it('falls back for anything that could leave the site', () => {
    expect(safeSitePath('//evil.example', '/x')).toBe('/x')
    expect(safeSitePath('/\\evil.example', '/x')).toBe('/x')
    expect(safeSitePath('https://evil.example', '/x')).toBe('/x')
    expect(safeSitePath(null, '/x')).toBe('/x')
  })
})

describe('safeNext', () => {
  it('allows a path inside the area only', () => {
    expect(safeNext('/supplier/messages/1', '/supplier')).toBe('/supplier/messages/1')
    expect(safeNext('/supplier?tab=orders', '/supplier')).toBe('/supplier?tab=orders')
    expect(safeNext('/app/messages/1', '/supplier')).toBeNull()
    expect(safeNext('/supplierX', '/supplier')).toBeNull()
    expect(safeNext('//evil.example/supplier', '/supplier')).toBeNull()
    expect(safeNext(null, '/app')).toBeNull()
  })
})
