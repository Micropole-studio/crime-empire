import type { BuildingType } from "../types/building"

export const BUILDING_NAMES: Record<
  BuildingType,
  string
> = {
  villa: "Villa",
  workshop: "Garage",
  hideout: "Planque",
  wall: "Sécurité",
  laboratory: "Laboratoire",
  syndicate: "Syndicat",
  factory: "Usine"
}