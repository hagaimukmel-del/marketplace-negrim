/**
 * Which version of the terms is in force.
 *
 * Stored next to every acceptance. Change it whenever the terms change in
 * substance, and everyone who accepted an older version is asked again the
 * next time they come in — "accepted the terms" means nothing once the terms
 * are different.
 */
export const TERMS_VERSION = '2026-11-09'

/**
 * Shown at the top of the terms page. 16.09: the Metzion section was added.
 * 22.10: the operator's identity, sign-in by code and Google, quote requests,
 * messages, "מוצר השבוע", the work board, and the supplier subscription.
 * 03.11: suppliers on the Metzion, the supplier annual agreement (350 ₪ a
 * month for 12 months) and the "מוצר השבוע" price (95 ₪).
 * 09.11: the terms review (T-038): the supplier annex (/terms/suppliers), the
 * privacy notice rewritten with retention periods, account deletion, the
 * operator in Hebrew. Merged before the lawyer's review (owner).
 */
export const TERMS_UPDATED_LABEL = '9 בנובמבר 2026'

/**
 * Who runs the site, as the terms and the privacy notice name it (owner,
 * 2026-10-22; Hebrew name 2026-11-09). נגרים B2B has no registration of its
 * own yet and runs under this עוסק מורשה. Marketing mail shows the name only,
 * never the registration or the address (owner, 2026-11-09).
 */
export const OPERATOR = {
  name: 'חגי מוקמל',
  nameEn: 'HAGAI MUKMEL',
  registration: 'עוסק מורשה 300009339',
  address: 'אור עקיבא, מיקוד 3061878',
}


export function acceptedCurrentTerms(version: string | null | undefined): boolean {
  return version === TERMS_VERSION
}
