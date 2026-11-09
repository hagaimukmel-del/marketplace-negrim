import { describe, expect, it } from 'vitest'
import { isSocialHour, socialKey, socialPosts } from './promo-social-rules'

describe('isSocialHour', () => {
  it('is Sunday 07:00 in Israel in winter (UTC+2) and in summer (UTC+3)', () => {
    expect(isSocialHour(new Date('2026-11-15T05:10:00Z'))).toBe(true)
    expect(isSocialHour(new Date('2026-11-15T04:10:00Z'))).toBe(false)
    expect(isSocialHour(new Date('2026-07-05T04:10:00Z'))).toBe(true)
    expect(isSocialHour(new Date('2026-07-05T05:10:00Z'))).toBe(false)
  })

  it('is never on another day', () => {
    expect(isSocialHour(new Date('2026-11-16T05:10:00Z'))).toBe(false)
  })
})

describe('socialPosts', () => {
  const base = { productName: 'דבק PUR', supplierName: 'איתמיר', brand: 'Kleiberit', priceText: null, url: 'https://x/app/product/1' }

  it('names product, brand, supplier and link, without a price unless asked', () => {
    const { short, long } = socialPosts(base)
    for (const text of [short, long]) {
      expect(text).toContain('דבק PUR (Kleiberit)')
      expect(text).toContain('איתמיר')
      expect(text).toContain('https://x/app/product/1')
      expect(text).not.toContain('מע״מ')
    }
    expect(short).toContain('מוצר השבוע שלנו')
  })

  it('shows the price when the supplier asked for it', () => {
    expect(socialPosts({ ...base, priceText: '₪89' }).short).toContain('₪89 לפני מע״מ')
  })

  it('does not repeat a brand already in the name', () => {
    expect(socialPosts({ ...base, productName: 'Kleiberit 501' }).short).toContain('Kleiberit 501\n')
  })
})

it('keys the mail by booking', () => {
  expect(socialKey('w1')).toBe('promo-social:w1')
})
