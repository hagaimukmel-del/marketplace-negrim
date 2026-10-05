'use client'

import { Loader } from 'lucide-react'
import type { ActionButton } from '@/lib/procurement-agent'

export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
  isLoading?: boolean
  actions?: ActionButton[]
}

interface ChatMessageProps {
  message: Message
  onOptionSelect?: (action: ActionButton) => void
  onAddToCart?: (action: ActionButton) => void
  onContactSupplier?: (action: ActionButton) => void
  onOpenCatalog?: (action: ActionButton) => void
  onOpenPage?: (action: ActionButton) => void
}

/**
 * The agent marks names with **bold** and documents with [title](https://...);
 * render those instead of showing the markup. Only https links become links.
 */
function withMarkup(text: string) {
  return text.split(/(\*\*.+?\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/)
    if (bold) return <strong key={i}>{bold[1]}</strong>
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/)
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline">
          {link[1]}
        </a>
      )
    }
    return part
  })
}

export function ChatMessage({ message, onOptionSelect, onAddToCart, onContactSupplier, onOpenCatalog, onOpenPage }: ChatMessageProps) {
  const isUser = message.role === 'user'

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
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{withMarkup(message.content)}</p>

            {/* Action buttons from backend */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {message.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (action.action.startsWith('select-')) {
                        onOptionSelect?.(action)
                      } else if (action.action === 'add-to-cart') {
                        onAddToCart?.(action)
                      } else if (action.action === 'contact-supplier') {
                        onContactSupplier?.(action)
                      } else if (action.action === 'open-catalog') {
                        onOpenCatalog?.(action)
                      } else if (action.action === 'open-page') {
                        onOpenPage?.(action)
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
