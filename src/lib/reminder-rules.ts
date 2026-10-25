/**
 * The backup ladder (communication plan, step 5), as rules.
 *
 * Something waiting on a supplier (an order to confirm, a quote to answer)
 * climbs one rung at a time, by working minutes since it was sent:
 *   1  after 2 working hours   a reminder to the supplier (bell + email)
 *   2  after a working day     a second reminder, and the carpentry is told
 *                              the supplier has not answered yet, with the
 *                              WhatsApp/call button one tap away
 *   3  after two working days  the operator is told, to pick up the phone
 * A run that finds several rungs due (the site was quiet) climbs straight to
 * the highest one and records the ones below it, so nobody gets three emails
 * at once. Anything older than LADDER_MAX_AGE_DAYS is left alone, so turning
 * the ladder on does not chase every old order.
 */

export const LADDER_MINUTES = [120, 540, 1080] as const
export const LADDER_MAX_AGE_DAYS = 7

export type Rung = 1 | 2 | 3

/** The highest rung due after this many working minutes, or null. */
export function rungDue(workingMinutes: number): Rung | null {
  let rung: Rung | null = null
  LADDER_MINUTES.forEach((minutes, index) => {
    if (workingMinutes >= minutes) rung = (index + 1) as Rung
  })
  return rung
}

/** The key a rung is recorded under, so it happens once however many servers run. */
export function rungKey(subject: 'order' | 'quote', id: string, rung: Rung): string {
  return `${subject}:${id}:${rung}`
}

/** What to do now: the rung to act on, or null when it was already done. */
export function nextRung(workingMinutes: number, done: ReadonlySet<Rung>): Rung | null {
  const due = rungDue(workingMinutes)
  if (!due || done.has(due)) return null
  // A higher rung done means this one is behind us too.
  for (let higher = due + 1; higher <= 3; higher += 1) if (done.has(higher as Rung)) return null
  return due
}
