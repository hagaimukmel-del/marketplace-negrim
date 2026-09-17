import Link from 'next/link'

/**
 * What a screen that belongs to one carpentry shows when nobody is signed in —
 * including the operator reviewing the app, who is not a carpentry.
 */
export default function SignedOutNotice({ what }: { what: string }) {
  return (
    <div className="mt-6 rounded-2xl border-[1.5px] border-dashed border-[#D9CFC1] p-5 text-[15px] text-muted">
      <b className="mb-1 block text-ink">{what} שייך לנגרייה מחוברת</b>
      כדי לראות אותו, נכנסים מקישור הכניסה של נגרייה — למשל נגריית הניסיון שלך.
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/join" className="inline-flex h-11 items-center rounded-[11px] bg-brand px-4 font-bold text-navy">
          כניסה / הרשמה
        </Link>
        <Link href="/app/catalog" className="inline-flex h-11 items-center rounded-[11px] border-[1.5px] border-hair bg-white px-4 font-bold">
          לקטלוג
        </Link>
      </div>
    </div>
  )
}
