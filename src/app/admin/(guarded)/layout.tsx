import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye } from 'lucide-react'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import AdminNav, { type NavItem } from './AdminNav'
import LogoutButton from './LogoutButton'

export const dynamic = 'force-dynamic'

/**
 * Looking through a user's eyes, rather than managing them. Kept apart from the
 * working tabs because they answer a different question — not "what do I need
 * to do" but "what does this look like from the other side".
 */
const VIEWS: NavItem[] = [
  { href: '/admin/view/carpenter', label: 'האתר כפי שנגר רואה' },
  { href: '/admin/view/supplier', label: 'האתר כפי שספק רואה' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The guard runs here, on the server, before any child renders. Nothing
  // below this point reaches the browser unless the cookie already verified.
  if (!(await isAdmin())) redirect('/admin/login')

  // Counted on every admin page rather than only on the screens they belong to:
  // work waiting on the operator should follow them around the console.
  const supabase = getSupabaseAdmin()
  const [{ count: pendingOrders }, { count: pendingSuppliers }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const nav: NavItem[] = [
    // Orders first: it is the screen with work waiting on it every day.
    { href: '/admin/orders', label: 'הזמנות', count: pendingOrders ?? 0 },
    { href: '/admin', label: 'תוצאות' },
    { href: '/admin/products', label: 'מוצרים' },
    { href: '/admin/campaigns', label: 'קמפיינים' },
    { href: '/admin/suppliers', label: 'ספקים', count: pendingSuppliers ?? 0 },
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
          <div className="ms-auto">
            <LogoutButton />
          </div>
        </div>

        <div className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <Eye size={13} />
              תצוגות
            </span>
            <AdminNav items={VIEWS} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  )
}
