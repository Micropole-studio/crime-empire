import type {
  BuildingPlacements,
} from "../types/buildingPlacement"

export const DEFAULT_BUILDING_PLACEMENTS: BuildingPlacements = {
  villa: {
    type: "villa",
    x: 25,
    y: 60,
    width: 18,
    rotation: 0,
    zIndex: 4,
  },

  workshop: {
    type: "workshop",
    x: 65,
    y: 45,
    width: 15,
    rotation: 0,
    zIndex: 3,
  },

  hideout: {
    type: "hideout",
    x: 22,
    y: 30,
    width: 13,
    rotation: 0,
    zIndex: 2,
  },

  wall: {
    type: "wall",
    x: 75,
    y: 70,
    width: 16,
    rotation: 0,
    zIndex: 5,
  },

  laboratory: {
    type: "laboratory",
    x: 50,
    y: 50,
    width: 12,
    rotation: 0,
    zIndex: 10,
  },

  syndicate: {
    type: "syndicate",
    x: 45,
    y: 25,
    width: 13,
    rotation: 0,
    zIndex: 6,
  },

  factory: {
    type: "factory",
    x: 82,
    y: 28,
    width: 15,
    rotation: 0,
    zIndex: 7,
  },
}