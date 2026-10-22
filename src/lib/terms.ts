/**
 * Which version of the terms is in force.
 *
 * Stored next to every acceptance. Change it whenever the terms change in
 * substance, and everyone who accepted an older version is asked again the
 * next time they come in — "accepted the terms" means nothing once the terms
 * are different.
 */
export const TERMS_VERSION = '2026-10-22'

/**
 * Shown at the top of the terms page. 16.09: the Metzion section was added.
 * 22.10: the operator's identity, sign-in by code and Google, quote requests,
 * messages, "מוצר השבוע", the work board, and the supplier subscription.
 */
export const TERMS_UPDATED_LABEL = '22 באוקטובר 2026'

/** Who runs the site, as the terms and the privacy notice name it (owner, 2026-10-22). */
export const OPERATOR = {
  name: 'HAGAI MUKMEL',
  registration: 'עוסק מורשה 300009339',
  address: 'אור עקיבא, מיקוד 3061878',
}

export function acceptedCurrentTerms(version: string | null | undefined): boolean {
  return version === TERMS_VERSION
}
