-- Crime Empire — City Layout Template + Notifications MVP
-- À exécuter UNE FOIS dans Supabase > SQL Editor après la migration Player Auth MVP.
--
-- Cette migration :
-- 1) enregistre les positions de ville dans Supabase ;
-- 2) permet au compte admin de définir le modèle officiel des nouvelles villes ;
-- 3) copie automatiquement ce modèle vers chaque nouveau joueur ;
-- 4) crée un centre de notifications persistant par joueur.

begin;

create or replace function public.current_player_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((
    select p.is_admin
    from public.players p
    where p.auth_user_id = auth.uid()
    limit 1
  ), false);
$$;

revoke all on function public.current_player_is_admin() from public;
grant execute on function public.current_player_is_admin() to authenticated;

-- ----------------------------
-- Modèle + sauvegardes de carte
-- ----------------------------

create table if not exists public.city_map_layout_template (
  template_key text primary key,
  placements jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.city_map_layout_template (
  template_key,
  placements
)
values (
  'default',
  jsonb_build_object(
    'villa', jsonb_build_object('type','villa','x',25,'y',60,'width',18,'rotation',0,'zIndex',4),
    'workshop', jsonb_build_object('type','workshop','x',65,'y',45,'width',15,'rotation',0,'zIndex',3),
    'hideout', jsonb_build_object('type','hideout','x',22,'y',30,'width',13,'rotation',0,'zIndex',2),
    'wall', jsonb_build_object('type','wall','x',75,'y',70,'width',16,'rotation',0,'zIndex',5),
    'laboratory', jsonb_build_object('type','laboratory','x',50,'y',50,'width',12,'rotation',0,'zIndex',10),
    'syndicate', jsonb_build_object('type','syndicate','x',45,'y',25,'width',13,'rotation',0,'zIndex',6),
    'factory', jsonb_build_object('type','factory','x',82,'y',28,'width',15,'rotation',0,'zIndex',7),
    'helicopter', jsonb_build_object('type','helicopter','x',22.2,'y',27.2,'width',15.5,'rotation',-4,'zIndex',90)
  )
)
on conflict (template_key) do nothing;

-- city_id reste volontairement en text : cela rend la migration compatible
-- avec l'identifiant historique de public.cities, quel que soit son type SQL.
create table if not exists public.city_map_layouts (
  city_id text primary key,
  placements jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.city_map_layout_template enable row level security;
alter table public.city_map_layouts enable row level security;

drop policy if exists city_map_layout_template_read on public.city_map_layout_template;
create policy city_map_layout_template_read
on public.city_map_layout_template
for select
to authenticated
using (true);

drop policy if exists city_map_layout_template_admin_write on public.city_map_layout_template;
create policy city_map_layout_template_admin_write
on public.city_map_layout_template
for all
to authenticated
using (public.current_player_is_admin())
with check (public.current_player_is_admin());

drop policy if exists city_map_layouts_own_read on public.city_map_layouts;
create policy city_map_layouts_own_read
on public.city_map_layouts
for select
to authenticated
using (public.player_owns_city(city_id));

drop policy if exists city_map_layouts_own_write on public.city_map_layouts;
create policy city_map_layouts_own_write
on public.city_map_layouts
for all
to authenticated
using (public.player_owns_city(city_id))
with check (public.player_owns_city(city_id));

create or replace function public.get_city_building_placements(p_city_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_placements jsonb;
  v_template jsonb;
begin
  if not public.player_owns_city(p_city_id) then
    raise exception 'CITY_NOT_OWNED';
  end if;

  select l.placements
  into v_placements
  from public.city_map_layouts l
  where l.city_id = p_city_id;

  if v_placements is not null then
    return v_placements;
  end if;

  -- Pour le compte DEV/admin, on ne remplace jamais silencieusement les
  -- anciennes positions locales : son premier passage dans l'éditeur publiera
  -- ce qu'il voit réellement et deviendra le nouveau modèle officiel.
  if public.current_player_is_admin() then
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

create or replace function public.save_city_building_placements(
  p_city_id text,
  p_placements jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing jsonb;
  v_merged jsonb;
begin
  if not public.player_owns_city(p_city_id) then
    raise exception 'CITY_NOT_OWNED';
  end if;

  if p_placements is null or jsonb_typeof(p_placements) <> 'object' then
    raise exception 'INVALID_PLACEMENTS';
  end if;

  select l.placements
  into v_existing
  from public.city_map_layouts l
  where l.city_id = p_city_id;

  v_merged := coalesce(v_existing, '{}'::jsonb) || p_placements;

  insert into public.city_map_layouts (city_id, placements, updated_at)
  values (p_city_id, v_merged, now())
  on conflict (city_id) do update
  set placements = excluded.placements,
      updated_at = now();

  -- Le compte admin pilote le modèle de départ des futures villes.
  if public.current_player_is_admin() then
    insert into public.city_map_layout_template (template_key, placements, updated_at)
    values ('default', v_merged, now())
    on conflict (template_key) do update
    set placements = excluded.placements,
        updated_at = now();
  end if;

  return v_merged;
end;
$$;

revoke all on function public.save_city_building_placements(text, jsonb) from public;
grant execute on function public.save_city_building_placements(text, jsonb) to authenticated;

-- Les futures villes reçoivent immédiatement le modèle courant.
create or replace function public.seed_new_city_map_layout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template jsonb;
begin
  select placements
  into v_template
  from public.city_map_layout_template
  where template_key = 'default';

  insert into public.city_map_layouts (city_id, placements, updated_at)
  values (new.id::text, coalesce(v_template, '{}'::jsonb), now())
  on conflict (city_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_seed_new_city_map_layout on public.cities;
create trigger trg_seed_new_city_map_layout
after insert on public.cities
for each row execute function public.seed_new_city_map_layout();

-- ----------------------------
-- Notifications persistantes
-- ----------------------------

create table if not exists public.game_notifications (
  id bigint generated by default as identity primary key,
  player_id text not null,
  category text not null default 'system',
  tone text not null default 'info',
  title text not null,
  message text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists game_notifications_player_created_idx
  on public.game_notifications(player_id, created_at desc);

alter table public.game_notifications enable row level security;

drop policy if exists game_notifications_own_select on public.game_notifications;
create policy game_notifications_own_select
on public.game_notifications
for select
to authenticated
using (public.player_owns_player(player_id));

drop policy if exists game_notifications_own_insert on public.game_notifications;
create policy game_notifications_own_insert
on public.game_notifications
for insert
to authenticated
with check (public.player_owns_player(player_id));

drop policy if exists game_notifications_own_update on public.game_notifications;
create policy game_notifications_own_update
on public.game_notifications
for update
to authenticated
using (public.player_owns_player(player_id))
with check (public.player_owns_player(player_id));

drop policy if exists game_notifications_own_delete on public.game_notifications;
create policy game_notifications_own_delete
on public.game_notifications
for delete
to authenticated
using (public.player_owns_player(player_id));

commit;
