import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/app/catalog-server', () => ({ loadProducts: async () => [{ brand: 'Henkel' }, { brand: null }] }))

const { transcribe, transcriptionConfigured } = await import('./agent-transcribe')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('transcribe', () => {
  it('is off without a key, so the chat keeps the browser microphone', async () => {
    expect(transcriptionConfigured()).toBe(false)
    expect(await transcribe(new Blob(['x']), 'speech.webm')).toBeNull()
  })

  it('sends Hebrew with the catalogue vocabulary and returns the text', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ text: ' דבק PUR 20 קילו לקנטים ' })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await transcribe(new Blob(['x']), 'speech.m4a')).toBe('דבק PUR 20 קילו לקנטים')
    const form = (fetchMock.mock.calls[0] as unknown as [string, { body: FormData }])[1].body
    expect(form.get('language')).toBe('he')
    expect(String(form.get('prompt'))).toContain('Henkel')
    expect(String(form.get('prompt'))).toContain('PUR')
  })

  it('returns null when the service fails', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })))
    expect(await transcribe(new Blob(['x']), 'speech.webm')).toBeNull()
  })
})
