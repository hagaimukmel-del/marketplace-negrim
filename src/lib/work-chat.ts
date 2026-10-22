/**
 * נגרים עובדים ביחד, phase 2: the rules of a conversation between carpentries.
 *
 * No database and no server imports, so the API, the screens and the tests
 * read the same limits. The tables check the same values (migration
 * 20261022100000_work_conversations); change both together.
 */

export type ChatSide = 'poster' | 'applicant'

export const MESSAGE_MAX = 2000
/** New conversations a carpentry may open in a day: far above honest use. */
export const CONVERSATIONS_PER_DAY = 30
/** One file per message, photos and PDF only (owner, 2026-10-15). */
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type FileType = (typeof FILE_TYPES)[number]

export function isFileType(value: unknown): value is FileType {
  return typeof value === 'string' && (FILE_TYPES as readonly string[]).includes(value)
}

const EXTENSION: Record<FileType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export function extensionFor(type: FileType): string {
  return EXTENSION[type]
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/**
 * What a file really is, from its first bytes. The browser's type and the
 * name's extension are both the sender's word; the server stores a file only
 * when the bytes agree with the type it claims.
 */
export function sniffFileType(bytes: Uint8Array): FileType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'
  return null
}

/**
 * A file name safe to show and to offer as a download name: no folders, no
 * control characters, at most 120 characters, and the extension that matches
 * what the file really is.
 */
export function cleanFileName(raw: string, type: FileType): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  const stem = base
    .replace(/\.[^.]*$/, '')
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .trim()
    .slice(0, 110)
  return `${stem || 'קובץ'}.${extensionFor(type)}`
}

/** The message text, trimmed; empty is allowed only when a file comes with it. */
export function readBody(raw: unknown): string | null {
  if (raw == null) return ''
  if (typeof raw !== 'string') return null
  const body = raw.trim()
  return body.length > MESSAGE_MAX ? null : body
}

export interface ConversationSides {
  poster_id: string
  applicant_id: string
}

/** Which side of the conversation a carpentry is on, or null when it is not on it. */
export function sideOf(conversation: ConversationSides, carpenterId: string): ChatSide | null {
  if (conversation.poster_id === carpenterId) return 'poster'
  if (conversation.applicant_id === carpenterId) return 'applicant'
  return null
}

export function otherSide(side: ChatSide): ChatSide {
  return side === 'poster' ? 'applicant' : 'poster'
}

export interface ReadState {
  last_sender: string
  last_message_at: string
  poster_last_read_at: string | null
  applicant_last_read_at: string | null
}

export function isUnread(row: ReadState, side: ChatSide): boolean {
  if (row.last_sender === side) return false
  const readAt = side === 'poster' ? row.poster_last_read_at : row.applicant_last_read_at
  return !readAt || new Date(row.last_message_at) > new Date(readAt)
}

/**
 * Why this carpentry may not write in a conversation right now, or null when
 * it may. A carpentry whose term ended keeps reading; it answers again after
 * renewing. A blocked conversation is read-only for both sides.
 */
export function sendBlockedReason(member: boolean, blockedBy: string | null, side: ChatSide): string | null {
  if (blockedBy === side) return 'חסמתם את השיחה. כדי לכתוב, בטלו את החסימה.'
  if (blockedBy) return 'הנגרייה השנייה חסמה את השיחה.'
  if (!member) return 'השיחה פתוחה לקריאה בלבד. כדי לענות צריך מנוי פעיל לנגרים עובדים ביחד.'
  return null
}

/** "קנטים · 40 חזיתות" for a conversation's subject line. */
export function jobLabel(jobTypeName: string, quantity: string): string {
  return `${jobTypeName} · ${quantity}`
}
