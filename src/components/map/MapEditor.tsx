import {
  useState,
  type MouseEvent,
} from "react"

import type {
  BuildingType,
} from "../../types/building"

import type {
  BuildingPlacement,
  BuildingPlacements,
} from "../../types/buildingPlacement"

import { BUILDING_NAMES } from "../../data/buildingNames"

import {
  loadBuildingPlacements,
  resetBuildingPlacements,
  saveBuildingPlacements,
} from "../../services/buildingPlacementStorage"

type Props = {
  onSave?: (
    placement: BuildingPlacement
  ) => void
}

const BUILDING_TYPES: BuildingType[] = [
  "villa",
  "workshop",
  "hideout",
  "wall",
  "laboratory",
  "syndicate",
  "factory",
]

export default function MapEditor({
  onSave,
}: Props) {
  const [
    selectedType,
    setSelectedType,
  ] = useState<BuildingType>("villa")

  const [
    placements,
    setPlacements,
  ] = useState<BuildingPlacements>(() =>
    loadBuildingPlacements()
  )

  const selectedPlacement =
    placements[selectedType]

  function updateSelectedPlacement(
    changes: Partial<BuildingPlacement>
  ) {
    setPlacements((previous) => {
      const updatedPlacement: BuildingPlacement =
        {
          ...previous[selectedType],
          ...changes,
          type: selectedType,
        }

      const updatedPlacements: BuildingPlacements =
        {
          ...previous,
          [selectedType]:
            updatedPlacement,
        }

      saveBuildingPlacements(
        updatedPlacements
      )

      onSave?.(updatedPlacement)

      return updatedPlacements
    })
  }

  function handleMapClick(
    event: MouseEvent<HTMLDivElement>
  ) {
    /*
     * Ignore les clics effectués sur
     * les contrôles de l'éditeur.
     */
    if (
      event.target instanceof
        HTMLElement &&
      event.target.closest(
        "[data-editor-control]"
      )
    ) {
      return
    }

    const rect =
      event.currentTarget.getBoundingClientRect()

    const x =
      ((event.clientX - rect.left) /
        rect.width) *
      100

    const y =
      ((event.clientY - rect.top) /
        rect.height) *
      100

    updateSelectedPlacement({
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    })
  }

  function handleReset() {
    const defaults =
      resetBuildingPlacements()

    setPlacements(defaults)
  }

  return (
    <div className="space-y-4">
      {/* SÉLECTION DU BÂTIMENT */}
      <div
        data-editor-control
        className="flex flex-wrap gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-3"
      >
        {BUILDING_TYPES.map((type) => {
          const isSelected =
            selectedType === type

          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                setSelectedType(type)
              }
              className={`rounded-lg px-4 py-2 font-semibold transition ${
                isSelected
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {BUILDING_NAMES[type]}
            </button>
          )
        })}
      </div>

      {/* CONTRÔLES VISUELS */}
      <div
        data-editor-control
        className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 md:grid-cols-4"
      >
        {/* TAILLE */}
        <label className="space-y-2">
          <span className="text-sm text-zinc-400">
            Taille :{" "}
            {selectedPlacement.width.toFixed(
              1
            )}{" "}
            %
          </span>

          <input
            type="range"
            min="3"
            max="40"
            step="0.5"
            value={
              selectedPlacement.width
            }
            onChange={(event) =>
              updateSelectedPlacement({
                width: Number(
                  event.target.value
                ),
              })
            }
            className="w-full"
          />
        </label>

        {/* ROTATION */}
        <label className="space-y-2">
          <span className="text-sm text-zinc-400">
            Rotation :{" "}
            {
              selectedPlacement.rotation
            }
            °
          </span>

          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={
              selectedPlacement.rotation
            }
            onChange={(event) =>
              updateSelectedPlacement({
                rotation: Number(
                  event.target.value
                ),
              })
            }
            className="w-full"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                updateSelectedPlacement({
                  rotation: 0,
                })
              }
              className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600"
            >
              Remettre droit
            </button>

            <button
              type="button"
              onClick={() =>
                updateSelectedPlacement({
                  rotation:
                    selectedPlacement.rotation -
                    90,
                })
              }
              className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600"
            >
              -90°
            </button>

            <button
              type="button"
              onClick={() =>
                updateSelectedPlacement({
                  rotation:
                    selectedPlacement.rotation +
                    90,
                })
              }
              className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600"
            >
              +90°
            </button>
          </div>
        </label>

        {/* PROFONDEUR */}
        <label className="space-y-2">
          <span className="text-sm text-zinc-400">
            Profondeur :{" "}
            {selectedPlacement.zIndex}
          </span>

          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={
              selectedPlacement.zIndex
            }
            onChange={(event) =>
              updateSelectedPlacement({
                zIndex: Number(
                  event.target.value
                ),
              })
            }
            className="w-full"
          />
        </label>

        {/* RÉINITIALISATION */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* INFORMATIONS */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
        <strong>
          {
            BUILDING_NAMES[
              selectedType
            ]
          }
        </strong>

        {" — "}

        X :{" "}
        {selectedPlacement.x.toFixed(
          2
        )}{" "}
        %

        {" | "}

        Y :{" "}
        {selectedPlacement.y.toFixed(
          2
        )}{" "}
        %

        {" | "}

        Taille :{" "}
        {selectedPlacement.width.toFixed(
          1
        )}{" "}
        %

        {" | "}

        Rotation :{" "}
        {
          selectedPlacement.rotation
        }
        °
      </div>

      {/* CARTE */}
      <div
        className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl"
        onClick={handleMapClick}
      >
        <img
          src="/city-map.png"
          alt="Carte de la ville"
          className="block w-full select-none"
          draggable={false}
        />

        {/* TOUS LES BÂTIMENTS */}
        {BUILDING_TYPES.map((type) => {
          const placement =
            placements[type]

          const isSelected =
            selectedType === type

          return (
            <div
              key={type}
              className="absolute"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                width: `${placement.width}%`,
                zIndex:
                  placement.zIndex,

                /*
                 * La base du bâtiment reste
                 * posée sur son point X/Y.
                 */
                transform: `
                  translate(-50%, -100%)
                  rotate(${placement.rotation}deg)
                `,

                transformOrigin:
                  "bottom center",
              }}
            >
              <div
                className={`relative transition ${
                  isSelected
                    ? "drop-shadow-[0_0_18px_rgba(59,130,246,1)]"
                    : "opacity-80"
                }`}
              >
                <img
                  src={`/buildings/${type}.png`}
                  alt={
                    BUILDING_NAMES[
                      type
                    ]
                  }
                  className="pointer-events-none block w-full select-none"
                  draggable={false}
                />

                {isSelected && (
                  <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-400" />
                )}
              </div>

              <div
                className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-black/70 text-zinc-300"
                }`}
              >
                {BUILDING_NAMES[type]}
              </div>
            </div>
          )
        })}

        <div
          data-editor-control
          className="absolute left-3 top-3 z-50 rounded-lg bg-black/80 px-3 py-2 text-sm text-white"
        >
          Clique sur la carte pour
          déplacer{" "}
          <strong>
            {
              BUILDING_NAMES[
                selectedType
              ]
            }
          </strong>
        </div>
      </div>
    </div>
  )
}