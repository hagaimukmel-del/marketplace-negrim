import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'
import LogoutButton from './LogoutButton'

export const dynamic = 'force-dynamic'

const NAV = [
  // Orders first: it is the screen with work waiting on it every day.
  { href: '/admin/orders', label: 'הזמנות' },
  { href: '/admin', label: 'תוצאות' },
  { href: '/admin/products', label: 'מוצרים' },
  { href: '/admin/campaigns', label: 'קמפיינים' },
  { href: '/admin/carpenters', label: 'נגריות' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The guard runs here, on the server, before any child renders. Nothing
  // below this point reaches the browser unless the cookie already verified.
  if (!(await isAdmin())) redirect('/admin/login')

  return (
    <div dir="rtl" className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <span className="font-bold text-stone-900">שוק הנגרים · ניהול</span>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-stone-600 hover:text-stone-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  )
}
