import type {
  CommanderSkills,
} from "../types/commander"

import type {
  MissionRewardRange,
} from "../types/mission"

type EconomyRates = {
  moneyPerHour: number
  materialsPerHour: number
  influencePerHour: number
  equipmentPerHour: number
}

function safeLevel(
  value: unknown,
  maximum = 5
) {
  return Math.min(
    maximum,
    Math.max(
      0,
      Math.floor(
        Number(value) || 0
      )
    )
  )
}

export function getCommanderMoneyBonusPercent(
  skills?: Partial<CommanderSkills> | null
) {
  return safeLevel(
    skills?.underground_management
  )
}

export function getCommanderMissionTimeReductionPercent(
  skills?: Partial<CommanderSkills> | null
) {
  return safeLevel(
    skills?.operation_logistics
  )
}

export function getCommanderMissionRewardBonusPercent(
  commanderLevel: number
) {
  const safeCommanderLevel =
    Math.max(
      1,
      Math.floor(
        Number(
          commanderLevel
        ) || 1
      )
    )

  return Math.max(
    0,
    safeCommanderLevel - 1
  ) * 0.25
}

export function getCommanderMilitaryPowerBonusPercent(
  commanderLevel: number,
  skills?: Partial<CommanderSkills> | null
) {
  const passiveBonus =
    Math.max(
      0,
      Math.floor(
        Number(
          commanderLevel
        ) || 1
      ) - 1
    ) * 0.5

  const skillBonus =
    safeLevel(
      skills?.military_power
    ) * 2

  return (
    passiveBonus +
    skillBonus
  )
}

export function applyCommanderEconomyBonus(
  economy: EconomyRates,
  skills?: Partial<CommanderSkills> | null
): EconomyRates {
  const moneyBonusPercent =
    getCommanderMoneyBonusPercent(
      skills
    )

  return {
    ...economy,

    moneyPerHour:
      economy.moneyPerHour *
      (
        1 +
        moneyBonusPercent /
          100
      ),
  }
}

export function applyCommanderMissionTimeBonus(
  baseDurationSeconds: number,
  skills?: Partial<CommanderSkills> | null
) {
  const reductionPercent =
    getCommanderMissionTimeReductionPercent(
      skills
    )

  return Math.max(
    1,
    Math.ceil(
      Math.max(
        1,
        Number(
          baseDurationSeconds
        ) || 1
      ) *
      (
        1 -
        reductionPercent /
          100
      )
    )
  )
}

function applyRewardBonus(
  value: number,
  bonusPercent: number
) {
  if (
    !Number.isFinite(
      Number(value)
    ) ||
    value <= 0
  ) {
    return 0
  }

  return Math.floor(
    value *
    (
      1 +
      bonusPercent /
        100
    )
  )
}

export function applyCommanderMissionRewardBonus(
  rewardRange: MissionRewardRange,
  commanderLevel: number
): MissionRewardRange {
  const bonusPercent =
    getCommanderMissionRewardBonusPercent(
      commanderLevel
    )

  return {
    moneyMin:
      applyRewardBonus(
        rewardRange.moneyMin,
        bonusPercent
      ),

    moneyMax:
      applyRewardBonus(
        rewardRange.moneyMax,
        bonusPercent
      ),

    materialsMin:
      applyRewardBonus(
        rewardRange.materialsMin,
        bonusPercent
      ),

    materialsMax:
      applyRewardBonus(
        rewardRange.materialsMax,
        bonusPercent
      ),

    influenceMin:
      applyRewardBonus(
        rewardRange.influenceMin,
        bonusPercent
      ),

    influenceMax:
      applyRewardBonus(
        rewardRange.influenceMax,
        bonusPercent
      ),

    equipmentMin:
      applyRewardBonus(
        rewardRange.equipmentMin,
        bonusPercent
      ),

    equipmentMax:
      applyRewardBonus(
        rewardRange.equipmentMax,
        bonusPercent
      ),
  }
}
