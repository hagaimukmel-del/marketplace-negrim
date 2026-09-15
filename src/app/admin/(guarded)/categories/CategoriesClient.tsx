'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react'
import CategoryIcon, { CATEGORY_ICONS } from '@/components/CategoryIcon'

export interface AdminCategory {
  id: string
  name_he: string
  name_en: string | null
  parent_category_id: string | null
  sort_order: number
  icon: string | null
  is_active: boolean
  products: number
}

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
  return data
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-30 ${
        danger ? 'text-red-700 hover:bg-red-50' : 'text-stone-500 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  )
}

/** A name that becomes an input on tap, saved with Enter or the tick. */
function EditableName({
  value,
  busy,
  onSave,
  className,
}: {
  value: string
  busy: boolean
  onSave: (name: string) => Promise<boolean>
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className={`group flex min-w-0 items-center gap-1.5 text-start ${className ?? ''}`}
      >
        <span className="truncate">{value}</span>
        <Pencil size={13} className="shrink-0 text-stone-300 group-hover:text-stone-500" />
      </button>
    )
  }

  const save = async () => {
    if (!draft.trim() || draft.trim() === value) return setEditing(false)
    if (await onSave(draft.trim())) setEditing(false)
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
        aria-label="שם הקטגוריה"
        className="h-9 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 text-sm"
      />
      <IconButton label="שמור" onClick={save} disabled={busy}>
        <Check size={16} />
      </IconButton>
      <IconButton label="ביטול" onClick={() => setEditing(false)}>
        <X size={16} />
      </IconButton>
    </span>
  )
}

function AddRow({
  placeholder,
  busy,
  onAdd,
}: {
  placeholder: string
  busy: boolean
  onAdd: (name: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const submit = async () => {
    if (!name.trim()) return
    if (await onAdd(name.trim())) setName('')
  }
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        placeholder={placeholder}
        className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !name.trim()}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Plus size={15} />
        הוסף
      </button>
    </div>
  )
}

/**
 * The category tree, edited in place.
 *
 * Laid out the way the catalogue shows it: main categories in order, each
 * opening to its branches. Every change is one tap and saves immediately —
 * rename, reorder, hide, move a branch to another main category, delete an
 * empty one. A category that still holds products cannot be deleted, only
 * hidden, so nothing in the catalogue is left without a home.
 */
