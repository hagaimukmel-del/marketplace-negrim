/**
 * Israeli phone numbers, in one place (communication plan, step 4).
 *
 * Numbers arrive in every shape: "050-1234567", "+972 50 123 4567", the nine
 * digit key carpenters are stored under ("501234567"), "0097250…". Everything
 * that turns one into a link or a label goes through here, so a WhatsApp
 * button and a call button never disagree about the same number.
 *
 * WhatsApp is click-to-chat only (wa.me): it opens the person's own WhatsApp
 * with a prepared message. No Business API, nothing sent by the site. Only a
 * mobile number gets a WhatsApp link; a landline gets a call button alone.
 *
 * Safe in the browser: no imports, no secrets.
 */

/** "0501234567" / "031234567", or null when it cannot be an Israeli number. */
export function nationalPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('972')) digits = `0${digits.slice(3)}`
  else if (!digits.startsWith('0') && (digits.length === 8 || digits.length === 9)) digits = `0${digits}`
  return /^0[2-9]\d{7,8}$/.test(digits) ? digits : null
}

/** A mobile number (05X), the only kind that gets a WhatsApp link. */
export function isMobilePhone(raw: string | null | undefined): boolean {
  return /^05\d{8}$/.test(nationalPhone(raw) ?? '')
}

/** "972501234567", the form wa.me and tel: links take. */
export function internationalPhone(raw: string | null | undefined): string | null {
  const national = nationalPhone(raw)
  return national ? `972${national.slice(1)}` : null
}

/** "050-123-4567" / "03-123-4567" for display; the input unchanged when it is not a number we know. */
export function formatPhone(raw: string | null | undefined): string {
  const national = nationalPhone(raw)
  if (!national) return (raw ?? '').trim()
  return national.length === 10
    ? `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`
    : `${national.slice(0, 2)}-${national.slice(2, 5)}-${national.slice(5)}`
}

/** A wa.me link with a prepared message, or null for a landline or a broken number. */
export function whatsappUrl(raw: string | null | undefined, text?: string): string | null {
  if (!isMobilePhone(raw)) return null
  return `https://wa.me/${internationalPhone(raw)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** A tel: link. A number we cannot parse is still dialled as typed, rather than hidden. */
export function telUrl(raw: string | null | undefined): string | null {
  const intl = internationalPhone(raw)
  if (intl) return `tel:+${intl}`
  const digits = (raw ?? '').replace(/[^\d+]/g, '')
  return digits.length >= 7 ? `tel:${digits}` : null
}

/**
 * The identity key a phone is stored and matched under: its last nine digits.
 * Kept exactly as the join routes always did, so existing rows still match.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : null
}

/**
 * The key for a number typed at sign-up or in a profile: null unless it is a
 * real Israeli number, otherwise the same nine digits phoneKey() gives a
 * local-format entry (so "+972 50…" and "050…" are one carpenter).
 */
export function validPhoneKey(raw: string | null | undefined): string | null {
  const national = nationalPhone(raw)
  return national ? national.slice(-9) : null
}
