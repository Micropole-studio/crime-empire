import { supabase } from "./supabase"

import {
  calculateEconomy,
} from "./economy"

import {
  getStorageCapacities,
} from "../data/storage"

import type {
  Building,
} from "../types/building"

export type SyncEconomyResponse = {
  city?: unknown

  seconds_passed?: number

  earned_money?: number
  earned_materials?: number
  earned_influence?: number
  earned_equipment?: number

  money_bonus_percent?: number
  materials_bonus_percent?: number
  influence_bonus_percent?: number
  equipment_bonus_percent?: number
  storage_bonus_percent?: number

  effective_money_per_hour?: number
  effective_materials_per_hour?: number
  effective_influence_per_hour?: number
  effective_equipment_per_hour?: number

  effective_money_capacity?: number
  effective_materials_capacity?: number
  effective_influence_capacity?: number
  effective_equipment_capacity?: number
}

export async function syncEconomy(
  city: {
    id: string
  },
  buildings: Building[]
): Promise<SyncEconomyResponse | null> {
  if (!city?.id) {
    throw new Error(
      "Impossible de synchroniser l’économie : City ID manquant"
    )
  }

  const economy =
    calculateEconomy(buildings)

  /*
   * Capacités de base.
   *
   * Les éventuels bonus de recherche sont
   * appliqués dans sync_city_economy côté SQL.
   */
  const capacities =
    getStorageCapacities(buildings)

  const {
    data,
    error,
  } = await supabase.rpc(
    "sync_city_economy",
    {
      p_city_id:
        city.id,

      p_money_per_hour:
        Number(
          economy.moneyPerHour
        ) || 0,

      p_materials_per_hour:
        Number(
          economy.materialsPerHour
        ) || 0,

      p_influence_per_hour:
        Number(
          economy.influencePerHour
        ) || 0,

      p_equipment_per_hour:
        Number(
          economy.equipmentPerHour
        ) || 0,

      p_money_capacity:
        Number(
          capacities.money
        ) || 0,

      p_materials_capacity:
        Number(
          capacities.materials
        ) || 0,

      p_influence_capacity:
        Number(
          capacities.influence
        ) || 0,

      p_equipment_capacity:
        Number(
          capacities.equipment
        ) || 0,
    }
  )

  if (error) {
    console.error(
      "Erreur de synchronisation économique :",
      error
    )

    throw error
  }

  const result =
    data as SyncEconomyResponse | null

  console.log(
    "SYNC ECONOMY",
    {
      secondsPassed:
        Number(
          result?.seconds_passed
        ) || 0,

      baseRates: {
        money:
          economy.moneyPerHour,

        materials:
          economy.materialsPerHour,

        influence:
          economy.influencePerHour,

        equipment:
          economy.equipmentPerHour,
      },

      effectiveRates: {
        money:
          Number(
            result?.effective_money_per_hour
          ) || 0,

        materials:
          Number(
            result?.effective_materials_per_hour
          ) || 0,

        influence:
          Number(
            result?.effective_influence_per_hour
          ) || 0,

        equipment:
          Number(
            result?.effective_equipment_per_hour
          ) || 0,
      },

      bonuses: {
        money:
          Number(
            result?.money_bonus_percent
          ) || 0,

        materials:
          Number(
            result?.materials_bonus_percent
          ) || 0,

        influence:
          Number(
            result?.influence_bonus_percent
          ) || 0,

        equipment:
          Number(
            result?.equipment_bonus_percent
          ) || 0,

        storage:
          Number(
            result?.storage_bonus_percent
          ) || 0,
      },

      earned: {
        money:
          Number(
            result?.earned_money
          ) || 0,

        materials:
          Number(
            result?.earned_materials
          ) || 0,

        influence:
          Number(
            result?.earned_influence
          ) || 0,

        equipment:
          Number(
            result?.earned_equipment
          ) || 0,
      },
    }
  )

  return result
}
