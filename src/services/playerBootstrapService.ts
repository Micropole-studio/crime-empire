import type { User } from "@supabase/supabase-js"

import { supabase } from "./supabase"
import { getPreferredUsername } from "./authService"

export type PlayerBootstrapResult = {
  player_id: string
  city_id: string
  created: boolean
  linked_legacy_player: boolean
  is_admin: boolean
}

export class DatabaseMigrationRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DatabaseMigrationRequiredError"
  }
}

function looksLikeMissingBootstrapFunction(error: {
  code?: string
  message?: string
}) {
  const message = (error.message ?? "").toLowerCase()

  return (
    error.code === "PGRST202" ||
    message.includes("bootstrap_current_player") ||
    message.includes("could not find the function")
  )
}

export async function bootstrapCurrentPlayer(
  user: User
): Promise<PlayerBootstrapResult> {
  const username = getPreferredUsername(user)

  const { data, error } = await supabase.rpc(
    "bootstrap_current_player",
    {
      p_username: username,
    }
  )

  if (error) {
    if (looksLikeMissingBootstrapFunction(error)) {
      throw new DatabaseMigrationRequiredError(
        "La migration Supabase Player Auth MVP n'a pas encore été exécutée."
      )
    }

    throw error
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Supabase n'a pas renvoyé les informations de la partie joueur."
    )
  }

  const result = data as Partial<PlayerBootstrapResult>

  if (!result.player_id || !result.city_id) {
    throw new Error(
      "La partie joueur a été créée mais les identifiants retournés sont invalides."
    )
  }

  return {
    player_id: String(result.player_id),
    city_id: String(result.city_id),
    created: Boolean(result.created),
    linked_legacy_player: Boolean(result.linked_legacy_player),
    is_admin: Boolean(result.is_admin),
  }
}
