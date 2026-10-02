export const WORLD_MAP_WIDTH = 6000
export const WORLD_MAP_HEIGHT = 4500

export const WORLD_REGION_KEY = "region_1"

/*
 * La carte illustrée actuelle devient le secteur central de la Région 1.
 * Le reste de la surface est réservé aux villes joueurs et aux futurs secteurs.
 */
export const CENTRAL_REGION_BOUNDS = {
  left: 32,
  top: 32,
  width: 36,
  height: 36,
} as const

export function mapCentralPoint(
  xPercent: number,
  yPercent: number
) {
  return {
    x:
      CENTRAL_REGION_BOUNDS.left +
      (xPercent / 100) * CENTRAL_REGION_BOUNDS.width,
    y:
      CENTRAL_REGION_BOUNDS.top +
      (yPercent / 100) * CENTRAL_REGION_BOUNDS.height,
  }
}

export function mapCentralHotspot(
  widthPercent: number,
  heightPercent: number
) {
  return {
    width:
      (widthPercent / 100) * CENTRAL_REGION_BOUNDS.width,
    height:
      (heightPercent / 100) * CENTRAL_REGION_BOUNDS.height,
  }
}

/*
 * Échelle purement gameplay : 100 % de largeur de Région 1 ≈ 60 km.
 * Elle sert aux distances affichées et aux futurs temps de trajet PvP.
 */
export const WORLD_WIDTH_KM = 60
export const WORLD_HEIGHT_KM = 45

export function getWorldDistanceKm(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const dx =
    ((toX - fromX) / 100) * WORLD_WIDTH_KM
  const dy =
    ((toY - fromY) / 100) * WORLD_HEIGHT_KM

  return Math.hypot(dx, dy)
}

export function getPvpTravelSeconds(
  distanceKm: number
) {
  /*
   * MVP : environ 8 secondes de jeu par kilomètre, minimum 60 secondes.
   * Cette formule pourra ensuite dépendre des véhicules/recherches.
   */
  return Math.max(
    60,
    Math.round(
      Math.max(0, distanceKm) * 8
    )
  )
}
