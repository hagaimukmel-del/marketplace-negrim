/**
 * The regions of the marketplace — one list for the whole product.
 *
 * Used when a carpenter registers, to filter the Metzion board, and later to
 * match suppliers and delivery. Decided 16.09: seven regions (Eilat and the
 * Arava are part of the south).
 *
 * A border town belongs to both regions it sits between, so a city maps to a
 * list, not a single key. A carpenter in Zichron Yaakov is found by someone
 * filtering Haifa and by someone filtering the Sharon — which is how deliveries
 * there actually work.
 *
 * Judea and Samaria are assigned to the region that actually supplies them:
 * Samaria with the Sharon, Binyamin, Gush Etzion and the Adumim area with
 * Jerusalem, the Hebron hills with the south.
 */

export const REGIONS = [
  { key: 'north', name: 'צפון', note: 'גליל, גולן ועמקים' },
  { key: 'haifa', name: 'חיפה והקריות', note: 'כולל חוף הכרמל' },
  { key: 'sharon', name: 'השרון', note: 'מחדרה עד הרצליה, ושומרון' },
  { key: 'center', name: 'גוש דן והמרכז', note: 'תל אביב, פתח תקווה, ראשון' },
  { key: 'shfela', name: 'השפלה', note: 'רחובות, אשדוד, בית שמש' },
  { key: 'jerusalem', name: 'ירושלים והסביבה', note: 'כולל בנימין, גוש עציון ומישור אדומים' },
  { key: 'south', name: 'הדרום', note: 'באר שבע, הנגב, הערבה ואילת' },
] as const

export type RegionKey = (typeof REGIONS)[number]['key']

export function isRegionKey(value: unknown): value is RegionKey {
  return typeof value === 'string' && REGIONS.some((region) => region.key === value)
}

export function regionName(key: string): string {
  return REGIONS.find((region) => region.key === key)?.name ?? key
}

