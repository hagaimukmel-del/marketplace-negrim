'use client'

import { createContext, useContext } from 'react'

/**
 * Opens the agent chat from anywhere inside AppShell, which owns the chat and
 * provides this. Outside the shell it is a no-op rather than an error, so a
 * button rendered elsewhere simply does nothing.
 */
export const OpenAgentContext = createContext<() => void>(() => {})

export function useOpenAgent(): () => void {
  return useContext(OpenAgentContext)
}
