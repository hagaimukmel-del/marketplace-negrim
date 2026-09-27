'use client'

import Link from 'next/link'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            🎯 נגרים B2B — מרכז הרכש
          </h1>
          <p className="text-xl text-slate-700 mb-2">
            קטלוג מוצרים של איתמיר בעברית
          </p>
          <p className="text-sm text-slate-500">
            סקירה חינם • אין אפליקציה דרושה
          </p>
        </div>

        {/* Demo Info */}
        <div className="bg-blue-50 rounded-lg shadow-lg border-l-4 border-blue-600 p-6 mb-8">
          <h2 className="font-bold text-slate-900 mb-3">📌 איך משתמשים בדמו:</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✅ עיין בקטלוג המוצרים לחלוטין</li>
            <li>✅ ראה מחירים וזמני הסעה</li>
            <li>✅ קרא דפים טכניים מתיעוד הספקים</li>
            <li>✅ כדי להציע הזמנות, התחברו כנגרייה</li>
            <li>⚠️ זו סביבת דמו בלבד — אין הזמנות ממשיות</li>
          </ul>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">📦</div>
            <h3 className="font-bold text-slate-900">קטלוג שלם</h3>
            <p className="text-sm text-slate-600">כל מוצרי איתמיר בממד אחד</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-bold text-slate-900">דפים טכניים</h3>
            <p className="text-sm text-slate-600">קרא תעודות מהספק</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-slate-900">מחירים אמיתיים</h3>
            <p className="text-sm text-slate-600">מחיר עדכני + מלאי</p>
          </div>
        </div>

        {/* Main CTA */}
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            בואו נתחיל!
          </h2>
          <p className="text-slate-600 mb-6">
            לחצו כאן כדי לעיין בקטלוג המוצרים
          </p>
          <Link
            href="/app/catalog"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            👉 אל הקטלוג
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Demo Mode • ספק: איתמיר דנינו דוד</p>
          <p className="mt-2">
            רוצה להציע הזמנות? התחברו כנגרייה:{' '}
            <Link href="/join" className="text-blue-600 hover:underline">
              התחברו כעת
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
