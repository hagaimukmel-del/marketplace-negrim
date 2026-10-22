import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { jobTypeName } from '@/lib/work'
import type { WorkViewer } from '@/lib/work-server'
import {
  CONVERSATIONS_PER_DAY,
  FILE_MAX_BYTES,
  cleanFileName,
  extensionFor,
  isFileType,
  isUnread,
  jobLabel,
  readBody,
  sendBlockedReason,
  sideOf,
  sniffFileType,
  type ChatSide,
  type FileType,
} from '@/lib/work-chat'

/**
 * Conversations between carpentries about a job (נגרים עובדים ביחד, phase 2).
 *
 * Every function takes the carpentry asking, resolved from its own session
 * by the caller, and filters on it in the query itself: a conversation id
 * the carpentry is not a side of matches nothing. Tables come from migration
 * 20261022100000; on a database without them the reads return nothing.
 */

const BUCKET = 'work-files'

export interface ConversationSummary {
  id: string
  jobId: string
  subject: string
  /** The other carpentry's name and city. */
  counterpart: string
  counterpartCity: string | null
  side: ChatSide
  lastMessageAt: string
  unread: boolean
}

export interface ChatFile {
  messageId: string
  name: string
  type: FileType
  size: number
}

export interface ChatMessage {
  id: string
  mine: boolean
  body: string
  file: ChatFile | null
  createdAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
  blockedBy: 'me' | 'them' | null
  /** Why writing is closed right now, or null when it is open. */
  readOnlyReason: string | null
}

type Failure = { ok: false; status: number; error: string }

interface PartyJoin {
  business_name: string
  city: string | null
}

interface ConversationRow {
  id: string
  job_id: string
  poster_id: string
  applicant_id: string
  last_message_at: string
  last_sender: string
  poster_last_read_at: string | null
  applicant_last_read_at: string | null
  blocked_by: string | null
  poster: PartyJoin | null
  applicant: PartyJoin | null
  work_jobs: { job_type: string; quantity: string } | null
}

const COLUMNS =
  'id, job_id, poster_id, applicant_id, last_message_at, last_sender, poster_last_read_at, applicant_last_read_at, blocked_by, ' +
  'poster:carpenters!work_conversations_poster_id_fkey(business_name, city), ' +
  'applicant:carpenters!work_conversations_applicant_id_fkey(business_name, city), ' +
  'work_jobs(job_type, quantity)'

const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)

function summary(row: ConversationRow, side: ChatSide): ConversationSummary {
  const other = side === 'poster' ? row.applicant : row.poster
  return {
    id: row.id,
    jobId: row.job_id,
    subject: row.work_jobs ? jobLabel(jobTypeName(row.work_jobs.job_type), row.work_jobs.quantity) : 'עבודה',
    counterpart: other?.business_name ?? 'נגרייה',
    counterpartCity: other?.city ?? null,
    side,
    lastMessageAt: row.last_message_at,
    unread: isUnread(row, side),
  }
}

async function ownConversation(carpenterId: string, id: string): Promise<{ row: ConversationRow; side: ChatSide } | null> {
  if (!isId(id)) return null
  const { data } = await getSupabaseAdmin()
    .from('work_conversations')
    .select(COLUMNS)
    .eq('id', id)
    .or(`poster_id.eq.${carpenterId},applicant_id.eq.${carpenterId}`)
    .maybeSingle()
  const row = data as unknown as ConversationRow | null
  const side = row ? sideOf(row, carpenterId) : null
  return row && side ? { row, side } : null
}

