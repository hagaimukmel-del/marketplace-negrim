'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import {
  ACTION_LABEL,
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  detectColumns,
  parseCsv,
  toImportRows,
  type CellValue,
  type ColumnMapping,
  type ImportFieldKey,
  type PlanAction,
  type PlanLine,
} from '@/lib/price-import'

interface Batch {
  id: string
  file_name: string | null
  summary: { updated?: number; attached?: number; created?: number; failed?: number }
  created_by: string
  created_at: string
  undone_at: string | null
}

type Step = 'pick' | 'map' | 'preview' | 'done'

const TONE: Record<PlanAction, string> = {
  update: 'bg-amber-100 text-amber-900',
  unchanged: 'bg-stone-100 text-stone-600',
  attach: 'bg-sky-100 text-sky-900',
  create: 'bg-emerald-100 text-emerald-900',
  error: 'bg-red-100 text-red-800',
}

const TEMPLATE =
  '﻿שם המוצר,מחיר,מק״ט,מלאי,יחידה,אריזה,כמות באריזה,מותג,מק״ט יצרן,קטגוריה\n' +
  'דבק PUR שקוף 12 ק״ג,850,PUR-12,20,יח׳,דלי,1,Kleiberit,707.9,דבקי PUR\n' +
  'ציר בלום קליפ טופ 110°,14.5,BL-110,500,יח׳,קרטון,200,Blum,71B3550,צירים\n'

/** Imports can be undone for seven days. */
function undoable(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 86_400_000
}

