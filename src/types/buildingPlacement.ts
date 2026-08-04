import type { BuildingType } from "./building"

export type BuildingPlacement = {
  type: BuildingType
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

export type BuildingPlacements = Record<
  BuildingType,
  BuildingPlacement
>