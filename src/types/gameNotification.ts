export type GameNotificationTone =
  | "info"
  | "success"
  | "warning"
  | "danger"

export type GameNotificationCategory =
  | "battle"
  | "world"
  | "building"
  | "research"
  | "recruitment"
  | "inventory"
  | "system"

export type GameNotification = {
  id: string
  player_id: string
  category: GameNotificationCategory | string
  tone: GameNotificationTone
  title: string
  message: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export type NewGameNotification = {
  category?: GameNotificationCategory | string
  tone?: GameNotificationTone
  title: string
  message?: string
  data?: Record<string, unknown>
}
