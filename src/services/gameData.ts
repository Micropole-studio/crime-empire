import { supabase } from "./supabase"

import type {
  CommanderSkills,
} from "../types/commander"

function createDefaultCommanderSkills(
  playerId: string
): CommanderSkills {
  const now =
    new Date().toISOString()

  return {
    player_id:
      playerId,

    military_power:
      0,

    operation_logistics:
      0,

    underground_management:
      0,

    created_at:
      now,

    updated_at:
      now,
  }
}

export async function getPlayerCity(
  playerId: string
) {
  if (!playerId) {
    throw new Error(
      "Impossible de charger la partie : Player ID manquant"
    )
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single()

  if (
    playerError ||
    !player
  ) {
    throw (
      playerError ??
      new Error(
        "Joueur introuvable"
      )
    )
  }

  const {
    data: city,
    error: cityError,
  } = await supabase
    .from("cities")
    .select("*")
    .eq(
      "player_id",
      player.id
    )
    .single()

  if (
    cityError ||
    !city
  ) {
    throw (
      cityError ??
      new Error(
        "Ville introuvable"
      )
    )
  }

  const [
    buildingsResult,
    commanderSkillsResult,
  ] = await Promise.all([
    supabase
      .from("buildings")
      .select("*")
      .eq(
        "city_id",
        city.id
      ),

    supabase
      .from(
        "commander_skills"
      )
      .select(
        `
          player_id,
          military_power,
          operation_logistics,
          underground_management,
          created_at,
          updated_at
        `
      )
      .eq(
        "player_id",
        player.id
      )
      .maybeSingle(),
  ])

  if (
    buildingsResult.error
  ) {
    throw buildingsResult.error
  }

  if (
    commanderSkillsResult.error
  ) {
    throw commanderSkillsResult.error
  }

  return {
    player,
    city,

    buildings:
      buildingsResult.data ??
      [],

    commanderSkills:
      (
        commanderSkillsResult.data ??
        createDefaultCommanderSkills(
          player.id
        )
      ) as CommanderSkills,
  }
}
