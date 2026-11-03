import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { refuseAdminWriteFor } from '@/lib/admin-scope'
import { isRegionKey, regionsForCity } from '@/lib/regions'
import {
  METZION_LIFETIME_DAYS,
  METZION_MAX_IMAGES,
  isCategory,
  isCondition,
} from '@/lib/metzion'
import type { Database } from '@/lib/database.types'

type ListingInsert = Database['public']['Tables']['metzion_listings']['Insert']
type ListingUpdate = Database['public']['Tables']['metzion_listings']['Update']

const BUCKET = 'metzion-images'
const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Who is posting: a carpenter from /app/metzion or a supplier from
 * /supplier/metzion. The side is named by the page that sends the request,
 * because the operator can hold both a carpenter and a supplier cookie. The id
 * always comes from that side's session, never from the request.
 */
interface Owner {
  column: 'carpenter_id' | 'supplier_id'
  id: string
  /** First folder of the listing's photos in storage. */
  folder: string
}

async function sessionOwner(side: unknown): Promise<Owner | NextResponse> {
  if (side === 'supplier') {
    const supplier = await getSessionSupplier()
    if (!supplier) return NextResponse.json({ error: 'צריך להיות ספק מאושר' }, { status: 401 })
    const refused = await refuseAdminWriteFor(supplier)
    if (refused) return refused
    return { column: 'supplier_id', id: supplier.id, folder: `supplier-${supplier.id}` }
  }
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות נגרייה רשומה' }, { status: 401 })
  return { column: 'carpenter_id', id: carpenter.id, folder: carpenter.id }
}

function text(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/** 050-1234567, 0501234567 and +972501234567 are one number: store 0XXXXXXXXX. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 9) return null
  return `0${digits.slice(-9)}`
}

function expiry(): string {
  return new Date(Date.now() + METZION_LIFETIME_DAYS * 86_400_000).toISOString()
}

/** The listing fields, read and checked. Shared by create and edit. */
function readFields(form: FormData): Omit<ListingInsert, 'carpenter_id' | 'supplier_id' | 'images'> | string {
  const title = text(form.get('title'), 120)
  if (!title || title.length < 3) return 'צריך תיאור קצר של הפריט'

  const category = form.get('category')
  if (!isCategory(category)) return 'צריך לבחור קטגוריה'

  const condition = form.get('condition')
  if (!isCondition(condition)) return 'צריך לבחור את מצב הפריט'

  const dealType = form.get('deal_type')
  if (dealType !== 'sale' && dealType !== 'free') return 'צריך לבחור למכירה או למסירה'

  const quantity = Number(form.get('quantity'))
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return 'כמות לא תקינה'

  const unit = text(form.get('unit'), 12) ?? 'יח׳'

  let price: number | null = null
  if (dealType === 'sale') {
    price = Number(form.get('price_per_unit'))
    if (!Number.isFinite(price) || price <= 0) return 'צריך מחיר ליחידה, או לבחור "למסירה בחינם"'
  }

  const contactName = text(form.get('contact_name'), 60)
  if (!contactName) return 'צריך שם איש קשר'

  const rawPhone = text(form.get('contact_phone'), 30)
  const phone = rawPhone ? normalisePhone(rawPhone) : null
  if (!phone) return 'מספר טלפון לא תקין'

  const city = text(form.get('city'), 60)
  if (!city) return 'צריך יישוב'

  let regions = form.getAll('regions').filter(isRegionKey)
  if (regions.length === 0) regions = regionsForCity(city)
  if (regions.length === 0) return 'צריך לבחור אזור'

  return {
    title,
    description: text(form.get('description'), 1500),
    category,
    condition,
    deal_type: dealType,
    quantity,
    unit,
    price_per_unit: price,
    contact_name: contactName,
    contact_phone: phone,
    city,
    regions: [...new Set(regions)],
  }
}

function readFiles(form: FormData): File[] | string {
  const files = form.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0)
  for (const file of files) {
    if (!TYPES.includes(file.type)) return 'תמונות בפורמט JPG, PNG או WEBP בלבד'
    if (file.size > MAX_BYTES) return 'כל תמונה עד 5MB'
  }
  return files
}

