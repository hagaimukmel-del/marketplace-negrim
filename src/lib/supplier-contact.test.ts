import { describe, expect, it } from 'vitest'
import { contactMessage, contactOf } from './supplier-contact'

describe('contactOf', () => {
  it('before the supplier confirms, uses the business phone: WhatsApp when it is a mobile', () => {
    expect(contactOf({ phone: '0501234567' })).toEqual({ phone: '050-123-4567', whatsapp: '050-123-4567' })
    expect(contactOf({ phone: '03-1234567' })).toEqual({ phone: '03-123-4567', whatsapp: null })
  })

  it('once confirmed, exactly the confirmed numbers', () => {
    const confirmed = { phone: '0501234567', contact_confirmed_at: '2026-11-12T10:00:00Z' }
    expect(contactOf({ ...confirmed, contact_phone: '03-7654321', whatsapp_phone: '052-1112222' })).toEqual({ phone: '03-765-4321', whatsapp: '052-111-2222' })
    // An empty WhatsApp is the supplier's choice: no WhatsApp button, not the business phone.
    expect(contactOf({ ...confirmed, contact_phone: '03-7654321', whatsapp_phone: null })).toEqual({ phone: '03-765-4321', whatsapp: null })
  })

  it('nothing to show without a usable number', () => {
    expect(contactOf({ phone: null })).toBeNull()
    expect(contactOf({ phone: '12' })).toBeNull()
    expect(contactOf({ phone: '0501234567', contact_confirmed_at: 'x', contact_phone: null, whatsapp_phone: '03-1234567' })).toBeNull()
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
