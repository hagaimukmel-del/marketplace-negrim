-- A main category for wall and ceiling cladding: wood and acoustic slat panels,
-- decorative panels, PVC/SPC and outdoor cladding, and what they are fixed with.
--
-- Cladding was being filed under boards or "other", where a carpenter looking for
-- slat panels would not think to look. It sits after edging and veneer, next to
-- the materials it is made from. Idempotent: it finds rows by name before inserting.

do $$
declare
  cladding uuid;
begin
  select id into cladding from public.categories
   where name_he = 'חיפויים' and parent_category_id is null
   limit 1;

  if cladding is null then
    insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
    values ('חיפויים', 'Cladding', null, true, 35, 'cladding')
    returning id into cladding;
  else
    update public.categories set icon = 'cladding', is_active = true where id = cladding;
  end if;

  insert into public.categories (name_he, name_en, parent_category_id, is_active, sort_order, icon)
  select v.name_he, v.name_en, cladding, true, v.sort_order, null
    from (values
      ('חיפוי קירות מעץ',           'Wood wall cladding',          10),
      ('פאנלים אקוסטיים (סלאטים)',  'Acoustic slat panels',        20),
      ('פאנלים דקורטיביים ותלת-ממד', 'Decorative and 3D panels',    30),
      ('חיפוי PVC ו-SPC',           'PVC and SPC cladding',        40),
      ('חיפוי תקרות',               'Ceiling cladding',            50),
      ('חיפוי חוץ ו-WPC',           'Outdoor and WPC cladding',    60),
      ('פרופילים ואביזרי התקנה',    'Trims and fixing accessories', 70)
    ) as v(name_he, name_en, sort_order)
   where not exists (
     select 1 from public.categories c
      where c.name_he = v.name_he and c.parent_category_id = cladding
   );
end $$;

comment on column public.categories.icon is
  'Key for the icon drawn on a main category tile (boards, wood, edge, cladding, glue, hardware, finish, tools, machines, care, other). Null on sub-categories.';
