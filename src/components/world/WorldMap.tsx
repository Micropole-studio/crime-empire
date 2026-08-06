import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"

import {
  createWorldNodes,
} from "../../data/worldMapNodes"

import type {
  WorldNode,
  WorldResourceType,
  WorldRewardRange,
} from "../../types/worldMap"

type Props = {
  onBack: () => void

  currentCityName: string
  currentVillaLevel: number
  commanderLevel: number
}

type Camera = {
  x: number
  y: number
  scale: number
}

type Point = {
  x: number
  y: number
}

type WorldSize = {
  width: number
  height: number
}

type GestureState =
  | {
      mode: "none"
      moved: false
    }
  | {
      mode: "pan"
      moved: boolean
      startPointer: Point
      startCamera: Camera
    }

const DEFAULT_WORLD_SIZE:
  WorldSize = {
    width: 1448,
    height: 1086,
  }

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Math.max(
      0,
      Number(value) || 0
    )
  )
}

function formatDuration(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        totalSeconds
      )
    )

  const minutes =
    Math.floor(
      safeSeconds /
        60
    )

  const seconds =
    safeSeconds %
    60

  if (minutes > 0) {
    return seconds > 0
      ? `${minutes} min ${seconds} s`
      : `${minutes} min`
  }

  return `${seconds} s`
}

