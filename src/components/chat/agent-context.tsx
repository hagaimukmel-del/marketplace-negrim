'use client'

import { createContext, useContext } from 'react'

/**
 * Opens the agent chat from anywhere inside AppShell, which owns the chat and
 * provides this. Given a query, the chat opens already asking it. Outside the
 * shell it is a no-op rather than an error, so a button rendered elsewhere
 * simply does nothing.
 */
export type OpenAgent = (query?: string) => void

export const OpenAgentContext = createContext<OpenAgent>(() => {})

export function useOpenAgent(): OpenAgent {
  return useContext(OpenAgentContext)
}
