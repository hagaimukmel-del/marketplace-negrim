/**
 * Small pieces the purchasing app repeats. No state, no hooks — usable from
 * server and client components alike.
 */

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { OrderStatus, Step } from '@/lib/app/orders'

export function SectionTitle({ title, href, action, children }: { title: React.ReactNode; href?: string; action?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2.5">
      <h3 className="m-0 text-base font-bold">{title}</h3>
      {href && action && (
        <Link href={href} className="text-sm font-semibold text-brand-ink">
          {action} ←
        </Link>
      )}
      {children}
    </div>
  )
}

export function Kicker({ tone, children }: { tone: 'attn' | 'ready' | 'ok'; children: React.ReactNode }) {
  const cls = { attn: 'bg-brand-soft text-attn', ready: 'bg-navy-soft text-navy', ok: 'bg-ok-soft text-ok-ink' }[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold ${cls}`}>{children}</span>
}

const DOT: Record<OrderStatus, string> = {
  pending: 'bg-brand',
  confirmed: 'bg-ok',
  processing: 'bg-ok',
  shipped: 'bg-navy',
  delivered: 'bg-ok',
  cancelled: 'bg-red-700',
}

export function StatusDot({ status, size = 8 }: { status: OrderStatus; size?: number }) {
  return <span className={`inline-block shrink-0 rounded-full ${DOT[status]}`} style={{ width: size, height: size }} aria-hidden />
}

/** "2 דברים דורשים את תשומת לבך" — information, not an alarm. */
export function AttentionLine({ count, calmText, children }: { count: number; calmText: string; children?: React.ReactNode }) {
  if (count === 0) {
    return (
      <div className="mt-2 inline-flex items-center gap-2 text-[15.5px] text-muted">
        <span className="h-2 w-2 rounded-full bg-ok" aria-hidden />
        {calmText}
      </div>
    )
  }
  return (
    <div className="mt-2 inline-flex items-center gap-2 text-[15.5px] font-semibold">
      <span className="tnum grid h-[26px] min-w-[26px] place-items-center rounded-full border border-brand-line bg-brand-soft px-2 text-sm font-extrabold text-attn">{count}</span>
      <span>{children}</span>
    </div>
  )
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Link href={href} aria-label={`חזרה ל${label}`} className="grid h-10 w-10 place-items-center rounded-xl border border-hair bg-white text-navy">
        <ChevronLeft size={18} className="-scale-x-100" />
      </Link>
      <span className="text-[13.5px] text-muted">{label}</span>
    </div>
  )
}

/**
 * The order's five steps. "בהכנה" and "בדרך" are optional for a supplier: a
 * skipped one is drawn small and grey and says "לא סומן" — never as if it
 * happened — and one still to come sits on a dashed line.
 */
export function Timeline({ steps, formatAt }: { steps: Step[]; formatAt: (iso: string) => string }) {
  const hint = steps.some((s) => s.optional && (s.state === 'skipped' || s.state === 'todo'))
  return (
    <div>
      <ol className="m-0 grid list-none grid-cols-5 p-0">
        {steps.map((step, i) => {
          const green = step.state === 'done' || step.state === 'skipped'
          const line = green ? 'bg-ok' : step.state === 'now' ? 'bg-[linear-gradient(to_left,var(--color-ok)_50%,var(--color-hair)_50%)]' : step.optional || steps[i - 1]?.state === 'todo' || steps[i - 1]?.state === 'now' ? 'bg-[repeating-linear-gradient(to_left,#D5D9DE_0_4px,transparent_4px_8px)]' : 'bg-hair'
          const dotSize = step.optional ? 'h-[11px] w-[11px] top-[2.5px]' : 'h-3.5 w-3.5 top-px'
          const dot = {
            done: 'border-ok bg-ok',
            now: 'border-brand bg-brand shadow-[0_0_0_4px_rgba(242,154,18,.22)]',
            skipped: 'border-[#D5D9DE] bg-[#E9EBEE]',
            todo: 'border-[#CBD2DA] bg-white',
          }[step.state]
          return (
            <li key={step.label} className={`relative pt-[22px] text-center text-[12.5px] leading-tight ${step.state === 'done' || step.state === 'now' ? 'font-semibold text-ink' : 'text-faint'}`}>
              <span
                className={`absolute top-[7px] h-0.5 ${line} ${i === 0 ? 'start-1/2 end-0' : i === steps.length - 1 ? 'start-0 end-1/2' : 'inset-x-0'}`}
                aria-hidden
              />
              <span className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 ${dotSize} ${dot}`} aria-hidden />
              {step.label}
              {step.at ? (
                <span className="block text-[11.5px] font-normal text-muted">{formatAt(step.at)}</span>
              ) : step.state === 'skipped' ? (
                <span className="block text-[11.5px] font-normal">לא סומן</span>
              ) : null}
            </li>
          )
        })}
      </ol>
      {hint && <p className="mt-2.5 mb-0 text-center text-[12.5px] text-muted">&quot;בהכנה&quot; ו&quot;בדרך&quot; מופיעים כשהספק מסמן אותם</p>}
    </div>
  )
}