export default function WorldMap({
  onBack,
  currentCityName,
  currentVillaLevel,
  commanderLevel,
}: Props) {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const pointerRef =
    useRef<Point | null>(
      null
    )

  const gestureRef =
    useRef<GestureState>({
      mode: "none",
      moved: false,
    })

  const cameraRef =
    useRef<Camera>({
      x: 0,
      y: 0,
      scale: 1,
    })

  const [
    camera,
    setCamera,
  ] = useState<Camera>(
    cameraRef.current
  )

  const [
    worldSize,
    setWorldSize,
  ] = useState<WorldSize>(
    DEFAULT_WORLD_SIZE
  )

  const [
    isMoving,
    setIsMoving,
  ] = useState(false)

  const [
    selectedNode,
    setSelectedNode,
  ] = useState<WorldNode | null>(
    null
  )

  const nodes =
    useMemo(
      () =>
        createWorldNodes({
          currentCityName,
          currentVillaLevel,
          commanderLevel,
        }),
      [
        commanderLevel,
        currentCityName,
        currentVillaLevel,
      ]
    )

  const getScaleLimits =
    useCallback(() => {
      const viewport =
        viewportRef.current

      if (!viewport) {
        return {
          minimum: 0.1,
          maximum: 4,
          initial: 1,
        }
      }

      const viewportWidth =
        Math.max(
          1,
          viewport.clientWidth
        )

      const viewportHeight =
        Math.max(
          1,
          viewport.clientHeight
        )

      const containScale =
        Math.min(
          viewportWidth /
            worldSize.width,

          viewportHeight /
            worldSize.height
        )

      const coverScale =
        Math.max(
          viewportWidth /
            worldSize.width,

          viewportHeight /
            worldSize.height
        )

      const isMobile =
        window.innerWidth <
        768

      return {
        minimum:
          Math.max(
            0.05,
            containScale
          ),

        maximum:
          Math.max(
            containScale * 4,
            coverScale * 2.5,
            2
          ),

        initial:
          Math.max(
            0.05,
            isMobile
              ? coverScale
              : containScale
          ),
      }
    }, [
      worldSize.height,
      worldSize.width,
    ])

  const clampCamera =
    useCallback(
      (
        candidate: Camera
      ): Camera => {
        const viewport =
          viewportRef.current

        if (!viewport) {
          return candidate
        }

        const {
          minimum,
          maximum,
        } =
          getScaleLimits()

        const scale =
          Math.min(
            maximum,
            Math.max(
              minimum,
              candidate.scale
            )
          )

        const viewportWidth =
          viewport.clientWidth

        const viewportHeight =
          viewport.clientHeight

        const scaledWidth =
          worldSize.width *
          scale

        const scaledHeight =
          worldSize.height *
          scale

        let x =
          candidate.x

        let y =
          candidate.y

        if (
          scaledWidth <=
          viewportWidth
        ) {
          x =
            (
              viewportWidth -
              scaledWidth
            ) /
            2
        } else {
          x =
            Math.min(
              0,
              Math.max(
                viewportWidth -
                  scaledWidth,
                x
              )
            )
        }

        if (
          scaledHeight <=
          viewportHeight
        ) {
          y =
            (
              viewportHeight -
              scaledHeight
            ) /
            2
        } else {
          y =
            Math.min(
              0,
              Math.max(
                viewportHeight -
                  scaledHeight,
                y
              )
            )
        }

        return {
          x,
          y,
          scale,
        }
      },
      [
        getScaleLimits,
        worldSize.height,
        worldSize.width,
      ]
    )

  const updateCamera =
    useCallback(
      (
        candidate: Camera
      ) => {
        const next =
          clampCamera(
            candidate
          )

        cameraRef.current =
          next

        setCamera(
          next
        )
      },
      [clampCamera]
    )

  const resetCamera =
    useCallback(() => {
      const viewport =
        viewportRef.current

      if (!viewport) {
        return
      }

      const {
        initial,
      } =
        getScaleLimits()

      updateCamera({
        scale:
          initial,

        x:
          (
            viewport.clientWidth -
            worldSize.width *
              initial
          ) /
          2,

        y:
          (
            viewport.clientHeight -
            worldSize.height *
              initial
          ) /
          2,
      })
    }, [
      getScaleLimits,
      updateCamera,
      worldSize.height,
      worldSize.width,
    ])

  const zoomAtPoint =
    useCallback(
      (
        targetScale: number,
        viewportPoint: Point
      ) => {
        const current =
          cameraRef.current

        const worldPoint = {
          x:
            (
              viewportPoint.x -
              current.x
            ) /
            current.scale,

          y:
            (
              viewportPoint.y -
              current.y
            ) /
            current.scale,
        }

        updateCamera({
          scale:
            targetScale,

          x:
            viewportPoint.x -
            worldPoint.x *
              targetScale,

          y:
            viewportPoint.y -
            worldPoint.y *
              targetScale,
        })
      },
      [updateCamera]
    )

  const zoomBy =
    useCallback(
      (
        multiplier: number
      ) => {
        const viewport =
          viewportRef.current

        if (!viewport) {
          return
        }

        zoomAtPoint(
          cameraRef.current.scale *
            multiplier,
          {
            x:
              viewport.clientWidth /
              2,

            y:
              viewport.clientHeight /
              2,
          }
        )
      },
      [zoomAtPoint]
    )

  useEffect(() => {
    const viewport =
      viewportRef.current

    if (!viewport) {
      return
    }

    const observer =
      new ResizeObserver(() => {
        resetCamera()
      })

    observer.observe(
      viewport
    )

    return () => {
      observer.disconnect()
    }
  }, [resetCamera])

  useEffect(() => {
    resetCamera()
  }, [
    resetCamera,
    worldSize.height,
    worldSize.width,
  ])

  function handlePointerDown(
    event:
      ReactPointerEvent<HTMLDivElement>
  ) {
    const target =
      event.target

    if (
      target instanceof Element &&
      target.closest(
        "[data-world-interactive]"
      )
    ) {
      return
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return
    }

    const viewport =
      viewportRef.current

    if (!viewport) {
      return
    }

    viewport.setPointerCapture(
      event.pointerId
    )

    const point = {
      x:
        event.clientX,

      y:
        event.clientY,
    }

    pointerRef.current =
      point

    gestureRef.current = {
      mode: "pan",
      moved: false,
      startPointer:
        point,
      startCamera:
        cameraRef.current,
    }
  }

  function handlePointerMove(
    event:
      ReactPointerEvent<HTMLDivElement>
  ) {
    const gesture =
      gestureRef.current

    if (
      gesture.mode !==
      "pan"
    ) {
      return
    }

    const deltaX =
      event.clientX -
      gesture.startPointer.x

    const deltaY =
      event.clientY -
      gesture.startPointer.y

    const moved =
      gesture.moved ||
      Math.hypot(
        deltaX,
        deltaY
      ) >
        5

    gestureRef.current = {
      ...gesture,
      moved,
    }

    if (moved) {
      setIsMoving(
        true
      )
    }

    updateCamera({
      ...gesture.startCamera,

      x:
        gesture.startCamera.x +
        deltaX,

      y:
        gesture.startCamera.y +
        deltaY,
    })
  }

  function finishPointer() {
    pointerRef.current =
      null

    gestureRef.current = {
      mode: "none",
      moved: false,
    }

    setIsMoving(
      false
    )
  }

  function handleWheel(
    event:
      ReactWheelEvent<HTMLDivElement>
  ) {
    event.preventDefault()

    const viewport =
      viewportRef.current

    if (!viewport) {
      return
    }

    const rect =
      viewport.getBoundingClientRect()

    zoomAtPoint(
      cameraRef.current.scale *
        (
          event.deltaY < 0
            ? 1.12
            : 0.89
        ),
      {
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top,
      }
    )
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-black text-white">
      <div
        ref={
          viewportRef
        }
        className={`absolute inset-0 overflow-hidden bg-zinc-950 ${
          isMoving
            ? "cursor-grabbing"
            : "cursor-grab"
        }`}
        style={{
          touchAction:
            "none",
        }}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          finishPointer
        }
        onPointerCancel={
          finishPointer
        }
        onWheel={
          handleWheel
        }
        onDoubleClick={(
          event:
            ReactMouseEvent<HTMLDivElement>
        ) => {
          const target =
            event.target

          if (
            target instanceof Element &&
            target.closest(
              "[data-world-interactive]"
            )
          ) {
            event.preventDefault()
            return
          }

          const rect =
            event.currentTarget.getBoundingClientRect()

          zoomAtPoint(
            cameraRef.current.scale *
              1.3,
            {
              x:
                event.clientX -
                rect.left,

              y:
                event.clientY -
                rect.top,
            }
          )
        }}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width:
              worldSize.width,

            height:
              worldSize.height,

            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,

            transformOrigin:
              "0 0",
          }}
        >
          <img
            src="/world/world-map.jpg"
            alt="Carte du monde de Crime Empire"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            draggable={
              false
            }
            onLoad={(
              event:
                SyntheticEvent<HTMLImageElement>
            ) => {
              const image =
                event.currentTarget

              if (
                image.naturalWidth >
                  0 &&
                image.naturalHeight >
                  0
              ) {
                setWorldSize({
                  width:
                    image.naturalWidth,

                  height:
                    image.naturalHeight,
                })
              }
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-black/10" />

          {nodes.map(
            (node) => (
              <WorldNodeMarker
                key={
                  node.id
                }
                node={
                  node
                }
                selected={
                  selectedNode?.id ===
                  node.id
                }
                onSelect={() =>
                  setSelectedNode(
                    node
                  )
                }
              />
            )
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/45" />

      <header
        data-world-interactive
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-5"
        style={{
          paddingTop:
            "max(8px, env(safe-area-inset-top))",
        }}
      >
        <button
          type="button"
          onClick={
            onBack
          }
          className="pointer-events-auto rounded-xl border border-white/15 bg-black/80 px-4 py-2 text-sm font-black text-white shadow-xl backdrop-blur-xl transition hover:bg-zinc-900"
        >
          ← Retour à la ville
        </button>

        <div className="pointer-events-auto rounded-xl border border-red-500/25 bg-black/80 px-4 py-2 text-right shadow-xl backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
            Opérations extérieures
          </p>

          <h1 className="text-lg font-black text-white">
            World Map
          </h1>
        </div>
      </header>

      <div
        data-world-interactive
        className="absolute right-3 top-24 z-30 flex flex-col gap-2"
      >
        <WorldControlButton
          label="Zoom avant"
          onClick={() =>
            zoomBy(
              1.25
            )
          }
        >
          +
        </WorldControlButton>

        <WorldControlButton
          label="Zoom arrière"
          onClick={() =>
            zoomBy(
              0.8
            )
          }
        >
          −
        </WorldControlButton>

        <WorldControlButton
          label="Recentrer"
          onClick={
            resetCamera
          }
        >
          ⌂
        </WorldControlButton>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur sm:block">
        Glisser pour explorer • molette pour zoomer
      </div>

      {selectedNode && (
        <WorldNodePanel
          node={
            selectedNode
          }
          onClose={() =>
            setSelectedNode(
              null
            )
          }
          onBack={
            onBack
          }
        />
      )}
    </main>
  )
}

type WorldNodeMarkerProps = {
  node: WorldNode
  selected: boolean
  onSelect: () => void
}

function WorldNodeMarker({
  node,
  selected,
  onSelect,
}: WorldNodeMarkerProps) {
  const isCity =
    node.type ===
    "player_city"

  const isCurrentCity =
    node.cityKind ===
    "current"

  const resourceClasses:
    Record<
      WorldResourceType,
      string
    > = {
      money:
        "border-green-300/70 bg-green-950/85 shadow-[0_0_22px_rgba(34,197,94,0.55)]",

      materials:
        "border-orange-300/70 bg-orange-950/85 shadow-[0_0_22px_rgba(249,115,22,0.55)]",

      equipment:
        "border-blue-300/70 bg-blue-950/85 shadow-[0_0_22px_rgba(59,130,246,0.55)]",

      influence:
        "border-purple-300/70 bg-purple-950/85 shadow-[0_0_22px_rgba(168,85,247,0.55)]",
    }

  const markerClasses =
    isCity
      ? isCurrentCity
        ? "border-amber-300/80 bg-amber-950/90 shadow-[0_0_26px_rgba(251,191,36,0.65)]"
        : "border-red-300/80 bg-red-950/90 shadow-[0_0_26px_rgba(239,68,68,0.6)]"
      : resourceClasses[
          node.resourceType ??
          "money"
        ]

  return (
    <button
      type="button"
      data-world-interactive
      onPointerDown={(
        event
      ) => {
        event.stopPropagation()
      }}
      onDoubleClick={(
        event
      ) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={(
        event
      ) => {
        event.stopPropagation()
        onSelect()
      }}
      className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
      style={{
        left:
          `${node.x}%`,

        top:
          `${node.y}%`,
      }}
      aria-label={`Ouvrir ${node.name}`}
    >
      <span
        className={`pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-white/15 ${
          selected
            ? "opacity-100"
            : "opacity-45"
        }`}
      />

      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl backdrop-blur transition duration-200 group-hover:scale-110 ${
          selected
            ? "scale-110 ring-2 ring-white/80"
            : ""
        } ${markerClasses}`}
      >
        {node.icon}
      </span>

      <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-2.5 py-1 text-[10px] font-black text-white shadow-xl backdrop-blur">
        {isCurrentCity &&
          "👑 "}

        {node.name}
      </span>
    </button>
  )
}

type WorldNodePanelProps = {
  node: WorldNode
  onClose: () => void
  onBack: () => void
}

function WorldNodePanel({
  node,
  onClose,
  onBack,
}: WorldNodePanelProps) {
  const isCity =
    node.type ===
    "player_city"

  const isCurrentCity =
    node.cityKind ===
    "current"

  return (
    <aside
      data-world-interactive
      className="absolute inset-x-3 bottom-3 z-40 max-h-[66vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/94 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-3xl">
            {node.icon}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
              {isCity
                ? isCurrentCity
                  ? "Ta capitale"
                  : "Ville rivale"
                : "Territoire contrôlé par un bot"}
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              {node.name}
            </h2>

            <p className="mt-1 text-xs font-bold text-zinc-500">
              Niveau{" "}
              {node.level}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          ×
        </button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
        {node.description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoCard
          label={
            isCity
              ? "Puissance estimée"
              : "Puissance ennemie"
          }
          value={
            formatNumber(
              node.recommendedPower
            )
          }
        />

        <InfoCard
          label="Type"
          value={
            isCity
              ? "Ville de joueur"
              : "Territoire PvE"
          }
        />

        {!isCity &&
          node.travelSeconds !==
            undefined && (
            <InfoCard
              label="Temps de trajet"
              value={
                formatDuration(
                  node.travelSeconds
                )
              }
            />
          )}

        {!isCity &&
          node.cooldownHours !==
            undefined && (
            <InfoCard
              label="Réapparition"
              value={`${node.cooldownHours} h`}
            />
          )}
      </div>

      {!isCity &&
        node.rewards && (
        <section className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/75">
            Récompenses possibles
          </p>

          <RewardLines
            rewards={
              node.rewards
            }
          />
        </section>
      )}

      <div className="mt-4">
        {isCurrentCity ? (
          <button
            type="button"
            onClick={
              onBack
            }
            className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-500"
          >
            🏙️ Retourner dans ma ville
          </button>
        ) : isCity ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-zinc-800 px-4 py-3 text-sm font-black text-zinc-500"
          >
            ⚔️ PvP bientôt disponible
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-red-950/60 px-4 py-3 text-sm font-black text-red-300/60"
          >
            ⚔️ Préparer l'opération — prochaine étape
          </button>
        )}
      </div>
    </aside>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/25 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

function RewardLines({
  rewards,
}: {
  rewards:
    WorldRewardRange
}) {
  const lines: string[] =
    []

  if (
    rewards.moneyMax
  ) {
    lines.push(
      `💵 ${formatNumber(
        rewards.moneyMin ??
          0
      )} à ${formatNumber(
        rewards.moneyMax
      )} argent`
    )
  }

  if (
    rewards.materialsMax
  ) {
    lines.push(
      `🧱 ${formatNumber(
        rewards.materialsMin ??
          0
      )} à ${formatNumber(
        rewards.materialsMax
      )} matériaux`
    )
  }

  if (
    rewards.equipmentMax
  ) {
    lines.push(
      `🧰 ${formatNumber(
        rewards.equipmentMin ??
          0
      )} à ${formatNumber(
        rewards.equipmentMax
      )} équipements`
    )
  }

  if (
    rewards.influenceMax
  ) {
    lines.push(
      `⭐ ${formatNumber(
        rewards.influenceMin ??
          0
      )} à ${formatNumber(
        rewards.influenceMax
      )} Influence`
    )
  }

  if (
    rewards.commanderXp
  ) {
    lines.push(
      `🧠 +${formatNumber(
        rewards.commanderXp
      )} XP commandant`
    )
  }

  return (
    <div className="mt-2 space-y-1.5 text-sm font-semibold text-amber-100">
      {lines.map(
        (line) => (
          <p key={line}>
            {line}
          </p>
        )
      )}
    </div>
  )
}

type WorldControlButtonProps = {
  label: string
  children: string
  onClick: () => void
}

function WorldControlButton({
  label,
  children,
  onClick,
}: WorldControlButtonProps) {
  return (
    <button
      type="button"
      data-world-interactive
      aria-label={
        label
      }
      onPointerDown={(
        event:
          ReactPointerEvent<HTMLButtonElement>
      ) => {
        event.stopPropagation()
      }}
      onClick={(
        event:
          ReactMouseEvent<HTMLButtonElement>
      ) => {
        event.stopPropagation()
        onClick()
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/80 text-lg font-black text-white shadow-xl backdrop-blur transition hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}
