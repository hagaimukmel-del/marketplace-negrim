import { editDistance, normalize, typoAllowance } from './catalog-search'

/**
 * What the site offers, in the words the agent answers with. The one place
 * the agent (keyword or LLM) learns about the site beyond the catalogue, so a
 * new feature is added here in the same commit as its code. Client-safe: no
 * database. Facts follow CLAUDE.md §5: the supplier sells and invoices, the
 * site never takes payment for goods.
 */

export interface SiteTopic {
  id: string
  title: string
  /** Words a carpenter may use for this topic. Matched with typo tolerance. */
  keywords: string[]
  answer: string
  links: { label: string; href: string }[]
}

export const SITE_TOPICS: SiteTopic[] = [
  {
    id: 'about',
    title: 'מה האתר עושה',
    keywords: ['מה האתר', 'מה יש באתר', 'מה יש פה', 'מה אתם', 'מה זה נגרים', 'איך זה עובד', 'מה אפשר לעשות', 'מה אתה יודע', 'help'],
    answer:
      'נגרים B2B הוא אתר הזמנות לנגריות: מחפשים מוצר בקטלוג, רואים מחיר ספק לפני מע״מ, ושולחים הזמנת רכש ישר לספק. הספק מאשר, מספק ומוציא חשבונית. חוץ מזה יש המציאון (העברת עודפים בין נגרים), נגרים עובדים ביחד (עבודות בין נגריות) ודרושים (מודעות עבודה).\nאני יכול לחפש מוצר, להכין עגלה, לבדוק מצב הזמנה או הצעת מחיר, ולענות על שאלות על האתר.',
    links: [{ label: 'לקטלוג', href: '/app/catalog' }],
  },
  {
    id: 'price',
    title: 'כמה עולה האתר',
    keywords: ['כמה עולה האתר', 'עולה כסף', 'חינם', 'דמי מנוי', 'תשלום לאתר', 'עמלה'],
    answer: 'לנגריות האתר חינם: ההרשמה, הקטלוג, ההזמנות, המציאון ודרושים. מחירי המוצרים הם של הספקים.',
    links: [],
  },
  {
    id: 'invoice',
    title: 'חשבונית ותשלום',
    keywords: ['חשבונית', 'קבלה', 'איך משלמים', 'תשלום', 'לשלם', 'אשראי', 'שוטף', 'תנאי תשלום', 'מעמ'],
    answer:
      'משלמים לספק, לא לאתר. הספק הוא המוכר: הוא מאשר את ההזמנה, מספק, מוציא לכם חשבונית ומחליט על תנאי התשלום (למשל שוטף+30). האתר לא גובה כסף על סחורה ולא מוציא חשבוניות. המחירים באתר לפני מע״מ.',
    links: [{ label: 'ההזמנות שלי', href: '/app/orders' }],
  },
  {
    id: 'order-flow',
    title: 'איך מזמינים',
    keywords: ['איך מזמינים', 'איך להזמין', 'שליחת הזמנה', 'הזמנת רכש', 'אישור הזמנה', 'מתי יגיע', 'משלוח', 'אספקה'],
    answer:
      'מוסיפים מוצרים לעגלה ושולחים משם. העגלה מתחלקת להזמנת רכש אחת לכל ספק. הספק מקבל מייל, מאשר ונותן תאריך אספקה, ואתם מקבלים עדכון. כדי לשלוח הזמנה צריך מייל מאומת. מצב כל הזמנה מופיע ב"ההזמנות שלי".',
    links: [
      { label: 'לעגלה', href: '/app/order' },
      { label: 'ההזמנות שלי', href: '/app/orders' },
    ],
  },
  {
    id: 'quotes',
    title: 'הצעת מחיר ומחיר מיוחד',
    keywords: ['הצעת מחיר', 'הצעות מחיר', 'מחיר מיוחד', 'הנחה', 'הזמנה גדולה', 'כמות גדולה', 'מחיר לכמות'],
    answer:
      'בדף המוצר יש "בקש הצעת מחיר". אצל ספק שעובד בהצעות מחיר בלבד זו הדרך היחידה לקבל מחיר. בהזמנה גדולה אפשר לבקש מחיר מיוחד. התשובות מגיעות ל"הצעות מחיר", ומשם מוסיפים לעגלה.',
    links: [{ label: 'הצעות המחיר שלי', href: '/app/quotes' }],
  },
  {
    id: 'promo',
    title: 'מוצר השבוע',
    keywords: ['מוצר השבוע', 'מבצע', 'פרסומת', 'מוצר מקודם'],
    answer: 'מוצר השבוע הוא מוצר שספק מקדם השבוע. הוא מופיע בראש מסך הבית ובקטגוריה שלו, ומסומן "פרסומת".',
    links: [{ label: 'למסך הבית', href: '/app' }],
  },
  {
    id: 'metzion',
    title: 'המציאון',
    keywords: ['מציאון', 'עודפים', 'שאריות', 'יד שניה', 'משומש', 'למסור', 'למכור ציוד', 'מכונה משומשת'],
    answer:
      'המציאון הוא לוח שבו נגרים, וגם ספקים, מפרסמים עודפי חומר, פרזול וציוד, למכירה או למסירה. העסקה נעשית ישירות ביניכם בטלפון או בוואטסאפ; האתר רק מחבר.',
    links: [
      { label: 'למציאון', href: '/app/metzion' },
      { label: 'פרסום חדש', href: '/app/metzion/new' },
    ],
  },
  {
    id: 'work',
    title: 'נגרים עובדים ביחד',
    keywords: ['נגרים עובדים ביחד', 'עבודה משותפת', 'עזרה בעבודה', 'קבלן משנה', 'להעביר עבודה', 'עבודות בין נגריות', 'שיתוף פעולה'],
    answer:
      'נגרים עובדים ביחד: נגרייה עם עבודה שצריכה עזרה מפרסמת אותה, ונגרייה מתאימה עונה ומתאמים בשיחה באתר. ממלאים פרופיל יכולות פעם אחת. בתקופת ההשקה זה בחינם.',
    links: [
      { label: 'ללוח העבודות', href: '/app/work' },
      { label: 'הפרופיל שלי שם', href: '/app/work/profile' },
    ],
  },
  {
    id: 'jobs',
    title: 'דרושים',
    keywords: ['דרושים', 'דרוש', 'מחפש עובד', 'מחפש עבודה', 'משרה', 'גיוס', 'נהג', 'מפעיל cnc'],
    answer:
      'דרושים הוא לוח מודעות עבודה: נגריות וספקים מפרסמים את מי שהם מחפשים (נגר ייצור, מפעיל CNC, נהג, איש מכירות). מתעניינים מתקשרים או שולחים וואטסאפ ישירות. מודעה נשארת 30 יום.',
    links: [
      { label: 'ללוח דרושים', href: '/app/jobs' },
      { label: 'פרסום מודעה', href: '/app/jobs/new' },
    ],
  },
  {
    id: 'messages',
    title: 'הודעות לספק',
    keywords: ['הודעה לספק', 'לדבר עם ספק', 'שאלה לספק', 'הודעות', 'טלפון של ספק', 'ליצור קשר'],
    answer: 'אפשר לשלוח לספק שאלה על מוצר או על הזמנה. ההודעות מחכות לכם ב"הודעות", וגם אני יכול להעביר שאלה מדף מוצר שמצאתי.',
    links: [{ label: 'להודעות', href: '/app/messages' }],
  },
  {
    id: 'delivery-region',
    title: 'אזור משלוח',
    keywords: ['אזור משלוח', 'מגיע אליי', 'משלוח לאזור', 'לא מגיע', 'איזה ספק מגיע'],
    answer:
      'כל ספק מסמן לאן הוא מספק. הקטלוג מעדיף ספק שמגיע לעיר שלכם ומסמן "לא מגיע לאזור שלך" כשלא. בקטלוג יש גם מסנן "באזור שלי". את העיר מעדכנים בפרופיל.',
    links: [{ label: 'לפרופיל', href: '/app/account' }],
  },
  {
    id: 'login',
    title: 'כניסה וחשבון',
    keywords: ['כניסה', 'להתחבר', 'התחברות', 'סיסמה', 'קוד כניסה', 'מכשיר חדש', 'לא מצליח להיכנס', 'אימות מייל', 'הרשמה'],
    answer:
      'אין סיסמה. נכנסים מהקישור האישי שבמייל, או מכניסה עם מייל או טלפון: מקבלים קוד של 6 ספרות למייל ומקלידים אותו. ההרשמה חינמית. כדי לשלוח הזמנות צריך לאמת את המייל מהקישור שנשלח.',
    links: [
      { label: 'כניסה / הרשמה', href: '/join' },
      { label: 'הפרופיל שלי', href: '/app/account' },
    ],
  },
  {
    id: 'documents',
    title: 'מסמכים',
    keywords: ['להדפיס', 'pdf', 'הצעת מחיר להדפסה', 'מסמך הזמנה'],
    answer:
      'מהעגלה אפשר להוציא הצעת מחיר להדפסה, ומכל הזמנה מסמך "הזמנת רכש". אלה לא חשבוניות. דפים טכניים של מוצר נמצאים בדף המוצר.',
    links: [{ label: 'לעגלה', href: '/app/order' }],
  },
  {
    id: 'supplier-join',
    title: 'להצטרף כספק',
    keywords: ['להיות ספק', 'הצטרפות ספק', 'אני ספק', 'למכור באתר', 'לפרסם מוצרים'],
    answer: 'ספק נרשם בטופס הצטרפות, ואחרי אישור מקבל קונסולה לניהול מחירון, הזמנות ומסמכים. פרטי המנוי לספקים מופיעים בטופס ובתקנון.',
    links: [{ label: 'הצטרפות ספקים', href: '/supplier/join' }],
  },
  {
    id: 'terms',
    title: 'תקנון ופרטיות',
    keywords: ['תקנון', 'תנאי שימוש', 'פרטיות', 'מדיניות', 'נגישות'],
    answer: 'התקנון, מדיניות הפרטיות ונספח הספקים נמצאים בדף התקנון.',
    links: [{ label: 'לתקנון', href: '/terms' }],
  },
  {
    id: 'contact',
    title: 'יצירת קשר עם האתר',
    keywords: ['צור קשר', 'תמיכה', 'משוב', 'תקלה', 'באג', 'לדבר עם מישהו', 'נציג'],
    answer: 'לשאלות, תקלות והצעות: nagarim.b2b@gmail.com.',
    links: [],
  },
  {
    id: 'voice',
    title: 'הזמנה קולית',
    keywords: ['הזמנה קולית', 'בקול', 'מיקרופון'],
    answer: 'הזמנה בקול בפיתוח. בינתיים כתבו לי מה אתם צריכים, גם עם כמות, למשל "דבק PUR 20 ק״ג".',
    links: [],
  },
]

