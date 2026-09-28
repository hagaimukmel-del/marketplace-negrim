'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Mic } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { ChatMessage, Message } from './ChatMessage'

interface ChatContainerProps {
  isOpen: boolean
  onClose: () => void
  carpenterId: string
  onSearch?: (query: string) => void
}

export function ChatContainer({ isOpen, onClose, carpenterId, onSearch }: ChatContainerProps) {
  const cart = useCart()
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

  const handleOptionSelect = async (option: string) => {
    // User selected an option (1, 2, 3, etc)

    // Add selection as user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: option,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Call agent API with selected option
      const response = await fetch('/api/carpenter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: option,
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
        actions: data.actions && data.actions.length > 0
          ? data.actions.map((act: any) => ({
              label: act.label,
              action: act.action,
            }))
          : [],
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

  const handleAddToCart = (productId: string, details?: Record<string, any>) => {
    try {
      cart.addItem(
        {
          id: productId,
          name_he: details?.label || 'מוצר',
          name_en: '',
          base_price_excl_vat: Number(details?.price) || 0,
          supplier_id: details?.supplier_id,
          supplier_name: details?.supplier_name,
        },
        Number(details?.quantity) || 1
      )
      // Show confirmation
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'agent',
        content: '✅ הוספתי לעגלה!',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, confirmMessage])
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessageText = input.trim()

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
      // Check if user is asking for order history or previous products
      const isOrderHistoryQuery = /הזמנ|order|history/i.test(userMessageText)
      const isPreviousProductQuery = /כמו.*בפעם|פעם.*שעברה|זה שקניתי|קודם|לפני/i.test(userMessageText)

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
        actions: data.actions && data.actions.length > 0
          ? data.actions.map((act: any) => ({
              label: act.label,
              action: act.action,
            }))
          : [],
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
    <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-2xl max-h-[80vh] shadow-2xl"
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
              onClick={handleSend}
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