const CITY_REGIONS: Record<string, RegionKey[]> = {
  // north
  'קריית שמונה': ['north'], 'צפת': ['north'], 'נהריה': ['north'], 'עכו': ['north'], 'כרמיאל': ['north'],
  'טבריה': ['north'], 'נצרת': ['north'], 'נוף הגליל': ['north'], 'עפולה': ['north'], 'בית שאן': ['north'],
  'קצרין': ['north'], 'מגדל העמק': ['north'], 'יקנעם': ['north'], 'יקנעם עילית': ['north'], 'שלומי': ['north'],
  'מעלות-תרשיחא': ['north'], 'סחנין': ['north'], 'שפרעם': ['north'], 'מגדל שמס': ['north'], 'ראש פינה': ['north'],
  'טמרה': ['north'], 'עראבה': ['north'], 'יבנאל': ['north'], 'מטולה': ['north'],
  // haifa
  'חיפה': ['haifa'], 'קריית ביאליק': ['haifa'], 'קריית מוצקין': ['haifa'], 'קריית אתא': ['haifa'],
  'קריית ים': ['haifa'], 'קריית חיים': ['haifa'], 'טירת כרמל': ['haifa'], 'נשר': ['haifa'], 'עתלית': ['haifa'],
  'דלית אל-כרמל': ['haifa'], 'עוספיא': ['haifa'],
  // sharon
  'נתניה': ['sharon'], 'חדרה': ['sharon'], 'הרצליה': ['sharon'], 'רעננה': ['sharon'], 'כפר סבא': ['sharon'],
  'הוד השרון': ['sharon'], 'אור עקיבא': ['sharon'], 'טייבה': ['sharon'], 'טירה': ['sharon'], 'קלנסווה': ['sharon'],
  'פרדס חנה-כרכור': ['sharon'], 'פרדס חנה': ['sharon'], 'בנימינה': ['sharon'], 'קדימה-צורן': ['sharon'],
  'אבן יהודה': ['sharon'], 'כוכב יאיר': ['sharon'], 'צור יגאל': ['sharon'], 'יד חנה': ['sharon'], 'עמק חפר': ['sharon'],
  // Samaria
  'אריאל': ['sharon'], 'קרני שומרון': ['sharon'], 'קדומים': ['sharon'], 'עמנואל': ['sharon'], 'אלקנה': ['sharon'],
  'ברקן': ['sharon'], 'אורנית': ['sharon'], 'אלפי מנשה': ['sharon'],
  // center
  'תל אביב': ['center'], 'תל אביב-יפו': ['center'], 'יפו': ['center'], 'רמת גן': ['center'], 'גבעתיים': ['center'],
  'בני ברק': ['center'], 'חולון': ['center'], 'בת ים': ['center'], 'פתח תקווה': ['center'], 'ראש העין': ['center'],
  'אור יהודה': ['center'], 'יהוד': ['center'], 'יהוד-מונוסון': ['center'], 'קריית אונו': ['center'],
  'גבעת שמואל': ['center'], 'ראשון לציון': ['center'], 'לוד': ['center'], 'רמלה': ['center'], 'שוהם': ['center'],
  'אלעד': ['center'], 'כפר קאסם': ['center'], 'רמת השרון': ['center'], 'אזור': ['center'],
  // shfela
  'רחובות': ['shfela'], 'נס ציונה': ['shfela'], 'יבנה': ['shfela'], 'אשדוד': ['shfela'], 'גדרה': ['shfela'],
  'קריית מלאכי': ['shfela'], 'קריית גת': ['shfela'], 'בית שמש': ['shfela'], 'מזכרת בתיה': ['shfela'],
  'גן יבנה': ['shfela'], 'קריית עקרון': ['shfela'],
  // jerusalem, with Binyamin, Gush Etzion and the Adumim area
  'ירושלים': ['jerusalem'], 'מבשרת ציון': ['jerusalem'], 'אבו גוש': ['jerusalem'], 'צור הדסה': ['jerusalem'],
  'מעלה אדומים': ['jerusalem'], 'מישור אדומים': ['jerusalem'], 'כפר אדומים': ['jerusalem'], 'קדר': ['jerusalem'],
  'בית אל': ['jerusalem'], 'עפרה': ['jerusalem'], 'כוכב יעקב': ['jerusalem'], 'גבעת זאב': ['jerusalem'],
  'ביתר עילית': ['jerusalem'], 'אפרת': ['jerusalem'], 'אלון שבות': ['jerusalem'], 'גוש עציון': ['jerusalem'],
  // south, with the Arava and Eilat, and the Hebron hills
  'באר שבע': ['south'], 'דימונה': ['south'], 'ערד': ['south'], 'אופקים': ['south'], 'נתיבות': ['south'],
  'שדרות': ['south'], 'ירוחם': ['south'], 'רהט': ['south'], 'מצפה רמון': ['south'], 'עומר': ['south'],
  'להבים': ['south'], 'מיתר': ['south'], 'אילת': ['south'], 'יטבתה': ['south'], 'ספיר': ['south'],
  'חצבה': ['south'], 'עין יהב': ['south'], 'קריית ארבע': ['south'], 'עתניאל': ['south'],
  // border towns: both regions
  'זכרון יעקב': ['haifa', 'sharon'],
  'אשקלון': ['south', 'shfela'],
  'מודיעין': ['jerusalem', 'center'],
  'מודיעין-מכבים-רעות': ['jerusalem', 'center'],
  'מודיעין עילית': ['jerusalem', 'center'],
  'אום אל-פחם': ['north', 'sharon'],
  'ערערה': ['north', 'sharon'],
  'באקה אל-גרבייה': ['north', 'sharon'],
  'כפר קרע': ['north', 'sharon'],
}

/** Spelling differences that should not decide which region someone is in. */
function normalise(city: string): string {
  return city
    .trim()
    .replace(/[׳']/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
}

const NORMALISED = new Map(Object.entries(CITY_REGIONS).map(([city, keys]) => [normalise(city), keys]))

/**
 * The regions a city belongs to, or an empty list for a place not on the list.
 * Unknown is a real answer: the person picks, rather than being filed wrongly.
 */
export function regionsForCity(city: string | null | undefined): RegionKey[] {
  if (!city) return []
  return NORMALISED.get(normalise(city)) ?? []
}
