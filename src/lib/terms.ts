/**
 * Which version of the terms is in force.
 *
 * Stored next to every acceptance. Change it whenever the terms change in
 * substance, and everyone who accepted an older version is asked again the
 * next time they come in — "accepted the terms" means nothing once the terms
 * are different.
 */
export const TERMS_VERSION = '2026-11-03'

/**
 * Shown at the top of the terms page. 16.09: the Metzion section was added.
 * 22.10: the operator's identity, sign-in by code and Google, quote requests,
 * messages, "מוצר השבוע", the work board, and the supplier subscription.
 * 03.11: suppliers on the Metzion, the supplier annual agreement (350 ₪ a
 * month for 12 months) and the "מוצר השבוע" price (95 ₪).
 */
export const TERMS_UPDATED_LABEL = '3 בנובמבר 2026'

/**
 * Who runs the site, as the terms, the privacy notice and every marketing
 * mail name it (owner, 2026-10-22; Hebrew name 2026-11-09). נגרים B2B has no
 * registration of its own yet and runs under this עוסק מורשה.
 */
export const OPERATOR = {
  name: 'חגי מוקמל',
  nameEn: 'HAGAI MUKMEL',
  registration: 'עוסק מורשה 300009339',
  address: 'אור עקיבא, מיקוד 3061878',
}

/** "חגי מוקמל (HAGAI MUKMEL), עוסק מורשה 300009339, אור עקיבא…" for mail footers. */
export const OPERATOR_LINE = `${OPERATOR.name} (${OPERATOR.nameEn}), ${OPERATOR.registration}, ${OPERATOR.address}`

export function acceptedCurrentTerms(version: string | null | undefined): boolean {
  return version === TERMS_VERSION
}
