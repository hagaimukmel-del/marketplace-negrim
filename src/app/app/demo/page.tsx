import OrderSearchClient from '@/app/(app)/order/order-search-client'

/**
 * /demo — Public demo of Nagarim Procurement Agent
 *
 * No login required. Uses mock carpenter. All data from Itamir supplier.
 * Orders created here are in TEST mode (not real).
 */
export const dynamic = 'force-dynamic'

const MOCK_CARPENTER_ID = 'demo-carpenter-12345'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            🎯 נגרימ — סוכן הרכש
          </h1>
          <p className="text-xl text-slate-700 mb-2">
            חיפוש חכם לדביקים, צבעים וכלים
          </p>
          <p className="text-sm text-slate-500">
            ניסוי חינם עם מוצרי איתמיר • אין בדיקה אמיתית
          </p>
        </div>

        {/* Demo Info */}
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-blue-600 p-6 mb-8">
          <h2 className="font-bold text-slate-900 mb-3">📌 איך משתמשים בדמו:</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✅ חפש בטקסט או דבר 🎙️ — "דבק מהיר", "צבע לאלון"</li>
            <li>✅ ראה מוצרים מהספקים עם מחירים וזמני הסעה</li>
            <li>✅ קרא דפים טכניים מתיעוד הספקים</li>
            <li>✅ בחר מוצר וודא הזמנה (תרגיל בלבד)</li>
            <li>⚠️ הזמנות כאן לא ממשיות — סביבת בדיקה בלבד</li>
          </ul>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">🎙️</div>
            <h3 className="font-bold text-slate-900">קול + טקסט</h3>
            <p className="text-sm text-slate-600">לחץ 🎙️ או כתוב בידיים</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-bold text-slate-900">דפים טכניים</h3>
            <p className="text-sm text-slate-600">קרא TDS מהספק</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-slate-900">מחירים אמיתיים</h3>
            <p className="text-sm text-slate-600">מחיר עדכני + מלאי</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <OrderSearchClient carpenterId={MOCK_CARPENTER_ID} />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Demo Mode • ספק: איתמיר דנינו דוד • אין orders אמיתיות</p>
          <p className="mt-2">
            רוצה לתת משוב? צור קשר:{' '}
            <a href="/join" className="text-blue-600 hover:underline">
              נכנס כנגרייה
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
