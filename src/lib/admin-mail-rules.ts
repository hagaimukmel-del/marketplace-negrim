/**
 * Mail the operator writes by hand from /admin (owner, 2026-11-09), as rules.
 *
 * Two kinds:
 * - One message to one supplier or one carpentry. Operational, one to one, so
 *   no consent is needed.
 * - One message to every approved supplier, or to every carpentry that agreed
 *   to offers by mail. Israeli law (חוק התקשורת, סעיף 30א) forbids advertising
 *   mail without prior consent and asks for "פרסומת" at the start of the
 *   subject and a way to refuse. So a mailing to carpentries only ever reaches
 *   those that agreed, and always carries both. A mailing to suppliers is
 *   operational by default; the operator marks it as advertising when it is.
 *
 * The mail leaves from the site's verified sender (EMAIL_FROM) and every reply
 * goes to the company's main address. A Gmail address cannot be a sender
 * through the mail provider: Gmail's own DMARC policy makes such mail bounce
 * or land in spam.
 *
 * No database and no server imports, so the rules are tested on their own.
 */

/** Where every reply to a hand-written mail goes (owner, 2026-10-22). */
export const ADMIN_MAIL_REPLY_TO = 'nagarim.b2b@gmail.com'

export const SUBJECT_MAX = 150
export const BODY_MAX = 5000

export type MailSide = 'supplier' | 'carpenter'
export type MailAudience = 'suppliers' | 'carpenters'

export interface MailDraft {
  subject: string
  body: string
}

/** The draft, trimmed, or what is wrong with it in Hebrew. */
export function checkDraft(input: { subject?: unknown; body?: unknown }): { ok: true; draft: MailDraft } | { ok: false; error: string } {
  const subject = typeof input.subject === 'string' ? input.subject.replace(/\s+/g, ' ').trim() : ''
  const body = typeof input.body === 'string' ? input.body.replace(/\r\n/g, '\n').trim() : ''
  if (!subject) return { ok: false, error: 'חסר נושא' }
  if (subject.length > SUBJECT_MAX) return { ok: false, error: `הנושא ארוך מדי (עד ${SUBJECT_MAX} תווים)` }
  if (!body) return { ok: false, error: 'חסר תוכן' }
  if (body.length > BODY_MAX) return { ok: false, error: `התוכן ארוך מדי (עד ${BODY_MAX} תווים)` }
  return { ok: true, draft: { subject, body } }
}

const MARKETING_PREFIX = 'פרסומת:'

/** The subject as sent: "פרסומת:" first on advertising, never twice. */
export function mailSubject(subject: string, marketing: boolean): string {
  const bare = subject.startsWith(MARKETING_PREFIX) ? subject.slice(MARKETING_PREFIX.length).trim() : subject
  return marketing ? `${MARKETING_PREFIX} ${bare}` : subject
}

/** A mailing to carpentries is always advertising as far as the law goes: only consenting ones get it. */
export function isMarketingMailing(audience: MailAudience, markedMarketing: boolean): boolean {
  return audience === 'carpenters' || markedMarketing
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Plain text to HTML: escaped, blank lines make paragraphs, single newlines stay. */
export function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 12px">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * The key a mailing is claimed under in reminder_log: the same audience,
 * subject and body go out once a day, so a double click or a retried request
 * never mails everyone twice.
 */
export function broadcastKey(audience: MailAudience, draft: MailDraft, now: Date, hash: (text: string) => string): string {
  const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  return `admin-mail:${audience}:${day}:${hash(`${draft.subject}\n${draft.body}`)}`
}

/** Whether an approved supplier can be mailed: approved and with an address. */
export function maySupplierBroadcast(row: { status: string; email: string | null }): row is { status: string; email: string } {
  return row.status === 'approved' && Boolean(row.email && row.email.includes('@'))
}
