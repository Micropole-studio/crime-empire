export type WorldMapAccessPlacement = {
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

/*
 * Placement de l'hélicoptère sur city-map.png.
 *
 * X et Y sont exprimés en pourcentage de la carte.
 * Tu pourras ajuster ces valeurs sans toucher à GameMap.
 */
export const WORLD_MAP_HELICOPTER_PLACEMENT: WorldMapAccessPlacement =
  {
    x: 22.2,
    y: 27.2,
    width: 15.5,
    rotation: -4,
    zIndex: 90,
  }
