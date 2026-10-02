-- Crime Empire — Gabarit visuel global des villes sur la World Map
-- À exécuter après les migrations Région Sud.
--
-- Permet à l'admin de régler une seule fois la position/taille du sprite de ville
-- à l'intérieur d'un slot, puis d'appliquer ce rendu à toutes les villes joueurs.

begin;

create table if not exists public.world_city_render_template (
  template_key text primary key,
  offset_x numeric(7,3) not null default 0,
  offset_y numeric(7,3) not null default 0,
  scale numeric(7,3) not null default 1,
  rotation numeric(7,3) not null default 0,
  label_offset_x numeric(7,3) not null default 0,
  label_offset_y numeric(7,3) not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.world_city_render_template (
  template_key,
  offset_x,
  offset_y,
  scale,
  rotation,
  label_offset_x,
  label_offset_y
)
values ('default', 0, 0, 1, 0, 0, 0)
on conflict (template_key) do nothing;

alter table public.world_city_render_template enable row level security;

-- Aucun accès direct nécessaire : lecture/écriture via RPC.
drop policy if exists world_city_render_template_no_direct_access
  on public.world_city_render_template;

create or replace function public.get_world_city_render_template()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'offset_x', coalesce(t.offset_x, 0),
    'offset_y', coalesce(t.offset_y, 0),
    'scale', coalesce(t.scale, 1),
    'rotation', coalesce(t.rotation, 0),
    'label_offset_x', coalesce(t.label_offset_x, 0),
    'label_offset_y', coalesce(t.label_offset_y, 0),
    'updated_at', t.updated_at
  )
  from public.world_city_render_template t
  where t.template_key = 'default'
  limit 1;
$$;

revoke all on function public.get_world_city_render_template() from public;
grant execute on function public.get_world_city_render_template() to authenticated;

create or replace function public.save_world_city_render_template(
  p_template jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_offset_x numeric;
  v_offset_y numeric;
  v_scale numeric;
  v_rotation numeric;
  v_label_offset_x numeric;
  v_label_offset_y numeric;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.current_player_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_template is null or jsonb_typeof(p_template) <> 'object' then
    raise exception 'INVALID_TEMPLATE';
  end if;

  begin
    v_offset_x := greatest(-80, least(80, coalesce((p_template->>'offset_x')::numeric, 0)));
    v_offset_y := greatest(-80, least(80, coalesce((p_template->>'offset_y')::numeric, 0)));
    v_scale := greatest(0.45, least(2.5, coalesce((p_template->>'scale')::numeric, 1)));
    v_rotation := greatest(-25, least(25, coalesce((p_template->>'rotation')::numeric, 0)));
    v_label_offset_x := greatest(-80, least(80, coalesce((p_template->>'label_offset_x')::numeric, 0)));
    v_label_offset_y := greatest(-80, least(80, coalesce((p_template->>'label_offset_y')::numeric, 0)));
  exception when others then
    raise exception 'INVALID_TEMPLATE_VALUES';
  end;

  insert into public.world_city_render_template (
    template_key,
    offset_x,
    offset_y,
    scale,
    rotation,
    label_offset_x,
    label_offset_y,
    updated_at
  )
  values (
    'default',
    v_offset_x,
    v_offset_y,
    v_scale,
    v_rotation,
    v_label_offset_x,
    v_label_offset_y,
    now()
  )
  on conflict (template_key) do update
  set offset_x = excluded.offset_x,
      offset_y = excluded.offset_y,
      scale = excluded.scale,
      rotation = excluded.rotation,
      label_offset_x = excluded.label_offset_x,
      label_offset_y = excluded.label_offset_y,
      updated_at = now();

  return jsonb_build_object(
    'offset_x', v_offset_x,
    'offset_y', v_offset_y,
    'scale', v_scale,
    'rotation', v_rotation,
    'label_offset_x', v_label_offset_x,
    'label_offset_y', v_label_offset_y
  );
end;
$$;

revoke all on function public.save_world_city_render_template(jsonb) from public;
grant execute on function public.save_world_city_render_template(jsonb) to authenticated;

commit;
