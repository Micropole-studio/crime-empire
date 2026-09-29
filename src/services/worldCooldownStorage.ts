const STORAGE_PREFIX =
  "crime-empire:world-cooldowns"

type CooldownMap = Record<
  string,
  string
>

function getStorageKey(
  cityId: string
) {
  return `${STORAGE_PREFIX}:${cityId}`
}

function loadCooldowns(
  cityId: string
): CooldownMap {
  if (
    !cityId ||
    typeof window === "undefined"
  ) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(
      getStorageKey(cityId)
    )

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return {}
    }

    return parsed as CooldownMap
  } catch {
    return {}
  }
}

function saveCooldowns(
  cityId: string,
  cooldowns: CooldownMap
) {
  if (
    !cityId ||
    typeof window === "undefined"
  ) {
    return
  }

  window.localStorage.setItem(
    getStorageKey(cityId),
    JSON.stringify(cooldowns)
  )
}

export function getWorldNodeCooldownRemainingSeconds(
  cityId: string,
  nodeId: string,
  currentTime = Date.now()
) {
  const cooldowns =
    loadCooldowns(cityId)

  const raw = cooldowns[nodeId]

  if (!raw) {
    return 0
  }

  const endTime = new Date(raw).getTime()

  if (!Number.isFinite(endTime)) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (endTime - currentTime) /
        1000
    )
  )
}

export function setWorldNodeCooldown(
  cityId: string,
  nodeId: string,
  cooldownHours: number,
  startedAt = Date.now()
) {
  const safeHours = Math.max(
    0,
    Number(cooldownHours) || 0
  )

  if (
    !cityId ||
    !nodeId ||
    safeHours <= 0
  ) {
    return
  }

  const cooldowns =
    loadCooldowns(cityId)

  cooldowns[nodeId] = new Date(
    startedAt +
      safeHours * 60 * 60 * 1000
  ).toISOString()

  saveCooldowns(
    cityId,
    cooldowns
  )
}