export async function listConversations(carpenterId: string): Promise<{ ready: boolean; conversations: ConversationSummary[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from('work_conversations')
    .select(COLUMNS)
    .or(`poster_id.eq.${carpenterId},applicant_id.eq.${carpenterId}`)
    .order('last_message_at', { ascending: false })
    .limit(200)
  if (error) return { ready: false, conversations: [] }
  const rows = (data ?? []) as unknown as ConversationRow[]
  return {
    ready: true,
    conversations: rows.flatMap((row) => {
      const side = sideOf(row, carpenterId)
      return side ? [summary(row, side)] : []
    }),
  }
}

/** Conversations waiting for this carpentry. Zero on a database without the tables. */
export async function unreadConversations(carpenterId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from('work_conversations')
    .select('poster_id, applicant_id, last_sender, last_message_at, poster_last_read_at, applicant_last_read_at')
    .or(`poster_id.eq.${carpenterId},applicant_id.eq.${carpenterId}`)
    .limit(500)
  if (error) return 0
  return (data ?? []).filter((row) => {
    const side = sideOf(row, carpenterId)
    return side != null && isUnread(row, side)
  }).length
}

/** How many carpentries answered each of the poster's jobs. */
export async function answersPerJob(posterId: string): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin().from('work_conversations').select('job_id').eq('poster_id', posterId).limit(2000)
  if (error) return {}
  const counts: Record<string, number> = {}
  for (const row of data ?? []) counts[row.job_id] = (counts[row.job_id] ?? 0) + 1
  return counts
}

/** The conversation this carpentry already has about a job it answered, if any. */
export async function conversationForJob(carpenterId: string, jobId: string): Promise<string | null> {
  if (!isId(jobId)) return null
  const { data } = await getSupabaseAdmin()
    .from('work_conversations')
    .select('id')
    .eq('job_id', jobId)
    .eq('applicant_id', carpenterId)
    .maybeSingle()
  return data?.id ?? null
}

/** One conversation with its messages; opening it marks it read for this carpentry. */
export async function loadConversation(viewer: WorkViewer, id: string): Promise<ConversationDetail | null> {
  if (!viewer.carpenter) return null
  const own = await ownConversation(viewer.carpenter.id, id)
  if (!own) return null
  const { row, side } = own
  const supabase = getSupabaseAdmin()
  const [{ data: messages }] = await Promise.all([
    supabase
      .from('work_messages')
      .select('id, sender, body, file_name, file_type, file_size, created_at')
      .eq('conversation_id', row.id)
      .order('created_at')
      .limit(500),
    supabase
      .from('work_conversations')
      .update(side === 'poster' ? { poster_last_read_at: new Date().toISOString() } : { applicant_last_read_at: new Date().toISOString() })
      .eq('id', row.id),
  ])

  return {
    ...summary(row, side),
    unread: false,
    blockedBy: row.blocked_by ? (row.blocked_by === side ? 'me' : 'them') : null,
    readOnlyReason: sendBlockedReason(viewer.member, row.blocked_by, side),
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      mine: message.sender === side,
      body: message.body,
      file:
        message.file_name && isFileType(message.file_type) && message.file_size
          ? { messageId: message.id, name: message.file_name, type: message.file_type, size: message.file_size }
          : null,
      createdAt: message.created_at,
    })),
  }
}

interface Upload {
  bytes: Uint8Array
  name: string
  type: FileType
}

/** A file from the form, checked by its bytes as well as its type. Returns the file, null for none, or the message to show. */
export async function readUpload(entry: FormDataEntryValue | null): Promise<Upload | null | string> {
  if (!(entry instanceof File) || entry.size === 0) return null
  if (entry.size > FILE_MAX_BYTES) return 'קובץ עד 10MB'
  if (!isFileType(entry.type)) return 'אפשר לצרף תמונה (JPG, PNG, WEBP) או PDF'
  const bytes = new Uint8Array(await entry.arrayBuffer())
  if (sniffFileType(bytes) !== entry.type) return 'הקובץ לא נראה כמו תמונה או PDF תקינים'
  return { bytes, name: cleanFileName(entry.name, entry.type), type: entry.type }
}

