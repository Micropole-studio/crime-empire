export type BuildingType =
  | "villa"
  | "workshop"
  | "hideout"
  | "wall"
  | "laboratory"
  | "syndicate"
  | "factory"

export type Building = {
  id: string
  type: BuildingType
  level: number

  /*
   * État d'accès au bâtiment.
   */
  isLocked: boolean

  /*
   * Colonnes utilisées dans Supabase.
   */
  is_upgrading: boolean
  target_level: number | null
  upgrade_finish: string | null

  /*
   * Conservées temporairement pour éviter de casser
   * d'anciens composants qui utiliseraient encore x et y.
   * La carte utilise désormais BuildingPlacement.
   */
  x?: number
  y?: number
}