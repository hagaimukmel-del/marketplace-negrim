-- The full category tree: ten main categories, each with its sub-categories.
--
-- Five groups were too few to be understood. "חומרי גלם" held nothing but
-- adhesives, "מוצרים" held nothing at all, and a supplier of boards or hinges
-- could not tell where anything went. A carpenter looking for MDF should find
-- "לוחות" and then "MDF", not guess which of five words hides it.
--
-- Existing rows are renamed and moved, never deleted, so every product keeps the
-- category id it already has. Nothing here touches products.

alter table public.categories
  add column if not exists sort_order integer not null default 100,
  add column if not exists icon text;

comment on column public.categories.icon is
  'Key for the icon drawn on a main category tile (boards, wood, edge, glue, hardware, finish, tools, machines, care, other). Null on sub-categories.';

-- The old groups become main categories that describe what they hold.
update public.categories set name_he = 'דבקים', name_en = 'Adhesives'
 where name_he = 'חומרי גלם' and parent_category_id is null
   and not exists (select 1 from public.categories where name_he = 'דבקים' and parent_category_id is null);

update public.categories set name_he = 'גימור וצבע', name_en = 'Finishes'
 where name_he = 'מוצרים' and parent_category_id is null
   and not exists (select 1 from public.categories where name_he = 'גימור וצבע' and parent_category_id is null);

update public.categories set name_he = 'מכונות', name_en = 'Machines'
 where name_he = 'מכונות וציוד' and parent_category_id is null
   and not exists (select 1 from public.categories where name_he = 'מכונות' and parent_category_id is null);

update public.categories set name_he = 'מוצרים ואחר', name_en = 'Products and other'
 where name_he = 'אחר' and parent_category_id is null
   and not exists (select 1 from public.categories where name_he = 'מוצרים ואחר' and parent_category_id is null);