async function append(row: ConversationRow, side: ChatSide, body: string, upload: Upload | null): Promise<Failure | null> {
  const supabase = getSupabaseAdmin()
  let filePath: string | null = null
  if (upload) {
    filePath = `${row.id}/${crypto.randomUUID()}.${extensionFor(upload.type)}`
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, upload.bytes, { contentType: upload.type })
    if (error) return { ok: false, status: 500, error: `העלאת הקובץ נכשלה: ${error.message}` }
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('work_messages').insert({
    conversation_id: row.id,
    sender: side,
    body,
    file_path: filePath,
    file_name: upload?.name ?? null,
    file_type: upload?.type ?? null,
    file_size: upload ? upload.bytes.byteLength : null,
  })
  if (error) {
    if (filePath) await supabase.storage.from(BUCKET).remove([filePath])
    return { ok: false, status: 500, error: 'השליחה נכשלה' }
  }

  await supabase
    .from('work_conversations')
    .update({
      last_message_at: now,
      last_sender: side,
      ...(side === 'poster' ? { poster_last_read_at: now } : { applicant_last_read_at: now }),
    })
    .eq('id', row.id)
  return null
}

/**
 * "אני מעוניין": a member answers a live job that is not theirs, with a first
 * message. Answering the same job again adds to the conversation it already
 * has instead of opening a second one.
 */
