-- Crime Empire — Multiplayer World 1
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- après Player Auth MVP + City Layout / Notifications.
--
-- Cette migration :
-- 1) crée la Région 1 et ~120 emplacements joueurs ;
-- 2) attribue automatiquement une position persistante à chaque ville ;
-- 3) expose un RPC public-authentifié sans e-mail pour afficher les empires ;
-- 4) ajoute une protection de départ de 24 h ;
-- 5) prépare la carte pour le futur combat PvP serveur.

begin;

create table if not exists public.world_spawn_slots (
  region_key text not null,
  slot_index integer not null,
  x numeric(6,3) not null,
  y numeric(6,3) not null,
  created_at timestamptz not null default now(),
  primary key (region_key, slot_index)
);

create table if not exists public.world_player_positions (
  player_id text primary key,
  city_id text not null unique,
  region_key text not null default 'region_1',
  slot_index integer not null,
  x numeric(6,3) not null,
  y numeric(6,3) not null,
  protection_until timestamptz,
  spawned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_key, slot_index)
);

create index if not exists world_player_positions_region_idx
  on public.world_player_positions(region_key, slot_index);

-- 12 x 12 cases ; la grande zone centrale est réservée à Port Sombre + PvE.
-- Après exclusion du centre, Région 1 dispose d'environ 120 emplacements.
with candidates as (
  select
    row_number() over (order by r, c) as slot_index,
    round((6 + c * 8.0)::numeric, 3) as x,
    round((7 + r * (86.0 / 11.0))::numeric, 3) as y
  from generate_series(0, 11) as rr(r)
  cross join generate_series(0, 11) as cc(c)
), filtered as (
  select *
  from candidates
  where not (
    x between 31 and 69
    and y between 30 and 70
  )
)
insert into public.world_spawn_slots (
  region_key,
  slot_index,
  x,
  y
)
select
  'region_1',
  row_number() over (order by slot_index),
  x,
  y
from filtered
on conflict (region_key, slot_index) do update
set x = excluded.x,
    y = excluded.y;

alter table public.world_spawn_slots enable row level security;
alter table public.world_player_positions enable row level security;

-- Aucun write direct client. La lecture de la carte passe par le RPC filtré.
drop policy if exists world_spawn_slots_no_direct_access on public.world_spawn_slots;
drop policy if exists world_player_positions_no_direct_access on public.world_player_positions;

