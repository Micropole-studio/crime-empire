import type {
  Building,
} from "../types/building"

import {
  BUILDING_NAMES,
} from "../data/buildingNames"

type Props = {
  building: Building

  /*
   * Conservé pour rester compatible avec
   * les anciens appels du composant.
   */
  city?: unknown

  /*
   * Autorise d'anciens paramètres éventuels
   * sans bloquer la compilation.
   */
  [key: string]: unknown
}

export default function BuildingPanel({
  building,
}: Props) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-black text-white">
        {
          BUILDING_NAMES[
            building.type
          ] || building.type
        }
      </h3>

      <p className="mt-1 text-sm text-zinc-400">
        Niveau{" "}
        {Math.max(
          0,
          Number(building.level) || 0
        )}
      </p>
    </section>
  )
}
