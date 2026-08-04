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

import type {
  Building,
  BuildingType,
} from "../../types/building"

import type {
  BuildingPlacements,
} from "../../types/buildingPlacement"

import {
  BUILDING_NAMES,
} from "../../data/buildingNames"

import {
  loadBuildingPlacements,
} from "../../services/buildingPlacementStorage"

import {
  BUILDING_PLACEMENTS_UPDATED_EVENT,
  loadSharedBuildingPlacements,
} from "../../services/buildingPlacementService"

type Props = {
  cityId: string
  buildings: Building[]
  onBuildingClick?: (
    id: string
  ) => void
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
  | {
      mode: "pinch"
      moved: boolean
      startDistance: number
      startScale: number
      worldPoint: Point
    }

const DEFAULT_WORLD_SIZE: WorldSize = {
  width: 1600,
  height: 900,
}

function getDistance(
  first: Point,
  second: Point
) {
  return Math.hypot(
    second.x - first.x,
    second.y - first.y
  )
}

function getMidpoint(
  first: Point,
  second: Point
): Point {
  return {
    x:
      (first.x + second.x) /
      2,

    y:
      (first.y + second.y) /
      2,
  }
}

export default function GameMap({
  cityId,
  buildings,
  onBuildingClick,
}: Props) {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const pointersRef =
    useRef<
      Map<number, Point>
    >(new Map())

  const gestureRef =
    useRef<GestureState>({
      mode: "none",
      moved: false,
    })

  const suppressClickUntilRef =
    useRef(0)

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
    placements,
    setPlacements,
  ] = useState<BuildingPlacements>(
    () =>
      loadBuildingPlacements()
  )

  const [
    isMoving,
    setIsMoving,
  ] = useState(false)

  const uniqueBuildings =
    useMemo(() => {
      const buildingsByType =
        new Map<
          BuildingType,
          Building
        >()

      for (
        const building
        of buildings
      ) {
        const existing =
          buildingsByType.get(
            building.type
          )

        if (
          !existing ||
          Number(building.level) >
            Number(existing.level)
        ) {
          buildingsByType.set(
            building.type,
            building
          )
        }
      }

      return Array.from(
        buildingsByType.values()
      )
    }, [buildings])

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
        window.innerWidth < 768

      const initialScale =
        isMobile
          ? coverScale
          : containScale

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
            initialScale
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

        setCamera(next)
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

      const centered =
        clampCamera({
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

      cameraRef.current =
        centered

      setCamera(
        centered
      )
    }, [
      clampCamera,
      getScaleLimits,
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
    let cancelled =
      false

    async function loadPlacements() {
      const result =
        await loadSharedBuildingPlacements(
          cityId
        )

      if (!cancelled) {
        setPlacements(
          result.placements
        )
      }
    }

    loadPlacements()

    function handlePlacementsUpdated(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<
          BuildingPlacements
        >

      if (
        customEvent.detail
      ) {
        setPlacements(
          customEvent.detail
        )
      }
    }

    window.addEventListener(
      BUILDING_PLACEMENTS_UPDATED_EVENT,
      handlePlacementsUpdated
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        BUILDING_PLACEMENTS_UPDATED_EVENT,
        handlePlacementsUpdated
      )
    }
  }, [cityId])

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
    const viewport =
      viewportRef.current

    if (!viewport) {
      return
    }

    viewport.setPointerCapture(
      event.pointerId
    )

    pointersRef.current.set(
      event.pointerId,
      {
        x:
          event.clientX,
        y:
          event.clientY,
      }
    )

    const pointers =
      Array.from(
        pointersRef.current.values()
      )

    if (
      pointers.length === 1
    ) {
      gestureRef.current = {
        mode: "pan",
        moved: false,
        startPointer:
          pointers[0],
        startCamera:
          cameraRef.current,
      }
    }

    if (
      pointers.length >= 2
    ) {
      const rect =
        viewport.getBoundingClientRect()

      const midpoint =
        getMidpoint(
          pointers[0],
          pointers[1]
        )

      const localMidpoint = {
        x:
          midpoint.x -
          rect.left,

        y:
          midpoint.y -
          rect.top,
      }

      gestureRef.current = {
        mode: "pinch",
        moved: false,
        startDistance:
          getDistance(
            pointers[0],
            pointers[1]
          ),

        startScale:
          cameraRef.current.scale,

        worldPoint: {
          x:
            (
              localMidpoint.x -
              cameraRef.current.x
            ) /
            cameraRef.current.scale,

          y:
            (
              localMidpoint.y -
              cameraRef.current.y
            ) /
            cameraRef.current.scale,
        },
      }
    }
  }

  function handlePointerMove(
    event:
      ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      !pointersRef.current.has(
        event.pointerId
      )
    ) {
      return
    }

    pointersRef.current.set(
      event.pointerId,
      {
        x:
          event.clientX,
        y:
          event.clientY,
      }
    )

    const viewport =
      viewportRef.current

    if (!viewport) {
      return
    }

    const pointers =
      Array.from(
        pointersRef.current.values()
      )

    const gesture =
      gestureRef.current

    if (
      pointers.length >= 2 &&
      gesture.mode ===
        "pinch"
    ) {
      const rect =
        viewport.getBoundingClientRect()

      const midpoint =
        getMidpoint(
          pointers[0],
          pointers[1]
        )

      const localMidpoint = {
        x:
          midpoint.x -
          rect.left,

        y:
          midpoint.y -
          rect.top,
      }

      const distance =
        getDistance(
          pointers[0],
          pointers[1]
        )

      const ratio =
        gesture.startDistance >
        0
          ? distance /
            gesture.startDistance
          : 1

      const targetScale =
        gesture.startScale *
        ratio

      gestureRef.current = {
        ...gesture,
        moved:
          gesture.moved ||
          Math.abs(
            distance -
              gesture.startDistance
          ) >
            4,
      }

      setIsMoving(true)

      updateCamera({
        scale:
          targetScale,

        x:
          localMidpoint.x -
          gesture.worldPoint.x *
            targetScale,

        y:
          localMidpoint.y -
          gesture.worldPoint.y *
            targetScale,
      })

      return
    }

    if (
      pointers.length === 1 &&
      gesture.mode ===
        "pan"
    ) {
      const currentPointer =
        pointers[0]

      const deltaX =
        currentPointer.x -
        gesture.startPointer.x

      const deltaY =
        currentPointer.y -
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
        setIsMoving(true)
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
  }

  function finishPointer(
    event:
      ReactPointerEvent<HTMLDivElement>
  ) {
    const previousGesture =
      gestureRef.current

    pointersRef.current.delete(
      event.pointerId
    )

    if (
      previousGesture.mode !==
        "none" &&
      previousGesture.moved
    ) {
      suppressClickUntilRef.current =
        Date.now() + 250
    }

    const pointers =
      Array.from(
        pointersRef.current.values()
      )

    if (
      pointers.length === 1
    ) {
      gestureRef.current = {
        mode: "pan",
        moved: false,
        startPointer:
          pointers[0],
        startCamera:
          cameraRef.current,
      }
    } else {
      gestureRef.current = {
        mode: "none",
        moved: false,
      }

      setIsMoving(false)
    }
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

    const multiplier =
      event.deltaY < 0
        ? 1.12
        : 0.89

    zoomAtPoint(
      cameraRef.current.scale *
        multiplier,
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

  function handleBuildingClick(
    building: Building
  ) {
    if (
      Date.now() <
      suppressClickUntilRef.current
    ) {
      return
    }

    if (
      building.isLocked
    ) {
      return
    }

    onBuildingClick?.(
      building.id
    )
  }

  return (
    <div
      ref={viewportRef}
      className={`relative h-full w-full overflow-hidden bg-zinc-950 ${
        isMoving
          ? "cursor-grabbing"
          : "cursor-grab"
      }`}
      style={{
        touchAction: "none",
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
        const rect =
          event.currentTarget.getBoundingClientRect()

        zoomAtPoint(
          cameraRef.current.scale *
            1.35,
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
          src="/city-map.png"
          alt="Carte de la ville"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          draggable={false}
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

        {uniqueBuildings.map(
          (building) => {
            const placement =
              placements[
                building.type
              ]

            if (!placement) {
              return null
            }

            return (
              <button
                key={building.id}
                type="button"
                className="group absolute border-0 bg-transparent p-0 text-left"
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
                onClick={() =>
                  handleBuildingClick(
                    building
                  )
                }
                disabled={
                  building.isLocked
                }
                aria-label={`Ouvrir ${
                  BUILDING_NAMES[
                    building.type
                  ]
                }`}
              >
                <div className="pointer-events-none absolute bottom-[-2%] left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-full bg-black/50 blur-md" />

                <img
                  src={`/buildings/${building.type}.png`}
                  alt={
                    BUILDING_NAMES[
                      building.type
                    ]
                  }
                  className={`pointer-events-none relative z-10 block w-full select-none transition duration-200 group-hover:brightness-110 ${
                    building.is_upgrading
                      ? "brightness-75 saturate-75"
                      : ""
                  }`}
                  draggable={false}
                />

                <div className="pointer-events-none absolute bottom-0 left-1/2 z-30 flex h-6 min-w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-400 bg-zinc-950 px-1 text-xs font-black text-yellow-300 shadow-lg">
                  {building.level}
                </div>

                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm sm:text-xs">
                  {
                    BUILDING_NAMES[
                      building.type
                    ]
                  }
                </div>

                {building.is_upgrading && (
                  <>
                    <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-500/5 shadow-[0_0_24px_rgba(251,191,36,0.35)]" />

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

                {building.isLocked && (
                  <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-black/70 text-4xl grayscale">
                    🔒
                  </div>
                )}
              </button>
            )
          }
        )}
      </div>

      <div className="pointer-events-none absolute bottom-20 left-3 z-20 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur md:bottom-4">
        Glisser pour déplacer • pincer pour zoomer
      </div>

      <div className="absolute bottom-20 right-3 z-30 flex flex-col gap-2 md:bottom-4">
        <MapControlButton
          label="Zoom avant"
          onClick={() =>
            zoomBy(1.25)
          }
        >
          +
        </MapControlButton>

        <MapControlButton
          label="Zoom arrière"
          onClick={() =>
            zoomBy(0.8)
          }
        >
          −
        </MapControlButton>

        <MapControlButton
          label="Recentrer"
          onClick={
            resetCamera
          }
        >
          ⌂
        </MapControlButton>
      </div>
    </div>
  )
}

type MapControlButtonProps = {
  label: string
  children: string
  onClick: () => void
}

function MapControlButton({
  label,
  children,
  onClick,
}: MapControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/75 text-lg font-black text-white shadow-xl backdrop-blur transition hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}
