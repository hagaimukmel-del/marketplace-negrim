import { useId } from 'react'

/**
 * The agent's face: a wooden figure with a receptionist's headset, so the
 * chat reads as "עוזר הרכש" of the site rather than a search box. Drawn
 * inline so it costs no request and stays sharp at every size.
 */
export function AgentAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  // Several avatars can share a page, so each clips with its own id
  const clip = `agent-avatar-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="#FDF1E1" />
      {/* Shoulders: a work shirt in the brand's navy */}
      <path d="M10 64c1.5-11 10-17 22-17s20.5 6 22 17z" fill="#1E2A3B" />
      <path d="M27 47.5l5 6 5-6" fill="none" stroke="#F29A12" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Head: a slice of wood, end grain showing */}
      <circle cx="32" cy="28" r="17" fill="#C9A27A" />
      <circle cx="32" cy="28" r="17" fill="none" stroke="#9A6B3F" strokeWidth="2" />
      <path d="M21 22c4-5 14-7 21-2M19.5 30c2 6 8 9.5 15 9" fill="none" stroke="#B48658" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="44.5" cy="33.5" r="1.6" fill="none" stroke="#B48658" strokeWidth="1.1" />
      {/* Face */}
      <circle cx="26" cy="27" r="2.3" fill="#1B2230" />
      <circle cx="38" cy="27" r="2.3" fill="#1B2230" />
      <circle cx="26.8" cy="26.2" r=".7" fill="#fff" />
      <circle cx="38.8" cy="26.2" r=".7" fill="#fff" />
      <circle cx="22.5" cy="32" r="2.2" fill="#E8956B" opacity=".55" />
      <circle cx="41.5" cy="32" r="2.2" fill="#E8956B" opacity=".55" />
      <path d="M27 33c2.6 3 7.4 3 10 0" fill="none" stroke="#1B2230" strokeWidth="2" strokeLinecap="round" />
      {/* Headset */}
      <path d="M14.5 28a17.5 17.5 0 0 1 35 0" fill="none" stroke="#1E2A3B" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="11.5" y="25" width="5" height="9" rx="2.5" fill="#1E2A3B" />
      <rect x="47.5" y="25" width="5" height="9" rx="2.5" fill="#1E2A3B" />
      <path d="M14 33.5c0 5 3.5 7.5 9 7.5" fill="none" stroke="#1E2A3B" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="41" r="2" fill="#F29A12" />
      </g>
    </svg>
  )
}
