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

import type {
  WorldMapAccessPlacement,
} from "../../data/worldMapAccess"

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

import {
  loadWorldMapAccessPlacement,
  resetWorldMapAccessPlacement,
  saveWorldMapAccessPlacement,
} from "../../data/worldMapAccess"

import {
  loadSharedWorldMapAccess,
  saveSharedWorldMapAccess,
} from "../../services/worldMapAccessService"

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

type EditorObjectType =
  | BuildingType
  | "helicopter"

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

const EDITOR_OBJECTS:
  EditorObjectType[] = [
    ...BUILDING_TYPES,
    "helicopter",
  ]

function isBuildingType(
  value: EditorObjectType
): value is BuildingType {
  return value !==
    "helicopter"
}

function getObjectName(
  type: EditorObjectType
) {
  return type ===
    "helicopter"
    ? "Hélicoptère"
    : BUILDING_NAMES[
        type
      ]
}

export default function MapEditor({
  cityId,
  onSave,
}: Props) {
  const [
    selectedType,
    setSelectedType,
  ] = useState<
    EditorObjectType
  >("villa")

  const initialPlacementsRef =
    useRef<BuildingPlacements>(
      loadBuildingPlacements()
    )

  const initialHelicopterRef =
    useRef<WorldMapAccessPlacement>(
      loadWorldMapAccessPlacement()
    )

  const [
    placements,
    setPlacements,
  ] = useState<BuildingPlacements>(
    initialPlacementsRef.current
  )

  const [
    helicopterPlacement,
    setHelicopterPlacement,
  ] = useState<WorldMapAccessPlacement>(
    initialHelicopterRef.current
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

  const selectedPlacement:
    EditablePlacement =
    selectedType ===
      "helicopter"
      ? helicopterPlacement
      : placements[
          selectedType
        ]

  useEffect(() => {
    let cancelled =
      false

    async function initialize() {
      try {
        setSyncStatus(
          "loading"
        )

        const [
          buildingResult,
          helicopterResult,
        ] = await Promise.all([
          loadSharedBuildingPlacements(
            cityId
          ),

          loadSharedWorldMapAccess(
            cityId
          ),
        ])

        if (cancelled) {
          return
        }

        setPlacements(
          buildingResult.placements
        )

        setHelicopterPlacement(
          helicopterResult.placement
        )

        const isDesktop =
          window.innerWidth >=
          768

        let nextBuildings =
          buildingResult.placements

        let nextHelicopter =
          helicopterResult.placement

        let publishedSomething =
          false

        if (
          isDesktop &&
          !buildingResult.hasRemotePlacements
        ) {
          nextBuildings =
            await saveSharedBuildingPlacements(
              cityId,
              nextBuildings
            )

          publishedSomething =
            true
        }

        if (
          isDesktop &&
          !helicopterResult.hasRemotePlacement
        ) {
          nextHelicopter =
            await saveSharedWorldMapAccess(
              cityId,
              nextHelicopter
            )

          publishedSomething =
            true
        }

        if (cancelled) {
          return
        }

        setPlacements(
          nextBuildings
        )

        setHelicopterPlacement(
          nextHelicopter
        )

        setSyncStatus(
          publishedSomething ||
          (
            buildingResult.hasRemotePlacements &&
            helicopterResult.hasRemotePlacement
          )
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
      BuildingPlacements,
    updatedHelicopter:
      WorldMapAccessPlacement
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
            const [
              synchronizedBuildings,
              synchronizedHelicopter,
            ] = await Promise.all([
              saveSharedBuildingPlacements(
                cityId,
                updatedPlacements
              ),

              saveSharedWorldMapAccess(
                cityId,
                updatedHelicopter
              ),
            ])

            setPlacements(
              synchronizedBuildings
            )

            setHelicopterPlacement(
              synchronizedHelicopter
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
      Partial<
        EditablePlacement
      >
  ) {
    if (
      selectedType ===
      "helicopter"
    ) {
      const updatedHelicopter =
        saveWorldMapAccessPlacement({
          ...helicopterPlacement,
          ...changes,
        })

      setHelicopterPlacement(
        updatedHelicopter
      )

      scheduleRemoteSave(
        placements,
        updatedHelicopter
      )

      return
    }

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
      updatedPlacements,
      helicopterPlacement
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

    const helicopterDefaults =
      resetWorldMapAccessPlacement()

    setPlacements(
      defaults
    )

    setHelicopterPlacement(
      helicopterDefaults
    )

    setSyncStatus(
      "saving"
    )

    try {
      const [
        synchronizedBuildings,
        synchronizedHelicopter,
      ] = await Promise.all([
        saveSharedBuildingPlacements(
          cityId,
          defaults
        ),

        saveSharedWorldMapAccess(
          cityId,
          helicopterDefaults
        ),
      ])

      setPlacements(
        synchronizedBuildings
      )

      setHelicopterPlacement(
        synchronizedHelicopter
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

      const [
        synchronizedBuildings,
        synchronizedHelicopter,
      ] = await Promise.all([
        saveSharedBuildingPlacements(
          cityId,
          placements
        ),

        saveSharedWorldMapAccess(
          cityId,
          helicopterPlacement
        ),
      ])

      setPlacements(
        synchronizedBuildings
      )

      setHelicopterPlacement(
        synchronizedHelicopter
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
          {EDITOR_OBJECTS.map(
            (type) => {
              const isSelected =
                selectedType ===
                type

              const isHelicopter =
                type ===
                "helicopter"

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
                      ? isHelicopter
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-950"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-950"
                      : isHelicopter
                        ? "border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {isHelicopter
                    ? "🚁 "
                    : ""}

                  {
                    getObjectName(
                      type
                    )
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
        Les bâtiments et l'hélicoptère
        sont maintenant enregistrés dans
        Supabase. Leur position reste la
        même sur ordinateur, téléphone
        et après un déploiement Vercel.
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
            min={
              selectedType ===
                "helicopter"
                ? "3"
                : "3"
            }
            max={
              selectedType ===
                "helicopter"
                ? "35"
                : "40"
            }
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

      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          selectedType ===
            "helicopter"
            ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
            : "border-blue-500/20 bg-blue-500/10 text-blue-100"
        }`}
      >
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
                      : "opacity-75"
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
          className="absolute"
          style={{
            left:
              `${helicopterPlacement.x}%`,

            top:
              `${helicopterPlacement.y}%`,

            width:
              `${helicopterPlacement.width}%`,

            zIndex:
              helicopterPlacement.zIndex,

            transform: `
              translate(-50%, -50%)
              rotate(${helicopterPlacement.rotation}deg)
            `,

            transformOrigin:
              "center center",
          }}
        >
          <div
            className={`relative transition ${
              selectedType ===
                "helicopter"
                ? "drop-shadow-[0_0_22px_rgba(251,191,36,1)]"
                : "opacity-80"
            }`}
          >
            <img
              src="/world/helicopter.png"
              alt="Hélicoptère"
              className="pointer-events-none block w-full select-none"
              draggable={false}
            />

            {selectedType ===
              "helicopter" && (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-amber-400" />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-300/70" />
              </>
            )}
          </div>

          <div
            className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${
              selectedType ===
                "helicopter"
                ? "bg-amber-600 text-white"
                : "bg-black/70 text-amber-200"
            }`}
          >
            🚁 Hélicoptère
          </div>
        </div>

        <div
          data-editor-control
          className="absolute left-3 top-3 z-[120] rounded-lg bg-black/85 px-3 py-2 text-sm text-white"
        >
          Clique sur la carte pour
          déplacer{" "}
          <strong
            className={
              selectedType ===
                "helicopter"
                ? "text-amber-300"
                : "text-blue-300"
            }
          >
            {
              getObjectName(
                selectedType
              )
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
