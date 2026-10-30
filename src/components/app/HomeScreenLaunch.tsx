'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const LAUNCHED = 'nagarim:launched'

/**
 * Opened from the phone's home-screen icon, the app starts on the home screen.
 *
 * iOS saves the page that was open when "Add to Home Screen" was tapped (often
 * the catalogue) and ignores the manifest's start_url, so the icon would keep
 * opening there. In standalone mode the first page of a launch is always that
 * saved address (links from outside open in Safari, not here), so the first
 * page of each launch is swapped for /app. The flag lives in sessionStorage,
 * which a fresh launch clears, so moving around inside the app is untouched.
 */
export default function HomeScreenLaunch() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone) return
    try {
      if (sessionStorage.getItem(LAUNCHED)) return
      sessionStorage.setItem(LAUNCHED, '1')
    } catch {
      return
    }
    if (pathname && pathname !== '/app' && pathname.startsWith('/app/')) router.replace('/app')
    // Only the first page of a launch counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
