import { describe, expect, it } from 'vitest'
import { safeSitePath } from './notification-links'

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
