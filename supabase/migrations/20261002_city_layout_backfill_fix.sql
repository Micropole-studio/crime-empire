-- Crime Empire — City Layout Backfill / Self-heal
-- À exécuter APRÈS 20261002_city_layout_notifications.sql
--
-- Objectif :
-- - remplir les nouvelles villes qui n'ont pas encore reçu le template officiel ;
-- - corriger les lignes vides ({}) qui feraient retomber la map sur les placements par défaut ;
-- - rendre get_city_building_placements auto-réparateur pour les comptes joueurs normaux.

begin;

create or replace function public.get_city_building_placements(p_city_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_placements jsonb;
  v_template jsonb;
  v_is_admin boolean;
begin
  if not public.player_owns_city(p_city_id) then
    raise exception 'CITY_NOT_OWNED';
  end if;

  v_is_admin := public.current_player_is_admin();

  select l.placements
  into v_placements
  from public.city_map_layouts l
  where l.city_id = p_city_id;

  if v_placements is not null
     and jsonb_typeof(v_placements) = 'object'
     and jsonb_object_length(v_placements) > 0 then
    return v_placements;
  end if;

  if v_is_admin then
    return '{}'::jsonb;
  end if;

  select t.placements
  into v_template
  from public.city_map_layout_template t
  where t.template_key = 'default';

  v_template := coalesce(v_template, '{}'::jsonb);

  insert into public.city_map_layouts (city_id, placements, updated_at)
  values (p_city_id, v_template, now())
  on conflict (city_id) do update
  set placements = excluded.placements,
      updated_at = now()
  returning placements into v_placements;

  return coalesce(v_placements, v_template, '{}'::jsonb);
end;
$$;

revoke all on function public.get_city_building_placements(text) from public;
grant execute on function public.get_city_building_placements(text) to authenticated;

with template as (
  select coalesce(placements, '{}'::jsonb) as placements
  from public.city_map_layout_template
  where template_key = 'default'
)
insert into public.city_map_layouts (city_id, placements, updated_at)
select c.id::text, template.placements, now()
from public.cities c
cross join template
left join public.city_map_layouts l on l.city_id = c.id::text
where l.city_id is null
   or l.placements is null
   or (jsonb_typeof(l.placements) = 'object' and jsonb_object_length(l.placements) = 0)
on conflict (city_id) do update
set placements = excluded.placements,
    updated_at = now()
where public.city_map_layouts.placements is null
   or (jsonb_typeof(public.city_map_layouts.placements) = 'object' and jsonb_object_length(public.city_map_layouts.placements) = 0);

commit;
