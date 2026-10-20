import { describe, expect, it, vi } from 'vitest'
import type { AppOffer, AppProduct } from './app/products'

const offer = (supplierName: string, price: number | null, packQty: number): AppOffer => ({
  supplierId: `id-${supplierName}`,
  supplierName,
  supplierLogo: null,
  price,
  quoteOnly: price == null,
  packLabel: 'דלי',
  packQty,
  inStock: true,
  leadDays: 2,
  terms: [],
  minOrder: null,
  minOrderQty: 1,
  specialMinQty: null,
  delivers: null,
  suggested: true,
})

const CATALOGUE: AppProduct[] = [
  {
    id: 'pur', name: 'דבק PUR לקנטים', brand: null, mpn: null, baseUnit: 'kg', unit: 'ק״ג', imageUrl: null, attributes: [],
    categoryId: null, icon: null, topId: null, subId: null, description: null, offers: [offer('גלעד', 24, 5)],
  },
]

vi.mock('@/lib/app/catalog-server', () => ({ loadProducts: async () => CATALOGUE }))
vi.mock('@/lib/promo', () => ({ loadCurrentPromo: async () => null, recordPromoEvent: async () => undefined }))
vi.mock('@/lib/agent-status', () => ({ answerStatus: async () => ({ message: '', actions: [] }) }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    const chain: Record<string, unknown> = {}
    for (const key of ['select', 'eq', 'order']) chain[key] = () => chain
    chain.limit = async () => ({ data: [], error: null })
    return { from: () => chain }
  },
}))

const { answerWithClaude } = await import('./agent-llm')

const usage = { input_tokens: 10, output_tokens: 5 }
const toolTurn = (name: string, input: unknown) => ({ stop_reason: 'tool_use', usage, content: [{ type: 'tool_use', id: `t-${name}`, name, input }] })
const textTurn = (text: string) => ({ stop_reason: 'end_turn', usage, content: [{ type: 'text', text }] })

function fake(turns: unknown[]) {
  const create = vi.fn(async () => turns.shift())
  return { client: { messages: { create } } as never, create }
}
const ask = (client: never, userMessage = 'תזמין לי עשרים קילו פי יו אר') =>
  answerWithClaude({ userMessage, carpenterId: 'c-llm', city: null }, client)

describe('answerWithClaude', () => {
  it('builds the cart from the catalogue, not from what Claude writes', async () => {
    const { client } = fake([
      toolTurn('search_catalogue', { query: 'דבק PUR', quantity_amount: 12, quantity_unit: 'kg', supplier: null }),
      toolTurn('prepare_cart', { lines: [{ ref: 'p1', quantity_amount: 12, quantity_unit: 'kg' }] }),
      textTurn('הכנתי 15 ק״ג של **דבק PUR לקנטים** מגלעד. בדוק ולחץ להוספה.'),
    ])
    const answer = await ask(client)
    expect(answer?.engine).toBe('claude')
    expect(answer?.state).toBe('results_order')
    expect(answer?.actions[0].items).toEqual([expect.objectContaining({ id: 'pur', supplier_name: 'גלעד', base_price_excl_vat: 24, quantity: 15 })])
  })

  it('ignores a ref Claude made up', async () => {
    const { client } = fake([toolTurn('prepare_cart', { lines: [{ ref: 'p9', quantity_amount: 1, quantity_unit: 'kg' }] }), textTurn('לא מצאתי.')])
    const answer = await ask(client)
    expect(answer?.actions.some((a) => a.action === 'add-all')).toBe(false)
  })

  it('offers add-to-cart for a single search result', async () => {
    const { client } = fake([toolTurn('search_catalogue', { query: 'דבק PUR', quantity_amount: null, quantity_unit: null, supplier: null }), textTurn('מצאתי דבק.')])
    const answer = await ask(client)
    expect(answer?.state).toBe('results_single')
    expect(answer?.actions.map((a) => a.action)).toContain('add-to-cart')
  })

  it('returns null so the keyword agent answers when the call fails or is declined', async () => {
    const failing = { messages: { create: vi.fn(async () => { throw new Error('boom') }) } } as never
    expect(await ask(failing)).toBeNull()
    const { client } = fake([{ stop_reason: 'refusal', usage, content: [] }])
    expect(await ask(client)).toBeNull()
  })

  it('stays off without a key', async () => {
    expect(await answerWithClaude({ userMessage: 'דבק', carpenterId: 'x', city: null })).toBeNull()
  })
})
