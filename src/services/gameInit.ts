import { supabase } from "./supabase"
import { bootstrapCurrentPlayer } from "./playerBootstrapService"

/*
 * Compatibilité avec les anciens imports du projet.
 *
 * La création d'un joueur n'est plus faite directement
 * depuis le navigateur avec un simple e-mail. Elle passe
 * obligatoirement par Supabase Auth puis par la fonction
 * SQL bootstrap_current_player().
 */
export async function initNewPlayer() {
  const {
    data,
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error(
      "Impossible de créer la partie : utilisateur non authentifié"
    )
  }

  return bootstrapCurrentPlayer(
    data.user
  )
}
