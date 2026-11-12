import { describe, expect, it } from 'vitest'
import { cleanRef, landingRef } from './landing-ref'

describe('landingRef', () => {
  it('prefers our own ref', () => {
    expect(landingRef({ ref: 'WA-Roi', utm_source: 'facebook' })).toBe('wa-roi')
  })

  it('joins the utm fields that are present', () => {
    expect(landingRef({ utm_source: 'facebook', utm_campaign: 'Suppliers Nov' })).toBe('facebook/suppliers-nov')
    expect(landingRef({ utm_source: 'whatsapp', utm_medium: 'personal' })).toBe('whatsapp/personal')
  })

  it('keeps Hebrew and drops everything unsafe', () => {
    expect(landingRef({ ref: 'קבוצה<script>' })).toBe('קבוצהscript')
    expect(landingRef({ ref: ['a"b', 'c'] })).toBe('ab')
  })

  it('returns null without a source', () => {
    expect(landingRef({})).toBeNull()
    expect(landingRef({ ref: '   ' })).toBeNull()
  })
})

describe('cleanRef', () => {
  it('accepts a label built by landingRef', () => {
    expect(cleanRef('facebook/suppliers-nov')).toBe('facebook/suppliers-nov')
  })

  it('rejects what is not a string and caps the length', () => {
    expect(cleanRef(42)).toBeNull()
    expect(cleanRef('')).toBeNull()
    expect(cleanRef('x'.repeat(200))?.length).toBeLessThanOrEqual(60)
  })
})
