# העברה למחשב העבודה — 03.10.2026

נכתב ב-session "B2B נגרים - מחשב בית". במחשב הבית אין קבצי env, ולכן המשימות
כאן עוברות למחשב העבודה. **למחוק את הקובץ הזה כשהכול בוצע.**

## מה נעשה במחשב הבית (כבר ב-main ובאוויר)

| commit | מה |
|---|---|
| `a359b7d` | 8 שגיאות `tsc` מעבודת הצ'אט תוקנו — בגללן כל פריסה ב-Vercel מ-28.09 נכשלה. נוספה המיגרציה `20261003090000_supplier_contact_requests` |
| `7e72976` | צ'אט הסוכן: "הוסף לעגלה" (היה ₪0 ובפועל לא עבד), בחירת אפשרות 1/2/3, מחיר ליחידת בסיס (חולק בטעות ב-`pack_qty`), נתיבי ניווט שהובילו ל-404, `documents/retrieve` דורש התחברות |
| `d0ecacb` | הוסר מפתח service_role של staging שהיה כתוב בקוד · Next.js 16.3.8 (חולשת RCE קריטית ב-16.3.5) |
| `71f3751` | בדיקת security ב-GitHub: audit לתלויות production בלבד — ירוקה לראשונה |

## מה נשאר — לפי הסדר

### 1. להחליף את מפתח ה-service_role של staging — דחוף

המפתח של `marketplace-negrim-staging` (`dyueyfmuhwvpgocbypqz`) היה כתוב בגלוי
ב-`validate-db.ts`, `insert-test-carpenter.ts` ו-`src/lib/sync-from-production.ts`
מ-24.09, בריפו ציבורי. הוא הוסר מהקוד ב-`d0ecacb` אבל **נשאר בהיסטוריה של git**,
כך שהוא עדיין תקף עד שמחליפים אותו.

- Supabase ← marketplace-negrim-staging ← Settings ← API Keys ← להחליף את המפתח הסודי
- לעדכן `STAGING_SERVICE_ROLE_KEY` ב-`.env.staging.local`, ואת `SUPABASE_SERVICE_ROLE_KEY`
  ב-`.env.local` (שמצביע על staging)
- לעדכן את המשתנה ב-Vercel לסביבת **Preview**
- מפתח ה-production **לא** נחשף

שלושת הסקריפטים קוראים עכשיו `STAGING_SERVICE_ROLE_KEY` / `STAGING_SUPABASE_URL`
מהסביבה ונכשלים בלעדיהם.

### 2. להריץ את המיגרציה — staging קודם

```bash
git pull
npm ci
npm run db:push:staging
```

ואז לוודא ב-staging:
- הטבלה `supplier_contact_requests` קיימת, RLS דלוק, בלי policy
- בצ'אט הסוכן, "פנה לספק" ← `POST /api/carpenter/contact-supplier` מחזיר 201
  ונוצרת שורה

רק אחרי שזה עובד:

```bash
npm run db:push
```

(production, הפרויקט המקושר `ihburmhtcfhwlairyfyf`)

עד שהמיגרציה רצה ב-production, "פנה לספק" נכשל באתר החי — כמו שנכשל גם לפני כן.

### 3. בדיקה מקצה לקצה של הצ'אט (`npm run dev`, מול staging)

הקוד עבר `tsc` ו-build, אבל **לא נבדק מול נתונים אמיתיים**. לעבור על:
- חיפוש שמחזיר תוצאה אחת ← "הוסף לעגלה" ← בעגלה (`/app/order`): שם המוצר, מחיר
  ליחידת בסיס, ספק, וכמות של חבילה אחת או מינימום ההזמנה
- חיפוש שמחזיר כמה תוצאות ← "בחר אפשרות 2" ← מוצג המוצר הנכון עם כפתור הוספה
- המחיר בטקסט של הסוכן תואם את המחיר בקטלוג (לפני התיקון ₪24/ק״ג הוצג כ-₪0.96)
- "תראה לי את העגלה" / "החשבון שלי" מנווטים לדף קיים

## לא נגעתי — לידיעה

- `TODO` ב-`src/lib/procurement-agent.ts`: פענוח הכוונה הוא התאמת מילות מפתח;
  מסמכי מוצר מוצגים לכל הנגרים
- `contact-supplier` רק שומר שורה — לא שולח מייל לספק
- 10 שגיאות `no-explicit-any` ותיקות בקבצי הצ'אט
