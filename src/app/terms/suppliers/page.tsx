import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { OPERATOR, TERMS_UPDATED_LABEL, TERMS_VERSION } from '@/lib/terms'
import {
  BILLING_STARTS_LABEL,
  PROMO_WEEK_EXCL_VAT,
  SUPPLIER_AGREEMENT_MONTHS,
  SUPPLIER_ANNUAL_EXCL_VAT,
  SUPPLIER_MONTHLY_EXCL_VAT,
} from '@/lib/supplier-plans'
import { PROMO_BOOKING_WEEKS } from '@/lib/promo-weeks'
import Logo from '@/components/brand/Logo'

export const metadata: Metadata = {
  title: 'נספח ספקים — שוק הנגרים',
  description: 'תנאי המנוי השנתי לספקים ותנאי ״מוצר השבוע״ בשוק הנגרים.',
}

interface Section {
  id: string
  title: string
  body: React.ReactNode
}

const ils = (amount: number) => `${amount.toLocaleString('he-IL')} ₪`

/**
 * The supplier annex: the annual subscription and "מוצר השבוע" (T-038 stage 4).
 *
 * Built from the owner's decisions of 2026-11-09: the agreement runs 12 months
 * from the operator's approval, is paid for the year in 12 installments, does
 * not renew by itself, ends early only by agreement, refunds pro rata when the
 * operator removes a supplier who did not breach, and a promo week can be
 * cancelled until the Thursday before it. Part of the terms and accepted with
 * them (same TERMS_VERSION). A lawyer reviews it before it goes live.
 */
