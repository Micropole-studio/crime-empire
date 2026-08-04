import { supabase } from "./supabase"

import { TROOPS } from "../data/troop"

import {
  isResearchCompleted,
  syncCityResearches,
} from "./researchService"

import type {
  Building,
  BuildingType,
} from "../types/building"

import type {
  CityResearch,
} from "../types/research"

import type {
  CityTroop,
  TroopType,
} from "../types/troop"

export type RecruitmentStatus =
  | "recruiting"
  | "completed"
  | "claimed"

export type CityRecruitment = {
  id: string
  city_id: string
  troop_key: TroopType
  quantity: number
  status: RecruitmentStatus
  started_at: string
  finish_at: string
  created_at: string
}

export type RecruitmentLimits = {
  capacity: number

  baseMaxOrder: number
  researchMaxOrderBonus: number
  maxOrder: number

  baseSpeedPercent: number
  researchSpeedPercent: number
  speedPercent: number

  queueCount: number
}

const SECURITY_CAPACITY_BY_LEVEL: Record<
  number,
  number
> = {
  1: 10,
  2: 15,
  3: 25,
  4: 35,
  5: 50,
  6: 70,
  7: 95,
  8: 125,
  9: 160,
  10: 200,
}

const SECURITY_MAX_ORDER_BY_LEVEL: Record<
  number,
  number
> = {
  1: 5,
  2: 7,
  3: 10,
  4: 15,
  5: 20,
  6: 25,
  7: 30,
  8: 40,
  9: 50,
  10: 60,
}

export function getHighestBuildingLevel(
  buildings: Building[],
  buildingType: BuildingType
) {
  return buildings
    .filter(
      (building) =>
        building.type === buildingType
    )
    .reduce(
      (highestLevel, building) =>
        Math.max(
          highestLevel,
          Number(building.level) || 0
        ),
      0
    )
}

export function getSecurityRecruitmentLimits(
  securityLevel: number,
  researches: CityResearch[] = []
): RecruitmentLimits {
  const safeLevel = Math.min(
    10,
    Math.max(
      0,
      Math.floor(
        Number(securityLevel) || 0
      )
    )
  )

  if (safeLevel < 1) {
    return {
      capacity: 0,
      baseMaxOrder: 0,
      researchMaxOrderBonus: 0,
      maxOrder: 0,
      baseSpeedPercent: 0,
      researchSpeedPercent: 0,
      speedPercent: 0,
      queueCount: 0,
    }
  }

  const baseMaxOrder =
    SECURITY_MAX_ORDER_BY_LEVEL[
      safeLevel
    ] ?? 0

  const baseSpeedPercent =
    Math.max(0, safeLevel - 1) * 2

  let researchMaxOrderBonus = 0
  let researchSpeedPercent = 0
  let queueCount = 1

  if (
    isResearchCompleted(
      researches,
      "recruitment_capacity_1"
    )
  ) {
    researchMaxOrderBonus += 5
  }

  if (
    isResearchCompleted(
      researches,
      "recruitment_capacity_2"
    )
  ) {
    researchMaxOrderBonus += 10
  }

  if (
    isResearchCompleted(
      researches,
      "recruitment_speed_1"
    )
  ) {
    researchSpeedPercent += 5
  }

  if (
    isResearchCompleted(
      researches,
      "second_recruitment_queue"
    )
  ) {
    queueCount = 2
  }

  return {
    capacity:
      SECURITY_CAPACITY_BY_LEVEL[
        safeLevel
      ] ?? 0,

    baseMaxOrder,
    researchMaxOrderBonus,
    maxOrder:
      baseMaxOrder +
      researchMaxOrderBonus,

    baseSpeedPercent,
    researchSpeedPercent,
    speedPercent:
      baseSpeedPercent +
      researchSpeedPercent,

    queueCount,
  }
}

export function getRecruitmentTimeSeconds(
  troopType: TroopType,
  quantity: number,
  securityLevel: number,
  researches: CityResearch[] = []
) {
  const definition = TROOPS[troopType]

  const safeQuantity = Math.max(
    1,
    Math.floor(Number(quantity) || 1)
  )

  const { speedPercent } =
    getSecurityRecruitmentLimits(
      securityLevel,
      researches
    )

  const baseSeconds =
    definition.recruitmentTimeSeconds *
    safeQuantity

  const speedMultiplier =
    1 + speedPercent / 100

  return Math.max(
    1,
    Math.ceil(
      baseSeconds / speedMultiplier
    )
  )
}

