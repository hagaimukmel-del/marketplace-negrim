import { describe, expect, it } from 'vitest'
import {
  BODY_MAX,
  SUBJECT_MAX,
  bodyToHtml,
  broadcastKey,
  checkDraft,
  isMarketingMailing,
  mailSubject,
  maySupplierBroadcast,
} from './admin-mail-rules'

describe('checkDraft', () => {
  it('trims and accepts a subject and a body', () => {
    expect(checkDraft({ subject: '  עדכון   מחירים ', body: '\nשלום\r\nעולם\n' })).toEqual({
      ok: true,
      draft: { subject: 'עדכון מחירים', body: 'שלום\nעולם' },
    })
  })

  it('refuses a missing or too long subject or body', () => {
    expect(checkDraft({ subject: '', body: 'x' }).ok).toBe(false)
    expect(checkDraft({ subject: 'x', body: '   ' }).ok).toBe(false)
    expect(checkDraft({ subject: 'x'.repeat(SUBJECT_MAX + 1), body: 'x' }).ok).toBe(false)
    expect(checkDraft({ subject: 'x', body: 'x'.repeat(BODY_MAX + 1) }).ok).toBe(false)
    expect(checkDraft({ subject: 5, body: null }).ok).toBe(false)
  })
})

describe('mailSubject', () => {
  it('puts "פרסומת:" first on advertising, once', () => {
    expect(mailSubject('מבצע חורף', true)).toBe('פרסומת: מבצע חורף')
    expect(mailSubject('פרסומת: מבצע חורף', true)).toBe('פרסומת: מבצע חורף')
  })

  it('leaves an operational subject alone', () => {
    expect(mailSubject('עדכון תנאים', false)).toBe('עדכון תנאים')
  })
})

describe('isMarketingMailing', () => {
  it('treats every mailing to carpentries as advertising', () => {
    expect(isMarketingMailing('carpenters', false)).toBe(true)
  })

  it('treats a supplier mailing as advertising only when marked', () => {
    expect(isMarketingMailing('suppliers', false)).toBe(false)
    expect(isMarketingMailing('suppliers', true)).toBe(true)
  })
})

describe('bodyToHtml', () => {
  it('escapes the text and keeps paragraphs and line breaks', () => {
    const html = bodyToHtml('שלום <b>\nשורה שנייה\n\nפסקה "שנייה"')
    expect(html).toContain('שלום &lt;b&gt;<br>שורה שנייה')
    expect(html).toContain('פסקה &quot;שנייה&quot;')
    expect(html.match(/<p /g)).toHaveLength(2)
  })
})

describe('broadcastKey', () => {
  const hash = (text: string) => String(text.length)

  it('is the same for the same message on the same Israeli day', () => {
    const draft = { subject: 'a', body: 'b' }
    const morning = broadcastKey('suppliers', draft, new Date('2026-11-09T06:00:00Z'), hash)
    const evening = broadcastKey('suppliers', draft, new Date('2026-11-09T20:00:00Z'), hash)
    expect(morning).toBe(evening)
  })

  it('differs by audience and by day', () => {
    const draft = { subject: 'a', body: 'b' }
    const at = new Date('2026-11-09T06:00:00Z')
    expect(broadcastKey('suppliers', draft, at, hash)).not.toBe(broadcastKey('carpenters', draft, at, hash))
    // 22:30 UTC is already the next day in Israel.
    expect(broadcastKey('suppliers', draft, new Date('2026-11-09T22:30:00Z'), hash)).not.toBe(broadcastKey('suppliers', draft, at, hash))
  })
})

describe('maySupplierBroadcast', () => {
  it('takes approved suppliers with an address only', () => {
    expect(maySupplierBroadcast({ status: 'approved', email: 'a@b.co' })).toBe(true)
    expect(maySupplierBroadcast({ status: 'pending', email: 'a@b.co' })).toBe(false)
    expect(maySupplierBroadcast({ status: 'approved', email: null })).toBe(false)
    expect(maySupplierBroadcast({ status: 'approved', email: 'none' })).toBe(false)
  })
})
