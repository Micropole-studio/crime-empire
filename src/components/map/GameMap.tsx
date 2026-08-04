import { useEffect, useMemo, useState } from "react"

import type {
  Building,
  BuildingType,
} from "../../types/building"

import type { BuildingPlacements } from "../../types/buildingPlacement"

import { BUILDING_NAMES } from "../../data/buildingNames"
import { loadBuildingPlacements } from "../../services/buildingPlacementStorage"

type Props = {
  buildings: Building[]
  onBuildingClick?: (id: string) => void
}

export default function GameMap({
  buildings,
  onBuildingClick,
}: Props) {
  const [placements, setPlacements] =
    useState<BuildingPlacements>(() =>
      loadBuildingPlacements()
    )

  /*
   * À chaque ouverture de GameMap, on recharge les positions
   * réglées dans MapEditor.
   */
  useEffect(() => {
    setPlacements(loadBuildingPlacements())
  }, [])

  /*
   * Protection temporaire contre les anciens doublons.
   * Pour chaque type, on garde le bâtiment ayant le niveau le plus élevé.
   */
  const uniqueBuildings = useMemo(() => {
    const buildingsByType =
      new Map<BuildingType, Building>()

    for (const building of buildings) {
      const existing = buildingsByType.get(building.type)

      if (
        !existing ||
        building.level > existing.level
      ) {
        buildingsByType.set(
          building.type,
          building
        )
      }
    }

    return Array.from(buildingsByType.values())
  }, [buildings])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl">
      {/* MAP */}
      <img
        src="/city-map.png"
        alt="Carte de la ville"
        className="block w-full select-none"
        draggable={false}
      />

      {/* BÂTIMENTS */}
      {uniqueBuildings.map((building) => {
        const placement = placements[building.type]

        return (
          <button
            key={building.id}
            type="button"
            className="group absolute cursor-pointer border-0 bg-transparent p-0 text-left"
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${placement.width}%`,
              zIndex: placement.zIndex,
              transform: `
                translate(-50%, -100%)
                rotate(${placement.rotation}deg)
              `,
              transformOrigin: "bottom center",
            }}
            onClick={() =>
              !building.isLocked &&
              onBuildingClick?.(building.id)
            }
            disabled={building.isLocked}
            aria-label={`Ouvrir ${BUILDING_NAMES[building.type]}`}
          >
            {/* OMBRE */}
            <div className="absolute bottom-[-2%] left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-full bg-black/50 blur-md" />

            {/* GLOW */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100 group-hover:drop-shadow-[0_0_22px_rgba(59,130,246,1)]" />

            {/* IMAGE */}
            <img
              src={`/buildings/${building.type}.png`}
              alt={BUILDING_NAMES[building.type]}
              className={`relative z-10 block w-full select-none transition duration-200 group-hover:brightness-110 ${
  building.is_upgrading
    ? "brightness-75 saturate-75"
    : ""
}`}
              draggable={false}
            />

           {/* NIVEAU */}
<div className="absolute bottom-0 left-1/2 z-30 flex h-6 min-w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-400 bg-zinc-950 px-1 text-xs font-black text-yellow-300 shadow-lg">
  {building.level}
</div>

{/* NOM */}
<div className="absolute left-1/2 top-full z-20 mt-5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
  {BUILDING_NAMES[building.type]}
</div>

{/* CONSTRUCTION EN COURS */}
{building.is_upgrading && (
  <>
    {/* Aura animée autour du bâtiment */}
    <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-500/5 animate-pulse shadow-[0_0_24px_rgba(251,191,36,0.35)]" />

    {/* Badge proche du pied du bâtiment */}
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-amber-300/60 bg-zinc-950/90 px-3 py-1.5 shadow-[0_0_18px_rgba(251,191,36,0.55)] backdrop-blur-sm">
        <span className="animate-bounce text-sm">
          🚧
        </span>

        <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.15em] text-amber-200">
          En travaux
        </span>
      </div>
    </div>
  </>
)}
            {/* VERROUILLÉ */}
            {building.isLocked && (
              <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-black/70 text-4xl grayscale">
                🔒
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}