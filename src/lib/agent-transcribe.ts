import 'server-only'

import { loadProducts } from '@/lib/app/catalog-server'

/**
 * Server-side speech to text for the agent chat (T-001). The phone's own
 * recogniser garbles Hebrew trade words ("PUR" comes back as "pour" or "QR",
 * "קנטים" as "Canteen"), so the recording goes to a transcription service that
 * takes a hint of the words to expect. Off without OPENAI_API_KEY: the chat
 * then keeps using the browser's recogniser.
 */

const MODEL = 'gpt-4o-transcribe'
const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions'

/** A recording is a sentence, not a meeting: 15 seconds of phone audio is well under this. */
export const MAX_AUDIO_BYTES = 2_000_000

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.AGENT_STT !== 'off'
}

const BASE_VOCABULARY = [
  'דבק PUR', 'דבק EVA', 'דבק פוליאורטן', 'קנט', 'קנטים', 'מכונת קנטים', 'קנט PVC', 'קנט ABS',
  'ציר בלום', 'Blum', 'קליפ טופ', 'מסילה', 'מגירה', 'לוח מלמין', 'MDF', 'סנדוויץ׳', 'סיליקון אקרילי', 'מדלל',
  'ק״ג', 'ליטר', 'יחידות', 'מטר', 'מ״ר', 'דלי', 'קרטון', 'Henkel', 'HOLZHER', 'Woodlock',
]

let brands: { at: number; list: string[] } | null = null

/** Brands in the catalogue, so a name the platform sells is spelled the way the catalogue spells it. */
async function catalogueBrands(): Promise<string[]> {
  if (brands && Date.now() - brands.at < 10 * 60_000) return brands.list
  try {
    const products = await loadProducts({ showPrices: false })
    const list = [...new Set(products.map((product) => product.brand).filter((brand): brand is string => Boolean(brand)))].slice(0, 60)
    brands = { at: Date.now(), list }
  } catch {
    brands = { at: Date.now(), list: [] }
  }
  return brands.list
}

/** Hebrew text from a recording, or null when the service is off or fails. */
export async function transcribe(audio: Blob, filename: string): Promise<string | null> {
  if (!transcriptionConfigured()) return null
  const form = new FormData()
  form.append('file', audio, filename)
  form.append('model', MODEL)
  form.append('language', 'he')
  form.append('prompt', `נגר מזמין חומרים וחומרי עזר. מילים צפויות: ${[...BASE_VOCABULARY, ...(await catalogueBrands())].join(', ')}.`)
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    console.error('agent.transcribe error', response.status)
    return null
  }
  const { text } = (await response.json()) as { text?: string }
  return text?.trim() || null
}
