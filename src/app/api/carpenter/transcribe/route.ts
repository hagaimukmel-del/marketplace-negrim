import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { MAX_AUDIO_BYTES, transcribe, transcriptionConfigured } from '@/lib/agent-transcribe'
import { checkRateLimit } from '@/lib/rate-limit'

/** GET: does the server transcribe? The chat uses it to choose between this and the browser's microphone. */
export async function GET() {
  return NextResponse.json({ enabled: transcriptionConfigured() })
}

/**
 * POST /api/carpenter/transcribe
 * Input: multipart form with an `audio` recording of one spoken request.
 * Output: { text } in Hebrew. The recording is never stored.
 */
export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'חייב להיות מחובר' }, { status: 401 })
  if (!transcriptionConfigured()) return NextResponse.json({ error: 'not configured' }, { status: 503 })
  if (!checkRateLimit(`stt:${carpenter.id}`, 'transcribe').allowed) return NextResponse.json({ error: 'too many recordings' }, { status: 429 })

  try {
    const audio = (await request.formData()).get('audio')
    if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'audio required (up to 2 MB)' }, { status: 400 })
    }
    const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : 'webm'
    const text = await transcribe(audio, `speech.${extension}`)
    console.info('agent.transcribe', JSON.stringify({ carpenter: carpenter.id, bytes: audio.size, type: audio.type, chars: text?.length ?? 0 }))
    return text ? NextResponse.json({ text }) : NextResponse.json({ error: 'no transcript' }, { status: 502 })
  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