function when(value: string): string {
  return new Date(value).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Upload a price list: pick the file, confirm the columns, see exactly what
 * will change, then save — and undo it if it was wrong.
 *
 * The file is read here in the browser; only the rows go to the server. The
 * preview is the server's own reading of what each row means against this
 * supplier's list and the whole catalogue, so what is shown is what will happen.
 */
export default function PriceImport({ supplierId, onClose }: { supplierId?: string; onClose?: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('pick')
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheet, setSheet] = useState<CellValue[][]>([])
  const [headerRow, setHeaderRow] = useState(-1)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [lines, setLines] = useState<PlanLine[]>([])
  const [skip, setSkip] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<PlanAction | 'all'>('all')
  const [result, setResult] = useState<{ batchId: string; summary: Batch['summary']; failed: { row: number; message: string }[] } | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = supplierId ? `?supplier_id=${supplierId}` : ''

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/supplier/import${query}`)
      const data = await response.json()
      if (response.ok) setBatches(data.batches)
    } catch {
      // History is a convenience; the import works without it.
    }
  }, [query])

  useEffect(() => {
    let active = true
    fetch(`/api/supplier/import${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setBatches(data.batches)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [query])

  const rows = useMemo(
    () => (mapping ? toImportRows(sheet, headerRow, mapping) : []),
    [sheet, headerRow, mapping]
  )

  const columns = useMemo(() => {
    const width = Math.max(0, ...sheet.slice(0, 20).map((row) => row.length))
    return Array.from({ length: width }, (_, index) => {
      const header = headerRow >= 0 ? String(sheet[headerRow]?.[index] ?? '').trim() : ''
      return { index, label: header || `עמודה ${index + 1}` }
    })
  }, [sheet, headerRow])

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      let data: CellValue[][]
      if (/\.csv$/i.test(file.name)) {
        data = parseCsv(await file.text())
      } else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        data = (await readSheet(file)) as CellValue[][]
      } else {
        throw new Error('אפשר להעלות קובץ Excel (xlsx) או CSV')
      }
      if (data.length < 2) throw new Error('בקובץ אין שורות מוצרים')
      const detected = detectColumns(data)
      setFileName(file.name)
      setSheet(data)
      setHeaderRow(detected.headerRow)
      setMapping(detected.mapping)
      setStep('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו לקרוא את הקובץ')
    } finally {
      setBusy(false)
    }
  }

  const send = async (mode: 'preview' | 'apply') => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          rows,
          skip: [...skip],
          file_name: fileName,
          ...(supplierId ? { supplier_id: supplierId } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הפעולה נכשלה')
      if (mode === 'preview') {
        setLines(data.lines)
        setSkip(new Set())
        setFilter('all')
        setStep('preview')
      } else {
        setResult({ batchId: data.batchId, summary: data.summary, failed: data.failed })
        setStep('done')
        router.refresh()
        void loadHistory()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const undo = async (batchId: string) => {
    if (!confirm('לבטל את הייבוא? המחירים יחזרו למה שהיו, ומוצרים שנוספו בו יוסרו.')) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier/import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId, ...(supplierId ? { supplier_id: supplierId } : {}) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'הביטול נכשל')
      router.refresh()
      await loadHistory()
      if (result?.batchId === batchId) {
        setResult(null)
        setStep('pick')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הביטול נכשל')
    } finally {
      setBusy(false)
    }
  }

  const counts = useMemo(() => {
    const result: Record<PlanAction, number> = { update: 0, unchanged: 0, attach: 0, create: 0, error: 0 }
    lines.forEach((line) => (result[line.action] += 1))
    return result
  }, [lines])

  const actionable = lines.filter((line) => ['update', 'attach', 'create'].includes(line.action))
  const toApply = actionable.filter((line) => !skip.has(line.row)).length
  const shownLines = filter === 'all' ? lines : lines.filter((line) => line.action === filter)

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {step === 'pick' && (
        <>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-8 text-center hover:border-emerald-600">
            <FileSpreadsheet size={40} className="text-emerald-700" />
            <span className="text-lg font-bold text-stone-900">{busy ? 'קורא את הקובץ…' : 'בחרו קובץ מחירון'}</span>
            <span className="text-sm text-stone-600">Excel ‏(xlsx) או CSV · עד {MAX_IMPORT_ROWS.toLocaleString('he-IL')} שורות</span>
            <span className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 font-semibold text-white">
              <Upload size={17} />
              העלאת קובץ
            </span>
            <input
              id="price-import-file"
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void readFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
            <p>
              צריך לפחות עמודת <strong>שם מוצר</strong> ועמודת <strong>מחיר ללא מע״מ</strong>. מק״ט, מלאי, אריזה, מותג וקטגוריה —
              אם יש, נשתמש בהם. לפני שמירה תראו בדיוק מה ישתנה.
            </p>
            <a href={templateHref} download="nagarim-price-list.csv" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-800 underline">
              <Download size={14} />
              הורדת קובץ דוגמה
            </a>
          </div>
        </>
      )}

      {step === 'map' && mapping && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-stone-600">
              <strong className="text-stone-900">{fileName}</strong> · {rows.length} שורות מוצרים
            </p>
            <button type="button" onClick={() => setStep('pick')} className="text-sm font-semibold text-stone-600 underline">
              קובץ אחר
            </button>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="font-semibold text-stone-900">איזו עמודה היא מה?</p>
            <p className="text-xs text-stone-500">זיהינו לבד את מה שיכולנו. תקנו אם משהו לא נכון.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {IMPORT_FIELDS.map((field) => (
                <label key={field.key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-sm text-stone-700">
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                  <select
                    id={`import-map-${field.key}`}
                    value={mapping[field.key]}
                    onChange={(e) => setMapping({ ...mapping, [field.key as ImportFieldKey]: Number(e.target.value) })}
                    className={`h-10 min-w-0 flex-1 rounded-lg border bg-white px-2 text-sm ${
                      field.required && mapping[field.key] < 0 ? 'border-red-400' : 'border-stone-300'
                    }`}
                  >
                    <option value={-1}>— לא בקובץ —</option>
                    {columns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="p-2 text-start font-medium">שורה</th>
                    <th className="p-2 text-start font-medium">שם</th>
                    <th className="p-2 text-start font-medium">מחיר</th>
                    <th className="p-2 text-start font-medium">מק״ט</th>
                    <th className="p-2 text-start font-medium">מלאי</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row) => (
                    <tr key={row.row} className="border-t border-stone-100">
                      <td className="tnum p-2 text-stone-400">{row.row}</td>
                      <td className="p-2">{row.name || '—'}</td>
                      <td className="tnum p-2">{row.price == null ? '—' : formatIls(row.price)}</td>
                      <td className="tnum p-2">{row.sku ?? '—'}</td>
                      <td className="tnum p-2">{row.stock ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-stone-100 p-2 text-xs text-stone-500">שלוש השורות הראשונות, כפי שהבנו אותן.</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => send('preview')}
            disabled={busy || mapping.name < 0 || mapping.price < 0 || rows.length === 0}
            className="h-12 w-full rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'בודק…' : 'בדיקה לפני שמירה'}
          </button>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="flex flex-wrap gap-2">
            {(['all', 'update', 'attach', 'create', 'unchanged', 'error'] as const).map((key) => {
              const count = key === 'all' ? lines.length : counts[key]
              if (key !== 'all' && count === 0) return null
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
                    filter === key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
                  }`}
                >
                  {key === 'all' ? 'הכל' : ACTION_LABEL[key]}
                  <span className="tnum text-xs opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          <p className="text-sm text-stone-600">
            <strong className="text-stone-900">{counts.update}</strong> מחירים יתעדכנו ·{' '}
            <strong className="text-stone-900">{counts.attach}</strong> יתווספו למוצרים שכבר באתר ·{' '}
            <strong className="text-stone-900">{counts.create}</strong> מוצרים חדשים
            {counts.error > 0 && (
              <>
                {' '}· <strong className="text-red-700">{counts.error}</strong> שורות עם שגיאה לא יישמרו
              </>
            )}
          </p>

          <div className="max-h-[50dvh] overflow-y-auto rounded-xl border border-stone-200 bg-white">
            {shownLines.slice(0, 400).map((line) => {
              const actionableLine = ['update', 'attach', 'create'].includes(line.action)
              return (
                <label key={line.row} className="flex items-center gap-3 border-b border-stone-100 px-3 py-2 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={actionableLine && !skip.has(line.row)}
                    disabled={!actionableLine}
                    onChange={(e) => {
                      const next = new Set(skip)
                      if (e.target.checked) next.delete(line.row)
                      else next.add(line.row)
                      setSkip(next)
                    }}
                    className="h-4 w-4 shrink-0 accent-emerald-700"
                    aria-label={`לכלול את שורה ${line.row}`}
                  />
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[line.action]}`}>
                    {ACTION_LABEL[line.action]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-900">{line.name || `שורה ${line.row}`}</span>
                    {line.message && <span className="block text-xs text-red-700">שורה {line.row}: {line.message}</span>}
                  </span>
                  <span className="tnum shrink-0 text-end text-sm">
                    {line.before && line.action === 'update' && line.before.price !== line.price ? (
                      <>
                        <span className="text-stone-400 line-through">{formatIls(line.before.price)}</span>{' '}
                        <span className="font-semibold text-stone-900">{formatIls(line.price!)}</span>
                      </>
                    ) : line.price != null ? (
                      <span className="text-stone-700">{formatIls(line.price)}</span>
                    ) : null}
                  </span>
                </label>
              )
            })}
            {shownLines.length > 400 && (
              <p className="p-3 text-center text-xs text-stone-500">ועוד {shownLines.length - 400} שורות</p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={() => setStep('map')} disabled={busy} className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-5 font-semibold text-stone-700">
              <ArrowRight size={16} />
              חזרה לעמודות
            </button>
            <button
              type="button"
              onClick={() => send('apply')}
              disabled={busy || toApply === 0}
              className="h-12 flex-1 rounded-lg bg-emerald-700 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'שומר…' : toApply === 0 ? 'אין שינויים לשמור' : `שמירת ${toApply} שינויים`}
            </button>
          </div>
        </>
      )}

      {step === 'done' && result && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-700" />
          <p className="mt-2 text-lg font-bold text-stone-900">המחירון נשמר</p>
          <p className="tnum mt-1 text-sm text-stone-600">
            {result.summary.updated ?? 0} עודכנו · {result.summary.attached ?? 0} נוספו למוצרים קיימים · {result.summary.created ?? 0} מוצרים חדשים
          </p>
          {result.failed.length > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-start text-sm text-red-800">
              {result.failed.length} שורות לא נשמרו:
              <ul className="mt-1 list-disc ps-5">
                {result.failed.slice(0, 10).map((item) => (
                  <li key={item.row}>שורה {item.row}: {item.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => undo(result.batchId)} disabled={busy} className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-4 font-semibold text-stone-700">
              <RotateCcw size={16} />
              ביטול הייבוא
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="h-11 rounded-lg bg-stone-900 px-6 font-semibold text-white">
                סיום
              </button>
            )}
          </div>
        </div>
      )}

      {batches.length > 0 && step !== 'map' && step !== 'preview' && (
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-sm font-bold text-stone-900">ייבואים אחרונים</p>
          <ul className="mt-2 divide-y divide-stone-100">
            {batches.map((batch) => {
              const recent = undoable(batch.created_at)
              return (
                <li key={batch.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="tnum text-xs text-stone-500">{when(batch.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate text-stone-800">{batch.file_name ?? 'קובץ'}</span>
                  <span className="tnum text-xs text-stone-500">
                    {batch.summary.updated ?? 0} עודכנו · {(batch.summary.attached ?? 0) + (batch.summary.created ?? 0)} נוספו
                  </span>
                  {batch.undone_at ? (
                    <span className="text-xs font-semibold text-stone-400">בוטל</span>
                  ) : recent ? (
                    <button type="button" onClick={() => undo(batch.id)} disabled={busy} className="text-xs font-semibold text-red-700 underline disabled:opacity-50">
                      בטל
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
