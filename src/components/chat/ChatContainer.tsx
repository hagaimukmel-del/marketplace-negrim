'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Mic } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { ChatMessage, Message } from './ChatMessage'
import type { ActionButton } from '@/lib/procurement-agent'
import { STATUS_LABEL, type OrderStatus } from '@/lib/app/orders'

// Shortcuts the chat answers itself. Kept narrow on purpose: "הזמנה של דבק" or
// "יש בקטלוג דבק PUR?" are product searches and must reach the agent.
const PREVIOUS_PRODUCTS = /בפעם שעברה|כמו בפעם|זה שקניתי|מה קניתי/
const ORDER_HISTORY = /ההזמנות שלי|הזמנות קודמות|היסטוריית הזמנות|מה הזמנתי|my orders|order history/i
const PAGES: [RegExp, string][] = [
  [/מציאון/, '/app/metzion'],
  [/עגלה/, '/app/order'],
  [/פרופיל|הפרטים שלי|החשבון שלי/, '/app/account'],
  [/הזמנות/, '/app/orders'],
  [/קטלוג/, '/app/catalog'],
]
/** "קח אותי לעגלה", "איפה המציאון?", or just "עגלה": a request to go somewhere, not a search. */
function pageFor(text: string): string | null {
  const isGoTo = /^(איפה|קח אותי|תעביר אותי|פתח|עבור ל|go to|where)/i.test(text) || text.split(/\s+/).length <= 2
  if (!isGoTo) return null
  return PAGES.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

interface ChatContainerProps {
  isOpen: boolean
  onClose: () => void
  carpenterId: string
  onSearch?: (query: string) => void
  onNavigate?: (path: string) => void
  /** Filled with a way to ask the chat a question, for a search handed over from the search bar. */
  askRef?: RefObject<((query: string) => void) | null>
}

export function ChatContainer({ isOpen, onClose, carpenterId, onSearch, askRef }: ChatContainerProps) {
  const cart = useCart()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  // After "שאלה לספק", the next message is the question for that supplier, not a search
  const [askingSupplier, setAskingSupplier] = useState<{ supplierId: string; supplierName: string; productId: string; productName: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  // The panel only renders once opened, so this never runs during server rendering
  const [canListen] = useState(() => typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'he-IL'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => setIsListening(true)
      recognitionRef.current.onend = () => setIsListening(false)

      recognitionRef.current.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript) setInput(transcript)
      }
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Escape closes the panel
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const say =(content: string, actions?: ActionButton[]) => {
    const agentMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role: 'agent',
      content,
      timestamp: Date.now(),
      actions,
    }
    setMessages((prev) => [...prev, agentMessage])
  }

  // The button carries the product the agent showed, so the choice is resolved
  // here rather than sent back through search as the bare text "2"
  const handleOptionSelect = (action: ActionButton) => {
    setAskingSupplier(null)
    const number = action.action.replace('select-', '')
    const item = action.item

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: item ? `${number}) ${item.name_he}` : number,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])

    const productPage: ActionButton = { label: 'לדף המוצר', action: 'open-page', value: `/app/product/${item?.id ?? action.value}` }

    if (!item) {
      say('למוצר הזה אין כרגע הצעה פעילה מספק, אז אי אפשר להזמין אותו מכאן.', action.value ? [productPage] : undefined)
      return
    }

    const pack = item.pack_qty && item.pack_qty > 1 ? ` · ${item.pack_label ?? 'חבילה'} ${item.pack_qty} ${item.unit}` : ''
    say(
      `${item.name_he}\n₪${item.base_price_excl_vat} ל${item.unit} לפני מע״מ${pack}\nספק: ${item.supplier_name}`,
      [
        { label: '➕ הוסף לעגלה', action: 'add-to-cart', value: item.id, item },
        productPage,
        { label: 'שאלה לספק', action: 'contact-supplier', value: item.supplier_id, item },
      ]
    )
  }

  const handleAddToCart = (action: ActionButton) => {
    setAskingSupplier(null)
    const item = action.item
    if (!item) {
      say('לא הצלחתי להוסיף לעגלה — חסרים פרטי מחיר. נסה לחפש שוב.')
      return
    }
    const { quantity, ...line } = item
    cart.addItem({ ...line, name_en: '' }, quantity)
    say(`✅ הוספתי לעגלה: ${item.name_he}`)
  }

  // The question itself comes as the next message, so the supplier gets the
  // carpenter's own words rather than a canned line
  const handleContactSupplier = (action: ActionButton) => {
    const item = action.item
    if (!item?.supplier_id) return
    const supplierName = item.supplier_name || 'הספק'
    setAskingSupplier({ supplierId: item.supplier_id, supplierName, productId: item.id, productName: item.name_he })
    say(`כתוב כאן את השאלה ל${supplierName} על ${item.name_he}, ואשלח לו אותה במייל עם הטלפון שלך. כדי לחזור לחיפוש כתוב "ביטול".`)
  }

  const sendQuestion = async (question: string) => {
    if (!askingSupplier) return
    const { supplierId, supplierName, productId } = askingSupplier
    if (/^ביטול$/.test(question)) {
      setAskingSupplier(null)
      say('בוטל. מה לחפש?')
      return
    }
    const failed = 'לא הצלחתי לשלוח את השאלה. נסה שוב בעוד רגע, או כתוב "ביטול".'
    const response = await fetch('/api/carpenter/contact-supplier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId, action: 'inquiry', message: question.slice(0, 1000), productId }),
    }).catch(() => null)
    if (!response) {
      say(failed)
      return
    }
    if (response.ok) {
      setAskingSupplier(null)
      say(`✅ השאלה נשלחה ל${supplierName}. הוא יחזור אליך לטלפון או למייל.`)
      return
    }
    const { error } = (await response.json().catch(() => ({}))) as { error?: string }
    say(response.status === 429 && error ? error : failed)
  }

  const goTo = (path: string) => {
    onClose()
    router.push(path)
  }

  const handleOpenPage = (action: ActionButton) => {
    if (action.value) goTo(action.value)
  }

  // The search bar and the chat run the same search; this shows it in the catalogue
  const handleOpenCatalog = (action: ActionButton) => {
    if (!action.value) return
    goTo(`/app/catalog?q=${encodeURIComponent(action.value)}`)
  }

  const handleSend = async (text?: string) => {
    const userMessageText = (text ?? input).trim()
    if (!userMessageText) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageText,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      if (askingSupplier) {
        await sendQuestion(userMessageText)
        return
      }

      // The conversational agent answers when it is configured; otherwise the
      // shortcuts and keyword search below answer, as before
      const history = [...messages, userMessage]
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const agentResponse = await fetch('/api/carpenter/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      }).catch(() => null)
      if (agentResponse?.ok) {
        const reply = (await agentResponse.json()) as { fallback?: boolean; message?: string; actions?: ActionButton[] }
        if (!reply.fallback && reply.message) {
          say(reply.message, reply.actions?.length ? reply.actions : undefined)
          return
        }
      } else if (agentResponse?.status === 429) {
        const { error } = (await agentResponse.json().catch(() => ({}))) as { error?: string }
        if (error) {
          say(error, [{ label: 'לקטלוג', action: 'open-page', value: '/app/catalog' }])
          return
        }
      }

      if (PREVIOUS_PRODUCTS.test(userMessageText)) {
        const prevResponse = await fetch('/api/carpenter/previous-products')
        if (prevResponse.ok) {
          const { products } = (await prevResponse.json()) as { products: { product_id: string; product_name_he: string }[] }
          say(
            products.length > 0 ? 'אלה המוצרים מההזמנות האחרונות שלך:' : 'עוד לא שלחת הזמנות, אז אין לי מה להציע מפעם שעברה.',
            products.map((p) => ({ label: p.product_name_he, action: 'open-page', value: `/app/product/${p.product_id}` }))
          )
          return
        }
      }

      if (ORDER_HISTORY.test(userMessageText)) {
        const orderResponse = await fetch('/api/carpenter/orders')
        if (orderResponse.ok) {
          const { orders } = (await orderResponse.json()) as {
            orders: { order_number: string; status: OrderStatus; order_items: { product_name_he: string; quantity: number }[] }[]
          }
          const ordersText = orders
            .slice(0, 5)
            .map((order) => `${order.order_number} · ${STATUS_LABEL[order.status] ?? order.status}\n${order.order_items.map((item) => `${item.product_name_he} ×${item.quantity}`).join(', ')}`)
            .join('\n\n')
          say(
            orders.length > 0 ? `ההזמנות האחרונות שלך:\n\n${ordersText}` : 'עוד לא שלחת הזמנות.',
            [{ label: 'לכל ההזמנות', action: 'open-page', value: '/app/orders' }]
          )
          return
        }
      }

      const page = pageFor(userMessageText)
      if (page) {
        goTo(page)
        return
      }

      // Call agent API for product search
      const response = await fetch('/api/carpenter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageText,
        }),
      })

      // Signed out: the agent is for registered carpenters, so invite them in
      if (response.status === 401) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: 'כדי לחפש עם הסוכן ולראות מחירים צריך להירשם. ההרשמה חינמית ולוקחת דקה.',
            timestamp: Date.now(),
            actions: [{ label: 'כניסה / הרשמה', action: 'open-page', value: '/join' }],
          },
        ])
        return
      }

      if (!response.ok) {
        throw new Error('החיפוש לא הצליח כרגע. נסה שוב בעוד רגע.')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'חיפוש נכשל')
      }

      // Use structured actions from backend
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.message,
        timestamp: Date.now(),
        actions: (data.actions ?? []) as ActionButton[],
      }

      setMessages((prev) => [...prev, agentMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'agent',
        content: error instanceof Error ? error.message : 'קרתה שגיאה בחיפוש',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Lets the shell hand over a search from the search bar, asked like a typed message
  useEffect(() => {
    if (!askRef) return
    askRef.current = (query) => void handleSend(query)
  })

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  if (!isOpen) return null

  return (
    // Phone: a sheet from the bottom. Desktop: a panel on the far side from the
    // sidebar, so the catalogue stays readable next to it
    <div className="fixed inset-0 z-50 bg-black/40 md:bg-black/20" onClick={onClose}>
      <div
        role="dialog"
        aria-label="סוכן חכם"
        className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl md:inset-x-auto md:end-0 md:top-0 md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:rounded-s-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-900">🧠 סוכן חכם</h2>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="p-1 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 pt-8">
              <p className="text-sm">👋 שלום! מה אתה מחפש היום?</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOptionSelect={handleOptionSelect}
                onAddToCart={handleAddToCart}
                onContactSupplier={handleContactSupplier}
                onOpenCatalog={handleOpenCatalog}
                onOpenPage={handleOpenPage}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start" aria-live="polite">
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">כותב תשובה...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="דבק, צבע, כלים..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            {canListen && (
            <button
              onClick={toggleVoice}
              aria-label={isListening ? 'עצור הקלטה' : 'דבר במקום להקליד'}
              className={`p-2 rounded-lg transition ${
                isListening ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
              disabled={isLoading}
            >
              <Mic size={20} />
            </button>
            )}
            <button
              onClick={() => handleSend()}
              aria-label="שלח"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Send size={20} />
            </button>
          </div>
          {isListening && (
            <div className="text-xs text-slate-600 text-center">
              🎤 מקשיב... דברו קול בעברית
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
