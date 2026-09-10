'use client'

import { useRouter, usePathname } from 'next/navigation'

/**
 * Chooses whose eyes you are looking through.
 *
 * The choice lives in the URL rather than in state, so a view can be reloaded,
 * bookmarked or sent to someone and still show the same person's screen.
 */
export default function ViewPicker({
  label,
  param,
  current,
  options,
}: {
  label: string
  param: string
  current: string
  options: { id: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  if (options.length === 0) return null

  return (
    <label className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        value={current}
        onChange={(event) => router.push(`${pathname}?${param}=${event.target.value}`)}
        className="h-11 min-w-56 rounded-lg border border-stone-300 bg-white px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
