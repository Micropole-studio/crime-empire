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

    const parsed = JSON.parse(
      raw
    ) as Partial<WorldOperation>

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

    return parsed as WorldOperation
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
