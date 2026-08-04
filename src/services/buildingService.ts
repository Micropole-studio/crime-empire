import { supabase } from "./supabase"

import type {
  Building,
  BuildingType,
} from "../types/building"

import {
  applyVillaConstructionSpeed,
  getBuildingMaxLevel,
  getNextLevelProgression,
} from "../data/progression"

import {
  getRequiredVillaLevel,
} from "../data/buildingUnlocks"

import {
  getVillaRequirementStates,
} from "../data/buildingRequirements"

type CityResources = {
  id: string
  money: number
  materials: number
  influence: number
}

export function getUpgradeCost(
  type: BuildingType,
  currentLevel: number
) {
  const nextLevel =
    getNextLevelProgression(
      type,
      currentLevel
    )

  return (
    nextLevel?.cost ?? {
      money: 0,
      materials: 0,
      influence: 0,
    }
  )
}

export function getConstructionTime(
  type: BuildingType,
  currentLevel: number,
  villaLevel: number
) {
  const nextLevel =
    getNextLevelProgression(
      type,
      currentLevel
    )

  if (!nextLevel) {
    return 0
  }

  /*
   * La Villa niveau 1 avait historiquement
   * un temps de 0 seconde. On conserve une
   * construction très rapide afin que le
   * passage niveau 0 -> 1 utilise le même
   * système fiable que les autres niveaux.
   */
  const baseSeconds =
    nextLevel.level === 1 &&
    type === "villa" &&
    nextLevel.constructionTimeSeconds <= 0
      ? 5
      : nextLevel.constructionTimeSeconds

  const speedVillaLevel =
    Math.max(
      1,
      Number(villaLevel) || 0
    )

  return applyVillaConstructionSpeed(
    baseSeconds,
    speedVillaLevel
  )
}

export function getUpgradeDetails(
  type: BuildingType,
  currentLevel: number
) {
  return getNextLevelProgression(
    type,
    currentLevel
  )
}

