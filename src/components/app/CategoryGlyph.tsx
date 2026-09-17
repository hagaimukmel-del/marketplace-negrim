/**
 * The line icons drawn for the carpentry trade — boards, edging, glue, hinges —
 * keyed by categories.icon. Lucide has no honest icon for an edgebanding roll
 * or a sack of hot-melt, so these are our own, on the same 24-unit grid and
 * stroke as the rest of the interface.
 */

const PATHS: Record<string, React.ReactNode> = {
  boards: (
    <>
      <path d="M3 7.5 12 3.5l9 4-9 4z" />
      <path d="M3 11.5l9 4 9-4" />
      <path d="M3 15.5l9 4 9-4" />
    </>
  ),
  wood: (
    <>
      <ellipse cx="8" cy="12" rx="4.5" ry="7" />
      <ellipse cx="8" cy="12" rx="1.8" ry="3" />
      <path d="M8 5h9.5a4.5 7 0 0 1 0 14H8" />
      <path d="M13 9.5h4M12 14.5h3.5" />
    </>
  ),
  edge: (
    <>
      <circle cx="9.5" cy="11" r="6.5" />
      <circle cx="9.5" cy="11" r="2.3" />
      <path d="M9.5 17.5H21.5" />
      <path d="M21.5 17.5v-2" />
    </>
  ),
  cladding: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M7.8 3.5v17M12 3.5v17M16.2 3.5v17" />
    </>
  ),
  glue: (
    <>
      <path d="M5.5 9h13l-1.4 11.2a1 1 0 0 1-1 .8H7.9a1 1 0 0 1-1-.8z" />
      <path d="M4.5 9h15" />
      <path d="M8 9a4 4 0 0 1 8 0" />
      <path d="M12 12.8c-1.2 1.6-1.8 2.6-1.8 3.4a1.8 1.8 0 0 0 3.6 0c0-.8-.6-1.8-1.8-3.4z" />
    </>
  ),
  hardware: (
    <>
      <rect x="3" y="4.5" width="7" height="15" rx="1.2" />
      <rect x="14" y="4.5" width="7" height="15" rx="1.2" />
      <path d="M10 7h4M10 12h4M10 17h4" />
    </>
  ),
  finish: (
    <>
      <path d="M12 2.5v6" />
      <rect x="8" y="8.5" width="8" height="4" rx="1" />
      <path d="M8.3 12.5 7.5 21h9l-.8-8.5" />
      <path d="M10.3 16.5V21M12 15.5V21M13.7 16.5V21" />
    </>
  ),
  tools: (
    <>
      <path d="M3.5 17.5 14.5 6.5l3 3-11 11H3.5z" />
      <path d="M14.5 6.5 17 4a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-2.5 2.5" />
    </>
  ),
  machines: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
  care: (
    <>
      <path d="M9 9h6v2.5l2 2.2V21H7v-7.3l2-2.2z" />
      <path d="M10 9V5.5h3.5l3.5 1" />
      <path d="M19 4h2M19.5 7h1.5" />
    </>
  ),
  other: (
    <>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
    </>
  ),
}

export default function CategoryGlyph({ icon, size = 22 }: { icon: string | null | undefined; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[icon ?? ''] ?? PATHS.other}
    </svg>
  )
}
