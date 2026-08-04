import { supabase } from "./supabase"

import { RESEARCHES } from "../data/researches"

import type {
  CityResearch,
  ResearchType,
} from "../types/research"

import type {
  Building,
  BuildingType,
} from "../types/building"

function getHighestBuildingLevel(
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

export async function getCityResearches(
  cityId: string
): Promise<CityResearch[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger les recherches : City ID manquant"
    )
  }

  const { data, error } = await supabase
    .from("city_researches")
    .select(
      `
        id,
        city_id,
        research_key,
        status,
        started_at,
        finish_at,
        completed_at
      `
    )
    .eq("city_id", cityId)
    .order("started_at", {
      ascending: false,
    })

  if (error) {
    console.error(
      "Erreur pendant le chargement des recherches :",
      error
    )

    throw error
  }

  return (data ?? []) as CityResearch[]
}

export async function syncCityResearches(
  cityId: string
): Promise<CityResearch[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de synchroniser les recherches : City ID manquant"
    )
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from("city_researches")
    .update({
      status: "completed",
      completed_at: now,
    })
    .eq("city_id", cityId)
    .eq("status", "researching")
    .lte("finish_at", now)

  if (error) {
    console.error(
      "Erreur pendant la synchronisation des recherches :",
      error
    )

    throw error
  }

  return getCityResearches(cityId)
}

export function isResearchCompleted(
  researches: CityResearch[],
  researchType: ResearchType
) {
  return researches.some(
    (research) =>
      research.research_key ===
        researchType &&
      research.status === "completed"
  )
}

export function isResearchInProgress(
  researches: CityResearch[],
  researchType: ResearchType
) {
  return researches.some(
    (research) =>
      research.research_key ===
        researchType &&
      research.status === "researching"
  )
}

export function getActiveResearch(
  researches: CityResearch[]
) {
  return (
    researches.find(
      (research) =>
        research.status === "researching"
    ) ?? null
  )
}

export function getResearchRemainingSeconds(
  research: CityResearch,
  currentTime = Date.now()
) {
  if (
    research.status !== "researching" ||
    !research.finish_at
  ) {
    return 0
  }

  const finishTime = new Date(
    research.finish_at
  ).getTime()

  if (Number.isNaN(finishTime)) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (finishTime - currentTime) / 1000
    )
  )
}

export function getResearchRequirementsState(
  researchType: ResearchType,
  buildings: Building[],
  researches: CityResearch[]
) {
  const definition = RESEARCHES[researchType]

  const laboratoryLevel =
    getHighestBuildingLevel(
      buildings,
      "laboratory"
    )

  const securityLevel =
    getHighestBuildingLevel(
      buildings,
      "wall"
    )

  const hasLaboratoryLevel =
    laboratoryLevel >=
    definition.laboratoryLevelRequired

  const hasSecurityLevel =
    securityLevel >=
    definition.securityLevelRequired

  const prerequisiteStates =
    definition.prerequisiteResearches.map(
      (requiredResearchType) => ({
        researchType:
          requiredResearchType,
        name:
          RESEARCHES[
            requiredResearchType
          ].name,
        completed:
          isResearchCompleted(
            researches,
            requiredResearchType
          ),
      })
    )

  const hasPrerequisiteResearches =
    prerequisiteStates.every(
      (state) => state.completed
    )

  const completed =
    isResearchCompleted(
      researches,
      researchType
    )

  const researching =
    isResearchInProgress(
      researches,
      researchType
    )

  const activeResearch =
    getActiveResearch(researches)

  return {
    definition,

    laboratoryLevel,
    securityLevel,

    hasLaboratoryLevel,
    hasSecurityLevel,
    hasPrerequisiteResearches,
    prerequisiteStates,

    completed,
    researching,

    canStart:
      hasLaboratoryLevel &&
      hasSecurityLevel &&
      hasPrerequisiteResearches &&
      !completed &&
      !researching &&
      !activeResearch,
  }
}

