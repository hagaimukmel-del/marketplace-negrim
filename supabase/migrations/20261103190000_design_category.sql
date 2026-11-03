-- A main category for architecture and interior design: architects and
-- interior designers who work with carpentries, listed as suppliers.
--
-- Carpentries get their kitchens, wardrobes and fit-outs from architects and
-- designers, and those professionals had no place on the site. They join as
-- suppliers and file their services here. It sits after software and
-- computing, before "other". Idempotent: it finds rows by name before inserting.

do $$
declare
  design uuid;
begin
  select id into design from public.categories
   where name_he = 'אדריכלות ועיצוב פנים' and parent_category_id is null
   limit 1;

  if design is null then
    insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
    values ('אדריכלות ועיצוב פנים', 'Architecture and interior design', null, true, 97, 'design')
    returning id into design;
  else
    update public.categories set icon = 'design', is_active = true where id = design;
  end if;

  insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
  select v.name_he, v.name_en, design, true, v.sort_order, null
    from (values
      ('אדריכלים ואדריכליות',      'Architects',                    10),
      ('מעצבות ומעצבי פנים',        'Interior designers',            20),
      ('תכנון מטבחים וארונות',      'Kitchen and wardrobe design',   30),
      ('הדמיות ותלת-ממד',           'Renderings and 3D',             40)
    ) as v(name_he, name_en, sort_order)
   where not exists (
     select 1 from public.categories c
      where c.name_he = v.name_he and c.parent_category_id = design
   );
end $$;

comment on column public.categories.icon is
  'Key for the icon drawn on a main category tile (boards, wood, edge, cladding, glue, hardware, finish, tools, machines, care, software, design, other). Null on sub-categories.';
