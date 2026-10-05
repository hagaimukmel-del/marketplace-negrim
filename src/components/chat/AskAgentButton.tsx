'use client'

import { MessageCircle } from 'lucide-react'
import { useOpenAgent } from './agent-context'

/** Hands a catalogue search to the agent chat, which runs the same search and carries on from there. */
export default function AskAgentButton({ query }: { query: string }) {
  const openAgent = useOpenAgent()
  return (
    <button
      type="button"
      onClick={() => openAgent(query)}
      className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-[10px] border-[1.5px] border-hair bg-white px-3 text-sm font-semibold text-navy hover:bg-warm"
    >
      <MessageCircle size={17} />
      שאל את הסוכן על ״{query}״
    </button>
  )
}
