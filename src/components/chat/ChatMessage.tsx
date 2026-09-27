'use client'

import { FileText, Loader } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
  isLoading?: boolean
  actions?: Array<{
    label: string
    action: string
  }>
}

interface ChatMessageProps {
  message: Message
  onOptionSelect?: (option: string) => void
}

// Extract selection options from message (e.g., "בחר (1/2/3)" -> ['1', '2', '3'])
function extractSelectionOptions(content: string): string[] {
  const match = content.match(/בחר\s*\(([0-9/]+)\)/)
  if (!match) return []
  return match[1].split('/').filter(Boolean)
}

export function ChatMessage({ message, onOptionSelect }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const selectionOptions = !isUser ? extractSelectionOptions(message.content) : []


  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-100 text-slate-900 rounded-bl-none'
        }`}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">מחפש...</span>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

            {/* Action buttons for product details */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {message.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (action.action.startsWith('select-')) {
                        const option = action.action.replace('select-', '')
                        onOptionSelect?.(option)
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded ${
                      isUser
                        ? 'bg-blue-700 hover:bg-blue-800'
                        : 'bg-white hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div className={`text-[11px] mt-1 opacity-60`}>
          {new Date(message.timestamp).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}