export default function CategoriesClient({ rows }: { rows: AdminCategory[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const tops = rows.filter((row) => !row.parent_category_id)
  const childrenOf = (id: string) => rows.filter((row) => row.parent_category_id === id)
  const totalOf = (top: AdminCategory) =>
    top.products + childrenOf(top.id).reduce((sum, child) => sum + child.products, 0)

  const run = async (url: string, method: string, body?: unknown): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await call(url, method, body)
      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      return false
    } finally {
      setBusy(false)
    }
  }

  const patch = (id: string, body: Record<string, unknown>) =>
    run('/api/admin/categories', 'PATCH', { id, ...body })

  const remove = (row: AdminCategory) => {
    if (!confirm(`למחוק את הקטגוריה "${row.name_he}"?`)) return
    void run(`/api/admin/categories?id=${row.id}`, 'DELETE')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900">קטגוריות</h1>
        <p className="mt-1 text-sm text-stone-600">
          {tops.length} ראשיות · {rows.length - tops.length} תתי־קטגוריות. זה העץ שנגרים רואים בקטלוג
          ושספקים בוחרים ממנו. לחיצה על שם — שינוי שם. קטגוריה מוסתרת לא מופיעה בקטלוג.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {tops.map((top, index) => {
          const children = childrenOf(top.id)
          const expanded = open[top.id] ?? false
          return (
            <section
              key={top.id}
              className={`overflow-hidden rounded-xl border bg-white ${top.is_active ? 'border-stone-200' : 'border-dashed border-stone-300 opacity-70'}`}
            >
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => setOpen({ ...open, [top.id]: !expanded })}
                  aria-expanded={expanded}
                  aria-label={expanded ? 'סגור' : 'פתח'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
                >
                  <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <CategoryIcon icon={top.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <EditableName
                    value={top.name_he}
                    busy={busy}
                    onSave={(name) => patch(top.id, { name_he: name })}
                    className="font-bold text-stone-900"
                  />
                  <span className="tnum block text-xs text-stone-500">
                    {children.length} תתי־קטגוריות · {totalOf(top)} מוצרים
                    {!top.is_active && ' · מוסתרת'}
                  </span>
                </span>
                <IconButton label="הזז למעלה" onClick={() => patch(top.id, { move: 'up' })} disabled={busy || index === 0}>
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton
                  label="הזז למטה"
                  onClick={() => patch(top.id, { move: 'down' })}
                  disabled={busy || index === tops.length - 1}
                >
                  <ArrowDown size={16} />
                </IconButton>
              </div>

              {expanded && (
                <div className="space-y-3 border-t border-stone-100 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-stone-600">אייקון:</span>
                    {CATEGORY_ICONS.map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => patch(top.id, { icon: key })}
                        disabled={busy}
                        aria-label={label}
                        aria-pressed={top.icon === key}
                        title={label}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                          top.icon === key
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-stone-200 bg-white text-stone-500'
                        }`}
                      >
                        <Icon size={17} />
                      </button>
                    ))}
                  </div>

                  <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
                    {children.length === 0 && (
                      <li className="p-3 text-sm text-stone-500">אין תתי־קטגוריות עדיין.</li>
                    )}
                    {children.map((child, childIndex) => (
                      <li
                        key={child.id}
                        className={`flex flex-wrap items-center gap-1 px-2 py-1.5 ${child.is_active ? '' : 'bg-stone-50 opacity-60'}`}
                      >
                        <span className="min-w-0 flex-1 ps-1">
                          <EditableName
                            value={child.name_he}
                            busy={busy}
                            onSave={(name) => patch(child.id, { name_he: name })}
                            className="text-sm font-medium text-stone-800"
                          />
                        </span>
                        <span className="tnum px-1 text-xs text-stone-500">{child.products} מוצרים</span>
                        <select
                          value={top.id}
                          onChange={(e) => patch(child.id, { parent_category_id: e.target.value })}
                          disabled={busy}
                          aria-label={`העבר את ${child.name_he} לקטגוריה אחרת`}
                          className="h-9 max-w-32 rounded-lg border border-stone-200 bg-white px-1 text-xs text-stone-600"
                        >
                          {tops.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.id === top.id ? 'העבר ל…' : option.name_he}
                            </option>
                          ))}
                        </select>
                        <IconButton
                          label="הזז למעלה"
                          onClick={() => patch(child.id, { move: 'up' })}
                          disabled={busy || childIndex === 0}
                        >
                          <ArrowUp size={15} />
                        </IconButton>
                        <IconButton
                          label="הזז למטה"
                          onClick={() => patch(child.id, { move: 'down' })}
                          disabled={busy || childIndex === children.length - 1}
                        >
                          <ArrowDown size={15} />
                        </IconButton>
                        <IconButton
                          label={child.is_active ? 'הסתר' : 'הצג'}
                          onClick={() => patch(child.id, { is_active: !child.is_active })}
                          disabled={busy}
                        >
                          {child.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                        </IconButton>
                        <IconButton label="מחק" onClick={() => remove(child)} disabled={busy} danger>
                          <Trash2 size={15} />
                        </IconButton>
                      </li>
                    ))}
                  </ul>

                  <AddRow
                    placeholder={`תת־קטגוריה חדשה ב${top.name_he}`}
                    busy={busy}
                    onAdd={(name) => run('/api/admin/categories', 'POST', { name_he: name, parent_category_id: top.id })}
                  />

                  <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-3">
                    <button
                      type="button"
                      onClick={() => patch(top.id, { is_active: !top.is_active })}
                      disabled={busy}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
                    >
                      {top.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                      {top.is_active ? 'הסתר מהקטלוג' : 'הצג בקטלוג'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(top)}
                      disabled={busy}
                      className="ms-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      מחק קטגוריה ראשית
                    </button>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <section className="rounded-xl border border-stone-300 bg-white p-4">
        <h2 className="text-sm font-bold text-stone-900">קטגוריה ראשית חדשה</h2>
        <p className="mt-0.5 text-xs text-stone-500">תופיע בסוף הרכזת בקטלוג. אפשר להזיז ולבחור לה אייקון אחרי ההוספה.</p>
        <div className="mt-2">
          <AddRow
            placeholder="למשל: זכוכית ומראות"
            busy={busy}
            onAdd={(name) => run('/api/admin/categories', 'POST', { name_he: name })}
          />
        </div>
      </section>
    </div>
  )
}