export default function SupplierAnnexPage() {
  const sections: Section[] = [
    {
      id: 'general',
      title: 'כללי',
      body: (
        <>
          <p>
            נספח זה חל על כל ספק שמציע מוצרים בשוק הנגרים, והוא חלק מ<Link href="/terms">התקנון</Link>. הספק
            מאשר אותו יחד עם התקנון, בהצטרפות או בכניסה הראשונה אחרי שהתעדכן. בכל עניין שהנספח מסדיר,
            הנספח גובר על התקנון.
          </p>
          <p>
            הצדדים לנספח הם הספק והמפעילה, {OPERATOR.name}, {OPERATOR.registration}. כל הסכומים בנספח
            הם לפני מע״מ, ומע״מ יתווסף כדין.
          </p>
        </>
      ),
    },
    {
      id: 'approval',
      title: 'הצטרפות ואישור',
      body: (
        <p>
          ספק שנרשם ממתין לאישור המפעילה. עד שהמפעילה אישרה את ההצטרפות, החשבון בהמתנה: המוצרים שלו
          אינם מוצגים לנגריות, הוא אינו מקבל הזמנות ולא נגבה ממנו דבר. המפעילה רשאית לסרב להצטרפות
          לפי שיקול דעתה, ללא חובת הנמקה.
        </p>
      ),
    },
    {
      id: 'subscription',
      title: 'המנוי השנתי',
      body: (
        <>
          <p>
            דמי המנוי הם {ils(SUPPLIER_MONTHLY_EXCL_VAT)} לחודש, בהסכם ל-{SUPPLIER_AGREEMENT_MONTHS} חודשים, כלומר{' '}
            {ils(SUPPLIER_ANNUAL_EXCL_VAT)} לשנה. המחיר אינו תלוי במספר המוצרים, ואין עמלה על הזמנות.
          </p>
          <p>
            <strong>תקופת ההסכם.</strong> ההסכם מתחיל במועד שבו המפעילה אישרה את ההצטרפות, ונמשך{' '}
            {SUPPLIER_AGREEMENT_MONTHS} חודשי מנוי. החיוב מתחיל ב{BILLING_STARTS_LABEL}: ספק שאושר לפני כן
            משתמש באתר ללא תשלום עד אז, ו-{SUPPLIER_AGREEMENT_MONTHS} חודשי המנוי שלו נספרים מ{BILLING_STARTS_LABEL}.
          </p>
          <p>
            <strong>מחיר קבוע.</strong> המחיר לא משתנה במהלך תקופת ההסכם. מחיר לתקופה הבאה יפורסם לספק
            לפחות 30 יום לפני תום התקופה.
          </p>
          <p>
            <strong>ספק פטור.</strong> המפעילה רשאית לפטור ספק מתשלום, כולו או לתקופה, למשל בתקופת השקה.
            לפני שספק פטור יתחיל לשלם, הוא יקבל הודעה לפחות 30 יום מראש, ולא ייגבה ממנו דבר בלי שהסכים לכך.
          </p>
        </>
      ),
    },
    {
      id: 'payment',
      title: 'תשלום',
      body: (
        <>
          <p>
            התשלום הוא עבור שנה מראש, {ils(SUPPLIER_ANNUAL_EXCL_VAT)}, ב-{SUPPLIER_AGREEMENT_MONTHS} תשלומים
            חודשיים של {ils(SUPPLIER_MONTHLY_EXCL_VAT)}, או בתשלום אחד אם הספק בוחר בכך. התשלום נעשה מחוץ
            לאתר, בהעברה בנקאית, בכרטיס אשראי או בצ׳ק, והמפעילה מוציאה לספק חשבונית מס על כל תשלום.
            האתר עצמו אינו גובה תשלום.
          </p>
          <p>
            <strong>איחור בתשלום.</strong> אם תשלום לא שולם במועד, המפעילה תודיע על כך לספק. אם התשלום לא
            הוסדר בתוך 14 יום מההודעה, המפעילה רשאית להסתיר את מוצרי הספק עד שישולם. ההסתרה אינה מבטלת את
            ההסכם ואת התשלומים שנותרו.
          </p>
        </>
      ),
    },
    {
      id: 'renewal',
      title: 'סיום התקופה וחידוש',
      body: (
        <p>
          ההסכם <strong>אינו מתחדש מעצמו</strong>. כ-30 יום לפני תום התקופה, המפעילה תשלח לספק תזכורת
          ותציע הסכם לתקופה נוספת. ספק שלא הסכים במפורש לתקופה נוספת לא יחויב, והמוצרים שלו יוסתרו
          בתום התקופה. הזמנות שהתקבלו לפני כן יטופלו כרגיל.
        </p>
      ),
    },
    {
      id: 'early-exit',
      title: 'יציאה לפני תום התקופה',
      body: (
        <p>
          ההסכם הוא ל-{SUPPLIER_AGREEMENT_MONTHS} חודשים מלאים, והספק מתחייב לתשלומים של כל התקופה. יציאה
          לפני תום התקופה אפשרית רק במקרים מיוחדים, בהסכמה בין הספק למפעילה לאחר שיחה ביניהם. התנאים של
          יציאה כזו, לרבות מה ישולם, ייקבעו באותה הסכמה ויתועדו בכתב.
        </p>
      ),
    },
    {
      id: 'removal',
      title: 'הסרת ספק על ידי המפעילה',
      body: (
        <>
          <p>
            אם המפעילה מסיימת את ההסכם לפני תום התקופה בלי שהספק הפר את התקנון או את הנספח, או מפסיקה
            את פעילות האתר, הספק יקבל <strong>החזר יחסי</strong> על החודשים ששילם ולא קיבל בהם שירות, ולא
            יחויב בתשלומים שנותרו.
          </p>
          <p>
            אם הספק הסיר מוצרים או נחסם בשל הפרה — למשל מסירת מידע כוזב או מטעה, אי־טיפול חוזר בהזמנות,
            פגיעה בנגריות או אי־תשלום — לא יינתן החזר. במקרים שניתן לתקן, המפעילה תודיע לספק על ההפרה
            ותיתן לו זמן סביר לתקן אותה לפני ההסרה.
          </p>
        </>
      ),
    },
    {
      id: 'promotion',
      title: '״מוצר השבוע״',
      body: (
        <>
          <p>
            ספק רשאי להזמין שבוע של ״מוצר השבוע״ למוצר שהוא מוכר באתר, מהשבוע הבא ועד{' '}
            {PROMO_BOOKING_WEEKS} שבועות קדימה. שבוע מתחיל ביום ראשון. המחיר הוא {ils(PROMO_WEEK_EXCL_VAT)}{' '}
            לשבוע, והוא נקבע בעת ההזמנה. שינוי מחיר עתידי לא חל על שבועות שכבר הוזמנו.
          </p>
          <p>
            <strong>אישור.</strong> הזמנה נכנסת לתוקף רק אחרי שהמפעילה אישרה אותה. המפעילה רשאית לסרב,
            למשל אם המוצר אינו מתאים או שהשבוע כבר נתפס. על שבוע שלא אושר לא נגבה דבר.
          </p>
          <p>
            <strong>ביטול.</strong> אפשר לבטל בקשה שעוד לא אושרה בכל עת, ושבוע שאושר — עד יום חמישי שלפני
            אותו שבוע, מתוך חשבון הספק, בלי חיוב. אחרי מועד זה השבוע ישולם במלואו.
          </p>
          <p>
            <strong>תקלה.</strong> אם המוצר לא הוצג חלק משמעותי מהשבוע בגלל תקלה באתר, הספק יקבל לבחירתו
            שבוע חלופי או החזר יחסי.
          </p>
          <p>
            <strong>איפה הוא מוצג.</strong> המוצר מוצג בבולטות באתר, מסומן כפרסומת, ועשוי להופיע גם במייל
            לנגריות שהסכימו לקבל דיוור ובפרסומים של שוק הנגרים ברשתות החברתיות. הספק מאשר להשתמש לשם כך
            בשם המוצר, בתמונה ובמחיר, אם בחר להציג מחיר. התשלום על ״מוצר השבוע״ נעשה מחוץ לאתר, בחשבונית
            של המפעילה.
          </p>
        </>
      ),
    },
    {
      id: 'data',
      title: 'הנתונים של הספק',
      body: (
        <p>
          המפעילה משתמשת במחירים, בהזמנות ובפרטי הלקוחות של ספק רק כדי להפעיל את השירות עבורו. היא לא
          תמסור לספק אחר את המחירים שאינם מוצגים לכולם, את ההזמנות או את רשימת הלקוחות של ספק. מעבר
          להפעלת השירות היא משתמשת בהם רק כנתונים מצטברים שאינם מזהים ספק.
        </p>
      ),
    },
  ]

  return (
    <main dir="rtl" className="min-h-screen bg-stone-50 px-4 py-8">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/terms"
          className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ArrowRight size={16} />
          לתקנון
        </Link>

        <header className="mt-2 border-b border-stone-300 pb-5">
          <Logo size="sm" tagline="always" />
          <h1 className="mt-1 text-2xl font-bold text-balance text-stone-900 sm:text-3xl">נספח ספקים</h1>
          <p className="mt-1 text-base text-stone-600">המנוי השנתי ו״מוצר השבוע״</p>
          <p className="tnum mt-2 text-sm text-stone-500">
            עודכן לאחרונה: {TERMS_UPDATED_LABEL} · גרסה {TERMS_VERSION}
          </p>
        </header>

        <div className="mt-6 space-y-7">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="flex items-baseline gap-2 text-lg font-bold text-stone-900">
                <span className="tnum text-sm font-semibold text-emerald-800">{index + 1}.</span>
                {section.title}
              </h2>
              <div className="mt-2 space-y-3 text-[15px] leading-7 text-stone-700 [&_a]:text-emerald-800 [&_a]:underline">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
