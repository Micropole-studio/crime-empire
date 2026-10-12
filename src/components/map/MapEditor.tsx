import {
  useEffect,
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
  isAdmin?: boolean

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

type EditablePlacement = {
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

const BUILDING_TYPES:
  BuildingType[] = [
    "villa",
    "workshop",
    "hideout",
    "wall",
    "laboratory",
    "syndicate",
    "factory",
  ]

const EDITOR_OBJECTS: BuildingType[] = BUILDING_TYPES

function getObjectName(type: BuildingType) {
  return BUILDING_NAMES[type]
}

export default function MapEditor({
  cityId,
  isAdmin = false,
  onSave,
}: Props) {
  const [
    selectedType,
    setSelectedType,
  ] = useState<
    BuildingType
  >("villa")

  const [
    placements,
    setPlacements,
  ] = useState<BuildingPlacements>(
    () =>
      loadBuildingPlacements(
        cityId
      )
  )

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<SyncStatus>(
    "loading"
  )

  const [syncError, setSyncError] = useState<string | null>(null)
  const [readBlocked, setReadBlocked] = useState(false)

  const selectedPlacement: EditablePlacement = placements[selectedType]

  useEffect(() => {
    let cancelled = false
    setSyncStatus("loading")
    setSyncError(null)
    setReadBlocked(false)

    void loadSharedBuildingPlacements(cityId).then((result) => {
      if (cancelled) return
      setPlacements(result.placements)
      // En cas d'erreur, laisser les positions locales éditables,
      // MAIS ne jamais les publier automatiquement.
      if (result.loadError) {
        setSyncStatus("error")
        setReadBlocked(true)
        setSyncError(result.loadError)
      } else {
        setSyncStatus(result.hasRemotePlacements ? "saved" : "local")
      }
    }).catch((error: unknown) => {
      if (cancelled) return
      setSyncStatus("error")
      setReadBlocked(true)
      setSyncError(error instanceof Error ? error.message : String(error))
    })

    return () => { cancelled = true }
  }, [cityId])

  function updateSelectedPlacement(
    changes:
      Partial<
        EditablePlacement
      >
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
      updatedPlacements,
      cityId
    )

    setSyncStatus("local")
    setSyncError(null)

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

  function handleReset() {
    if (!window.confirm(
      "Réinitialiser les positions locales ? Il faudra ensuite cliquer sur Publier pour les enregistrer dans Supabase."
    )) return

    const defaults = resetBuildingPlacements(cityId)
    setPlacements(defaults)
    setSyncStatus("local")
    setSyncError(null)
  }

  async function handlePublishNow() {
    if (syncStatus === "saving" || readBlocked) return
    try {
      setSyncStatus("saving")
      setSyncError(null)
      const synchronizedBuildings = await saveSharedBuildingPlacements(cityId, placements)
      setPlacements(synchronizedBuildings)
      setSyncStatus("saved")
    } catch (error: unknown) {
      setSyncStatus("error")
      const e = error as { code?: string; message?: string; details?: string; hint?: string }
      setSyncError([e?.code, e?.message, e?.details, e?.hint].filter(Boolean).join(" | ") || String(error))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <div className="flex flex-wrap gap-2">
          {EDITOR_OBJECTS.map(
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
                  {getObjectName(type)}
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
            disabled={syncStatus === "saving" || syncStatus === "loading" || readBlocked}
            className="rounded-lg border border-green-500/30 bg-green-700 px-4 py-2 text-sm font-black text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {isAdmin
              ? "Publier le modèle"
              : "Publier les positions"}
          </button>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${
        isAdmin
          ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
          : "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
      }`}>
        {isAdmin ? (
          <>
            <strong>Modèle officiel des nouvelles villes.</strong>{" "}
            Une publication réussie est sauvegardée dans Supabase et devient le modèle de départ des futures villes. Aucun enregistrement automatique à l'ouverture.
          </>
        ) : (
          <>
            Les bâtiments peuvent être repositionnés librement. Clique sur Publier les positions pour les enregistrer dans Supabase.
          </>
        )}
      </div>

      {syncStatus === "error" && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <strong>Synchronisation Supabase indisponible.</strong> Les positions restent modifiables localement, mais ne sont pas publiées. {readBlocked && "Publication verrouillée pour éviter un écrasement : corrige l’erreur puis recharge la page."}
          {syncError && <pre className="mt-2 whitespace-pre-wrap break-all text-xs">{syncError}</pre>}
        </div>
      )}
      {syncStatus === "local" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">
          Positions locales non publiées : clique sur « Publier » quand tu es prêt.
        </div>
      )}

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
            max="100"
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
            Tout réinitialiser
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
        <strong>
          {
            getObjectName(
              selectedType
            )
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
          src="/game-assets/city-map-luxe.webp"
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
                      : "opacity-75"
                  }`}
                >
                  <img
                    src={`/game-assets/${type}-luxe.webp`}
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
          className="absolute left-3 top-3 z-[120] rounded-lg bg-black/85 px-3 py-2 text-sm text-white"
        >
          Clique sur la carte pour
          déplacer{" "}
          <strong className="text-blue-300">{getObjectName(selectedType)}</strong>
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
