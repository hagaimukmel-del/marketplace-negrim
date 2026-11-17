import type { ExposureMonth } from '@/lib/exposure'

const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']

/** "2026-11" → "נובמבר 2026"-like short label parts. */
function monthLabel(month: string): { name: string; year: string } {
  const [year, index] = month.split('-')
  return { name: MONTHS[Number(index) - 1], year }
}

/**
 * One measure month by month: a bar per month, oldest on the left as every
 * time axis reads, the year under its first month and under each January.
 * Every bar shows its number on hover; the current month and the best month
 * carry it always. A table holds the same numbers for a screen reader.
 */
function MonthBars({ title, points, pick, color }: { title: string; points: ExposureMonth[]; pick: (p: ExposureMonth) => number; color: string }) {
  const values = points.map(pick)
  const max = Math.max(...values, 0)
  const best = max > 0 ? values.indexOf(max) : -1
  const last = points.length - 1
  return (
    <figure className="rounded-xl border border-stone-200 bg-white p-3">
      <figcaption className="text-sm font-semibold text-stone-600">{title}</figcaption>
      <div dir="ltr" className="mt-2 flex h-36 items-end gap-1 border-b border-stone-200" aria-hidden>
        {points.map((point, i) => {
          const value = values[i]
          const height = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0
          const label = monthLabel(point.month)
          return (
            <div key={point.month} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span
                className={`tnum mb-0.5 text-xs font-semibold text-stone-700 ${i === last || i === best ? '' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {value.toLocaleString('he-IL')}
              </span>
              <span className="w-full max-w-7 rounded-t" style={{ height: `${height}%`, background: color }} />
              <span className="absolute inset-0" title={`${label.name} ${label.year}: ${value}`} />
            </div>
          )
        })}
      </div>
      <div dir="ltr" className="mt-1 flex gap-1" aria-hidden>
        {points.map((point, i) => {
          const label = monthLabel(point.month)
          const showYear = i === 0 || point.month.endsWith('-01')
          return (
            <span key={point.month} className="min-w-0 flex-1 text-center text-[11px] leading-tight text-stone-500">
              {label.name}
              <span className={`block font-semibold ${showYear ? '' : 'invisible'}`}>{label.year}</span>
            </span>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((point, i) => (
            <tr key={point.month}>
              <th>{`${monthLabel(point.month).name} ${monthLabel(point.month).year}`}</th>
              <td>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** "ראו אתכם" and "פנו אליכם" by month: two charts, since the two run on very different scales. */
export default function ExposureChart({ months, title = 'התקדמות לפי חודש' }: { months: ExposureMonth[]; title?: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-stone-500">{title}</h3>
      <div className="mt-1.5 grid gap-2 md:grid-cols-2">
        <MonthBars title="ראו אתכם (חיפושים, עמוד הספק, מוצרים)" points={months} pick={(p) => p.seen} color="#1E2A3B" />
        <MonthBars title="פנו אליכם (וואטסאפ, חיוג, שאלות, הצעות, הזמנות)" points={months} pick={(p) => p.reached} color="#C2650A" />
      </div>
    </section>
  )
}
