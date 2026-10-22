import { describe, expect, it } from 'vitest'
import { cleanFileName, isUnread, readBody, sendBlockedReason, sideOf, sniffFileType } from './work-chat'

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)])

describe('sniffFileType', () => {
  it('knows photos and PDF by their first bytes', () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    expect(sniffFileType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
    expect(sniffFileType(new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf')
  })

  it('refuses anything else, whatever it is called', () => {
    expect(sniffFileType(new TextEncoder().encode('<html><script>'))).toBeNull()
    expect(sniffFileType(bytes(0x4d, 0x5a))).toBeNull() // a Windows program
    expect(sniffFileType(new Uint8Array([0xff, 0xd8]))).toBeNull()
  })
})

describe('cleanFileName', () => {
  it('drops folders and odd characters and sets the real extension', () => {
    expect(cleanFileName('../../etc/תוכנית מטבח.exe', 'application/pdf')).toBe('תוכנית מטבח.pdf')
    expect(cleanFileName('C:\\Users\\a\\photo<1>.png', 'image/jpeg')).toBe('photo1.jpg')
    expect(cleanFileName('', 'image/png')).toBe('קובץ.png')
  })
})

describe('readBody', () => {
  it('trims, allows empty (a file alone) and refuses too long', () => {
    expect(readBody('  שלום ')).toBe('שלום')
    expect(readBody(null)).toBe('')
    expect(readBody('x'.repeat(2001))).toBeNull()
    expect(readBody(5)).toBeNull()
  })
})

describe('sideOf', () => {
  const conversation = { poster_id: 'p', applicant_id: 'a' }
  it('places each carpentry, and nobody else', () => {
    expect(sideOf(conversation, 'p')).toBe('poster')
    expect(sideOf(conversation, 'a')).toBe('applicant')
    expect(sideOf(conversation, 'x')).toBeNull()
  })
})

describe('isUnread', () => {
  const row = { last_sender: 'applicant', last_message_at: '2026-10-22T10:00:00Z', poster_last_read_at: null, applicant_last_read_at: null }
  it('is unread for the side that did not write last, until it reads', () => {
    expect(isUnread(row, 'poster')).toBe(true)
    expect(isUnread(row, 'applicant')).toBe(false)
    expect(isUnread({ ...row, poster_last_read_at: '2026-10-22T10:01:00Z' }, 'poster')).toBe(false)
  })
})

describe('sendBlockedReason', () => {
  it('lets a member write in an open conversation', () => {
    expect(sendBlockedReason(true, null, 'poster')).toBeNull()
  })
  it('closes writing for both sides of a blocked conversation', () => {
    expect(sendBlockedReason(true, 'poster', 'poster')).toMatch(/חסמתם/)
    expect(sendBlockedReason(true, 'poster', 'applicant')).toMatch(/חסמה/)
  })
  it('leaves a carpentry without a live term reading only', () => {
    expect(sendBlockedReason(false, null, 'applicant')).toMatch(/קריאה בלבד/)
  })
})
