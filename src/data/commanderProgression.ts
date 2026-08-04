import type {
  BuildingType,
} from "../types/building"

/*
 * XP accordée lorsque le niveau est réellement terminé.
 *
 * La récompense est enregistrée côté SQL avec une clé unique :
 * un même niveau de bâtiment ne peut donc jamais donner deux fois
 * son XP, même en cas de synchronisations simultanées.
 */
const BUILDING_XP_BY_LEVEL: Record<
  number,
  number
> = {
  1: 5,
  2: 10,
  3: 15,
  4: 22,
  5: 32,
  6: 45,
  7: 60,
  8: 80,
  9: 105,
  10: 140,
}

const BUILDING_XP_MULTIPLIER: Record<
  BuildingType,
  number
> = {
  villa: 1.25,
  workshop: 1,
  hideout: 1,
  wall: 1.15,
  laboratory: 1.1,
  syndicate: 1.05,
  factory: 1.05,
}

export function getBuildingUpgradeXp(
  buildingType: BuildingType,
  targetLevel: number
) {
  const safeLevel = Math.min(
    10,
    Math.max(
      1,
      Math.floor(
        Number(targetLevel) || 1
      )
    )
  )

  const baseXp =
    BUILDING_XP_BY_LEVEL[
      safeLevel
    ] ?? 0

  const multiplier =
    BUILDING_XP_MULTIPLIER[
      buildingType
    ] ?? 1

  return Math.max(
    0,
    Math.round(
      baseXp *
        multiplier
    )
  )
}
