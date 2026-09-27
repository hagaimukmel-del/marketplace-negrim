'use client'

import { useState, useEffect } from 'react'

interface ChatState {
  isOpen: boolean
  messages: Array<{
    id: string
    role: 'user' | 'agent'
    content: string
    timestamp: number
  }>
}

const CHAT_STORAGE_KEY = 'negrim-chat-history'

export function useChat(carpenterId: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatState['messages']>([])

  // Load messages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // Keep only last 100 messages
        setMessages(data.slice(-100))
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }, [])

  // Save messages to localStorage
  const addMessage = (message: ChatState['messages'][0]) => {
    const updated = [...messages, message].slice(-100) // Keep last 100
    setMessages(updated)
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }

  const clearMessages = () => {
    setMessages([])
    localStorage.removeItem(CHAT_STORAGE_KEY)
  }

  return {
    isOpen,
    setIsOpen,
    messages,
    addMessage,
    clearMessages,
  }
}
