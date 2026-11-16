import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, sendEmail } from './email'
import { supplierLoginLinkHtml, supplierLoginLinkSubject } from './emails/supplier-login-link'
import { loginCodeForEmail } from './login-code'

export interface LoginSupplier {
  id: string
  company_name: string
  email: string | null
  token: string | null
}

/**
 * The approved supplier an email belongs to, or null.
 *
 * Case-insensitive, because rows written before emails were lowercased on
 * save still hold them as typed: an exact match missed ITAMIRLTD1@GMAIL.COM
 * and silently sent nothing. The pattern's wildcards are escaped so an
 * underscore in an address matches only an underscore.
 */
export async function findApprovedSupplierByEmail(email: string): Promise<LoginSupplier | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@')) return null
  const pattern = normalized.replace(/[\\%_]/g, (char: string) => `\\${char}`)
  const { data } = await getSupabaseAdmin()
    .from('suppliers')
    .select('id, company_name, email, token')
    .ilike('email', pattern)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()
  return data ?? null
}

/** Mail the supplier a fresh six-digit code and their entry link, to the address on file. */
export async function sendSupplierLoginEmail(supplier: LoginSupplier, next: string | null): Promise<void> {
  if (!supplier.email || !supplier.token) return
  const code = await loginCodeForEmail(supplier.id, 'supplier')
  await sendEmail({
    to: supplier.email,
    subject: supplierLoginLinkSubject(code),
    html: supplierLoginLinkHtml({ companyName: supplier.company_name, token: supplier.token, next, code }),
    isTest: isTestName(supplier.company_name),
  })
}
