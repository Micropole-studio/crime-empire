-- Crime Empire — Région Sud / slots alignés sur la carte validée
-- À exécuter après 20261002_multiplayer_world_1.sql et 20261002_world_relocation_1.sql
--
-- Cette migration remplace les anciens emplacements génériques de Région 1
-- par les parcelles visibles sur l'illustration Région Sud. Les villes déjà
-- présentes sont automatiquement replacées sur ces parcelles.

begin;

do $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.world_player_positions
  where region_key = 'region_1';

  if v_count > 15 then
    raise exception 'REGION_SOUTH_CAPACITY_EXCEEDED: % villes pour 15 emplacements', v_count;
  end if;
end;
$$;

-- Mettre temporairement les positions existantes hors de region_1 pour
-- éviter la contrainte unique (region_key, slot_index) pendant le remapping.
update public.world_player_positions
set region_key = 'region_1_relocating',
    slot_index = slot_index + 10000,
    updated_at = now()
where region_key = 'region_1';

delete from public.world_spawn_slots
where region_key = 'region_1';

-- Coordonnées en % de l'image validée Région Sud (1536 × 1024).
-- Les index correspondent autant que possible aux numéros visibles sur la carte.
insert into public.world_spawn_slots (region_key, slot_index, x, y)
values
  ('region_1', 2, 59.300, 16.200),
  ('region_1', 3, 75.300, 22.500),
  ('region_1', 4, 41.800, 9.800),
  ('region_1', 5, 40.000, 22.000),
  ('region_1', 6, 25.300, 28.000),
  ('region_1', 8, 15.200, 37.500),
  ('region_1', 9, 34.400, 40.400),
  ('region_1', 10, 65.800, 36.500),
  ('region_1', 11, 76.000, 43.500),
  ('region_1', 12, 24.300, 48.700),
  ('region_1', 14, 59.200, 47.600),
  ('region_1', 15, 88.600, 57.400),
  ('region_1', 17, 47.600, 57.200),
  ('region_1', 19, 41.400, 67.800),
  ('region_1', 20, 65.300, 74.400)
on conflict (region_key, slot_index) do update
set x = excluded.x,
    y = excluded.y;

-- Admin en priorité au slot 17, deuxième joueur au 11, puis distribution
-- sur les autres parcelles. Le classement ne change aucune donnée joueur.
with preferred_slots(rank_no, slot_index) as (
  values
    (1, 17),
    (2, 11),
    (3, 14),
    (4, 9),
    (5, 10),
    (6, 12),
    (7, 15),
    (8, 20),
    (9, 19),
    (10, 8),
    (11, 6),
    (12, 5),
    (13, 4),
    (14, 2),
    (15, 3)
), ranked_players as (
  select
    wp.player_id,
    row_number() over (
      order by coalesce(p.is_admin, false) desc, wp.spawned_at asc, wp.player_id
    )::integer as rank_no
  from public.world_player_positions wp
  left join public.players p on p.id::text = wp.player_id
  where wp.region_key = 'region_1_relocating'
), target as (
  select
    rp.player_id,
    s.slot_index,
    s.x,
    s.y
  from ranked_players rp
  join preferred_slots ps on ps.rank_no = rp.rank_no
  join public.world_spawn_slots s
    on s.region_key = 'region_1'
   and s.slot_index = ps.slot_index
)
update public.world_player_positions wp
set region_key = 'region_1',
    slot_index = target.slot_index,
    x = target.x,
    y = target.y,
    updated_at = now()
from target
where wp.player_id = target.player_id;

commit;