create or replace function public.claim_world_position_internal(
  p_player_id text,
  p_city_id text,
  p_region_key text default 'region_1'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.world_player_positions%rowtype;
  v_slot public.world_spawn_slots%rowtype;
begin
  select *
  into v_existing
  from public.world_player_positions wp
  where wp.player_id = p_player_id
     or wp.city_id = p_city_id
  limit 1;

  if found then
    return jsonb_build_object(
      'player_id', v_existing.player_id,
      'city_id', v_existing.city_id,
      'region_key', v_existing.region_key,
      'slot_index', v_existing.slot_index,
      'x', v_existing.x,
      'y', v_existing.y,
      'protection_until', v_existing.protection_until,
      'spawned_at', v_existing.spawned_at
    );
  end if;

  select s.*
  into v_slot
  from public.world_spawn_slots s
  where s.region_key = p_region_key
    and not exists (
      select 1
      from public.world_player_positions wp
      where wp.region_key = s.region_key
        and wp.slot_index = s.slot_index
    )
  order by random()
  limit 1
  for update skip locked;

  if not found then
    raise exception 'WORLD_REGION_FULL';
  end if;

  insert into public.world_player_positions (
    player_id,
    city_id,
    region_key,
    slot_index,
    x,
    y,
    protection_until,
    spawned_at,
    updated_at
  ) values (
    p_player_id,
    p_city_id,
    v_slot.region_key,
    v_slot.slot_index,
    v_slot.x,
    v_slot.y,
    now() + interval '24 hours',
    now(),
    now()
  )
  returning * into v_existing;

  return jsonb_build_object(
    'player_id', v_existing.player_id,
    'city_id', v_existing.city_id,
    'region_key', v_existing.region_key,
    'slot_index', v_existing.slot_index,
    'x', v_existing.x,
    'y', v_existing.y,
    'protection_until', v_existing.protection_until,
    'spawned_at', v_existing.spawned_at
  );
end;
$$;

revoke all on function public.claim_world_position_internal(text, text, text) from public;

create or replace function public.ensure_current_world_position()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_player_id text;
  v_city_id text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.id::text, c.id::text
  into v_player_id, v_city_id
  from public.players p
  join public.cities c on c.player_id = p.id
  where p.auth_user_id = auth.uid()
  order by c.id
  limit 1;

  if v_player_id is null or v_city_id is null then
    raise exception 'PLAYER_CITY_MISSING';
  end if;

  return public.claim_world_position_internal(
    v_player_id,
    v_city_id,
    'region_1'
  );
end;
$$;

revoke all on function public.ensure_current_world_position() from public;
grant execute on function public.ensure_current_world_position() to authenticated;

create or replace function public.seed_world_position_for_new_city()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.claim_world_position_internal(
    new.player_id::text,
    new.id::text,
    'region_1'
  );

  return new;
end;
$$;

drop trigger if exists trg_seed_world_position on public.cities;
create trigger trg_seed_world_position
after insert on public.cities
for each row execute function public.seed_world_position_for_new_city();

-- Positionner aussi les comptes déjà créés avant cette migration.
do $$
declare
  v_row record;
begin
  for v_row in
    select p.id::text as player_id, c.id::text as city_id
    from public.players p
    join public.cities c on c.player_id = p.id
    where p.auth_user_id is not null
      and not exists (
        select 1
        from public.world_player_positions wp
        where wp.player_id = p.id::text
           or wp.city_id = c.id::text
      )
    order by p.id, c.id
  loop
    perform public.claim_world_position_internal(
      v_row.player_id,
      v_row.city_id,
      'region_1'
    );
  end loop;
end;
$$;

create or replace function public.get_world_player_cities()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  with villa_levels as (
    select
      b.city_id::text as city_id,
      max(coalesce(b.level, 0)) filter (where b.type = 'villa') as villa_level
    from public.buildings b
    group by b.city_id::text
  ), troop_power as (
    select
      ct.city_id::text as city_id,
      sum(
        greatest(coalesce(ct.quantity, 0), 0) *
        case ct.troop_key
          when 'henchman_1' then 18
          when 'henchman_2' then 32
          when 'henchman_3' then 54
          when 'lieutenant_1' then 83
          else 10
        end
      ) as power
    from public.city_troops ct
    group by ct.city_id::text
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'player_id', p.id::text,
        'city_id', c.id::text,
        'username', coalesce(nullif(btrim(p.username), ''), 'Empire ' || right(p.id::text, 4)),
        'region_key', wp.region_key,
        'x', wp.x,
        'y', wp.y,
        'villa_level', greatest(coalesce(vl.villa_level, 1), 1),
        'commander_level', greatest(coalesce(p.commander_level, 1), 1),
        'estimated_power', greatest(
          100,
          coalesce(tp.power, 0) +
          greatest(coalesce(vl.villa_level, 1), 1) * 80 +
          greatest(coalesce(p.commander_level, 1), 1) * 35
        ),
        'protection_until', wp.protection_until,
        'spawned_at', wp.spawned_at,
        'is_current', p.auth_user_id = auth.uid()
      )
      order by wp.slot_index
    ),
    '[]'::jsonb
  )
  into v_result
  from public.world_player_positions wp
  join public.players p on p.id::text = wp.player_id
  join public.cities c on c.id::text = wp.city_id
  left join villa_levels vl on vl.city_id = c.id::text
  left join troop_power tp on tp.city_id = c.id::text
  where wp.region_key = 'region_1';

  return v_result;
end;
$$;

revoke all on function public.get_world_player_cities() from public;
grant execute on function public.get_world_player_cities() to authenticated;

commit;