-- Find a category by name under a parent, or create it. Dropped at the end.
create or replace function public._negrim_category(
  p_name text, p_name_en text, p_parent uuid, p_sort integer, p_icon text
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  select id into v_id from public.categories
   where name_he = p_name and parent_category_id is not distinct from p_parent
   limit 1;

  if v_id is null then
    insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
    values (p_name, p_name_en, p_parent, true, p_sort, p_icon)
    returning id into v_id;
  else
    update public.categories
       set name_en = coalesce(name_en, p_name_en),
           sort_order = p_sort,
           icon = p_icon,
           is_active = true
     where id = v_id;
  end if;

  return v_id;
end $$;

do $$
declare
  boards   uuid;
  wood     uuid;
  edge     uuid;
  glue     uuid;
  hardware uuid;
  finish   uuid;
  tools    uuid;
  machines uuid;
  care     uuid;
  other    uuid;
begin
  boards   := public._negrim_category('לוחות',          'Boards',              null, 10,  'boards');
  wood     := public._negrim_category('עץ מלא',         'Solid wood',          null, 20,  'wood');
  edge     := public._negrim_category('קנטים ופורניר',  'Edging and veneer',   null, 30,  'edge');
  glue     := public._negrim_category('דבקים',          'Adhesives',           null, 40,  'glue');
  hardware := public._negrim_category('פרזול',          'Hardware',            null, 50,  'hardware');
  finish   := public._negrim_category('גימור וצבע',     'Finishes',            null, 60,  'finish');
  tools    := public._negrim_category('כלי עבודה',      'Tools',               null, 70,  'tools');
  machines := public._negrim_category('מכונות',         'Machines',            null, 80,  'machines');
  care     := public._negrim_category('תחזוקה וניקוי',  'Care and maintenance', null, 90, 'care');
  other    := public._negrim_category('מוצרים ואחר',    'Products and other',  null, 100, 'other');

  -- Cleaning fluids are for looking after machines, not a machine.
  update public.categories set parent_category_id = care
   where name_he = 'חומרי ניקוי ותחזוקה';

  perform public._negrim_category('MDF',                 'MDF',                 boards, 10, null);
  perform public._negrim_category('סנדוויץ׳ (דיקט)',     'Plywood',             boards, 20, null);
  perform public._negrim_category('מזוניט',              'Hardboard',           boards, 30, null);
  perform public._negrim_category('סיבית',               'Chipboard',           boards, 40, null);
  perform public._negrim_category('לוחות מלמין',         'Melamine boards',     boards, 50, null);
  perform public._negrim_category('פורמייקה (HPL)',      'HPL laminate',        boards, 60, null);
  perform public._negrim_category('OSB',                 'OSB',                 boards, 70, null);
  perform public._negrim_category('לוחות מצופי פורניר',  'Veneered boards',     boards, 80, null);

  perform public._negrim_category('עצים קשים',           'Hardwoods',           wood, 10, null);
  perform public._negrim_category('עצים רכים',           'Softwoods',           wood, 20, null);
  perform public._negrim_category('קורות ופרופילים',     'Beams and profiles',  wood, 30, null);
  perform public._negrim_category('משטחי עבודה',         'Worktops',            wood, 40, null);

  perform public._negrim_category('קנטי PVC',            'PVC edging',          edge, 10, null);
  perform public._negrim_category('קנטי ABS',            'ABS edging',          edge, 20, null);
  perform public._negrim_category('קנטי פורניר',         'Veneer edging',       edge, 30, null);
  perform public._negrim_category('קנטי אקריל',          'Acrylic edging',      edge, 40, null);
  perform public._negrim_category('גליונות פורניר',      'Veneer sheets',       edge, 50, null);

  perform public._negrim_category('דבקים למכונות קנטים', 'Edgebander adhesives', glue, 10, null);
  perform public._negrim_category('דבקים על בסיס מים',   'Water-based adhesives', glue, 20, null);
  perform public._negrim_category('דבקי PUR',            'PUR adhesives',       glue, 30, null);
  perform public._negrim_category('דבקי מגע',            'Contact adhesives',   glue, 40, null);
  perform public._negrim_category('סיליקונים ואקרילים',  'Silicones and acrylics', glue, 50, null);
  perform public._negrim_category('תוספים של חברת RIEPE למתזים', 'RIEPE additives', glue, 60, null);

  perform public._negrim_category('צירים',               'Hinges',              hardware, 10, null);
  perform public._negrim_category('מסילות ומגירות',      'Runners and drawers', hardware, 20, null);
  perform public._negrim_category('ידיות',               'Handles',             hardware, 30, null);
  perform public._negrim_category('מחברים וברגים',       'Connectors and screws', hardware, 40, null);
  perform public._negrim_category('רגליות וגלגלים',      'Feet and castors',    hardware, 50, null);
  perform public._negrim_category('מנעולים ובריחים',     'Locks and bolts',     hardware, 60, null);
  perform public._negrim_category('מנגנונים ומתלים',     'Mechanisms and hangers', hardware, 70, null);
  perform public._negrim_category('פרזול למטבח',         'Kitchen hardware',    hardware, 80, null);

  perform public._negrim_category('לכות',                'Lacquers',            finish, 10, null);
  perform public._negrim_category('צבעים',               'Paints',              finish, 20, null);
  perform public._negrim_category('שמנים ווקס',          'Oils and wax',        finish, 30, null);
  perform public._negrim_category('בייצים',              'Stains',              finish, 40, null);
  perform public._negrim_category('מדללים וממסים',       'Thinners and solvents', finish, 50, null);
  perform public._negrim_category('שיוף ונייר לטש',      'Sanding',             finish, 60, null);

  perform public._negrim_category('כלים ידניים',         'Hand tools',          tools, 10, null);
  perform public._negrim_category('כלים חשמליים',        'Power tools',         tools, 20, null);
  perform public._negrim_category('להבים ומסורים',       'Blades and saws',     tools, 30, null);
  perform public._negrim_category('מקדחים וכרסומים',     'Drill and router bits', tools, 40, null);
  perform public._negrim_category('מדידה וסימון',        'Measuring and marking', tools, 50, null);
  perform public._negrim_category('ציוד מגן ובטיחות',    'Safety equipment',    tools, 60, null);

  perform public._negrim_category('מכונות קנטים',        'Edgebanders',         machines, 10, null);
  perform public._negrim_category('מסורי פאנל ושולחן',   'Panel and table saws', machines, 20, null);
  perform public._negrim_category('מכונות CNC',          'CNC machines',        machines, 30, null);
  perform public._negrim_category('מקדחות ומכונות דיבלים', 'Drilling and dowel machines', machines, 40, null);
  perform public._negrim_category('מכבשים',              'Presses',             machines, 50, null);
  perform public._negrim_category('מכונות שיוף',         'Sanding machines',    machines, 60, null);
  perform public._negrim_category('יניקה ושואבי אבק',    'Dust extraction',     machines, 70, null);
  perform public._negrim_category('מדחסי אוויר',         'Air compressors',     machines, 80, null);
  perform public._negrim_category('חלקי חילוף',          'Spare parts',         machines, 90, null);

  perform public._negrim_category('חומרי ניקוי ותחזוקה', 'Cleaning and care',   care, 10, null);
  perform public._negrim_category('שמנים וגריז',         'Oils and grease',     care, 20, null);
  perform public._negrim_category('ציוד אחזקה',          'Maintenance supplies', care, 30, null);

  perform public._negrim_category('מוצרים משלימים',      'Complementary products', other, 10, null);
  perform public._negrim_category('ארונות ומוצרים מוגמרים', 'Cabinets and finished goods', other, 20, null);
  perform public._negrim_category('אריזה ומשלוח',        'Packing and shipping', other, 30, null);
  perform public._negrim_category('שונות',               'Miscellaneous',       other, 40, null);
end $$;

drop function public._negrim_category(text, text, uuid, integer, text);