export async function getCityTroops(
  cityId: string
): Promise<CityTroop[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger les troupes : City ID manquant"
    )
  }

  const { data, error } = await supabase
    .from("city_troops")
    .select(
      `
        id,
        city_id,
        troop_key,
        quantity
      `
    )
    .eq("city_id", cityId)
    .order("troop_key", {
      ascending: true,
    })

  if (error) {
    console.error(
      "Erreur pendant le chargement des troupes :",
      error
    )

    throw error
  }

  return (data ?? []) as CityTroop[]
}

export async function getCityRecruitments(
  cityId: string
): Promise<CityRecruitment[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger les recrutements : City ID manquant"
    )
  }

  const { data, error } = await supabase
    .from("city_recruitments")
    .select(
      `
        id,
        city_id,
        troop_key,
        quantity,
        status,
        started_at,
        finish_at,
        created_at
      `
    )
    .eq("city_id", cityId)
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    console.error(
      "Erreur pendant le chargement des recrutements :",
      error
    )

    throw error
  }

  return (
    data ?? []
  ) as CityRecruitment[]
}

export function getActiveRecruitments(
  recruitments: CityRecruitment[]
) {
  return recruitments.filter(
    (recruitment) =>
      recruitment.status === "recruiting"
  )
}

/*
 * Conservée pour les composants qui
 * utilisent encore une seule file.
 */
export function getActiveRecruitment(
  recruitments: CityRecruitment[]
) {
  return (
    getActiveRecruitments(
      recruitments
    )[0] ?? null
  )
}

export function getRecruitmentRemainingSeconds(
  recruitment: CityRecruitment,
  currentTime = Date.now()
) {
  if (
    recruitment.status !==
      "recruiting" ||
    !recruitment.finish_at
  ) {
    return 0
  }

  const finishTime = new Date(
    recruitment.finish_at
  ).getTime()

  if (Number.isNaN(finishTime)) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (finishTime - currentTime) /
        1000
    )
  )
}

export function getTroopRequirementsState(
  troopType: TroopType,
  buildings: Building[],
  researches: CityResearch[]
) {
  const definition = TROOPS[troopType]

  const securityLevel =
    getHighestBuildingLevel(
      buildings,
      "wall"
    )

  const laboratoryLevel =
    getHighestBuildingLevel(
      buildings,
      "laboratory"
    )

  const hasSecurityLevel =
    securityLevel >=
    definition.securityLevelRequired

  const hasLaboratoryLevel =
    definition.laboratoryLevelRequired <=
      0 ||
    laboratoryLevel >=
      definition.laboratoryLevelRequired

  const hasRequiredResearch =
    !definition.researchRequired ||
    isResearchCompleted(
      researches,
      definition.researchRequired
    )

  return {
    definition,

    securityLevel,
    laboratoryLevel,

    hasSecurityLevel,
    hasLaboratoryLevel,
    hasRequiredResearch,

    unlocked:
      hasSecurityLevel &&
      hasLaboratoryLevel &&
      hasRequiredResearch,
  }
}

