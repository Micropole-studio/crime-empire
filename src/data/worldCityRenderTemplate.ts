import type {
  WorldCityRenderTemplate,
} from "../types/worldCityRenderTemplate"

export const DEFAULT_WORLD_CITY_RENDER_TEMPLATE: WorldCityRenderTemplate = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  labelOffsetX: 0,
  labelOffsetY: 0,
}

function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numeric))
}

export function normalizeWorldCityRenderTemplate(
  value: unknown
): WorldCityRenderTemplate {
  const row =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {}

  return {
    offsetX: clamp(row.offset_x ?? row.offsetX, -80, 80, 0),
    offsetY: clamp(row.offset_y ?? row.offsetY, -80, 80, 0),
    scale: clamp(row.scale, 0.45, 2.5, 1),
    rotation: clamp(row.rotation, -25, 25, 0),
    labelOffsetX: clamp(
      row.label_offset_x ?? row.labelOffsetX,
      -80,
      80,
      0
    ),
    labelOffsetY: clamp(
      row.label_offset_y ?? row.labelOffsetY,
      -80,
      80,
      0
    ),
  }
}
