import { AlarmClock, Bell, CheckCircle2, ClipboardList, FileText, MailWarning, MessageSquare, Truck, XCircle } from 'lucide-react'
import type { NotificationItem, NotificationKind } from '@/lib/notifications'

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ICON: Record<NotificationKind, typeof Bell> = {
  order_new: ClipboardList,
  order_confirmed: CheckCircle2,
  order_rejected: XCircle,
  order_shipped: Truck,
  order_delivered: CheckCircle2,
  quote_new: FileText,
  quote_answered: FileText,
  quote_declined: XCircle,
  message_new: MessageSquare,
  email_failed: MailWarning,
  reminder: AlarmClock,
}

/**
 * What came in, newest first, the same for a carpentry and a supplier. Each
 * row opens through `${openBase}/<id>`, which marks it read and goes to what
 * it is about. Plain links, so it works without JavaScript on a slow phone.
 */
export default function NotificationList({ items, openBase }: { items: NotificationItem[]; openBase: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">
        <Bell size={28} className="mx-auto mb-2 text-stone-400" />
        אין התראות עדיין. הזמנות, הצעות מחיר והודעות יופיעו כאן.
      </div>
    )
  }
  return (
    <ul className="m-0 list-none overflow-hidden rounded-2xl border border-stone-200 bg-white p-0">
      {items.map((item) => {
        const Icon = ICON[item.kind] ?? Bell
        return (
          <li key={item.id} className="border-t border-stone-100 first:border-t-0">
            <a href={`${openBase}/${item.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-stone-50">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-amber-500'}`}
                aria-label={item.read ? undefined : 'לא נקרא'}
              />
              <Icon size={18} className="shrink-0 text-stone-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${item.read ? 'font-semibold text-stone-700' : 'font-bold text-stone-900'}`}>{item.title}</span>
                {item.body && <span className="block truncate text-base text-stone-500">{item.body}</span>}
              </span>
              <span className="tnum shrink-0 text-sm text-stone-500">{when(item.createdAt)}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
