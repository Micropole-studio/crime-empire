import {
  DEFAULT_WORLD_CITY_RENDER_TEMPLATE,
  normalizeWorldCityRenderTemplate,
} from "../data/worldCityRenderTemplate"

import type {
  WorldCityRenderTemplate,
} from "../types/worldCityRenderTemplate"

import { supabase } from "./supabase"

export class WorldCityRenderTemplateMigrationRequiredError extends Error {
  constructor() {
    super("La migration World City Render Template n'a pas encore été exécutée.")
    this.name = "WorldCityRenderTemplateMigrationRequiredError"
  }
}

function looksLikeMissingFunction(error: {
  code?: string
  message?: string
}) {
  const message = (error.message ?? "").toLowerCase()

  return (
    error.code === "PGRST202" ||
    message.includes("get_world_city_render_template") ||
    message.includes("save_world_city_render_template") ||
    message.includes("could not find the function")
  )
}

export async function loadWorldCityRenderTemplate(): Promise<WorldCityRenderTemplate> {
  const { data, error } = await supabase.rpc(
    "get_world_city_render_template"
  )

  if (error) {
    if (looksLikeMissingFunction(error)) {
      throw new WorldCityRenderTemplateMigrationRequiredError()
    }

    throw error
  }

  return normalizeWorldCityRenderTemplate(
    data ?? DEFAULT_WORLD_CITY_RENDER_TEMPLATE
  )
}

export async function saveWorldCityRenderTemplate(
  template: WorldCityRenderTemplate
): Promise<WorldCityRenderTemplate> {
  const normalized = normalizeWorldCityRenderTemplate(template)

  const { data, error } = await supabase.rpc(
    "save_world_city_render_template",
    {
      p_template: {
        offset_x: normalized.offsetX,
        offset_y: normalized.offsetY,
        scale: normalized.scale,
        rotation: normalized.rotation,
        label_offset_x: normalized.labelOffsetX,
        label_offset_y: normalized.labelOffsetY,
      },
    }
  )

  if (error) {
    if (looksLikeMissingFunction(error)) {
      throw new WorldCityRenderTemplateMigrationRequiredError()
    }

    throw error
  }

  return normalizeWorldCityRenderTemplate(data)
}
