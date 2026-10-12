import { sameRequest, type QuoteKind, type RequestIdentity } from '@/lib/quote-rules'

/**
 * Saving a quote request exactly once (stage 1 RFQ rules). Client-safe and
 * free of Supabase, so the tests drive it with an in-memory store.
 *
 * The browser generates client_request_id when the request form opens and
 * sends it with every attempt. A second send with the same id:
 * - asks for the same thing: the saved request comes back, and the caller
 *   does not email the supplier again;
 * - asks for something else: a conflict, nothing is written.
 * A form opened again gets a new id, so a separate request for the same
 * product (another quantity) is a new row.
 */

export interface StoredRequest extends RequestIdentity {
  id: string
}

export interface QuoteRequestStore {
  /** The request this carpentry already sent with this id, if any. */
  findByClientId(carpenterId: string, clientRequestId: string): Promise<StoredRequest | null>
  /** Insert; `duplicate` when the (carpenter, client id) pair already exists. */
  insert(row: {
    carpenterId: string
    clientRequestId: string | null
    kind: QuoteKind
    request: RequestIdentity
  }): Promise<{ id: string } | { duplicate: true } | { error: string }>
}

export type SaveResult =
  | { status: 'created'; id: string }
  | { status: 'existing'; id: string }
  | { status: 'conflict' }
  | { status: 'error'; error: string }

export async function saveQuoteRequest(
  store: QuoteRequestStore,
  input: { carpenterId: string; clientRequestId: string | null; kind: QuoteKind; request: RequestIdentity }
): Promise<SaveResult> {
  const { carpenterId, clientRequestId, request } = input

  const compare = async (): Promise<SaveResult | null> => {
    if (!clientRequestId) return null
    const existing = await store.findByClientId(carpenterId, clientRequestId)
    if (!existing) return null
    return sameRequest(existing, request) ? { status: 'existing', id: existing.id } : { status: 'conflict' }
  }

  const before = await compare()
  if (before) return before

  const inserted = await store.insert({ carpenterId, clientRequestId, kind: input.kind, request })
  if ('id' in inserted) return { status: 'created', id: inserted.id }
  if ('duplicate' in inserted) {
    // Two sends raced past the first look; the one that lost reads the winner.
    return (await compare()) ?? { status: 'error', error: 'duplicate without a row' }
  }
  return { status: 'error', error: inserted.error }
}
