import { supabase } from "./supabase"

export type SynchronizedBuilding = {
  id: string
  level: number
}

/*
 * La mise à jour du bâtiment déclenche désormais
 * automatiquement l'attribution sécurisée de l'XP
 * côté Supabase.
 *
 * Le trigger SQL couvre également les constructions
 * terminées directement avec un accélérateur.
 */
export async function syncBuildings(
  buildings: any[]
): Promise<SynchronizedBuilding[]> {
  const now =
    new Date().toISOString()

  const synchronized:
    SynchronizedBuilding[] = []

  for (const building of buildings) {
    if (!building.is_upgrading) {
      continue
    }

    if (!building.upgrade_finish) {
      continue
    }

    const finishTime =
      new Date(
        building.upgrade_finish
      ).getTime()

    if (
      Number.isNaN(finishTime) ||
      Date.now() < finishTime
    ) {
      continue
    }

    const {
      data,
      error,
    } = await supabase
      .from("buildings")
      .update({
        level:
          building.target_level,

        target_level:
          null,

        is_upgrading:
          false,

        upgrade_finish:
          null,
      })
      .eq(
        "id",
        building.id
      )
      .eq(
        "is_upgrading",
        true
      )
      .lte(
        "upgrade_finish",
        now
      )
      .select(
        `
          id,
          level
        `
      )
      .maybeSingle()

    if (error) {
      console.error(
        "Erreur pendant la finalisation du bâtiment :",
        error
      )

      throw error
    }

    /*
     * Un autre onglet peut avoir terminé
     * exactement la même construction.
     *
     * Dans ce cas, data vaut null et le trigger
     * n'accorde pas une seconde fois l'XP.
     */
    if (data) {
      synchronized.push({
        id:
          String(data.id),

        level:
          Number(
            data.level
          ) || 0,
      })
    }
  }

  return synchronized
}
