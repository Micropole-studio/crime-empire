import { supabase } from "./supabase"

export type CityVisualSettings = {
  artStyle: "luxury" | "classic"
  renderer: "pixi" | "classic"
}

export const DEFAULT_CITY_VISUAL_SETTINGS: CityVisualSettings = {
  artStyle: "luxury",
  renderer: "pixi",
}

export function normalizeCityVisualSettings(input: unknown): CityVisualSettings {
  if (!input || typeof input !== "object") return { ...DEFAULT_CITY_VISUAL_SETTINGS }
  const record = input as Record<string, unknown>
  return {
    artStyle: record.artStyle === "classic" ? "classic" : "luxury",
    renderer: record.renderer === "classic" ? "classic" : "pixi",
  }
}

// Pas de localStorage : un seul choix, publié par l'administrateur pour tous.
export async function loadCityVisualSettings(): Promise<CityVisualSettings> {
  const { data, error } = await supabase.rpc("get_city_visual_settings")
  if (error) throw error
  return normalizeCityVisualSettings(data)
}

export async function publishCityVisualSettings(
  settings: CityVisualSettings
): Promise<CityVisualSettings> {
  const { data, error } = await supabase.rpc("save_city_visual_settings", {
    p_settings: settings,
  })
  if (error) throw error
  return normalizeCityVisualSettings(data)
}
