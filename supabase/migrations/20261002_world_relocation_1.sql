-- Crime Empire — World Relocation 1
-- À exécuter après Multiplayer World 1.
-- Permet d'afficher les emplacements libres seulement en mode déplacement
-- et de déplacer sa ville sur un slot libre, comme dans les jeux de stratégie mobile.

begin;

create or replace function public.get_available_world_slots()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_player_id text;
  v_region_key text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.id::text, coalesce(wp.region_key, 'region_1')
  into v_player_id, v_region_key
  from public.players p
  left join public.world_player_positions wp
    on wp.player_id = p.id::text
  where p.auth_user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    raise exception 'PLAYER_MISSING';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'region_key', s.region_key,
        'slot_index', s.slot_index,
        'x', s.x,
        'y', s.y
      )
      order by s.slot_index
    ),
    '[]'::jsonb
  )
  into v_result
  from public.world_spawn_slots s
  where s.region_key = v_region_key
    and not exists (
      select 1
      from public.world_player_positions wp
      where wp.region_key = s.region_key
        and wp.slot_index = s.slot_index
    );

  return v_result;
end;
$$;

revoke all on function public.get_available_world_slots() from public;
grant execute on function public.get_available_world_slots() to authenticated;

create or replace function public.relocate_current_world_position(
  p_slot_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_player_id text;
  v_city_id text;
  v_region_key text;
  v_slot public.world_spawn_slots%rowtype;
  v_updated public.world_player_positions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.id::text, c.id::text, coalesce(wp.region_key, 'region_1')
  into v_player_id, v_city_id, v_region_key
  from public.players p
  join public.cities c on c.player_id = p.id
  left join public.world_player_positions wp
    on wp.player_id = p.id::text
  where p.auth_user_id = auth.uid()
  order by c.id
  limit 1;

  if v_player_id is null or v_city_id is null then
    raise exception 'PLAYER_CITY_MISSING';
  end if;

  select *
  into v_slot
  from public.world_spawn_slots s
  where s.region_key = v_region_key
    and s.slot_index = p_slot_index
  for update;

  if not found then
    raise exception 'WORLD_SLOT_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.world_player_positions wp
    where wp.region_key = v_slot.region_key
      and wp.slot_index = v_slot.slot_index
      and wp.player_id <> v_player_id
  ) then
    raise exception 'WORLD_SLOT_OCCUPIED';
  end if;

  update public.world_player_positions
  set slot_index = v_slot.slot_index,
      x = v_slot.x,
      y = v_slot.y,
      updated_at = now()
  where player_id = v_player_id
  returning * into v_updated;

  if not found then
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
      v_player_id,
      v_city_id,
      v_slot.region_key,
      v_slot.slot_index,
      v_slot.x,
      v_slot.y,
      now() + interval '24 hours',
      now(),
      now()
    )
    returning * into v_updated;
  end if;

  return jsonb_build_object(
    'player_id', v_updated.player_id,
    'city_id', v_updated.city_id,
    'region_key', v_updated.region_key,
    'slot_index', v_updated.slot_index,
    'x', v_updated.x,
    'y', v_updated.y,
    'protection_until', v_updated.protection_until,
    'spawned_at', v_updated.spawned_at
  );
end;
$$;

revoke all on function public.relocate_current_world_position(integer) from public;
grant execute on function public.relocate_current_world_position(integer) to authenticated;

commit;
