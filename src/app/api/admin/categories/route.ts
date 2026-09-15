import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CATEGORY_ICONS } from '@/components/CategoryIcon'
import type { Database } from '@/lib/database.types'

type CategoryUpdate = Database['public']['Tables']['categories']['Update']

const ICON_KEYS = CATEGORY_ICONS.map((item) => item.key)

function text(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

async function unauthorized() {
  return !(await isAdmin())
}

/**
 * The tree is two levels deep on purpose: a main category and its branches.
 * A third level is where a carpenter stops finding things, so nothing here can
 * create one — a parent must itself be a main category.
 */
async function validParent(parentId: string | null, selfId?: string): Promise<string | null> {
  if (!parentId) return null
  if (parentId === selfId) return 'קטגוריה לא יכולה להיות תחת עצמה'
  const { data } = await getSupabaseAdmin()
    .from('categories')
    .select('id, parent_category_id')
    .eq('id', parentId)
    .maybeSingle()
  if (!data) return 'קטגוריית האב לא נמצאה'
  if (data.parent_category_id) return 'אפשר לשייך רק לקטגוריה ראשית'
  return null
}

/** Add a main category, or a branch under one. It goes to the end of its level. */
export async function POST(request: NextRequest) {
  if (await unauthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = text(body.name_he)
    if (!name) return NextResponse.json({ error: 'צריך שם קטגוריה' }, { status: 400 })

    const parentId = text(body.parent_category_id, 64)
    const parentError = await validParent(parentId)
    if (parentError) return NextResponse.json({ error: parentError }, { status: 400 })

    const supabase = getSupabaseAdmin()
    let siblings = supabase.from('categories').select('name_he, sort_order')
    siblings = parentId ? siblings.eq('parent_category_id', parentId) : siblings.is('parent_category_id', null)
    const { data: existing } = await siblings

    if ((existing ?? []).some((row) => row.name_he === name)) {
      return NextResponse.json({ error: 'כבר יש קטגוריה בשם הזה באותה רמה' }, { status: 409 })
    }

    const nextSort = Math.max(0, ...(existing ?? []).map((row) => row.sort_order)) + 10

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name_he: name,
        name_en: text(body.name_en),
        parent_category_id: parentId,
        is_active: true,
        sort_order: nextSort,
        icon: parentId ? null : 'other',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

/**
 * Rename, re-icon, hide, move under another main category, or nudge up and down.
 * Moving up or down swaps places with the neighbour, so the order is always
 * exactly what the screen shows.
 */
export async function PATCH(request: NextRequest) {
  if (await unauthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.id !== 'string') {
      return NextResponse.json({ error: 'חסר מזהה קטגוריה' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: current } = await supabase
      .from('categories')
      .select('id, parent_category_id, sort_order')
      .eq('id', body.id)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 })

    if (body.move === 'up' || body.move === 'down') {
      let query = supabase.from('categories').select('id, sort_order')
      query = current.parent_category_id
        ? query.eq('parent_category_id', current.parent_category_id)
        : query.is('parent_category_id', null)
      const { data: siblings } = await query.order('sort_order').order('name_he')

      const list = siblings ?? []
      const index = list.findIndex((row) => row.id === current.id)
      const swapWith = list[body.move === 'up' ? index - 1 : index + 1]
      if (!swapWith) return NextResponse.json({ ok: true })

      // Renumber the level first, so equal sort orders from older rows cannot
      // make a swap a no-op.
      const renumbered = list.map((row, position) => ({ id: row.id, sort_order: (position + 1) * 10 }))
      const mine = renumbered[index].sort_order
      const theirs = renumbered[body.move === 'up' ? index - 1 : index + 1].sort_order
      for (const row of renumbered) {
        const sort = row.id === current.id ? theirs : row.id === swapWith.id ? mine : row.sort_order
        await supabase.from('categories').update({ sort_order: sort }).eq('id', row.id)
      }
      return NextResponse.json({ ok: true })
    }

    const update: CategoryUpdate = {}

    if ('name_he' in body) {
      const name = text(body.name_he)
      if (!name) return NextResponse.json({ error: 'צריך שם קטגוריה' }, { status: 400 })
      update.name_he = name
    }
    if ('name_en' in body) update.name_en = text(body.name_en)
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active

    if ('icon' in body) {
      if (typeof body.icon !== 'string' || !ICON_KEYS.includes(body.icon)) {
        return NextResponse.json({ error: 'אייקון לא מוכר' }, { status: 400 })
      }
      update.icon = body.icon
    }

    if ('parent_category_id' in body) {
      const parentId = text(body.parent_category_id, 64)
      const parentError = await validParent(parentId, current.id)
      if (parentError) return NextResponse.json({ error: parentError }, { status: 400 })

      if (parentId) {
        const { count } = await supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('parent_category_id', current.id)
        if ((count ?? 0) > 0) {
          return NextResponse.json(
            { error: 'לקטגוריה הזו יש תתי־קטגוריות, ולכן היא לא יכולה לעבור מתחת לאחרת' },
            { status: 409 }
          )
        }
      }

      update.parent_category_id = parentId
      update.icon = parentId ? null : 'other'
      update.sort_order = 1000
    }

    const { error } = await supabase.from('categories').update(update).eq('id', current.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

/**
 * Delete an empty category. One that holds products or branches is refused with
 * the count, because deleting it would leave those products with nowhere to be
 * found — hide it, or move them first.
 */
export async function DELETE(request: NextRequest) {
  if (await unauthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'חסר מזהה קטגוריה' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const [{ count: children }, { count: products }] = await Promise.all([
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_category_id', id),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id),
    ])

    if ((children ?? 0) > 0 || (products ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            `אי אפשר למחוק: בקטגוריה ${products ?? 0} מוצרים ו-${children ?? 0} תתי־קטגוריות. ` +
            'אפשר להסתיר אותה, או להעביר את המוצרים קודם.',
        },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
