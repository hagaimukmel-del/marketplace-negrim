import { describe, expect, it } from 'vitest'
import { readOfferPrice } from './offer-price'

describe('readOfferPrice', () => {
  it('leaves the price alone when the field is not sent', () => {
    expect(readOfferPrice(undefined)).toBeUndefined()
  })

  it('reads an empty field as no price', () => {
    expect(readOfferPrice(null)).toBeNull()
    expect(readOfferPrice('')).toBeNull()
    expect(readOfferPrice('  ')).toBeNull()
  })

  it('takes a price above zero, rounded to agorot', () => {
    expect(readOfferPrice('24.5')).toBe(24.5)
    expect(readOfferPrice(10.456)).toBe(10.46)
  })

  it('refuses zero, a negative number and text', () => {
    expect(readOfferPrice(0)).toBe('invalid')
    expect(readOfferPrice('-3')).toBe('invalid')
    expect(readOfferPrice('abc')).toBe('invalid')
  })
})
