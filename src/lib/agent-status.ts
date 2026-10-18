import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { STATUS_LABEL, type OrderStatus } from '@/lib/app/orders'
import { loadCarpenterQuotes } from '@/lib/quotes-server'
import { QUOTE_STATE_LABEL, validLabel } from '@/lib/quotes'
import { formatUnitPrice } from '@/lib/agent-quantity'
import type { StatusQuestion } from '@/lib/agent-shortcuts'

/**
 * The agent's answers about the carpentry's own quote requests and orders
 * (communication center spec, stage 6). Reads only this carpenter's rows and
 * never shows a price the supplier did not quote to them.
 */
export async function answerStatus(question: StatusQuestion, carpenterId: string): Promise<{ message: string; actions: { label: string; action: string; value: string }[] }> {
  if (question.kind === 'order') {
    const { data: order } = await getSupabaseAdmin()
      .from('orders')
      .select('id, short_number, status, suppliers(company_name)')
      .eq('carpenter_id', carpenterId)
      .eq('short_number', question.number)
      .maybeSingle()
    if (!order) {
      return {
        message: `לא מצאתי אצלך הזמנה #${question.number}.`,
        actions: [{ label: 'לכל ההזמנות', action: 'open-page', value: '/app/orders' }],
      }
    }
    const status = STATUS_LABEL[order.status as OrderStatus] ?? order.status
    const supplier = order.suppliers?.company_name
    return {
      message: `הזמנה #${order.short_number}${supplier ? ` מ${supplier}` : ''}: ${status}.`,
      actions: [{ label: `להזמנה #${order.short_number}`, action: 'open-page', value: `/app/orders/${order.id}` }],
    }
  }

  const { ready, quotes } = await loadCarpenterQuotes(carpenterId)
  const all = { label: 'לכל הצעות המחיר', action: 'open-page', value: '/app/quotes' }
  if (!ready || quotes.length === 0) return { message: 'עוד לא ביקשת הצעות מחיר. מבקשים אחת מדף המוצר.', actions: [] }

  const answered = quotes.filter((quote) => quote.state === 'quoted').length
  const lines = quotes.slice(0, 5).map((quote) => {
    let line = `- **${quote.productName}** (${quote.supplierName}): ${QUOTE_STATE_LABEL[quote.state]}`
    if (quote.state === 'quoted' && quote.unitPrice != null) {
      line += ` · ${formatUnitPrice(quote.unitPrice, quote.unit)} לפני מע״מ`
      if (quote.validUntil) line += ` · בתוקף עד ${validLabel(quote.validUntil)}`
    }
    return line
  })
  const head = answered > 0 ? `יש לך ${answered === 1 ? 'הצעה אחת שנענתה' : `${answered} הצעות שנענו`}.` : 'אף הצעה עוד לא נענתה.'
  return { message: `${head}\n\n${lines.join('\n')}`, actions: [all] }
}
