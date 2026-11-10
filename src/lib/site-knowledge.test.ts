import { describe, expect, it } from 'vitest'
import { SITE_TOPICS, siteTopicFor } from './site-knowledge'

const topic = (text: string) => siteTopicFor(text)?.id ?? null

describe('siteTopicFor', () => {
  it('answers questions about the site', () => {
    expect(topic('מי שולח לי חשבונית?')).toBe('invoice')
    expect(topic('איך משלמים')).toBe('invoice')
    expect(topic('מה זה מוצר השבוע')).toBe('promo')
    expect(topic('איפה הדרושים')).toBe('jobs')
    expect(topic('מחפש עובד לנגרייה')).toBe('jobs')
    expect(topic('איך מבקשים הצעת מחיר')).toBe('quotes')
    expect(topic('נגרים עובדים ביחד')).toBe('work')
    expect(topic('כמה עולה האתר')).toBe('price')
    expect(topic('יש לי שאריות פורמייקה למסור')).toBe('metzion')
    // The chat's starter buttons
    expect(topic('מי מוציא את החשבונית?')).toBe('invoice')
    expect(topic('מה יש באתר חוץ מהקטלוג?')).toBe('about')
  })

  it('forgives typos', () => {
    expect(topic('חשבונייה')).toBe('invoice')
    expect(topic('חשבונת')).toBe('invoice')
    expect(topic('מציאן')).toBe('metzion')
    expect(topic('הצאת מחיר')).toBe('quotes')
    expect(topic('תקנן')).toBe('terms')
  })

  it('leaves product searches alone', () => {
    expect(topic('דבק PUR 20 ק״ג')).toBeNull()
    expect(topic('ציר בלום')).toBeNull()
    expect(topic('לוח לבן וצירים')).toBeNull()
    expect(topic('מדלל לכה')).toBeNull()
    expect(topic('קלינר Q1924')).toBeNull()
    expect(topic('מסור עגול')).toBeNull()
  })

  it('links only to app pages', () => {
    for (const t of SITE_TOPICS) for (const link of t.links) expect(link.href).toMatch(/^\//)
  })
})
