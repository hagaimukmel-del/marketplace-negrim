-- Five top-level groups, so a supplier has somewhere to put their goods.
--
-- The catalogue's categories grew out of one supplier's spreadsheet: adhesives
-- for edge banders, RIEPE additives, cleaning fluids. They describe what Itamir
-- sells, which is the right answer for a catalogue of one and the wrong answer
-- for recruiting the second. A supplier of boards or hardware arriving today
-- finds nowhere to file anything.
--
-- These have to exist BEFORE the supplier does, not after. That is the whole
-- reason this lands ahead of anyone needing it.
--
-- Only the five groups. The full sub-category tree - MDF, סנדוויץ', צירים,
-- מסילות and the rest - is recorded in TODO.md and gets created as real
-- products arrive to fill it. Twenty-five empty sub-categories over thirty
-- adhesives would make the catalogue harder to use, not easier.

insert into public.categories (name_he, name_en, is_active)
select v.name_he, v.name_en, true
  from (values
    ('חומרי גלם',     'Raw materials'),
    ('פרזול',          'Hardware'),
    ('מוצרים',         'Finished products'),
    ('מכונות וציוד',   'Machines and equipment'),
    ('אחר',            'Other')
  ) as v(name_he, name_en)
 where not exists (
   select 1 from public.categories c
    where c.name_he = v.name_he and c.parent_category_id is null
 );

-- File what already exists. Adhesives and additives go in with raw materials
-- because they are consumed making the product; the cleaning fluids are for
-- maintaining the glue machines, so they sit with equipment. This is a judgement
-- call on someone else's taxonomy and it is meant to be moved if it reads wrong.
do $$
declare
  raw_id  uuid;
  kit_id  uuid;
  misc_id uuid;
begin
  select id into raw_id  from public.categories where name_he = 'חומרי גלם'   and parent_category_id is null limit 1;
  select id into kit_id  from public.categories where name_he = 'מכונות וציוד' and parent_category_id is null limit 1;
  select id into misc_id from public.categories where name_he = 'אחר'          and parent_category_id is null limit 1;

  update public.categories set parent_category_id = raw_id
   where parent_category_id is null
     and name_he in ('דבקים למכונות קנטים', 'דבקים על בסיס מים', 'תוספים של חברת RIEPE למתזים');

  update public.categories set parent_category_id = kit_id
   where parent_category_id is null
     and name_he in ('חומרי ניקוי ותחזוקה');

  update public.categories set parent_category_id = misc_id
   where parent_category_id is null
     and name_he in ('מוצרים משלימים');
end $$;