export async function startResearch(
  cityId: string,
  researchType: ResearchType
): Promise<CityResearch> {
  if (!cityId) {
    throw new Error(
      "Impossible de lancer la recherche : City ID manquant"
    )
  }

  const definition = RESEARCHES[researchType]

  if (!definition) {
    throw new Error(
      "Cette recherche est introuvable"
    )
  }

  const researches =
    await syncCityResearches(cityId)

  const existingResearch =
    researches.find(
      (research) =>
        research.research_key ===
        researchType
    )

  if (
    existingResearch?.status ===
    "completed"
  ) {
    throw new Error(
      "Cette recherche est déjà terminée"
    )
  }

  if (
    existingResearch?.status ===
    "researching"
  ) {
    throw new Error(
      "Cette recherche est déjà en cours"
    )
  }

  const activeResearch =
    getActiveResearch(researches)

  if (activeResearch) {
    throw new Error(
      "Une autre recherche est déjà en cours dans le Laboratoire"
    )
  }

  for (
    const requiredResearchType of
      definition.prerequisiteResearches
  ) {
    if (
      !isResearchCompleted(
        researches,
        requiredResearchType
      )
    ) {
      throw new Error(
        `La recherche « ${RESEARCHES[requiredResearchType].name} » doit être terminée avant celle-ci`
      )
    }
  }

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
      "laboratory",
      "wall",
    ])

  if (buildingError) {
    console.error(
      "Erreur pendant le chargement des bâtiments :",
      buildingError
    )

    throw buildingError
  }

  const buildings =
    (buildingData ?? []) as Building[]

  const laboratoryLevel =
    getHighestBuildingLevel(
      buildings,
      "laboratory"
    )

  const securityLevel =
    getHighestBuildingLevel(
      buildings,
      "wall"
    )

  if (
    laboratoryLevel <
    definition.laboratoryLevelRequired
  ) {
    throw new Error(
      `Laboratoire niveau ${definition.laboratoryLevelRequired} requis pour cette recherche`
    )
  }

  if (
    securityLevel <
    definition.securityLevelRequired
  ) {
    throw new Error(
      `Sécurité niveau ${definition.securityLevelRequired} requise pour cette recherche`
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
        materials,
        influence
      `
    )
    .eq("id", cityId)
    .single()

  if (cityReadError) {
    console.error(
      "Erreur pendant le chargement de la ville :",
      cityReadError
    )

    throw cityReadError
  }

  const currentMoney =
    Number(city.money) || 0

  const currentMaterials =
    Number(city.materials) || 0

  const currentInfluence =
    Number(city.influence) || 0

  const cost = definition.cost

  if (currentMoney < cost.money) {
    throw new Error(
      "Pas assez d'argent pour lancer cette recherche"
    )
  }

  if (
    currentMaterials < cost.materials
  ) {
    throw new Error(
      "Pas assez de matériaux pour lancer cette recherche"
    )
  }

  if (
    currentInfluence < cost.influence
  ) {
    throw new Error(
      "Pas assez d'influence pour lancer cette recherche"
    )
  }

  const startedAt = new Date()

  const finishAt = new Date(
    startedAt.getTime() +
      definition.researchTimeSeconds *
        1000
  )

  const {
    data: createdResearch,
    error: insertError,
  } = await supabase
    .from("city_researches")
    .insert({
      city_id: cityId,
      research_key: researchType,
      status: "researching",
      started_at:
        startedAt.toISOString(),
      finish_at:
        finishAt.toISOString(),
      completed_at: null,
    })
    .select(
      `
        id,
        city_id,
        research_key,
        status,
        started_at,
        finish_at,
        completed_at
      `
    )
    .single()

  if (insertError) {
    console.error(
      "Erreur pendant la création de la recherche :",
      insertError
    )

    if (insertError.code === "23505") {
      throw new Error(
        "Une recherche est déjà en cours ou a déjà été créée"
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
        currentMoney - cost.money,
      materials:
        currentMaterials -
        cost.materials,
      influence:
        currentInfluence -
        cost.influence,
    })
    .eq("id", cityId)
    .eq("money", city.money)
    .eq(
      "materials",
      city.materials
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
      .from("city_researches")
      .delete()
      .eq("id", createdResearch.id)

    if (cityUpdateError) {
      console.error(
        "Erreur pendant le retrait des ressources :",
        cityUpdateError
      )

      throw cityUpdateError
    }

    throw new Error(
      "Les ressources de la ville ont changé. Recharge le jeu puis réessaie."
    )
  }

  return createdResearch as CityResearch
}
