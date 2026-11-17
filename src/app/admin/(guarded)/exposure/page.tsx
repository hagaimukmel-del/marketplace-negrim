import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isTestName } from '@/lib/email'
import { EXPOSURE_DAYS, loadExposure, loadSearchStats, type Exposure, type SearchStat } from '@/lib/exposure'

export const dynamic = 'force-dynamic'

const COLUMNS: [keyof Exposure, string][] = [
  ['searchAppearances', 'בחיפושים'],
  ['pageViews', 'עמוד ספק'],
  ['productViews', 'צפיות מוצר*'],
  ['whatsapp', 'וואטסאפ'],
  ['calls', 'חיוג'],
  ['questions', 'שאלות'],
  ['quoteRequests', 'הצעות'],
  ['orders', 'הזמנות'],
]

function SearchTable({ title, rows, empty }: { title: string; rows: SearchStat[]; empty: string }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-bold text-stone-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-base text-stone-500">{empty}</p>
      ) : (
        <table className="mt-2 w-full text-base">
          <thead>
            <tr className="text-sm text-stone-500">
              <th className="py-1.5 text-start font-semibold">חיפוש</th>
              <th className="py-1.5 text-start font-semibold">פעמים</th>
              <th className="py-1.5 text-start font-semibold">תוצאות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.query} className="border-t border-stone-100">
                <td className="py-1.5">{row.query}</td>
                <td className="tnum py-1.5">{row.count}</td>
                <td className={`tnum py-1.5 ${row.results === 0 ? 'font-semibold text-red-700' : ''}`}>{row.results}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/**
 * Exposure and searches (PR 4): per supplier, what the site brought it over
 * the last 30 days, the same numbers its console shows; and what carpentries
 * and visitors searched for, with the searches that found nothing first in
 * line for the next supplier to bring.
 */
export default async function ExposurePage() {
  const { data: suppliers } = await getSupabaseAdmin().from('suppliers').select('id, company_name').eq('status', 'approved')
  const real = (suppliers ?? []).filter((row) => !isTestName(row.company_name))
  const [exposure, searches] = await Promise.all([loadExposure(real.map((row) => row.id)), loadSearchStats()])
  const rows = real
    .map((row) => ({ ...row, counts: exposure.get(row.id)! }))
    .sort((a, b) => b.counts.pageViews + b.counts.searchAppearances - (a.counts.pageViews + a.counts.searchAppearances))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">חשיפה וחיפושים</h1>
        <p className="mt-1 text-base text-stone-600">
          {EXPOSURE_DAYS} הימים האחרונים. אותם מספרים שכל ספק רואה בקונסולה שלו, בלשונית &quot;חשיפה ומכירות&quot;. בלי צפיות
          של המפעיל, של ספקים ושל טעינה מוקדמת.
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-stone-50 text-sm text-stone-500">
              <th className="px-3 py-2 text-start font-semibold">ספק</th>
              {COLUMNS.map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-start font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-stone-100">
                <td className="px-3 py-2 font-semibold">{row.company_name}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key} className="tnum px-3 py-2">{row.counts[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-3 py-2 text-sm text-stone-500">* צפיות במוצרים מתחילת המדידה, לא רק בתקופה.</p>
      </section>

      {!searches.ready ? (
        <p className="rounded-xl bg-amber-50 p-3 text-base text-amber-900">רישום החיפושים יתחיל אחרי שתרוץ המיגרציה 20261117200000_search_log.</p>
      ) : (
        <>
          <p className="text-base text-stone-600">
            <span className="tnum font-semibold">{searches.total}</span> חיפושים בקטלוג ב-{EXPOSURE_DAYS} הימים האחרונים.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <SearchTable title="חיפשו ולא מצאו" rows={searches.empty} empty="אין חיפושים בלי תוצאות." />
            <SearchTable title="החיפושים הנפוצים" rows={searches.top} empty="עוד אין חיפושים." />
          </div>
        </>
      )}
    </div>
  )
}
