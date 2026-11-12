import { describe, expect, it } from 'vitest'
import { contactMessage, contactOf } from './supplier-contact'

describe('contactOf', () => {
  it('nothing until the supplier entered numbers itself: never the business phone', () => {
    expect(contactOf({})).toBeNull()
    expect(contactOf({ contact_phone: '0501234567', whatsapp_phone: '0501234567' })).toBeNull()
  })

  it('exactly the numbers the supplier entered', () => {
    const at = '2026-11-12T10:00:00Z'
    expect(contactOf({ contact_confirmed_at: at, contact_phone: '03-7654321', whatsapp_phone: '052-1112222' })).toEqual({ phone: '03-765-4321', whatsapp: '052-111-2222' })
    expect(contactOf({ contact_confirmed_at: at, contact_phone: null, whatsapp_phone: '0521112222' })).toEqual({ phone: null, whatsapp: '052-111-2222' })
    expect(contactOf({ contact_confirmed_at: at, contact_phone: '03-7654321', whatsapp_phone: null })).toEqual({ phone: '03-765-4321', whatsapp: null })
  })

  it('saved empty (in-site messages only), or a landline as WhatsApp: nothing to show', () => {
    const at = '2026-11-12T10:00:00Z'
    expect(contactOf({ contact_confirmed_at: at, contact_phone: null, whatsapp_phone: null })).toBeNull()
    expect(contactOf({ contact_confirmed_at: at, contact_phone: null, whatsapp_phone: '03-1234567' })).toBeNull()
  })
})

describe('contactMessage', () => {
  it('names the product and links its page', () => {
    const text = contactMessage({ productId: 'p1', productName: 'דבק לעץ' })
    expect(text.startsWith('שלום, הגעתי מנגרים B2B לגבי דבק לעץ.')).toBe(true)
    expect(text).toMatch(/\/app\/product\/p1$/)
  })

  it('from the supplier page, says so', () => {
    expect(contactMessage(null)).toBe('שלום, הגעתי מנגרים B2B דרך עמוד הספק שלכם.')
  })
})
