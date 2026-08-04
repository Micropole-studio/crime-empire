import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react"

import type {
  BuildingType,
} from "../../types/building"

import type {
  BuildingPlacement,
  BuildingPlacements,
} from "../../types/buildingPlacement"

import {
  BUILDING_NAMES,
} from "../../data/buildingNames"

import {
  loadBuildingPlacements,
  resetBuildingPlacements,
  saveBuildingPlacements,
} from "../../services/buildingPlacementStorage"

import {
  loadSharedBuildingPlacements,
  saveSharedBuildingPlacements,
} from "../../services/buildingPlacementService"

type Props = {
  cityId: string

  onSave?: (
    placement: BuildingPlacement
  ) => void
}

type SyncStatus =
  | "loading"
  | "local"
  | "saving"
  | "saved"
  | "error"

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
  cityId,
  onSave,
}: Props) {
  const [
    selectedType,
    setSelectedType,
  ] = useState<BuildingType>(
    "villa"
  )

  const initialPlacementsRef =
    useRef<BuildingPlacements>(
      loadBuildingPlacements()
    )

  const [
    placements,
    setPlacements,
  ] = useState<BuildingPlacements>(
    initialPlacementsRef.current
  )

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<SyncStatus>(
    "loading"
  )

  const saveTimerRef =
    useRef<number | null>(
      null
    )

  const selectedPlacement =
    placements[selectedType]

  useEffect(() => {
    let cancelled =
      false

    async function initialize() {
      try {
        setSyncStatus(
          "loading"
        )

        const result =
          await loadSharedBuildingPlacements(
            cityId
          )

        if (cancelled) {
          return
        }

        setPlacements(
          result.placements
        )

        /*
         * Au premier passage sur ordinateur,
         * les positions déjà réglées dans le
         * localStorage du PC sont publiées.
         *
         * Un téléphone ne peut donc pas écraser
         * accidentellement les positions du PC.
         */
        if (
          !result.hasRemotePlacements &&
          window.innerWidth >= 768
        ) {
          const synchronized =
            await saveSharedBuildingPlacements(
              cityId,
              result.placements
            )

          if (!cancelled) {
            setPlacements(
              synchronized
            )

            setSyncStatus(
              "saved"
            )
          }

          return
        }

        setSyncStatus(
          result.hasRemotePlacements
            ? "saved"
            : "local"
        )
      } catch (error) {
        console.error(
          "Impossible d'initialiser l'éditeur de carte :",
          error
        )

        if (!cancelled) {
          setSyncStatus(
            "error"
          )
        }
      }
    }

    initialize()

    return () => {
      cancelled = true

      if (
        saveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          saveTimerRef.current
        )
      }
    }
  }, [cityId])

  function scheduleRemoteSave(
    updatedPlacements:
      BuildingPlacements
  ) {
    if (
      saveTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        saveTimerRef.current
      )
    }

    setSyncStatus(
      "saving"
    )

    saveTimerRef.current =
      window.setTimeout(
        async () => {
          try {
            const synchronized =
              await saveSharedBuildingPlacements(
                cityId,
                updatedPlacements
              )

            setPlacements(
              synchronized
            )

            setSyncStatus(
              "saved"
            )
          } catch (error) {
            console.error(
              "Impossible de synchroniser les positions :",
              error
            )

            setSyncStatus(
              "error"
            )
          }
        },
        500
      )
  }

  function updateSelectedPlacement(
    changes:
      Partial<BuildingPlacement>
  ) {
    const updatedPlacement:
      BuildingPlacement = {
        ...placements[
          selectedType
        ],

        ...changes,

        type:
          selectedType,
      }

    const updatedPlacements:
      BuildingPlacements = {
        ...placements,

        [selectedType]:
          updatedPlacement,
      }

    setPlacements(
      updatedPlacements
    )

    saveBuildingPlacements(
      updatedPlacements
    )

    scheduleRemoteSave(
      updatedPlacements
    )

    onSave?.(
      updatedPlacement
    )
  }

  function handleMapClick(
    event:
      MouseEvent<HTMLDivElement>
  ) {
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
      (
        (
          event.clientX -
          rect.left
        ) /
        rect.width
      ) *
      100

    const y =
      (
        (
          event.clientY -
          rect.top
        ) /
        rect.height
      ) *
      100

    updateSelectedPlacement({
      x:
        Number(
          x.toFixed(2)
        ),

      y:
        Number(
          y.toFixed(2)
        ),
    })
  }

  async function handleReset() {
    const defaults =
      resetBuildingPlacements()

    setPlacements(
      defaults
    )

    setSyncStatus(
      "saving"
    )

    try {
      const synchronized =
        await saveSharedBuildingPlacements(
          cityId,
          defaults
        )

      setPlacements(
        synchronized
      )

      setSyncStatus(
        "saved"
      )
    } catch (error) {
      console.error(
        "Impossible de publier les positions réinitialisées :",
        error
      )

      setSyncStatus(
        "error"
      )
    }
  }

  async function handlePublishNow() {
    try {
      setSyncStatus(
        "saving"
      )

      const synchronized =
        await saveSharedBuildingPlacements(
          cityId,
          placements
        )

      setPlacements(
        synchronized
      )

      setSyncStatus(
        "saved"
      )
    } catch (error) {
      console.error(
        "Impossible de publier les positions :",
        error
      )

      setSyncStatus(
        "error"
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <div className="flex flex-wrap gap-2">
          {BUILDING_TYPES.map(
            (type) => {
              const isSelected =
                selectedType ===
                type

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setSelectedType(
                      type
                    )
                  }
                  className={`rounded-lg px-4 py-2 font-semibold transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {
                    BUILDING_NAMES[
                      type
                    ]
                  }
                </button>
              )
            }
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncBadge
            status={
              syncStatus
            }
          />

          <button
            type="button"
            onClick={
              handlePublishNow
            }
            disabled={
              syncStatus ===
              "saving"
            }
            className="rounded-lg border border-green-500/30 bg-green-700 px-4 py-2 text-sm font-black text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            Publier les positions
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
        Les positions sont maintenant
        enregistrées dans Supabase.
        Elles restent identiques sur
        ordinateur, téléphone et après
        un déploiement Vercel.
      </div>

      <div
        data-editor-control
        className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 md:grid-cols-4"
      >
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
            onChange={(
              event:
                ChangeEvent<HTMLInputElement>
            ) =>
              updateSelectedPlacement({
                width:
                  Number(
                    event.target.value
                  ),
              })
            }
            className="w-full"
          />
        </label>

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
            onChange={(
              event:
                ChangeEvent<HTMLInputElement>
            ) =>
              updateSelectedPlacement({
                rotation:
                  Number(
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
              Droit
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

        <label className="space-y-2">
          <span className="text-sm text-zinc-400">
            Profondeur :{" "}
            {
              selectedPlacement.zIndex
            }
          </span>

          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={
              selectedPlacement.zIndex
            }
            onChange={(
              event:
                ChangeEvent<HTMLInputElement>
            ) =>
              updateSelectedPlacement({
                zIndex:
                  Number(
                    event.target.value
                  ),
              })
            }
            className="w-full"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={
              handleReset
            }
            className="w-full rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
          >
            Réinitialiser
          </button>
        </div>
      </div>

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

      <div
        className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl"
        onClick={
          handleMapClick
        }
      >
        <img
          src="/city-map.png"
          alt="Carte de la ville"
          className="block w-full select-none"
          draggable={false}
        />

        {BUILDING_TYPES.map(
          (type) => {
            const placement =
              placements[type]

            const isSelected =
              selectedType ===
              type

            return (
              <div
                key={type}
                className="absolute"
                style={{
                  left:
                    `${placement.x}%`,

                  top:
                    `${placement.y}%`,

                  width:
                    `${placement.width}%`,

                  zIndex:
                    placement.zIndex,

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
                    draggable={
                      false
                    }
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
                  {
                    BUILDING_NAMES[
                      type
                    ]
                  }
                </div>
              </div>
            )
          }
        )}

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

type SyncBadgeProps = {
  status: SyncStatus
}

function SyncBadge({
  status,
}: SyncBadgeProps) {
  const content = {
    loading: {
      label:
        "Chargement...",
      classes:
        "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
    },

    local: {
      label:
        "Positions locales",
      classes:
        "border-amber-500/30 bg-amber-500/10 text-amber-200",
    },

    saving: {
      label:
        "Synchronisation...",
      classes:
        "border-blue-500/30 bg-blue-500/10 text-blue-200",
    },

    saved: {
      label:
        "Synchronisé",
      classes:
        "border-green-500/30 bg-green-500/10 text-green-200",
    },

    error: {
      label:
        "Erreur de synchronisation",
      classes:
        "border-red-500/30 bg-red-500/10 text-red-200",
    },
  }[status]

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${content.classes}`}
    >
      {content.label}
    </span>
  )
}
