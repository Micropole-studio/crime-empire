import type { User } from "@supabase/supabase-js"

import { supabase } from "./supabase"

export type SignUpResult = {
  requiresEmailConfirmation: boolean
}

export async function signInWithPassword(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signUpPlayer(
  email: string,
  password: string,
  username: string
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedUsername = username.trim()

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        username: normalizedUsername,
      },
      emailRedirectTo:
        typeof window !== "undefined"
          ? window.location.origin
          : undefined,
    },
  })

  if (error) {
    throw error
  }

  return {
    requiresEmailConfirmation: !data.session,
  }
}

export async function signOutPlayer() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export function getPreferredUsername(user: User) {
  const metadataUsername =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username.trim()
      : ""

  if (metadataUsername) {
    return metadataUsername
  }

  const emailPrefix = user.email?.split("@")[0]?.trim() ?? ""

  return emailPrefix || "Commandant"
}
