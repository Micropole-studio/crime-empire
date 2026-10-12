-- Crime Empire — Modèle de ville GLOBAL + rendu public contrôlé par l'admin
-- A exécuter dans Supabase SQL Editor sur le projet ACTUEL avant le patch React.
-- Ne modifie AUCUNE ligne dans players, cities ou city_map_layouts.
-- Ne remplace PAS les coordonnées de la ville administrateur.
-- Compatible avec les RPC text conservées après la correction PGRST203.

begin;

-- Le modèle de référence est déjà publié par l'admin dans
-- public.city_map_layout_template (template_key = 'default').
-- Les comptes ordinaires, même créés auparavant, lisent désormais ce
-- modèle LIVE à chaque ouverture ; leurs anciennes copies ne sont pas effacées.
create or replace function public.get_city_building_placements(p_city_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_placements jsonb;
  v_template jsonb;
begin
  if not public.player_owns_city(p_city_id) then
    raise exception 'CITY_NOT_OWNED';
  end if;

  select t.placements into v_template
  from public.city_map_layout_template t
  where t.template_key = 'default';

  -- Le compte admin conserve sa disposition de travail personnelle.
  if public.current_player_is_admin() then
    select l.placements into v_placements
    from public.city_map_layouts l
    where l.city_id = p_city_id;

    if v_placements is not null
       and jsonb_typeof(v_placements) = 'object'
       and v_placements ? 'villa' then
      return v_placements;
    end if;
  end if;

  -- La disposition officielle prévaut pour TOUS les comptes joueurs.
  if v_template is not null
     and jsonb_typeof(v_template) = 'object'
     and v_template ? 'villa' then
    return v_template;
  end if;

  -- Secours si le modèle n'a pas encore été publié.
  select l.placements into v_placements
  from public.city_map_layouts l
  where l.city_id = p_city_id;

  return coalesce(v_placements, '{}'::jsonb);
end;
$$;

revoke all on function public.get_city_building_placements(text) from public;
grant execute on function public.get_city_building_placements(text) to authenticated;

-- Choix artistique PUBLIÉ, identique pour tous les navigateurs/comptes.
create table if not exists public.city_visual_settings (
  setting_key text primary key,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.city_visual_settings (setting_key, settings)
values ('default', '{"artStyle":"luxury","renderer":"pixi"}'::jsonb)
on conflict (setting_key) do nothing;

alter table public.city_visual_settings enable row level security;
revoke all on table public.city_visual_settings from anon, authenticated;

create or replace function public.get_city_visual_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings jsonb;
begin
  select settings into v_settings
  from public.city_visual_settings
  where setting_key = 'default';

  return coalesce(v_settings, '{"artStyle":"luxury","renderer":"pixi"}'::jsonb);
end;
$$;

create or replace function public.save_city_visual_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_art text;
  v_renderer text;
  v_settings jsonb;
begin
  if not public.current_player_is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'INVALID_VISUAL_SETTINGS';
  end if;

  v_art := p_settings->>'artStyle';
  v_renderer := p_settings->>'renderer';
  if v_art is null or v_art not in ('luxury', 'classic')
     or v_renderer is null or v_renderer not in ('pixi', 'classic') then
    raise exception 'INVALID_VISUAL_SETTINGS';
  end if;

  v_settings := jsonb_build_object('artStyle', v_art, 'renderer', v_renderer);

  insert into public.city_visual_settings (setting_key, settings, updated_at)
  values ('default', v_settings, now())
  on conflict (setting_key) do update
  set settings = excluded.settings, updated_at = now();

  return v_settings;
end;
$$;

revoke all on function public.get_city_visual_settings() from public;
revoke all on function public.save_city_visual_settings(jsonb) from public;
grant execute on function public.get_city_visual_settings() to authenticated;
grant execute on function public.save_city_visual_settings(jsonb) to authenticated;

commit;
notify pgrst, 'reload schema';