export async function startConversation(
  viewer: WorkViewer,
  jobId: unknown,
  rawBody: unknown,
  now: Date = new Date()
): Promise<{ ok: true; id: string } | Failure> {
  const carpenter = viewer.carpenter
  if (!carpenter) return { ok: false, status: 401, error: 'צריך להיות נגרייה רשומה' }
  if (!viewer.open) return { ok: false, status: 403, error: 'הלוח עוד לא נפתח' }
  if (!viewer.member) return { ok: false, status: 403, error: 'כדי לפנות לעבודה צריך למלא פרופיל יכולות' }
  if (!isId(jobId)) return { ok: false, status: 400, error: 'חסרה עבודה' }
  const body = readBody(rawBody)
  if (!body) return { ok: false, status: 400, error: 'צריך לכתוב הודעה ראשונה' }

  const supabase = getSupabaseAdmin()
  const { data: job } = await supabase
    .from('work_jobs')
    .select('id, carpenter_id, status, expires_at, carpenters!work_jobs_carpenter_id_fkey!inner(is_active)')
    .eq('id', jobId)
    .maybeSingle()
  const owner = job?.carpenters as unknown as { is_active: boolean } | null
  if (!job || job.status !== 'open' || new Date(job.expires_at) <= now || !owner?.is_active) {
    return { ok: false, status: 404, error: 'העבודה כבר לא בלוח' }
  }
  if (job.carpenter_id === carpenter.id) return { ok: false, status: 400, error: 'זו עבודה שלכם' }

  const existing = await conversationForJob(carpenter.id, job.id)
  if (existing) {
    const own = await ownConversation(carpenter.id, existing)
    if (!own) return { ok: false, status: 404, error: 'השיחה לא נמצאה' }
    const reason = sendBlockedReason(viewer.member, own.row.blocked_by, own.side)
    if (reason) return { ok: false, status: 403, error: reason }
    const failed = await append(own.row, own.side, body, null)
    return failed ?? { ok: true, id: existing }
  }

  const { count } = await supabase
    .from('work_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('applicant_id', carpenter.id)
    .gt('created_at', new Date(now.getTime() - 86_400_000).toISOString())
  if ((count ?? 0) >= CONVERSATIONS_PER_DAY) {
    return { ok: false, status: 429, error: `עד ${CONVERSATIONS_PER_DAY} פניות חדשות ביום. אפשר להמשיך מחר.` }
  }

  const { data: created, error } = await supabase
    .from('work_conversations')
    .insert({ job_id: job.id, poster_id: job.carpenter_id, applicant_id: carpenter.id, last_sender: 'applicant' })
    .select('id')
    .single()
  if (error || !created) {
    // Two taps at once: the unique (job, applicant) lets one through; use it.
    const raced = await conversationForJob(carpenter.id, job.id)
    if (!raced) return { ok: false, status: 500, error: 'פתיחת השיחה נכשלה' }
    return startConversation(viewer, jobId, rawBody, now)
  }

  const own = await ownConversation(carpenter.id, created.id)
  if (!own) return { ok: false, status: 500, error: 'פתיחת השיחה נכשלה' }
  const failed = await append(own.row, 'applicant', body, null)
  return failed ?? { ok: true, id: created.id }
}

/** A message, with or without a file, from a side that may write. */
export async function sendMessage(
  viewer: WorkViewer,
  id: string,
  rawBody: unknown,
  file: FormDataEntryValue | null
): Promise<{ ok: true } | Failure> {
  if (!viewer.carpenter) return { ok: false, status: 401, error: 'צריך להיות נגרייה רשומה' }
  const own = await ownConversation(viewer.carpenter.id, id)
  if (!own) return { ok: false, status: 404, error: 'השיחה לא נמצאה' }
  const reason = sendBlockedReason(viewer.member, own.row.blocked_by, own.side)
  if (reason) return { ok: false, status: 403, error: reason }

  const body = readBody(rawBody)
  if (body == null) return { ok: false, status: 400, error: 'ההודעה ארוכה מדי' }
  const upload = await readUpload(file)
  if (typeof upload === 'string') return { ok: false, status: 400, error: upload }
  if (!body && !upload) return { ok: false, status: 400, error: 'ההודעה ריקה' }

  return (await append(own.row, own.side, body, upload)) ?? { ok: true }
}

/**
 * Block or unblock the other carpentry in this conversation. Only the side
 * that blocked can lift it, so a block cannot be undone from the other end.
 */
export async function setBlocked(carpenterId: string, id: string, block: boolean): Promise<{ ok: true } | Failure> {
  const own = await ownConversation(carpenterId, id)
  if (!own) return { ok: false, status: 404, error: 'השיחה לא נמצאה' }
  const { row, side } = own
  if (block && row.blocked_by && row.blocked_by !== side) return { ok: false, status: 409, error: 'השיחה כבר חסומה' }
  if (!block && row.blocked_by !== side) return { ok: false, status: 409, error: 'רק מי שחסם יכול לבטל את החסימה' }
  const { error } = await getSupabaseAdmin()
    .from('work_conversations')
    .update({ blocked_by: block ? side : null })
    .eq('id', row.id)
  return error ? { ok: false, status: 500, error: 'הפעולה נכשלה' } : { ok: true }
}

/** "שיתוף הטלפון שלי": the carpentry's own phone, as a message from it. Each side decides for itself. */
export async function sharePhone(viewer: WorkViewer, id: string): Promise<{ ok: true } | Failure> {
  const carpenter = viewer.carpenter
  if (!carpenter) return { ok: false, status: 401, error: 'צריך להיות נגרייה רשומה' }
  if (!carpenter.phone) return { ok: false, status: 400, error: 'אין טלפון בפרטי הנגרייה' }
  return sendMessage(viewer, id, `הטלפון שלי: ${carpenter.phone}`, null)
}

/**
 * A short-lived link to a file in a conversation this carpentry is a side
 * of. A PDF is offered as a download, never opened in the site's own tab.
 */
export async function fileLink(carpenterId: string, messageId: string): Promise<string | null> {
  if (!isId(messageId)) return null
  const supabase = getSupabaseAdmin()
  const { data: message } = await supabase
    .from('work_messages')
    .select('conversation_id, file_path, file_name, file_type')
    .eq('id', messageId)
    .maybeSingle()
  if (!message?.file_path || !message.file_name) return null
  if (!(await ownConversation(carpenterId, message.conversation_id))) return null

  const download = message.file_type === 'application/pdf' ? message.file_name : undefined
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(message.file_path, 60, download ? { download } : undefined)
  return data?.signedUrl ?? null
}