const PREFIX_LETTERS = 'והבלמשכ'

/**
 * One typo in a word of 4-6 letters, two in a longer one; short words must
 * match. A missing prefix letter is not a typo: "מסור" (a saw) is not "למסור".
 */
function wordMatches(typed: string, wanted: string): boolean {
  if (typed === wanted) return true
  const forms = typed.length >= 4 && PREFIX_LETTERS.includes(typed[0]) ? [typed, typed.slice(1)] : [typed]
  const cap = typoAllowance(wanted)
  return forms.some((form) => {
    if (form === wanted) return true
    if (cap === 0 || (PREFIX_LETTERS.includes(wanted[0]) && wanted.slice(1) === form)) return false
    return editDistance(form, wanted, cap) <= cap
  })
}

export interface SiteTopicMatch {
  topic: SiteTopic
  /** The message without the keyword's words, to search for a product in ("הצעת מחיר לדבק PUR" → "לדבק PUR"). */
  rest: string
}

/**
 * The site topic a message asks about, or null for a product search. Every
 * word of a keyword must appear (typos forgiven); the longest keyword wins, so
 * "הצעת מחיר" beats "מחיר".
 */
export function siteTopicMatch(message: string): SiteTopicMatch | null {
  const words = normalize(message).split(' ').filter(Boolean)
  if (words.length === 0) return null
  let found: { topic: SiteTopic; weight: number; used: Set<number> } | null = null
  for (const topic of SITE_TOPICS) {
    for (const keyword of topic.keywords) {
      const wanted = normalize(keyword).split(' ').filter(Boolean)
      const used = new Set<number>()
      const all = wanted.every((w) => {
        const at = words.findIndex((typed, i) => !used.has(i) && wordMatches(typed, w))
        if (at < 0) return false
        used.add(at)
        return true
      })
      if (all) {
        const weight = wanted.join('').length
        if (!found || weight > found.weight) found = { topic, weight, used }
      }
    }
  }
  if (!found) return null
  const { topic, used } = found
  return { topic, rest: words.filter((_, i) => !used.has(i)).join(' ') }
}

export function siteTopicFor(message: string): SiteTopic | null {
  return siteTopicMatch(message)?.topic ?? null
}
