import { supabase } from "./supabase"

import {
  createEmptyCommanderSkills,
} from "../data/commanderSkills"

import type {
  CommanderSkillKey,
  CommanderPowerBreakdown,
  CommanderSkills,
  UpgradeCommanderSkillResult,
} from "../types/commander"

export async function getCommanderSkills(
  playerId: string
): Promise<CommanderSkills> {
  if (!playerId) {
    throw new Error(
      "Impossible de charger le commandant : Player ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from("commander_skills")
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
    .eq("player_id", playerId)
    .maybeSingle()

  if (error) {
    console.error(
      "Erreur pendant le chargement des compétences du commandant :",
      error
    )

    throw error
  }

  if (!data) {
    const {
      data: created,
      error: createError,
    } = await supabase
      .from("commander_skills")
      .insert({
        player_id:
          playerId,
      })
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
      .single()

    if (createError) {
      /*
       * Un autre appel peut avoir créé
       * la ligne au même moment.
       */
      if (
        createError.code ===
        "23505"
      ) {
        return getCommanderSkills(
          playerId
        )
      }

      throw createError
    }

    return (
      created ??
      createEmptyCommanderSkills(
        playerId
      )
    ) as CommanderSkills
  }

  return data as CommanderSkills
}

export async function upgradeCommanderSkill(
  playerId: string,
  skillKey: CommanderSkillKey
): Promise<UpgradeCommanderSkillResult> {
  if (!playerId) {
    throw new Error(
      "Impossible d'améliorer cette compétence : Player ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "upgrade_commander_skill",
    {
      p_player_id:
        playerId,

      p_skill_key:
        skillKey,
    }
  )

  if (error) {
    console.error(
      "Erreur pendant l'amélioration de la compétence :",
      error
    )

    throw error
  }

  return data as UpgradeCommanderSkillResult
}


export async function getCommanderPower(
  playerId: string
): Promise<CommanderPowerBreakdown> {
  if (!playerId) {
    throw new Error(
      "Impossible de calculer la puissance : Player ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_commander_power",
    {
      p_player_id:
        playerId,
    }
  )

  if (error) {
    console.error(
      "Erreur pendant le calcul de la puissance :",
      error
    )

    throw error
  }

  return data as CommanderPowerBreakdown
}
