'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Mic } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { ChatMessage, Message } from './ChatMessage'
import type { ActionButton } from '@/lib/procurement-agent'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

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
    const number = action.action.replace('select-', '')
    const item = action.item

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: item ? `${number}) ${item.name_he}` : number,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])

    if (!item) {
      say('למוצר הזה אין כרגע הצעה פעילה מספק, אז אי אפשר להזמין אותו מכאן.')
      return
    }

    const pack = item.pack_qty && item.pack_qty > 1 ? ` · ${item.pack_label ?? 'חבילה'} ${item.pack_qty} ${item.unit}` : ''
    say(
      `${item.name_he}\n₪${item.base_price_excl_vat} ל${item.unit} לפני מע״מ${pack}\nספק: ${item.supplier_name}`,
      [{ label: '➕ הוסף לעגלה', action: 'add-to-cart', value: item.id, item }]
    )
  }

  const handleAddToCart = (action: ActionButton) => {
    const item = action.item
    if (!item) {
      say('לא הצלחתי להוסיף לעגלה — חסרים פרטי מחיר. נסה לחפש שוב.')
      return
    }
    const { quantity, ...line } = item
    cart.addItem({ ...line, name_en: '' }, quantity)
    say(`✅ הוספתי לעגלה: ${item.name_he}`)
  }

  const handleContactSupplier = async (action: ActionButton) => {
    const supplierId = action.item?.supplier_id ?? action.value
    if (!supplierId) return
    const productName = action.item?.name_he

    try {
      const response = await fetch('/api/carpenter/contact-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          action: 'inquiry',
          message: productName ? `שאלה לגבי ${productName}` : 'שאלה כללית',
          productId: action.item?.id,
        }),
      })

      say(response.ok ? '✅ הודעתך נשלחה לספק. הם יחזרו אלייך בקרוב.' : 'לא הצלחתי לשלוח את ההודעה לספק. נסה שוב בעוד רגע.')
    } catch (error) {
      console.error('Failed to contact supplier:', error)
      say('לא הצלחתי לשלוח את ההודעה לספק. נסה שוב בעוד רגע.')
    }
  }

  // The search bar and the chat run the same search; this shows it in the catalogue
  const handleOpenCatalog = (action: ActionButton) => {
    if (!action.value) return
    onClose()
    router.push(`/app/catalog?q=${encodeURIComponent(action.value)}`)
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
      // Check if user is asking for order history, previous products, or navigation
      const isOrderHistoryQuery = /הזמנ|order|history/i.test(userMessageText)
      const isPreviousProductQuery = /כמו.*בפעם|פעם.*שעברה|זה שקניתי|קודם|לפני/i.test(userMessageText)
      const isNavigationQuery = /איפה|קטלוג|מציאון|עגלה|פרופיל|פרטיים|how|where|go to/i.test(userMessageText)

      if (isOrderHistoryQuery) {
        // Fetch order history
        const orderResponse = await fetch('/api/carpenter/orders', {
          method: 'GET',
        })

        if (orderResponse.ok) {
          const { orders } = await orderResponse.json()

          if (orders.length > 0) {
            const ordersText = orders
              .slice(0, 5)
              .map(
                (order: any) =>
                  `📦 ${order.order_number} (${order.status})\n   ${order.order_items.map((item: any) => `${item.product_name_he} ×${item.quantity}`).join(', ')}`
              )
              .join('\n\n')

            const agentMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'agent',
              content: `הנה ההזמנות האחרונות שלך:\n\n${ordersText}`,
              timestamp: Date.now(),
            }

            setMessages((prev) => [...prev, agentMessage])
            return
          }
        }
      }

      if (isPreviousProductQuery) {
        // Fetch previous products
        const prevResponse = await fetch('/api/carpenter/previous-products', {
          method: 'GET',
        })

        if (prevResponse.ok) {
          const { products } = await prevResponse.json()

          if (products.length > 0) {
            const productsText = products
              .map((product: any) => `• ${product.product_name_he}`)
              .join('\n')

            const agentMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'agent',
              content: `הנה המוצרים שקניתם קודם:\n\n${productsText}\n\nרוצה לחפש אחד מהם?`,
              timestamp: Date.now(),
            }

            setMessages((prev) => [...prev, agentMessage])
            return
          }
        }
      }

      if (isNavigationQuery) {
        let targetPath = ''
        if (/מציאון/i.test(userMessageText)) {
          targetPath = '/app/metzion'
        } else if (/קטלוג/i.test(userMessageText)) {
          targetPath = '/app/catalog'
        } else if (/עגלה|shopping/i.test(userMessageText)) {
          targetPath = '/app/order' // the open order is the cart
        } else if (/פרופיל|פרטיים|חשבון/i.test(userMessageText)) {
          targetPath = '/app/account'
        } else if (/הזמנות|orders/i.test(userMessageText)) {
          targetPath = '/app/orders'
        }

        if (targetPath) {
          window.location.href = targetPath
          return
        }
      }

      // Call agent API for product search
      const response = await fetch('/api/carpenter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageText,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
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
              />
            ))
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
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-lg transition ${
                isListening ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
              disabled={isLoading}
            >
              <Mic size={20} />
            </button>
            <button
              onClick={() => handleSend()}
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
