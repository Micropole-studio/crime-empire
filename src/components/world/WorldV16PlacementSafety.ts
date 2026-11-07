/**
 * V16.3 — vérification visuelle des conflits ville / lieux PvE publiés.
 * Cette fonction NE DÉPLACE PAS les joueurs : les coordonnées Supabase restent la source de vérité.
 * Une ville en conflit reste cliquable et peut être déplacée via le flux serveur existant.
 */
import type { V16PublishedScene, V16SceneNode } from "../../services/worldVisualSceneService"

const ART_W = 1672
const ART_H = 941
const POI_KINDS = new Set(["port", "prison", "blackmarket", "weapons"])

export type WorldNormalizedPoint = { x: number; y: number }

function poiBounds(node: V16SceneNode) {
  const w = node.w * node.scale
  const h = node.h * node.scale
  // Même géométrie que VisualPoi dans WorldV16PublishedArtwork.tsx.
  return {
    l: node.x - (w - node.w) / 2,
    r: node.x - (w - node.w) / 2 + w,
    t: node.y - (h - node.h),
    b: node.y - (h - node.h) + h,
  }
}

/**
 * Empreinte prudente d'une ville de la carte en pixels de l'illustration V16.
 * Calcul volontairement légèrement supérieur au socle du sprite : pas de double bâtiment.
 */
export function getV16CityConflict(
  position: WorldNormalizedPoint,
  scene: V16PublishedScene | null,
): V16SceneNode | null {
  if (!scene) return null
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return null
  const px = position.x / 100 * ART_W
  const py = position.y / 100 * ART_H
  const city = { l: px - 68, r: px + 68, t: py - 74, b: py + 24 }
  const area = (city.r - city.l) * (city.b - city.t)
  for (const node of scene.nodes) {
    if (!POI_KINDS.has(node.kind)) continue
    const b = poiBounds(node)
    const ix = Math.max(0, Math.min(city.r, b.r) - Math.max(city.l, b.l))
    const iy = Math.max(0, Math.min(city.b, b.b) - Math.max(city.t, b.t))
    // Ne signale pas les simples voisinages : la villa doit réellement mordre sur le POI.
    if (ix * iy >= area * 0.17) return node
  }
  return null
}

export function getSafeV16RelocationSlots<T extends WorldNormalizedPoint>(
  slots: T[],
  scene: V16PublishedScene | null,
): T[] {
  if (!scene) return slots
  return slots.filter((slot) => getV16CityConflict(slot, scene) === null)
}