export async function upgradeBuilding(
  building: Building,
  city: CityResources,
  villaLevel: number,
  buildings: Building[] = []
) {
  const safeVillaLevel =
    Math.max(
      0,
      Math.floor(
        Number(villaLevel) || 0
      )
    )

  if (!city?.id) {
    throw new Error(
      "City ID manquant"
    )
  }

  if (!building?.id) {
    throw new Error(
      "Building ID manquant"
    )
  }

  const buildingType =
    building.type

  const currentLevel =
    Math.floor(
      Number(
        building.level
      )
    )

  if (
    !Number.isFinite(
      currentLevel
    ) ||
    currentLevel < 0
  ) {
    throw new Error(
      "Niveau du bâtiment invalide"
    )
  }

  const maxLevel =
    getBuildingMaxLevel(
      buildingType
    )

  if (
    currentLevel >=
    maxLevel
  ) {
    throw new Error(
      "Ce bâtiment a atteint son niveau maximum"
    )
  }

  const nextLevel =
    getNextLevelProgression(
      buildingType,
      currentLevel
    )

  if (!nextLevel) {
    throw new Error(
      "La progression du niveau suivant est introuvable"
    )
  }

  const requiredVillaLevel =
    getRequiredVillaLevel(
      buildingType
    )

  if (
    buildingType !== "villa" &&
    safeVillaLevel <
      requiredVillaLevel
  ) {
    throw new Error(
      `Villa niveau ${requiredVillaLevel} nécessaire pour construire ce bâtiment`
    )
  }

  if (
    buildingType !== "villa" &&
    nextLevel.level >
      safeVillaLevel
  ) {
    throw new Error(
      `Villa niveau ${nextLevel.level} nécessaire pour améliorer ce bâtiment`
    )
  }

  if (
    buildingType === "villa"
  ) {
    let progressionBuildings =
      buildings

    if (
      progressionBuildings.length ===
      0
    ) {
      const {
        data: buildingData,
        error: buildingReadError,
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
        .eq(
          "city_id",
          city.id
        )

      if (buildingReadError) {
        throw buildingReadError
      }

      progressionBuildings =
        (
          buildingData ?? []
        ) as Building[]
    }

    const missingRequirements =
      getVillaRequirementStates(
        progressionBuildings,
        nextLevel.level
      ).filter(
        (requirement) =>
          !requirement.completed
      )

    if (
      missingRequirements.length >
      0
    ) {
      const missingText =
        missingRequirements
          .map(
            (requirement) =>
              `${requirement.name} niveau ${requirement.level} (actuel : ${requirement.currentLevel})`
          )
          .join(", ")

      throw new Error(
        `Prérequis manquants pour la Villa niveau ${nextLevel.level} : ${missingText}`
      )
    }
  }

  const {
    data: activeConstruction,
    error: activeError,
  } = await supabase
    .from("buildings")
    .select("id")
    .eq(
      "city_id",
      city.id
    )
    .eq(
      "is_upgrading",
      true
    )

  if (activeError) {
    throw activeError
  }

  if (
    (
      activeConstruction
        ?.length ?? 0
    ) > 0
  ) {
    throw new Error(
      "Une construction est déjà en cours dans votre ville"
    )
  }

  if (
    building.is_upgrading
  ) {
    throw new Error(
      "Construction déjà en cours"
    )
  }

  const cost =
    nextLevel.cost

  const currentMoney =
    Number(
      city.money
    ) || 0

  const currentMaterials =
    Number(
      city.materials
    ) || 0

  const currentInfluence =
    Number(
      city.influence
    ) || 0

  if (
    currentMoney <
    cost.money
  ) {
    throw new Error(
      "Pas assez d'argent"
    )
  }

  if (
    currentMaterials <
    cost.materials
  ) {
    throw new Error(
      "Pas assez de matériaux"
    )
  }

  if (
    currentInfluence <
    cost.influence
  ) {
    throw new Error(
      "Pas assez d'influence"
    )
  }

  const constructionTime =
    getConstructionTime(
      buildingType,
      currentLevel,
      safeVillaLevel
    )

  if (
    constructionTime <= 0
  ) {
    throw new Error(
      "Temps de construction invalide"
    )
  }

  const finishDate =
    new Date(
      Date.now() +
        constructionTime *
          1000
    ).toISOString()

  /*
   * Le trigger Supabase fourni dans le pack
   * revérifie les déblocages, le plafond de
   * la Villa et les prérequis de la Villa.
   */
  const {
    data: updatedBuilding,
    error: buildingError,
  } = await supabase
    .from("buildings")
    .update({
      is_upgrading:
        true,

      target_level:
        nextLevel.level,

      upgrade_finish:
        finishDate,
    })
    .eq(
      "id",
      building.id
    )
    .eq(
      "is_upgrading",
      false
    )
    .eq(
      "level",
      currentLevel
    )
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
    .maybeSingle()

  if (buildingError) {
    throw buildingError
  }

  if (!updatedBuilding) {
    throw new Error(
      "Ce bâtiment vient déjà d'être mis en construction"
    )
  }

  const newMoney =
    currentMoney -
    cost.money

  const newMaterials =
    currentMaterials -
    cost.materials

  const newInfluence =
    currentInfluence -
    cost.influence

  const {
    error: cityError,
  } = await supabase
    .from("cities")
    .update({
      money:
        newMoney,

      materials:
        newMaterials,

      influence:
        newInfluence,
    })
    .eq(
      "id",
      city.id
    )

  if (cityError) {
    /*
     * Compensation de sécurité :
     * si le retrait des ressources échoue,
     * la construction est annulée.
     */
    await supabase
      .from("buildings")
      .update({
        is_upgrading:
          false,

        target_level:
          null,

        upgrade_finish:
          null,
      })
      .eq(
        "id",
        building.id
      )
      .eq(
        "target_level",
        nextLevel.level
      )

    throw cityError
  }

  return true
}
