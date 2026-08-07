import type {
  TroopType,
} from "../types/troop"

import type {
  DeploymentCapacity,
  DeploymentUsage,
  HumanDeploymentSelection,
} from "../types/deployment"

/*
 * Ces valeurs étaient auparavant utilisées comme
 * plafond du nombre total de troupes possédées.
 *
 * Elles représentent maintenant uniquement les
 * points disponibles pour préparer une opération.
 */
export const SECURITY_DEPLOYMENT_POINTS_BY_LEVEL:
  Record<number, number> = {
    0: 0,
    1: 10,
    2: 15,
    3: 25,
    4: 35,
    5: 50,
    6: 70,
    7: 95,
    8: 125,
    9: 160,
    10: 200,
  }

/*
 * Coût provisoire des unités humaines.
 *
 * Les véhicules disposeront plus tard de leur
 * propre table de coûts et de leurs propres limites.
 */
export const HUMAN_TROOP_COMMAND_POINT_COST:
  Record<TroopType, number> = {
    henchman_1: 1,
    henchman_2: 2,
    henchman_3: 3,
    lieutenant_1: 5,
  }

export function getSecurityDeploymentCapacity(
  securityLevel: number,
  buildingBonusCommandPoints = 0,
  researchBonusCommandPoints = 0
): DeploymentCapacity {
  const safeLevel =
    Math.max(
      0,
      Math.min(
        10,
        Math.floor(
          Number(
            securityLevel
          ) || 0
        )
      )
    )

  const baseCommandPoints =
    SECURITY_DEPLOYMENT_POINTS_BY_LEVEL[
      safeLevel
    ] ?? 0

  const safeBuildingBonus =
    Math.max(
      0,
      Math.floor(
        Number(
          buildingBonusCommandPoints
        ) || 0
      )
    )

  const safeResearchBonus =
    Math.max(
      0,
      Math.floor(
        Number(
          researchBonusCommandPoints
        ) || 0
      )
    )

  return {
    baseCommandPoints,

    buildingBonusCommandPoints:
      safeBuildingBonus,

    researchBonusCommandPoints:
      safeResearchBonus,

    totalCommandPoints:
      baseCommandPoints +
      safeBuildingBonus +
      safeResearchBonus,
  }
}

export function getTroopCommandPointCost(
  troopType: TroopType
) {
  return Math.max(
    1,
    HUMAN_TROOP_COMMAND_POINT_COST[
      troopType
    ] ?? 1
  )
}

export function calculateHumanDeploymentCommandPoints(
  selection:
    HumanDeploymentSelection
) {
  return (
    Object.entries(
      selection
    ) as Array<
      [
        TroopType,
        number | undefined,
      ]
    >
  ).reduce(
    (
      total,
      [
        troopType,
        quantity,
      ]
    ) => {
      const safeQuantity =
        Math.max(
          0,
          Math.floor(
            Number(
              quantity
            ) || 0
          )
        )

      return (
        total +
        safeQuantity *
          getTroopCommandPointCost(
            troopType
          )
      )
    },
    0
  )
}

export function getHumanDeploymentUsage(
  selection:
    HumanDeploymentSelection,
  capacity:
    DeploymentCapacity
): DeploymentUsage {
  const usedCommandPoints =
    calculateHumanDeploymentCommandPoints(
      selection
    )

  const totalCommandPoints =
    Math.max(
      0,
      Math.floor(
        Number(
          capacity.totalCommandPoints
        ) || 0
      )
    )

  return {
    usedCommandPoints,
    totalCommandPoints,

    remainingCommandPoints:
      Math.max(
        0,
        totalCommandPoints -
          usedCommandPoints
      ),

    isWithinCapacity:
      usedCommandPoints <=
      totalCommandPoints,
  }
}
