import Link from 'next/link'

/** Every 404 on the site, including a conversation or job the visitor may not open. */
export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-md place-content-center gap-3 p-6 text-center">
      <h1 className="m-0 text-2xl font-bold text-ink">הדף לא נמצא</h1>
      <p className="m-0 text-muted">ייתכן שהקישור שגוי, שהדף הוסר, או שאין לכם גישה אליו.</p>
      <Link href="/" className="mx-auto rounded-lg bg-[#0E5E5E] px-4 py-2 font-semibold text-white">
        לדף הבית
      </Link>
    </main>
  )
}
