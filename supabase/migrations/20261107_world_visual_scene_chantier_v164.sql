-- V16.4 : autorisation du nouveau POI sans modifier les positions des joueurs, les combats, ni les politiques RLS.
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor, après le SQL de publication V16.1.
begin;

create or replace function public.ce_publish_world_visual_scene(
  p_scene jsonb,
  p_expected_revision bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_revision bigint := 0;
  v_node jsonb;
  v_road jsonb;
  v_point jsonb;
  v_ids text[] := '{}';
  v_id text;
  v_kind text;
begin
  if v_actor is null or not exists (
    select 1 from public.players p
    where p.auth_user_id = v_actor and p.is_admin is true
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_scene is null or jsonb_typeof(p_scene) <> 'object'
     or p_scene->>'version' <> '16'
     or jsonb_typeof(p_scene->'nodes') <> 'array'
     or jsonb_typeof(p_scene->'roads') <> 'array'
     or pg_column_size(p_scene) > 220000
     or jsonb_array_length(p_scene->'nodes') > 125
     or jsonb_array_length(p_scene->'roads') > 80
  then
    raise exception 'SCENE_INVALID';
  end if;

  -- Contrôle côté serveur : types autorisés, IDs uniques, dimensions numériques et chemins assets figés.
  for v_node in select value from jsonb_array_elements(p_scene->'nodes') loop
    v_id := v_node->>'id';
    v_kind := v_node->>'kind';
    if jsonb_typeof(v_node) <> 'object' or v_id is null
       or v_id !~ '^[A-Za-z0-9_-]{1,60}$'
       or v_id = any(v_ids)
       or v_kind not in ('city','port','prison','blackmarket','weapons','construction')
       or (v_kind = 'construction' and v_node->>'src' <> 'chantier-clandestin.webp')
       or (v_node->>'src') not in (
         'villa-ouest.webp','villa-est.webp','villa-centrale.webp',
         'villa-sud.webp','villa-rivage.webp',
         'prison-regionale.webp','port-sombre.webp',
         'marche-noir.webp','depot-armes.webp','chantier-clandestin.webp'
       )
    then
      raise exception 'NODE_INVALID';
    end if;
    v_ids := array_append(v_ids, v_id);
    if jsonb_typeof(v_node->'x') <> 'number'
       or jsonb_typeof(v_node->'y') <> 'number'
       or jsonb_typeof(v_node->'w') <> 'number'
       or jsonb_typeof(v_node->'h') <> 'number'
       or jsonb_typeof(v_node->'scale') <> 'number'
       or jsonb_typeof(v_node->'rotation') <> 'number'
       or (v_node->>'x')::numeric not between -300 and 1800
       or (v_node->>'y')::numeric not between -300 and 1050
       or (v_node->>'w')::numeric not between 1 and 600
       or (v_node->>'h')::numeric not between 1 and 400
       or (v_node->>'scale')::numeric not between 0.25 and 1.5
       or (v_node->>'rotation')::numeric not between -25 and 25
    then
      raise exception 'NODE_GEOMETRY_INVALID';
    end if;
  end loop;

  for v_road in select value from jsonb_array_elements(p_scene->'roads') loop
    if jsonb_typeof(v_road) <> 'array'
       or jsonb_array_length(v_road) not between 2 and 50
    then
      raise exception 'ROAD_INVALID';
    end if;
    for v_point in select value from jsonb_array_elements(v_road) loop
      if jsonb_typeof(v_point) <> 'object'
         or jsonb_typeof(v_point->'x') <> 'number'
         or jsonb_typeof(v_point->'y') <> 'number'
         or (v_point->>'x')::numeric not between -200 and 1900
         or (v_point->>'y')::numeric not between -100 and 1100
      then
        raise exception 'ROAD_POINT_INVALID';
      end if;
    end loop;
  end loop;

  select revision into v_revision
  from public.world_visual_scenes
  where region_key = 'region_1'
  for update;

  v_revision := coalesce(v_revision, 0);
  if p_expected_revision is not null and p_expected_revision <> v_revision then
    raise exception 'REVISION_CONFLICT';
  end if;

  insert into public.world_visual_scenes(region_key,scene,revision,published_at,published_by)
  values ('region_1',p_scene,v_revision+1,now(),v_actor)
  on conflict (region_key) do update
  set scene=excluded.scene,
      revision=excluded.revision,
      published_at=excluded.published_at,
      published_by=excluded.published_by;
  return v_revision + 1;
end;
$$;

commit;
