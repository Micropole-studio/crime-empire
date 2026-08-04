import { supabase } from "./supabase"

export async function initNewPlayer(email: string) {
  // 1. player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ email })
    .select()
    .single()

  if (playerError) throw playerError

  // 2. city
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .insert({ player_id: player.id })
    .select()
    .single()

  if (cityError) throw cityError

  // 3. buildings
  const buildings = [
    { city_id: city.id, type: "villa", level: 1 },
    { city_id: city.id, type: "hideout", level: 1 },
    { city_id: city.id, type: "workshop", level: 1 },
    { city_id: city.id, type: "wall", level: 1 },
  ]

  const { error: buildingsError } = await supabase
    .from("buildings")
    .insert(buildings)

  if (buildingsError) throw buildingsError

  return { player, city }
}