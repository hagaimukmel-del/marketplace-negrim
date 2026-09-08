/**
 * Order statuses, in one place.
 *
 * The stored values are unchanged — the database still holds pending,
 * confirmed, processing, shipped, delivered, cancelled — but the words shown
 * to a carpenter now describe fulfilment rather than payment. "בהמתנה" said
 * nothing about who was waiting for what; an order that has just been placed
 * is sitting with the supplier, so it says so.
 *
 * This lived twice, mapped differently in the list and the detail page, which
 * is how "delivered" ended up rendering as "הופקד" — a banking word — in one
 * of them.
 */
export interface StatusInfo {
  label: string
  /** Tailwind classes for the badge. */
  className: string
}

const STATUSES: Record<string, StatusInfo> = {
  pending: { label: 'נשלח לספק', className: 'bg-amber-100 text-amber-900' },
  confirmed: { label: 'הספק אישר', className: 'bg-blue-100 text-blue-900' },
  processing: { label: 'בהכנה', className: 'bg-blue-100 text-blue-900' },
  shipped: { label: 'יצא לאספקה', className: 'bg-sky-100 text-sky-900' },
  delivered: { label: 'סופק', className: 'bg-emerald-100 text-emerald-900' },
  cancelled: { label: 'בוטל', className: 'bg-red-100 text-red-900' },
}

export function statusInfo(status: string | null | undefined): StatusInfo {
  return STATUSES[status ?? ''] ?? STATUSES.pending
}
