import type {
  BuildingType,
} from "../types/building"

/*
 * Niveau minimal de Villa nécessaire
 * pour débloquer et utiliser chaque bâtiment.
 *
 * Identifiants internes :
 * workshop = Garage
 * hideout = Planque
 * wall = Sécurité
 * syndicate = Syndicat
 * factory = Usine
 */
export const BUILDING_UNLOCK_LEVELS: Record<
  BuildingType,
  number
> = {
  villa: 1,
  hideout: 2,
  workshop: 3,
  wall: 3,
  syndicate: 4,
  laboratory: 5,
  factory: 5,
}

export function getRequiredVillaLevel(
  buildingType: BuildingType
) {
  return (
    BUILDING_UNLOCK_LEVELS[
      buildingType
    ] ?? 1
  )
}

export function isBuildingUnlocked(
  buildingType: BuildingType,
  villaLevel: number
) {
  if (buildingType === "villa") {
    return true
  }

  const safeVillaLevel = Math.max(
    1,
    Number(villaLevel) || 1
  )

  return (
    safeVillaLevel >=
    getRequiredVillaLevel(
      buildingType
    )
  )
}