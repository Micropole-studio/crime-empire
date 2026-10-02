import { supabase } from "./supabase"

import type {
  WorldPlayerCity,
} from "../types/worldPlayer"

export class MultiplayerWorldMigrationRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MultiplayerWorldMigrationRequiredError"
  }
}

function looksLikeMissingWorldFunction(error: {
  code?: string
  message?: string
}) {
  const message = (error.message ?? "").toLowerCase()

  return (
    error.code === "PGRST202" ||
    message.includes("ensure_current_world_position") ||
    message.includes("get_world_player_cities") ||
    message.includes("could not find the function")
  )
}

function normalizeWorldPlayerCity(
  value: unknown
): WorldPlayerCity | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const row = value as Record<string, unknown>

  if (!row.player_id || !row.city_id) {
    return null
  }

  const x = Number(row.x)
  const y = Number(row.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return {
    player_id: String(row.player_id),
    city_id: String(row.city_id),
    username:
      String(row.username ?? "Empire inconnu").trim() ||
      "Empire inconnu",
    region_key: String(row.region_key ?? "region_1"),
    x,
    y,
    villa_level: Math.max(0, Number(row.villa_level) || 0),
    commander_level: Math.max(
      1,
      Number(row.commander_level) || 1
    ),
    estimated_power: Math.max(
      0,
      Number(row.estimated_power) || 0
    ),
    protection_until:
      row.protection_until
        ? String(row.protection_until)
        : null,
    spawned_at:
      row.spawned_at
        ? String(row.spawned_at)
        : null,
    is_current: Boolean(row.is_current),
  }
}

export async function ensureCurrentWorldPosition() {
  const { data, error } = await supabase.rpc(
    "ensure_current_world_position"
  )

  if (error) {
    if (looksLikeMissingWorldFunction(error)) {
      throw new MultiplayerWorldMigrationRequiredError(
        "La migration Multiplayer World 1 n'a pas encore été exécutée."
      )
    }

    throw error
  }

  return data
}

export async function loadWorldPlayerCities(): Promise<WorldPlayerCity[]> {
  const { data, error } = await supabase.rpc(
    "get_world_player_cities"
  )

  if (error) {
    if (looksLikeMissingWorldFunction(error)) {
      throw new MultiplayerWorldMigrationRequiredError(
        "La migration Multiplayer World 1 n'a pas encore été exécutée."
      )
    }

    throw error
  }

  const rows = Array.isArray(data) ? data : []

  return rows
    .map(normalizeWorldPlayerCity)
    .filter(
      (item): item is WorldPlayerCity => Boolean(item)
    )
}
