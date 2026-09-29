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

export type WorldResourceBundle = {
  money: number
  materials: number
  equipment: number
  influence: number
}

export type WorldOperationRewards =
  WorldResourceBundle & {
    commanderXp: number
  }

export type WorldSpecialLootDrop = {
  itemKey: string
  name: string
  icon: string
  chancePercent: number
  payload: WorldResourceBundle
}

export type WorldReplacementCost = {
  money: number
  equipment: number
  influence: number
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
  replacementCost: WorldReplacementCost

  rewards: WorldOperationRewards
  specialDrop?: WorldSpecialLootDrop
}

export type WorldSettlementProgress = {
  troopsReturnedAt?: string
  resourcesGrantedAt?: string
  commanderXpGrantedAt?: string
  specialDropGrantedAt?: string
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

  settlementProgress?: WorldSettlementProgress
  settledAt?: string
}
