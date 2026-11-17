import { Eye, MessageCircle, MessageSquare, Phone, Search, FileText, Truck, Store } from 'lucide-react'
import type { Exposure } from '@/lib/exposure'

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-stone-500">
        {icon}
        {label}
      </p>
      <p className="tnum mt-1 text-xl font-bold text-stone-900">{value.toLocaleString('he-IL')}</p>
    </div>
  )
}

/**
 * "החשיפה שלך": what the site brought this supplier over the last days (PR 4).
 * How often carpentries came across it (searches, its page, its products) and
 * how often they reached out (WhatsApp, call, a question, a quote, an order).
 * Only counts, never who: the carpentries behind an order are in sales.
 */
export default function ExposurePanel({ exposure, days }: { exposure: Exposure; days: number }) {
  const reached = exposure.whatsapp + exposure.calls + exposure.questions + exposure.quoteRequests + exposure.orders
  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h2 className="font-bold text-stone-900">החשיפה שלך ב-{days} הימים האחרונים</h2>
      <p className="mt-0.5 text-base text-stone-600">
        כמה פעמים נגריות נתקלו בכם באתר, וכמה פנו אליכם. {reached > 0 ? `סה״כ ${reached} פניות.` : 'עוד אין פניות בתקופה הזו.'}
      </p>
      <h3 className="mt-3 text-sm font-semibold text-stone-500">ראו אתכם</h3>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile icon={<Search size={15} />} label="הופעתם בחיפושים" value={exposure.searchAppearances} />
        <Tile icon={<Store size={15} />} label="כניסות לעמוד הספק" value={exposure.pageViews} />
        <Tile icon={<Eye size={15} />} label="צפיות במוצרים שלכם*" value={exposure.productViews} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-stone-500">פנו אליכם</h3>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile icon={<MessageCircle size={15} />} label="וואטסאפ" value={exposure.whatsapp} />
        <Tile icon={<Phone size={15} />} label="חיוג" value={exposure.calls} />
        <Tile icon={<MessageSquare size={15} />} label="שאלות באתר" value={exposure.questions} />
        <Tile icon={<FileText size={15} />} label="בקשות הצעת מחיר" value={exposure.quoteRequests} />
        <Tile icon={<Truck size={15} />} label="הזמנות" value={exposure.orders} />
      </div>
      <p className="mt-2 text-sm text-stone-500">* צפיות במוצרים נספרות מתחילת המדידה, לא רק ב-{days} הימים האחרונים.</p>
    </section>
  )
}
