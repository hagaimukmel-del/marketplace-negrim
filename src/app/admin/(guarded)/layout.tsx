import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import AdminNav, { type NavItem } from './AdminNav'
import LogoutButton from './LogoutButton'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The guard runs here, on the server, before any child renders. Nothing
  // below this point reaches the browser unless the cookie already verified.
  if (!(await isAdmin())) redirect('/admin/login')

  // Counted on every admin page rather than only on the orders screen: an
  // order waiting for confirmation is the one thing that should follow the
  // supplier around the console.
  const { count } = await getSupabaseAdmin()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const nav: NavItem[] = [
    // Orders first: it is the screen with work waiting on it every day.
    { href: '/admin/orders', label: 'הזמנות', count: count ?? 0 },
    { href: '/admin', label: 'תוצאות' },
    { href: '/admin/products', label: 'מוצרים' },
    { href: '/admin/campaigns', label: 'קמפיינים' },
    { href: '/admin/carpenters', label: 'נגריות' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <Link href="/admin/orders" className="font-bold text-stone-900">
            שוק הנגרים · ניהול
          </Link>
          <AdminNav items={nav} />
          <div className="ms-auto flex items-center gap-4">
            <a
              href="/carpenter/catalog"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
            >
              <ExternalLink size={14} />
              הקטלוג כפי שנגר רואה
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  )
}
