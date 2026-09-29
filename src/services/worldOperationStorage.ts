import type {
  WorldOperation,
} from "../types/worldOperation"

const STORAGE_PREFIX =
  "crime-empire:world-operation"

function getStorageKey(
  cityId: string
) {
  return `${STORAGE_PREFIX}:${cityId}`
}

export function loadWorldOperation(
  cityId: string
): WorldOperation | null {
  if (
    !cityId ||
    typeof window === "undefined"
  ) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(
      getStorageKey(cityId)
    )

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<WorldOperation>

    if (
      parsed.cityId !== cityId ||
      !parsed.id ||
      !parsed.targetNodeId ||
      !parsed.targetName ||
      !parsed.startedAt ||
      !parsed.arrivalAt ||
      !parsed.selection
    ) {
      return null
    }

    /*
     * Compatibilité avec une opération créée par la Phase 1 :
     * on complète les nouveaux champs sans jeter l'expédition active.
     */
    return {
      ...parsed,
      playerId:
        parsed.playerId ?? "",
      targetIcon:
        parsed.targetIcon ?? "⚔️",
      targetType:
        parsed.targetType ?? "bot_territory",
      travelSeconds: Math.max(
        1,
        Math.floor(Number(parsed.travelSeconds) || 1)
      ),
      squadPower: Math.max(
        0,
        Math.floor(Number(parsed.squadPower) || 0)
      ),
      enemyPower: Math.max(
        1,
        Math.floor(Number(parsed.enemyPower) || 1)
      ),
      assaultPreparationSeconds: Math.max(
        0,
        Math.floor(Number(parsed.assaultPreparationSeconds) || 0)
      ),
      autoAssault:
        parsed.autoAssault ?? false,
      troopsReserved:
        parsed.troopsReserved ?? false,
      phase:
        parsed.phase ?? "outbound",
      combatResult:
        parsed.combatResult
          ? {
              ...parsed.combatResult,
              replacementCost:
                parsed.combatResult.replacementCost ?? {
                  money: 0,
                  equipment: 0,
                  influence: 0,
                },
            }
          : undefined,
      settlementProgress:
        parsed.settlementProgress ?? {},
    } as WorldOperation
  } catch {
    return null
  }
}

export function saveWorldOperation(
  operation: WorldOperation
) {
  if (
    !operation.cityId ||
    typeof window === "undefined"
  ) {
    return
  }

  window.localStorage.setItem(
    getStorageKey(operation.cityId),
    JSON.stringify(operation)
  )
}

export function clearWorldOperation(
  cityId: string
) {
  if (
    !cityId ||
    typeof window === "undefined"
  ) {
    return
  }

  window.localStorage.removeItem(
    getStorageKey(cityId)
  )
}
