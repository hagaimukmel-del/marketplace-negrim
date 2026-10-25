import { describe, expect, it } from 'vitest'
import { formatPhone, internationalPhone, isMobilePhone, nationalPhone, phoneKey, telUrl, validPhoneKey, whatsappUrl } from './phone'

describe('nationalPhone', () => {
  it('reads every shape a number arrives in', () => {
    for (const raw of ['050-1234567', '0501234567', '+972 50 123 4567', '972501234567', '00972501234567', '501234567', '(050) 123-4567']) {
      expect(nationalPhone(raw)).toBe('0501234567')
    }
    expect(nationalPhone('03-1234567')).toBe('031234567')
    expect(nationalPhone('31234567')).toBe('031234567')
  })

  it('refuses what cannot be an Israeli number', () => {
    for (const raw of ['', null, undefined, '12345', '0123456789', '05012345678901', 'abc']) {
      expect(nationalPhone(raw)).toBeNull()
    }
  })
})

describe('links', () => {
  it('gives a mobile a WhatsApp link with the message, and a landline none', () => {
    expect(isMobilePhone('050-1234567')).toBe(true)
    expect(whatsappUrl('050-1234567', 'שלום, הזמנה #12')).toBe(`https://wa.me/972501234567?text=${encodeURIComponent('שלום, הזמנה #12')}`)
    expect(whatsappUrl('501234567')).toBe('https://wa.me/972501234567')
    expect(isMobilePhone('03-1234567')).toBe(false)
    expect(whatsappUrl('03-1234567', 'x')).toBeNull()
    expect(whatsappUrl(null)).toBeNull()
  })

  it('dials a known number internationally and an unknown one as typed', () => {
    expect(telUrl('03-1234567')).toBe('tel:+97231234567')
    expect(telUrl('+1 212 555 0100')).toBe('tel:+12125550100')
    expect(telUrl('12')).toBeNull()
    expect(internationalPhone('0501234567')).toBe('972501234567')
  })
})

describe('formatPhone and phoneKey', () => {
  it('formats for display and leaves an unknown number alone', () => {
    expect(formatPhone('972501234567')).toBe('050-123-4567')
    expect(formatPhone('031234567')).toBe('03-123-4567')
    expect(formatPhone(' ext 12 ')).toBe('ext 12')
  })

  it('keeps the legacy nine-digit key', () => {
    expect(phoneKey('050-1234567')).toBe('501234567')
    expect(phoneKey('+972-50-123-4567')).toBe('501234567')
    expect(phoneKey('1234')).toBeNull()
  })

  it('keys a sign-up number only when it is real, and one key for every shape', () => {
    expect(validPhoneKey('+972 50-123-4567')).toBe('501234567')
    expect(validPhoneKey('050-1234567')).toBe('501234567')
    expect(validPhoneKey('+972 3 123 4567')).toBe(phoneKey('03-1234567'))
    expect(validPhoneKey('123456789012')).toBeNull()
  })
})
