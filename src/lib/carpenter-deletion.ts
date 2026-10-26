/**
 * Deleting a carpentry with three months to change your mind.
 *
 * The operator's "מחק" marks the row (deleted_at) and switches it off
 * (is_active = false), which every way in already refuses. The row and
 * everything hanging off it stays untouched until the daily cron removes it
 * for good, RETENTION_MONTHS after it was deleted. Until then one click in
 * /admin/carpenters puts it back exactly as it was, blocked or not.
 *
 * Pure rules here; the database work is in carpenter-deletion-server.ts.
 */

export const RETENTION_MONTHS = 3

/** When a carpentry deleted at `deletedAt` is removed for good. */
export function purgeDate(deletedAt: string | Date): Date {
  const date = new Date(deletedAt)
  const day = date.getUTCDate()
  date.setUTCMonth(date.getUTCMonth() + RETENTION_MONTHS)
  // 30 November + 3 months is 2 March in JS; keep it on the last day of February.
  if (date.getUTCDate() !== day) date.setUTCDate(0)
  return date
}

/** Rows deleted before this moment are due for removal. */
export function purgeCutoff(now: Date = new Date()): Date {
  const date = new Date(now)
  const day = date.getUTCDate()
  date.setUTCMonth(date.getUTCMonth() - RETENTION_MONTHS)
  if (date.getUTCDate() !== day) date.setUTCDate(0)
  return date
}

/** Whole days left before removal, never below zero. */
export function daysLeft(deletedAt: string | Date, now: Date = new Date()): number {
  const ms = purgeDate(deletedAt).getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

/** What to write when restoring: back to the state it had when it was deleted. */
export function restoredFields(activeBeforeDelete: boolean | null) {
  return {
    is_active: activeBeforeDelete ?? true,
    deleted_at: null,
    deleted_by: null,
    active_before_delete: null,
  }
}
