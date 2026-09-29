import { TROOPS } from "./troops"

import {
  getCommanderMilitaryPowerBonusPercent,
} from "./commanderBonuses"

import type {
  CommanderSkills,
} from "../types/commander"

import type {
  HumanDeploymentSelection,
} from "../types/deployment"

import type {
  TroopType,
} from "../types/troop"

export type WorldPowerAssessment =
  | "overwhelming_advantage"
  | "advantage"
  | "balanced"
  | "dangerous"
  | "critical"

/*
 * La puissance d'opération est volontairement différente de la
 * « puissance globale de l'empire ». Elle ne mesure ici que la force
 * de l'escouade réellement envoyée sur la World Map.
 *
 * La formule reste simple pour cette première phase : attaque + défense
 * + 10 % des PV. Elle pourra ensuite être enrichie par l'équipement,
 * les contres d'unités, les véhicules et les bonus de territoire.
 */
export function getTroopOperationUnitPower(
  troopType: TroopType
) {
  const definition = TROOPS[troopType]

  if (!definition) {
    return 0
  }

  return Math.max(
    1,
    Math.round(
      definition.stats.attack +
        definition.stats.defense +
        definition.stats.health * 0.1
    )
  )
}

export function calculateWorldSquadBasePower(
  selection: HumanDeploymentSelection
) {
  return (
    Object.entries(selection) as Array<
      [TroopType, number | undefined]
    >
  ).reduce(
    (total, [troopType, quantity]) => {
      const safeQuantity = Math.max(
        0,
        Math.floor(Number(quantity) || 0)
      )

      return (
        total +
        safeQuantity *
          getTroopOperationUnitPower(
            troopType
          )
      )
    },
    0
  )
}

export function calculateWorldSquadPower(
  selection: HumanDeploymentSelection,
  commanderLevel: number,
  commanderSkills?: Partial<CommanderSkills> | null
) {
  const basePower =
    calculateWorldSquadBasePower(selection)

  const commanderBonusPercent =
    getCommanderMilitaryPowerBonusPercent(
      commanderLevel,
      commanderSkills
    )

  const totalPower = Math.max(
    0,
    Math.round(
      basePower *
        (1 + commanderBonusPercent / 100)
    )
  )

  return {
    basePower,
    commanderBonusPercent,
    totalPower,
  }
}

export function assessWorldPower(
  squadPower: number,
  enemyPower: number
): WorldPowerAssessment {
  const safeEnemyPower = Math.max(
    1,
    Number(enemyPower) || 1
  )

  const ratio =
    Math.max(0, Number(squadPower) || 0) /
    safeEnemyPower

  if (ratio >= 1.4) {
    return "overwhelming_advantage"
  }

  if (ratio >= 1.1) {
    return "advantage"
  }

  if (ratio >= 0.9) {
    return "balanced"
  }

  if (ratio >= 0.7) {
    return "dangerous"
  }

  return "critical"
}
