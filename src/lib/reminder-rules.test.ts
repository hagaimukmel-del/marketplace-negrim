import { describe, expect, it } from 'vitest'
import { nextRung, rungDue, rungKey } from './reminder-rules'

describe('rungDue', () => {
  it('climbs by working minutes', () => {
    expect(rungDue(0)).toBeNull()
    expect(rungDue(119)).toBeNull()
    expect(rungDue(120)).toBe(1)
    expect(rungDue(540)).toBe(2)
    expect(rungDue(5000)).toBe(3)
  })
})

describe('nextRung', () => {
  it('acts once per rung', () => {
    expect(nextRung(130, new Set())).toBe(1)
    expect(nextRung(130, new Set([1]))).toBeNull()
    expect(nextRung(600, new Set([1]))).toBe(2)
  })

  it('jumps to the highest rung due, and never back down', () => {
    expect(nextRung(2000, new Set())).toBe(3)
    expect(nextRung(600, new Set([3]))).toBeNull()
  })

  it('keys a rung by subject and id', () => {
    expect(rungKey('order', 'abc', 2)).toBe('order:abc:2')
  })
})
