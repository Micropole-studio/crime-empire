import type {
  HumanDeploymentSelection,
} from "./deployment"

import type {
  WorldNodeType,
  WorldRewardRange,
} from "./worldMap"

export type WorldOperationPhase =
  | "outbound"
  | "ready"
  | "assault_preparation"
  | "returning"
  | "returned"

export type WorldCombatOutcome =
  | "victory"
  | "defeat"
  | "recalled"

export type WorldOperationRewards = {
  money: number
  materials: number
  equipment: number
  influence: number
  commanderXp: number
}

export type WorldCombatResult = {
  outcome: Exclude<
    WorldCombatOutcome,
    "recalled"
  >

  resolvedAt: string

  attackerPower: number
  enemyPower: number
  attackerEffectivePower: number
  enemyEffectivePower: number

  casualties: HumanDeploymentSelection
  survivors: HumanDeploymentSelection
  casualtyPercent: number

  rewards: WorldOperationRewards
}

export type WorldOperation = {
  id: string
  cityId: string
  playerId: string

  targetNodeId: string
  targetName: string
  targetIcon: string
  targetType: WorldNodeType

  startedAt: string
  arrivalAt: string

  travelSeconds: number

  squadPower: number
  enemyPower: number

  selection: HumanDeploymentSelection
  troopsReserved: boolean

  /*
   * En PvE, 0 seconde : l'assaut est résolu immédiatement une fois
   * l'ordre donné. Pour les futures villes PvP, la valeur prévue est
   * actuellement de 120 secondes afin de laisser au défenseur une
   * fenêtre de réaction.
   */
  assaultPreparationSeconds: number
  autoAssault: boolean

  phase: WorldOperationPhase
  assaultOrderedAt?: string
  assaultResolvesAt?: string

  targetRewards?: WorldRewardRange
  targetCooldownHours?: number

  combatResult?: WorldCombatResult

  returnStartedAt?: string
  returnAt?: string
  recalledAt?: string

  settledAt?: string
}
