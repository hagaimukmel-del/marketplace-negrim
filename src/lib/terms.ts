/**
 * Which version of the terms is in force.
 *
 * Stored next to every acceptance. Change it whenever the terms change in
 * substance, and everyone who accepted an older version is asked again the
 * next time they come in — "accepted the terms" means nothing once the terms
 * are different.
 */
export const TERMS_VERSION = '2026-09-16'

/** Shown at the top of the terms page. 16.09: the Metzion section was added. */
export const TERMS_UPDATED_LABEL = '16 בספטמבר 2026'

export function acceptedCurrentTerms(version: string | null | undefined): boolean {
  return version === TERMS_VERSION
}
