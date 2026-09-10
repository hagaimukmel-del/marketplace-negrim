'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

export interface SupplierFields {
  company_name: string
  business_id: string
  contact_name: string
  phone: string
  email: string
  city: string
  address: string
  pickup_address: string
  min_order_value_excl_vat: string
  default_lead_time_days: string
  sells_note: string
}

export const EMPTY_SUPPLIER: SupplierFields = {
  company_name: '',
  business_id: '',
  contact_name: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  pickup_address: '',
  min_order_value_excl_vat: '',
  default_lead_time_days: '',
  sells_note: '',
}

function Field({
  label,
  value,
  onChange,
  required,
  hint,
  wide,
  ...input
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  wide?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-stone-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        {...input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
      />
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

/**
 * One form for opening a supplier and for editing one.
 *
 * They ask for exactly the same things, so they are the same component — a
 * second, drifting copy of eleven fields is how the create screen and the edit
 * screen end up disagreeing about what a supplier is.
 */
export default function SupplierForm({
  mode,
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: SupplierFields
  busy: boolean
  error: string | null
  onSubmit: (fields: SupplierFields) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = (key: keyof SupplierFields) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const complete = form.company_name.trim() && form.business_id.trim()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
      className="rounded-xl border border-stone-300 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-stone-900">
          {mode === 'create' ? 'ספק חדש' : 'עריכת פרטי ספק'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="בטל"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
        >
          <X size={17} />
        </button>
      </div>

      <fieldset className="mt-4" disabled={busy}>
        <legend className="text-xs font-bold text-stone-500">החברה</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field
            label="שם החברה"
            required
            autoFocus
            value={form.company_name}
            onChange={set('company_name')}
            placeholder="פרזול הצפון בע״מ"
            wide
          />
          <Field
            label="ח.פ / ע.מ"
            required
            inputMode="numeric"
            value={form.business_id}
            onChange={set('business_id')}
            placeholder="512345678"
            hint="זו החברה שתוציא את החשבונית לנגר."
          />
          <Field label="עיר" value={form.city} onChange={set('city')} placeholder="חיפה" />
          <Field
            label="כתובת"
            value={form.address}
            onChange={set('address')}
            placeholder="הרצל 12"
            wide
          />
        </div>
      </fieldset>

      <fieldset className="mt-5" disabled={busy}>
        <legend className="text-xs font-bold text-stone-500">איש קשר</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field
            label="שם"
            value={form.contact_name}
            onChange={set('contact_name')}
            placeholder="רון"
          />
          <Field
            label="טלפון"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="050-1234567"
          />
          <Field
            label="מייל"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="ron@parzal.co.il"
            hint="לכאן תישלח כל הזמנה חדשה."
            wide
          />
        </div>
      </fieldset>

      <fieldset className="mt-5" disabled={busy}>
        <legend className="text-xs font-bold text-stone-500">תנאי מסחר</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field
            label="מינימום הזמנה (₪, ללא מע״מ)"
            inputMode="decimal"
            value={form.min_order_value_excl_vat}
            onChange={set('min_order_value_excl_vat')}
            placeholder="500"
            hint="יוצג לנגר בעגלה."
          />
          <Field
            label="זמן אספקה (ימים)"
            inputMode="numeric"
            value={form.default_lead_time_days}
            onChange={set('default_lead_time_days')}
            placeholder="3"
          />
          <Field
            label="נקודת איסוף"
            value={form.pickup_address}
            onChange={set('pickup_address')}
            placeholder="המחסן, אזור התעשייה חולון"
            wide
          />
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">מה הוא מוכר</span>
            <textarea
              value={form.sells_note}
              onChange={(event) => set('sells_note')(event.target.value)}
              rows={2}
              placeholder="ידיות, מסילות, צירים"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
            />
          </label>
        </div>
      </fieldset>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy || !complete}
          className="flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50"
        >
          <Check size={16} />
          {busy ? 'שומר…' : mode === 'create' ? 'פתח ספק' : 'שמור שינויים'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-11 rounded-lg border border-stone-300 px-4 font-semibold text-stone-700 disabled:opacity-50"
        >
          ביטול
        </button>
        {mode === 'create' && (
          <span className="text-xs text-stone-500">
            ספק שנפתח כאן מאושר מיד. עדיין צריך לטעון לו מוצרים כדי שיופיע בקטלוג.
          </span>
        )}
      </div>
    </form>
  )
}
