import type {
  TroopType,
} from "./troop"

export type HumanDeploymentSelection =
  Partial<
    Record<
      TroopType,
      number
    >
  >

export type DeploymentCapacity = {
  baseCommandPoints: number
  buildingBonusCommandPoints: number
  researchBonusCommandPoints: number
  totalCommandPoints: number
}

export type DeploymentUsage = {
  usedCommandPoints: number
  totalCommandPoints: number
  remainingCommandPoints: number
  isWithinCapacity: boolean
}
