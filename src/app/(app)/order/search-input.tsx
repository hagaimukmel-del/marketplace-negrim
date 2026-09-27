'use client'

import { FormEvent, useState, useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface SearchInputProps {
  onSearch: (query: string) => void
  loading?: boolean
}

export default function SearchInput({ onSearch, loading }: SearchInputProps) {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'he-IL' // Hebrew
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => setIsListening(true)
      recognitionRef.current.onend = () => setIsListening(false)

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setQuery((prev) => prev + finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setQuery('') // Clear on new recording
      recognitionRef.current.start()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            מה אתה צריך?
          </label>
          <div className="flex gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              } disabled:opacity-50`}
              title={isListening ? 'עצור הקלטה' : 'הקלט קול'}
            >
              {isListening ? (
                <>
                  <MicOff size={18} />
                  <span className="text-sm">עצור</span>
                </>
              ) : (
                <>
                  <Mic size={18} />
                  <span className="text-sm">🎙️</span>
                </>
              )}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="דבק לבירץ, צבע לאלון, וכו..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 font-medium transition-colors"
            >
              {loading ? 'חופש...' : 'חפש'}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {isListening && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <div className="animate-pulse">
              <Mic size={16} className="text-blue-600" />
            </div>
            <span className="text-sm text-blue-700">מקשיב... דברו קול בעברית</span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          💡 לחץ 🎙️ לדברות, או כתוב בידיים. תן לי כמה פרטים: סוג מוצר, עץ, או יישום.
        </p>
      </div>
    </form>
  )
}
