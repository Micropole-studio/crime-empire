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

  /*
   * Niveau 0 :
   * le terrain existe dans la base,
   * mais le bâtiment n'est pas construit.
   */
  level: number

  /*
   * Conservé pour rester compatible avec
   * les anciennes données. La carte recalcule
   * désormais le verrouillage depuis le niveau
   * réel de la Villa.
   */
  isLocked: boolean

  is_upgrading: boolean
  target_level: number | null
  upgrade_finish: string | null

  x?: number
  y?: number
}