async function upload(folder: string, listingId: string, files: File[]) {
  const supabase = getSupabaseAdmin()
  const urls: string[] = []
  const paths: string[] = []
  for (const [index, file] of files.entries()) {
    const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${folder}/${listingId}/${Date.now()}-${index}.${extension}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (error) {
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
      throw new Error(`העלאת התמונה נכשלה: ${error.message}`)
    }
    paths.push(path)
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return { urls, paths }
}

/** The storage path inside a public URL of this bucket, to delete an image. */
function pathOf(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

/**
 * Post a listing.
 *
 * Only a registered, active carpenter or an approved supplier can post, and the
 * listing belongs to whoever is in the session — never to an id in the request. At least one photo
 * is required: a board of text-only listings is a board nobody scrolls.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const owner = await sessionOwner(form.get('side'))
    if (owner instanceof NextResponse) return owner

    const fields = readFields(form)
    if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

    const files = readFiles(form)
    if (typeof files === 'string') return NextResponse.json({ error: files }, { status: 400 })
    if (files.length === 0) return NextResponse.json({ error: 'צריך לפחות תמונה אחת' }, { status: 400 })
    if (files.length > METZION_MAX_IMAGES) {
      return NextResponse.json({ error: `עד ${METZION_MAX_IMAGES} תמונות` }, { status: 400 })
    }

    const id = randomUUID()
    const { urls, paths } = await upload(owner.folder, id, files)

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('metzion_listings').insert({
      id,
      [owner.column]: owner.id,
      ...fields,
      images: urls,
      expires_at: expiry(),
    })

    if (error) {
      await supabase.storage.from(BUCKET).remove(paths)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    console.error('Metzion create failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הפרסום נכשל' }, { status: 500 })
  }
}

/**
 * Everything the owner does to their own listing after posting it.
 *
 * JSON for the one-tap actions — extend for another 60 days, mark as sold,
 * take down — and multipart for editing, where the photos that stay are named
 * and new ones are attached. Every write is filtered on the owner, so an id
 * belonging to somebody else simply matches nothing.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const owner = await sessionOwner(form.get('side'))
      if (owner instanceof NextResponse) return owner
      const id = text(form.get('id'), 64)
      if (!id) return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })

      const { data: current } = await supabase
        .from('metzion_listings')
        .select('id, images, status')
        .eq('id', id)
        .eq(owner.column, owner.id)
        .maybeSingle()
      if (!current) return NextResponse.json({ error: 'המודעה לא נמצאה' }, { status: 404 })
      if (current.status === 'sold') {
        return NextResponse.json({ error: 'מודעה שנמכרה לא נערכת' }, { status: 409 })
      }

      const fields = readFields(form)
      if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

      const files = readFiles(form)
      if (typeof files === 'string') return NextResponse.json({ error: files }, { status: 400 })

      const keep = form.getAll('keep_images').filter(
        (url): url is string => typeof url === 'string' && current.images.includes(url)
      )
      if (keep.length + files.length === 0) {
        return NextResponse.json({ error: 'צריך לפחות תמונה אחת' }, { status: 400 })
      }
      if (keep.length + files.length > METZION_MAX_IMAGES) {
        return NextResponse.json({ error: `עד ${METZION_MAX_IMAGES} תמונות` }, { status: 400 })
      }

      const { urls } = await upload(owner.folder, id, files)
      const update: ListingUpdate = {
        ...fields,
        images: [...keep, ...urls],
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('metzion_listings')
        .update(update)
        .eq('id', id)
        .eq(owner.column, owner.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const dropped = current.images.filter((url) => !keep.includes(url)).map(pathOf).filter(Boolean) as string[]
      if (dropped.length) await supabase.storage.from(BUCKET).remove(dropped)

      return NextResponse.json({ ok: true })
    }

    const body = (await request.json()) as Record<string, unknown>
    const owner = await sessionOwner(body.side)
    if (owner instanceof NextResponse) return owner
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'חסרה מודעה' }, { status: 400 })

    const now = new Date().toISOString()
    let update: ListingUpdate
    let allowedFrom: string[]

    switch (body.action) {
      case 'extend':
        update = { expires_at: expiry(), updated_at: now }
        allowedFrom = ['active']
        break
      case 'sold':
        update = { status: 'sold', sold_at: now, updated_at: now }
        allowedFrom = ['active']
        break
      case 'remove':
        update = { status: 'removed', removed_reason: 'owner', updated_at: now }
        allowedFrom = ['active']
        break
      default:
        return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('metzion_listings')
      .update(update)
      .eq('id', body.id)
      .eq(owner.column, owner.id)
      .in('status', allowedFrom)
      .select('id, expires_at')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'המודעה לא נמצאה או שכבר לא פעילה' }, { status: 404 })

    return NextResponse.json({ ok: true, expires_at: data.expires_at })
  } catch (err) {
    console.error('Metzion update failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'הפעולה נכשלה' }, { status: 500 })
  }
}
