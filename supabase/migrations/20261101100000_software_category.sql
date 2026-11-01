-- A main category for software and computing: design/CAD and CNC software,
-- shop-management systems, and the computers and peripherals that run them.
--
-- Carpentries buy cutting-list, nesting and kitchen-design software and the
-- hardware for it, and a supplier of those had nowhere to file them except
-- "מוצרים ואחר". It sits after care and maintenance, before "other".
-- Idempotent: it finds rows by name before inserting.

do $$
declare
  software uuid;
begin
  select id into software from public.categories
   where name_he = 'תוכנה ומחשוב' and parent_category_id is null
   limit 1;

  if software is null then
    insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
    values ('תוכנה ומחשוב', 'Software and computing', null, true, 95, 'software')
    returning id into software;
  else
    update public.categories set icon = 'software', is_active = true where id = software;
  end if;

  insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
  select v.name_he, v.name_en, software, true, v.sort_order, null
    from (values
      ('תוכנות תכנון ושרטוט',     'Design and CAD software',        10),
      ('תוכנות ייצור ו-CNC',       'CAM, nesting and CNC software',  20),
      ('תוכנות ניהול לנגרייה',     'Shop management software',      30),
      ('מחשבים וציוד היקפי',       'Computers and peripherals',      40),
      ('הדרכה ותמיכה',             'Training and support',           50)
    ) as v(name_he, name_en, sort_order)
   where not exists (
     select 1 from public.categories c
      where c.name_he = v.name_he and c.parent_category_id = software
   );
end $$;

comment on column public.categories.icon is
  'Key for the icon drawn on a main category tile (boards, wood, edge, cladding, glue, hardware, finish, tools, machines, care, software, other). Null on sub-categories.';
