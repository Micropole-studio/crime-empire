import { supabase } from "./supabase"

import type {
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

// =====================================================
// COÛT DU PROCHAIN NIVEAU
// =====================================================

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

// =====================================================
// TEMPS DE CONSTRUCTION RÉEL
//
// Le temps de base est réduit grâce
// au niveau actuel de la Villa.
// =====================================================

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

  const safeVillaLevel = Math.max(
    1,
    Number(villaLevel) || 1
  )

  return applyVillaConstructionSpeed(
    nextLevel.constructionTimeSeconds,
    safeVillaLevel
  )
}

// =====================================================
// INFORMATIONS DU PROCHAIN NIVEAU
// =====================================================

export function getUpgradeDetails(
  type: BuildingType,
  currentLevel: number
) {
  return getNextLevelProgression(
    type,
    currentLevel
  )
}

// =====================================================
// AMÉLIORATION D'UN BÂTIMENT
// =====================================================

export async function upgradeBuilding(
  building: any,
  city: any,
  villaLevel: number
) {
  const safeVillaLevel = Math.max(
    1,
    Number(villaLevel) || 1
  )

  console.log("UPGRADE START:", {
    building,
    city,
    villaLevel: safeVillaLevel,
  })

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
    building.type as BuildingType

  const currentLevel = Number(
    building.level
  )

  if (
    !Number.isFinite(currentLevel) ||
    currentLevel < 1
  ) {
    throw new Error(
      "Niveau du bâtiment invalide"
    )
  }

  const maxLevel =
    getBuildingMaxLevel(
      buildingType
    )

  if (currentLevel >= maxLevel) {
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

  // =====================================================
  // NIVEAU MINIMAL DE VILLA
  //
  // Villa niveau 2 :
  // → Planque
  //
  // Villa niveau 3 :
  // → Garage
  // → Sécurité
  //
  // Villa niveau 4 :
  // → Syndicat
  //
  // Villa niveau 5 :
  // → Laboratoire
  // → Usine
  // =====================================================

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
      `Villa niveau ${requiredVillaLevel} nécessaire pour débloquer ce bâtiment`
    )
  }

  // =====================================================
  // PLAFOND IMPOSÉ PAR LA VILLA
  //
  // Un bâtiment ne peut jamais
  // dépasser le niveau actuel de la Villa.
  //
  // Exemple :
  // Villa niveau 4
  // → les autres bâtiments peuvent
  // atteindre le niveau 4 maximum.
  //
  // La Villa elle-même n'est pas concernée.
  // =====================================================

  if (
    buildingType !== "villa" &&
    nextLevel.level >
      safeVillaLevel
  ) {
    throw new Error(
      `Villa niveau ${nextLevel.level} nécessaire pour améliorer ce bâtiment`
    )
  }

  // =====================================================
  // CONSTRUCTION UNIQUE
  // =====================================================

  const {
    data: activeConstruction,
    error: activeError,
  } = await supabase
    .from("buildings")
    .select("id")
    .eq("city_id", city.id)
    .eq("is_upgrading", true)

  if (activeError) {
    throw activeError
  }

  if (
    (activeConstruction?.length ?? 0) >
    0
  ) {
    throw new Error(
      "Une construction est déjà en cours dans votre ville"
    )
  }

  if (building.is_upgrading) {
    throw new Error(
      "Construction déjà en cours"
    )
  }

  const cost = nextLevel.cost

  console.log(
    "NEXT LEVEL:",
    nextLevel
  )

  console.log(
    "COST:",
    cost
  )

  // =====================================================
  // VÉRIFICATION DES RESSOURCES
  // =====================================================

  const currentMoney =
    Number(city.money) || 0

  const currentMaterials =
    Number(city.materials) || 0

  const currentInfluence =
    Number(city.influence) || 0

  if (
    currentMoney < cost.money
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

  // =====================================================
  // TEMPS DE CONSTRUCTION
  //
  // Le temps réel tient compte du
  // bonus de vitesse actuel de la Villa.
  //
  // Exemple :
  // Villa niveau 3
  // → +6 % de vitesse de construction.
  // =====================================================

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

  const finishDate = new Date(
    Date.now() +
      constructionTime * 1000
  ).toISOString()

  console.log(
    "CONSTRUCTION TIME:",
    constructionTime,
    "secondes"
  )

  console.log(
    "UPGRADE FINISH:",
    finishDate
  )

  // =====================================================
  // MISE À JOUR DU BÂTIMENT
  // =====================================================

  const {
    data: updatedBuilding,
    error: buildingError,
  } = await supabase
    .from("buildings")
    .update({
      is_upgrading: true,
      target_level:
        nextLevel.level,
      upgrade_finish:
        finishDate,
    })
    .eq("id", building.id)
    .eq(
      "is_upgrading",
      false
    )
    .select("id")
    .maybeSingle()

  if (buildingError) {
    console.error(
      "BUILDING ERROR:",
      buildingError
    )

    throw buildingError
  }

  /*
   * La condition is_upgrading = false
   * sert de verrou.
   *
   * Si aucune ligne n'a été modifiée,
   * les ressources ne sont pas retirées.
   */
  if (!updatedBuilding) {
    throw new Error(
      "Ce bâtiment vient déjà d'être mis en construction"
    )
  }

  // =====================================================
  // RETRAIT DES RESSOURCES
  // =====================================================

  const newMoney =
    currentMoney - cost.money

  const newMaterials =
    currentMaterials -
    cost.materials

  const newInfluence =
    currentInfluence -
    cost.influence

  const {
    data: cityData,
    error: cityError,
  } = await supabase
    .from("cities")
    .update({
      money: newMoney,
      materials:
        newMaterials,
      influence:
        newInfluence,
    })
    .eq("id", city.id)
    .select()

  if (cityError) {
    console.error(
      "CITY ERROR:",
      cityError
    )

    throw cityError
  }

  console.log(
    "CITY UPDATED:",
    cityData
  )

  return true
}