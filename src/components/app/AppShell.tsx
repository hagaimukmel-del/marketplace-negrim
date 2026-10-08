'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ClipboardList, Home, LayoutGrid, MessageSquare, Recycle, Search, ShoppingBag, Sparkles, UserRound } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { LogoMark } from '@/components/brand/Logo'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { OpenAgentContext } from '@/components/chat/agent-context'
import { useChat } from '@/hooks/useChat'
import { getCarpenterToken } from '@/lib/carpenter-session'
import { useEffect, useRef, useState } from 'react'

function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span dir="ltr" className="flex flex-col leading-none" aria-hidden>
      <span className={`text-[15px] font-extrabold tracking-[0.02em] ${onDark ? 'text-white' : 'text-navy'}`} style={{ fontFamily: 'ui-sans-serif, "Segoe UI", Arial, sans-serif' }}>
        NAGARIM
      </span>
      <span className="mt-[3px] text-[7.5px] font-bold tracking-[0.3em] text-[#DC6F0C]" style={{ fontFamily: 'ui-sans-serif, "Segoe UI", Arial, sans-serif' }}>
        B2B MARKETPLACE
      </span>
    </span>
  )
}

/** The bell: messages from suppliers the carpenter has not opened yet. */
function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/app/messages"
      aria-label={unread ? `הודעות, ${unread} חדשות` : 'הודעות'}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hair bg-white text-navy"
    >
      <Bell size={20} />
      {unread > 0 && (
        <span className="tnum absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#DC6F0C] px-1 text-[11px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

/**
 * The frame every screen of the purchasing app sits in.
 *
 * On a phone: the logo and search on top, five destinations at the bottom, the
 * order in the middle as the one amber button carrying the number of lines in
 * it. On a desktop the same destinations become a navy sidebar, and search and
 * the order button move to the head of the page.
 */
export default function AppShell({
  attention,
  unread,
  initial,
  signedIn,
  children,
}: {
  /** No carpentry signed in: the avatar becomes the way in. */
  signedIn: boolean
  /** Orders that want the carpenter — the dot on "הזמנות". */
  attention: number
  /** Message threads with an answer the carpenter has not opened — the bell. */
  unread: number
  /** First letter of the carpentry, for the avatar. */
  initial: string
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? '/app'
  const { isOpen, setIsOpen, messages } = useChat('demo')
  const [carpenterId, setCarpenterId] = useState('demo')
  const cart = useCart()
  const lines = cart.items.length

  // Load carpenter token from localStorage if available
  useEffect(() => {
    const token = getCarpenterToken()
    if (token) {
      setCarpenterId(token)
    }
  }, [])

  const is = (href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href))
  const catalogActive = is('/app/catalog') || is('/app/product')
  // Exact match: a prefix test would also light up on /app/orders
  const cartActive = pathname === '/app/order'

  // A query handed over from the search bar is asked as soon as the chat opens
  const askAgent = useRef<((query: string) => void) | null>(null)
  const openAgent = (query?: string) => {
    setIsOpen(true)
    if (query?.trim()) askAgent.current?.(query)
  }

  return (
    <OpenAgentContext.Provider value={openAgent}>
    <div className="min-h-dvh bg-warm text-ink md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 bg-navy px-3.5 py-5 text-slate-200 md:flex">
        <Link href="/app" className="flex items-center gap-2.5 px-1" aria-label="נגרים B2B — בית">
          <LogoMark size={36} tile />
          <Wordmark onDark />
        </Link>
        <nav className="grid gap-0.5" aria-label="ניווט ראשי">
          <SideLink href="/app" label="בית" active={is('/app')} icon={<Home size={19} />} />
          <SideLink href="/app/catalog" label="קטלוג" active={catalogActive} icon={<LayoutGrid size={19} />} />
          <SideLink href="/app/order" label="עגלה" active={cartActive} icon={<ShoppingBag size={19} />} count={lines} />
          <button
            type="button"
            onClick={() => openAgent()}
            aria-pressed={isOpen}
            className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-start text-[15px] ${isOpen ? 'bg-white/10 font-bold text-white' : 'font-medium text-slate-300 hover:bg-white/5'}`}
          >
            <Sparkles size={19} />
            סוכן חכם
          </button>
          <SideLink href="/app/orders" label="הזמנות" active={is('/app/orders')} icon={<ClipboardList size={19} />} count={attention} />
          {signedIn && (
            <SideLink href="/app/messages" label="הודעות" active={is('/app/messages')} icon={<MessageSquare size={19} />} count={unread} />
          )}
          <SideLink href="/app/metzion" label="מציאון" active={is('/app/metzion')} icon={<Recycle size={19} />} />
          <SideLink href={signedIn ? '/app/account' : '/join'} label={signedIn ? 'הנגרייה שלי' : 'כניסה / הרשמה'} active={is('/app/account')} icon={<UserRound size={19} />} />
        </nav>
      </aside>

      <div className="min-w-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-2.5 bg-warm/95 px-4 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2.5" aria-label="נגרים B2B — בית">
            <LogoMark size={32} tile />
            <Wordmark />
          </Link>
          <span className="flex-1" />
          {signedIn && <BellLink unread={unread} />}
          <Link href="/app/catalog?focus=search" aria-label="חיפוש" className="grid h-10 w-10 place-items-center rounded-xl border border-hair bg-white text-navy">
            <Search size={20} />
          </Link>
          {signedIn ? (
            <Link href="/app/account" aria-label="הנגרייה שלי" className="grid h-9 w-9 place-items-center rounded-full bg-navy text-[15px] font-bold text-white">
              {initial}
            </Link>
          ) : (
            <Link href="/join" className="inline-flex h-10 items-center rounded-xl bg-navy px-3 text-sm font-bold text-white">
              כניסה
            </Link>
          )}
        </header>

        {/* Desktop head */}
        <header className="sticky top-0 z-30 hidden items-center gap-3.5 border-b border-hair bg-warm px-7 py-3.5 md:flex">
          <form action="/app/catalog" className="relative w-full max-w-[520px]">
            <Search size={19} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              type="search"
              placeholder="מה אתה צריך? מוצר, מותג, מק״ט או ספק"
              aria-label="חיפוש"
              className="h-11 w-full rounded-xl border-[1.5px] border-hair bg-white ps-11 pe-3.5 text-[15px] placeholder:text-faint"
            />
          </form>
          {/* Searching and asking sit together: what the search bar can't find, the agent may */}
          <button
            type="button"
            onClick={() => openAgent()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[11px] border-[1.5px] border-purple-200 bg-white px-3.5 text-[15px] font-bold text-purple-700 hover:bg-purple-50"
          >
            <Sparkles size={18} />
            שאל את הסוכן
          </button>
          <span className="flex-1" />
          {signedIn && <BellLink unread={unread} />}
          <Link href="/app/order" className="inline-flex h-11 items-center gap-2 rounded-[11px] bg-brand px-4 font-bold text-navy hover:bg-brand-hover">
            <ShoppingBag size={18} />
            {lines ? (
              <>
                עגלה · <span className="tnum">{lines}</span>
              </>
            ) : (
              'עגלה'
            )}
          </Link>
          {signedIn ? (
            <Link href="/app/account" aria-label="הנגרייה שלי" className="grid h-9 w-9 place-items-center rounded-full bg-navy font-bold text-white">
              {initial}
            </Link>
          ) : (
            <Link href="/join" className="inline-flex h-10 items-center rounded-xl bg-navy px-3.5 text-sm font-bold text-white">
              כניסה / הרשמה
            </Link>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-1 md:px-7 md:pb-12 md:pt-6">
          {children}
          {/* What every public page owes its visitors, kept quiet at the end. */}
          <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-hair pt-4 text-xs text-faint">
            <span className="flex items-center gap-1.5">
              <LogoMark size={16} tile /> © נגרים B2B · שוק הנגרים
            </span>
            <Link href="/terms" className="hover:text-ink">תקנון ותנאי שימוש</Link>
            <Link href="/terms#privacy" className="hover:text-ink">מדיניות פרטיות</Link>
            <Link href="/supplier/join" className="hover:text-ink">ספקים</Link>
          </footer>
        </main>
      </div>

      {/* FAB Agent Button - Phone only; kept off the cart so nothing sits over the send button */}
      {!cartActive && (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 start-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-[0_8px_24px_rgba(88,28,135,.4)] hover:shadow-[0_12px_32px_rgba(88,28,135,.5)] transition-shadow active:scale-95 md:hidden"
        aria-label="סוכן חכם"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="absolute text-lg">🧠</span>
      </button>
      )}

      {/* The same bubble on a wide screen, with its name, on the side away from the sidebar */}
      {!cartActive && !isOpen && (
        <button
          type="button"
          onClick={() => openAgent()}
          className="fixed bottom-6 end-6 z-30 hidden h-14 items-center gap-2.5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 pe-6 ps-5 text-[16px] font-bold text-white shadow-[0_8px_24px_rgba(88,28,135,.4)] transition-shadow hover:shadow-[0_12px_32px_rgba(88,28,135,.5)] active:scale-95 md:flex"
        >
          <Sparkles size={22} />
          שאל את הסוכן
        </button>
      )}

      {/* Chat Modal */}
      <ChatContainer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        carpenterId={carpenterId}
        askRef={askAgent}
      />

      {/* Phone bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-hair bg-white/[.98] px-1 pb-[max(14px,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
        aria-label="ניווט ראשי"
      >
        <BottomLink href="/app" label="בית" active={is('/app')} icon={<Home size={22} />} />
        <BottomLink href="/app/catalog" label="קטלוג" active={catalogActive} icon={<LayoutGrid size={22} />} />
        <Link href="/app/order" aria-current={cartActive ? 'page' : undefined} className="flex flex-col items-center gap-0.5 text-xs font-semibold text-navy">
          <span className="relative -mt-5 grid h-[46px] w-[46px] place-items-center rounded-full bg-brand text-navy shadow-[0_6px_16px_rgba(242,154,18,.35)]">
            <ShoppingBag size={23} />
            {lines > 0 && (
              <span className="tnum absolute -end-1 -top-1 min-w-[21px] rounded-full border-2 border-white bg-navy px-1 text-center text-xs font-bold leading-[17px] text-white">
                {lines}
              </span>
            )}
          </span>
          עגלה
        </Link>
        <BottomLink href="/app/orders" label="הזמנות" active={is('/app/orders')} icon={<ClipboardList size={22} />} dot={attention > 0} />
        <BottomLink href={signedIn ? '/app/account' : '/join'} label={signedIn ? 'אני' : 'כניסה'} active={is('/app/account')} icon={<UserRound size={22} />} />
      </nav>
    </div>
    </OpenAgentContext.Provider>
  )
}

function SideLink({ href, label, active, icon, count }: { href: string; label: string; active: boolean; icon: React.ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[15px] ${active ? 'bg-white/10 font-bold text-white' : 'font-medium text-slate-300 hover:bg-white/5'}`}
    >
      {icon}
      {label}
      {count ? <span className="tnum ms-auto rounded-full bg-brand px-1.5 text-xs font-bold text-navy">{count}</span> : null}
    </Link>
  )
}

function BottomLink({ href, label, active, icon, dot }: { href: string; label: string; active: boolean; icon: React.ReactNode; dot?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-12 flex-col items-center gap-0.5 py-1.5 text-xs font-semibold ${active ? 'text-navy' : 'text-gray-500'}`}
    >
      {active && <span className="absolute -top-1.5 h-[3px] w-[22px] rounded-full bg-brand" />}
      {dot && <span className="absolute start-[calc(50%+6px)] top-1 h-2 w-2 rounded-full border-2 border-white bg-brand box-content" />}
      {icon}
      {label}
    </Link>
  )
}
