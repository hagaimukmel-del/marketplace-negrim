import { describe, expect, it } from 'vitest'
import { saveQuoteRequest, type QuoteRequestStore, type StoredRequest } from './quote-idempotency'

/** quote_requests in memory, with the (carpenter, client id) unique index. */
function memoryStore(opts: { raceOnce?: StoredRequest & { carpenterId: string; clientRequestId: string } } = {}) {
  const rows: (StoredRequest & { carpenterId: string; clientRequestId: string | null })[] = []
  let race = opts.raceOnce
  let inserts = 0
  const store: QuoteRequestStore = {
    async findByClientId(carpenterId, clientRequestId) {
      return rows.find((row) => row.carpenterId === carpenterId && row.clientRequestId === clientRequestId) ?? null
    },
    async insert({ carpenterId, clientRequestId, request }) {
      // Another send with the same id lands between the first look and this insert.
      if (race) {
        rows.push(race)
        race = undefined
      }
      if (clientRequestId && rows.some((row) => row.carpenterId === carpenterId && row.clientRequestId === clientRequestId)) {
        return { duplicate: true }
      }
      inserts += 1
      const id = `q${inserts}`
      rows.push({ id, carpenterId, clientRequestId, ...request })
      return { id }
    },
  }
  return { store, rows, inserts: () => inserts }
}

const request = { supplierId: 's1', productId: 'p1', quantity: 40, note: null }

describe('saveQuoteRequest', () => {
  it('saves a new request', async () => {
    const { store, rows } = memoryStore()
    const result = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    expect(result).toEqual({ status: 'created', id: 'q1' })
    expect(rows).toHaveLength(1)
  })

  it('returns the saved request when the same send repeats', async () => {
    const { store, rows } = memoryStore()
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    const again = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    expect(again).toEqual({ status: 'existing', id: 'q1' })
    expect(rows).toHaveLength(1)
  })

  it('is a conflict when the same id carries other details', async () => {
    const { store, rows } = memoryStore()
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    const changed = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request: { ...request, quantity: 80 } })
    expect(changed).toEqual({ status: 'conflict' })
    expect(rows).toHaveLength(1)
  })

  it('never blocks a separate request for the same product', async () => {
    const { store, rows } = memoryStore()
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    const other = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k2', kind: 'volume', request: { ...request, quantity: 80 } })
    expect(other).toEqual({ status: 'created', id: 'q2' })
    // Same product and quantity under a new id is also a separate request.
    const third = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k3', kind: 'volume', request })
    expect(third.status).toBe('created')
    expect(rows).toHaveLength(3)
  })

  it('keeps one carpentry from claiming another one\'s id', async () => {
    const { store } = memoryStore()
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    const other = await saveQuoteRequest(store, { carpenterId: 'c2', clientRequestId: 'k1', kind: 'volume', request })
    expect(other).toEqual({ status: 'created', id: 'q2' })
  })

  it('reads the winner when two sends race past the first look', async () => {
    const { store, rows } = memoryStore({ raceOnce: { id: 'winner', carpenterId: 'c1', clientRequestId: 'k1', ...request } })
    const result = await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: 'k1', kind: 'volume', request })
    expect(result).toEqual({ status: 'existing', id: 'winner' })
    expect(rows).toHaveLength(1)
  })

  it('saves without idempotency when the browser sent no id', async () => {
    const { store, rows } = memoryStore()
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: null, kind: 'quote', request })
    await saveQuoteRequest(store, { carpenterId: 'c1', clientRequestId: null, kind: 'quote', request })
    expect(rows).toHaveLength(2)
  })
})
