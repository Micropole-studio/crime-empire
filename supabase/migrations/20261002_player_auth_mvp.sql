-- Crime Empire — Player Auth MVP
-- À exécuter UNE FOIS dans Supabase > SQL Editor avant de déployer cette phase.
--
-- Objectifs :
-- 1) relier public.players à Supabase Auth ;
-- 2) conserver la ville DEV historique si l'e-mail correspond ;
-- 3) créer automatiquement une nouvelle partie pour un nouvel utilisateur ;
-- 4) isoler les données de chaque joueur avec RLS sur les tables de gameplay principales.

begin;

alter table public.players
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.players
  add column if not exists is_admin boolean not null default false;

alter table public.players
  add column if not exists last_seen_at timestamptz;

create unique index if not exists players_auth_user_id_unique
  on public.players(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists players_username_lower_unique
  on public.players(lower(username))
  where username is not null and btrim(username) <> '';

-- L'ancien profil de développement du projet devient l'administrateur DEV.
-- Tu peux changer cette ligne plus tard si tu utilises une autre adresse.
update public.players
set is_admin = true
where lower(email) = 'test@test.com';

create or replace function public.current_player_id_text()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id::text
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_player_id_text() from public;
grant execute on function public.current_player_id_text() to authenticated;

create or replace function public.player_owns_city(p_city_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.cities c
    join public.players p on p.id = c.player_id
    where c.id::text = p_city_id
      and p.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.player_owns_city(text) from public;
grant execute on function public.player_owns_city(text) to authenticated;

create or replace function public.player_owns_player(p_player_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.players p
    where p.id::text = p_player_id
      and p.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.player_owns_player(text) from public;
grant execute on function public.player_owns_player(text) to authenticated;

create or replace function public.player_owns_mission(p_mission_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.city_missions m
    where m.id::text = p_mission_id
      and public.player_owns_city(m.city_id::text)
  );
$$;

revoke all on function public.player_owns_mission(text) from public;
grant execute on function public.player_owns_mission(text) to authenticated;

create or replace function public.bootstrap_current_player(p_username text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text;
  v_username text;
  v_player_id public.players.id%type;
  v_city_id public.cities.id%type;
  v_is_admin boolean := false;
  v_created boolean := false;
  v_linked_legacy boolean := false;
begin
  if v_auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_auth_user_id;

  if v_email is null then
    raise exception 'AUTH_EMAIL_MISSING';
  end if;

  v_username := nullif(btrim(coalesce(p_username, '')), '');

  if v_username is null then
    v_username := split_part(v_email, '@', 1);
  end if;

  -- Compte déjà relié à Supabase Auth.
  select p.id, p.is_admin
  into v_player_id, v_is_admin
  from public.players p
  where p.auth_user_id = v_auth_user_id
  limit 1;

  -- Migration douce de l'ancien profil local : même e-mail + aucune liaison Auth.
  if v_player_id is null then
    select p.id, p.is_admin
    into v_player_id, v_is_admin
    from public.players p
    where lower(p.email) = lower(v_email)
      and p.auth_user_id is null
    limit 1;

    if v_player_id is not null then
      update public.players
      set
        auth_user_id = v_auth_user_id,
        username = coalesce(nullif(btrim(username), ''), v_username),
        last_seen_at = now()
      where id = v_player_id;

      v_linked_legacy := true;
    end if;
  end if;

  -- Vrai nouveau joueur.
  if v_player_id is null then
    insert into public.players (
      email,
      username,
      auth_user_id,
      is_admin,
      last_seen_at
    ) values (
      lower(v_email),
      v_username,
      v_auth_user_id,
      false,
      now()
    )
    returning id, is_admin
      into v_player_id, v_is_admin;

    v_created := true;
  else
    update public.players
    set last_seen_at = now()
    where id = v_player_id;
  end if;

  select c.id
  into v_city_id
  from public.cities c
  where c.player_id = v_player_id
  order by c.id
  limit 1;

  if v_city_id is null then
    insert into public.cities (player_id)
    values (v_player_id)
    returning id into v_city_id;

    v_created := true;
  end if;

  -- Une ligne par type est nécessaire pour que la map affiche aussi les futurs terrains.
  if not exists (
    select 1 from public.buildings b where b.city_id = v_city_id
  ) then
    insert into public.buildings (city_id, type, level)
    values
      (v_city_id, 'villa', 1),
      (v_city_id, 'hideout', 1),
      (v_city_id, 'workshop', 1),
      (v_city_id, 'wall', 0),
      (v_city_id, 'syndicate', 0),
      (v_city_id, 'laboratory', 0),
      (v_city_id, 'factory', 0);
  end if;

  if not exists (
    select 1
    from public.commander_skills cs
    where cs.player_id = v_player_id
  ) then
    insert into public.commander_skills (player_id)
    values (v_player_id);
  end if;

  -- Petite escouade de départ pour permettre les premiers tests sans attendre le recrutement.
  if not exists (
    select 1
    from public.city_troops ct
    where ct.city_id = v_city_id
      and ct.troop_key = 'henchman_1'
  ) then
    insert into public.city_troops (city_id, troop_key, quantity)
    values (v_city_id, 'henchman_1', 5);
  end if;

  return jsonb_build_object(
    'player_id', v_player_id,
    'city_id', v_city_id,
    'created', v_created,
    'linked_legacy_player', v_linked_legacy,
    'is_admin', v_is_admin
  );
end;
$$;

revoke all on function public.bootstrap_current_player(text) from public;
grant execute on function public.bootstrap_current_player(text) to authenticated;

-- ----------------------------
-- Row Level Security — MVP
-- ----------------------------

alter table public.players enable row level security;
alter table public.cities enable row level security;
alter table public.buildings enable row level security;
alter table public.commander_skills enable row level security;
alter table public.city_troops enable row level security;
alter table public.city_recruitments enable row level security;
alter table public.city_researches enable row level security;
alter table public.city_inventory enable row level security;
alter table public.city_missions enable row level security;
alter table public.city_mission_troops enable row level security;

drop policy if exists players_own_select on public.players;
create policy players_own_select
on public.players
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists players_own_update on public.players;
create policy players_own_update
on public.players
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists cities_own_select on public.cities;
create policy cities_own_select
on public.cities
for select
to authenticated
using (public.player_owns_city(id::text));

drop policy if exists cities_own_update on public.cities;
create policy cities_own_update
on public.cities
for update
to authenticated
using (public.player_owns_city(id::text))
with check (public.player_owns_player(player_id::text));

drop policy if exists buildings_own_all on public.buildings;
create policy buildings_own_all
on public.buildings
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));

drop policy if exists commander_skills_own_all on public.commander_skills;
create policy commander_skills_own_all
on public.commander_skills
for all
to authenticated
using (public.player_owns_player(player_id::text))
with check (public.player_owns_player(player_id::text));

drop policy if exists city_troops_own_all on public.city_troops;
create policy city_troops_own_all
on public.city_troops
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));

drop policy if exists city_recruitments_own_all on public.city_recruitments;
create policy city_recruitments_own_all
on public.city_recruitments
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));

drop policy if exists city_researches_own_all on public.city_researches;
create policy city_researches_own_all
on public.city_researches
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));

drop policy if exists city_inventory_own_all on public.city_inventory;
create policy city_inventory_own_all
on public.city_inventory
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));

drop policy if exists city_missions_own_all on public.city_missions;
create policy city_missions_own_all
on public.city_missions
for all
to authenticated
using (public.player_owns_city(city_id::text))
with check (public.player_owns_city(city_id::text));


drop policy if exists city_mission_troops_own_all on public.city_mission_troops;
create policy city_mission_troops_own_all
on public.city_mission_troops
for all
to authenticated
using (public.player_owns_mission(mission_id::text))
with check (public.player_owns_mission(mission_id::text));

commit;
