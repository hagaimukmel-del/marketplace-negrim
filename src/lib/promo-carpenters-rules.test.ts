import { describe, expect, it } from 'vitest'
import {
  carpentersKey,
  isMarketingUnsubscribeSignature,
  marketingUnsubscribeSignature,
  mayMarket,
  promoCarpentersSubject,
} from './promo-carpenters-rules'
import { unsubscribeSignature } from './work-notify'

const ok = {
  email: 'a@b.co',
  email_verified_at: '2026-10-01T00:00:00Z',
  is_active: true,
  deleted_at: null,
  marketing_consent: true,
}

describe('mayMarket', () => {
  it('takes an active carpentry that agreed and verified its address', () => {
    expect(mayMarket(ok)).toBe(true)
  })

  it('never mails one that did not agree to offers', () => {
    expect(mayMarket({ ...ok, marketing_consent: false })).toBe(false)
  })

  it('skips blocked, deleted, unverified and address-less carpentries', () => {
    expect(mayMarket({ ...ok, is_active: false })).toBe(false)
    expect(mayMarket({ ...ok, deleted_at: '2026-11-01T00:00:00Z' })).toBe(false)
    expect(mayMarket({ ...ok, email_verified_at: null })).toBe(false)
    expect(mayMarket({ ...ok, email: null })).toBe(false)
    expect(mayMarket(null)).toBe(false)
  })
})

describe('subject and key', () => {
  it('opens the subject with פרסומת, as the law asks', () => {
    expect(promoCarpentersSubject('דבק PUR').startsWith('פרסומת')).toBe(true)
  })

  it('claims per booking, apart from the owner\'s social mail', () => {
    expect(carpentersKey('w1')).toBe('promo-carpenters:w1')
  })
})

describe('unsubscribe signature', () => {
  const secret = 'x'.repeat(32)
  const id = '11111111-1111-1111-1111-111111111111'

  it('accepts its own signature and refuses others', () => {
    const signature = marketingUnsubscribeSignature(id, secret)
    expect(isMarketingUnsubscribeSignature(id, signature, secret)).toBe(true)
    expect(isMarketingUnsubscribeSignature('22222222-2222-2222-2222-222222222222', signature, secret)).toBe(false)
    expect(isMarketingUnsubscribeSignature(id, signature.slice(1), secret)).toBe(false)
  })

  it('differs from the work board link, so one cannot be used as the other', () => {
    expect(marketingUnsubscribeSignature(id, secret)).not.toBe(unsubscribeSignature(id, secret))
  })
})
