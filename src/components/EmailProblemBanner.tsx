import Link from 'next/link'
import { MailWarning } from 'lucide-react'
import type { EmailProblem } from '@/lib/email-delivery'

/**
 * Shown to a carpentry or a supplier whose address we stopped mailing because
 * it bounced or marked us as spam: nothing from the site reaches them until
 * they fix it. Everything is still in the site, under the bell.
 */
export default function EmailProblemBanner({ problem, fixHref }: { problem: EmailProblem; fixHref: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 bg-red-50 px-4 py-2.5 text-sm text-red-900">
      <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p className="m-0 min-w-0 flex-1">
        {problem.reason === 'complained' ? (
          <>המייל <span dir="ltr">{problem.email}</span> סימן את ההודעות שלנו כספאם, ולכן הפסקנו לשלוח אליו.</>
        ) : (
          <>מיילים לכתובת <span dir="ltr">{problem.email}</span> חוזרים אלינו, כך שהודעות על הזמנות והצעות לא מגיעות אליכם.</>
        )}{' '}
        הכול שמור באתר, בפעמון.{' '}
        <Link href={fixHref} className="font-bold underline">
          עדכון כתובת המייל
        </Link>
      </p>
    </div>
  )
}