export async function syncCityRecruitments(
  cityId: string
) {
  if (!cityId) {
    throw new Error(
      "Impossible de synchroniser les recrutements : City ID manquant"
    )
  }

  const now = new Date().toISOString()

  const {
    error: completionError,
  } = await supabase
    .from("city_recruitments")
    .update({
      status: "completed",
    })
    .eq("city_id", cityId)
    .eq("status", "recruiting")
    .lte("finish_at", now)

  if (completionError) {
    console.error(
      "Erreur pendant la fin des recrutements :",
      completionError
    )

    throw completionError
  }

  const {
    data: completedRecruitments,
    error: completedError,
  } = await supabase
    .from("city_recruitments")
    .select(
      `
        id,
        city_id,
        troop_key,
        quantity,
        status,
        started_at,
        finish_at,
        created_at
      `
    )
    .eq("city_id", cityId)
    .eq("status", "completed")

  if (completedError) {
    throw completedError
  }

  for (
    const recruitment of
      completedRecruitments ?? []
  ) {
    const {
      data: claimedRecruitment,
      error: claimError,
    } = await supabase
      .from("city_recruitments")
      .update({
        status: "claimed",
      })
      .eq("id", recruitment.id)
      .eq("status", "completed")
      .select(
        `
          id,
          city_id,
          troop_key,
          quantity
        `
      )
      .maybeSingle()

    if (claimError) {
      throw claimError
    }

    if (!claimedRecruitment) {
      continue
    }

    try {
      const {
        data: existingTroop,
        error: troopReadError,
      } = await supabase
        .from("city_troops")
        .select(
          `
            id,
            quantity
          `
        )
        .eq(
          "city_id",
          claimedRecruitment.city_id
        )
        .eq(
          "troop_key",
          claimedRecruitment.troop_key
        )
        .maybeSingle()

      if (troopReadError) {
        throw troopReadError
      }

      if (existingTroop) {
        const {
          error: troopUpdateError,
        } = await supabase
          .from("city_troops")
          .update({
            quantity:
              Number(
                existingTroop.quantity
              ) +
              Number(
                claimedRecruitment.quantity
              ),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", existingTroop.id)

        if (troopUpdateError) {
          throw troopUpdateError
        }
      } else {
        const {
          error: troopInsertError,
        } = await supabase
          .from("city_troops")
          .insert({
            city_id:
              claimedRecruitment.city_id,
            troop_key:
              claimedRecruitment.troop_key,
            quantity:
              claimedRecruitment.quantity,
            updated_at:
              new Date().toISOString(),
          })

        if (troopInsertError) {
          throw troopInsertError
        }
      }
    } catch (error) {
      await supabase
        .from("city_recruitments")
        .update({
          status: "completed",
        })
        .eq(
          "id",
          claimedRecruitment.id
        )

      throw error
    }
  }

  const [troops, recruitments] =
    await Promise.all([
      getCityTroops(cityId),
      getCityRecruitments(cityId),
    ])

  return {
    troops,
    recruitments,
  }
}

export async function startRecruitment(
  cityId: string,
  troopType: TroopType,
  quantity: number
): Promise<CityRecruitment> {
  if (!cityId) {
    throw new Error(
      "Impossible de lancer le recrutement : City ID manquant"
    )
  }

  const definition = TROOPS[troopType]

  if (!definition) {
    throw new Error(
      "Cette troupe est introuvable"
    )
  }

  const safeQuantity = Math.floor(
    Number(quantity)
  )

  if (
    !Number.isFinite(safeQuantity) ||
    safeQuantity < 1
  ) {
    throw new Error(
      "La quantité à recruter est invalide"
    )
  }

  const synced =
    await syncCityRecruitments(cityId)

  const researches =
    await syncCityResearches(cityId)

  const {
    data: buildingData,
    error: buildingError,
  } = await supabase
    .from("buildings")
    .select(
      `
        id,
        type,
        level,
        is_upgrading,
        target_level,
        upgrade_finish
      `
    )
    .eq("city_id", cityId)
    .in("type", [
      "wall",
      "laboratory",
    ])

  if (buildingError) {
    throw buildingError
  }

  const buildings =
    (buildingData ?? []) as Building[]

  const requirements =
    getTroopRequirementsState(
      troopType,
      buildings,
      researches
    )

  if (!requirements.hasSecurityLevel) {
    throw new Error(
      `Sécurité niveau ${definition.securityLevelRequired} requise`
    )
  }

  if (!requirements.hasLaboratoryLevel) {
    throw new Error(
      `Laboratoire niveau ${definition.laboratoryLevelRequired} requis`
    )
  }

  if (!requirements.hasRequiredResearch) {
    throw new Error(
      "La recherche militaire nécessaire n'est pas terminée"
    )
  }

  const limits =
    getSecurityRecruitmentLimits(
      requirements.securityLevel,
      researches
    )

  const activeRecruitments =
    getActiveRecruitments(
      synced.recruitments
    )

  if (
    activeRecruitments.length >=
    limits.queueCount
  ) {
    throw new Error(
      limits.queueCount > 1
        ? "Toutes les files de recrutement sont occupées"
        : "Un recrutement est déjà en cours"
    )
  }

  if (safeQuantity > limits.maxOrder) {
    throw new Error(
      `Tu peux recruter au maximum ${limits.maxOrder} troupes par commande`
    )
  }

  const ownedQuantity =
    synced.troops.reduce(
      (total, troop) =>
        total +
        (Number(troop.quantity) || 0),
      0
    )

  const queuedQuantity =
    activeRecruitments.reduce(
      (total, recruitment) =>
        total +
        (Number(
          recruitment.quantity
        ) || 0),
      0
    )

  if (
    ownedQuantity +
      queuedQuantity +
      safeQuantity >
    limits.capacity
  ) {
    const remainingCapacity = Math.max(
      0,
      limits.capacity -
        ownedQuantity -
        queuedQuantity
    )

    throw new Error(
      `Capacité militaire insuffisante. Places restantes : ${remainingCapacity}`
    )
  }

  const {
    data: city,
    error: cityReadError,
  } = await supabase
    .from("cities")
    .select(
      `
        id,
        money,
        equipment,
        influence
      `
    )
    .eq("id", cityId)
    .single()

  if (cityReadError) {
    throw cityReadError
  }

  const totalMoney =
    definition.cost.money *
    safeQuantity

  const totalEquipment =
    definition.cost.equipment *
    safeQuantity

  const totalInfluence =
    definition.cost.influence *
    safeQuantity

  const currentMoney =
    Number(city.money) || 0

  const currentEquipment =
    Number(city.equipment) || 0

  const currentInfluence =
    Number(city.influence) || 0

  if (currentMoney < totalMoney) {
    throw new Error(
      "Pas assez d'argent pour ce recrutement"
    )
  }

  if (
    currentEquipment < totalEquipment
  ) {
    throw new Error(
      "Pas assez d'équipements pour ce recrutement"
    )
  }

  if (
    currentInfluence < totalInfluence
  ) {
    throw new Error(
      "Pas assez d'influence pour ce recrutement"
    )
  }

  const recruitmentTimeSeconds =
    getRecruitmentTimeSeconds(
      troopType,
      safeQuantity,
      requirements.securityLevel,
      researches
    )

  const startedAt = new Date()

  const finishAt = new Date(
    startedAt.getTime() +
      recruitmentTimeSeconds * 1000
  )

  const {
    data: createdRecruitment,
    error: insertError,
  } = await supabase
    .from("city_recruitments")
    .insert({
      city_id: cityId,
      troop_key: troopType,
      quantity: safeQuantity,
      status: "recruiting",
      started_at:
        startedAt.toISOString(),
      finish_at:
        finishAt.toISOString(),
    })
    .select(
      `
        id,
        city_id,
        troop_key,
        quantity,
        status,
        started_at,
        finish_at,
        created_at
      `
    )
    .single()

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error(
        "Une contrainte Supabase empêche plusieurs recrutements actifs. Exécute le script SQL fourni pour préparer la deuxième file."
      )
    }

    throw insertError
  }

  const {
    data: updatedCity,
    error: cityUpdateError,
  } = await supabase
    .from("cities")
    .update({
      money:
        currentMoney - totalMoney,
      equipment:
        currentEquipment -
        totalEquipment,
      influence:
        currentInfluence -
        totalInfluence,
    })
    .eq("id", cityId)
    .eq("money", city.money)
    .eq(
      "equipment",
      city.equipment
    )
    .eq(
      "influence",
      city.influence
    )
    .select("id")
    .maybeSingle()

  if (
    cityUpdateError ||
    !updatedCity
  ) {
    await supabase
      .from("city_recruitments")
      .delete()
      .eq(
        "id",
        createdRecruitment.id
      )

    if (cityUpdateError) {
      throw cityUpdateError
    }

    throw new Error(
      "Les ressources ont changé. Recharge le jeu puis réessaie."
    )
  }

  return (
    createdRecruitment
  ) as CityRecruitment
}
