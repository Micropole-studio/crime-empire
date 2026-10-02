import { supabase } from "./supabase"

import type {
  GameNotification,
  NewGameNotification,
} from "../types/gameNotification"

function normalizeNotification(
  value: Record<string, unknown>
): GameNotification {
  return {
    id: String(value.id ?? ""),
    player_id: String(value.player_id ?? ""),
    category: String(value.category ?? "system"),
    tone:
      value.tone === "success" ||
      value.tone === "warning" ||
      value.tone === "danger"
        ? value.tone
        : "info",
    title: String(value.title ?? "Notification"),
    message: String(value.message ?? ""),
    data:
      value.data && typeof value.data === "object"
        ? (value.data as Record<string, unknown>)
        : {},
    read_at:
      typeof value.read_at === "string"
        ? value.read_at
        : null,
    created_at:
      typeof value.created_at === "string"
        ? value.created_at
        : new Date().toISOString(),
  }
}

export async function loadGameNotifications(
  playerId: string,
  limit = 60
): Promise<GameNotification[]> {
  if (!playerId) {
    return []
  }

  const { data, error } = await supabase
    .from("game_notifications")
    .select("id, player_id, category, tone, title, message, data, read_at, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)))

  if (error) {
    // La migration Notifications peut ne pas encore être exécutée.
    console.error("Impossible de charger les notifications :", error)
    return []
  }

  return (data ?? []).map((row) =>
    normalizeNotification(row as Record<string, unknown>)
  )
}

export async function createGameNotification(
  playerId: string,
  notification: NewGameNotification
): Promise<GameNotification | null> {
  if (!playerId) {
    return null
  }

  const { data, error } = await supabase
    .from("game_notifications")
    .insert({
      player_id: playerId,
      category: notification.category ?? "system",
      tone: notification.tone ?? "info",
      title: notification.title,
      message: notification.message ?? "",
      data: notification.data ?? {},
    })
    .select("id, player_id, category, tone, title, message, data, read_at, created_at")
    .single()

  if (error) {
    console.error("Impossible d'enregistrer la notification :", error)
    return null
  }

  return normalizeNotification(data as Record<string, unknown>)
}

export async function markGameNotificationRead(
  notificationId: string
) {
  const { error } = await supabase
    .from("game_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)

  if (error) {
    throw error
  }
}

export async function markAllGameNotificationsRead(
  playerId: string
) {
  const { error } = await supabase
    .from("game_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("player_id", playerId)
    .is("read_at", null)

  if (error) {
    throw error
  }
}
