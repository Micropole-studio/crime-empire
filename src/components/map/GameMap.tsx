import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react"

import PixiCityScene from "./PixiCityScene"
import SeaCanvasOverlay from "./SeaCanvasOverlay"

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
  getHighestBuildingLevel,
  getRequiredVillaLevel,
} from "../../data/buildingRequirements"

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

  onWorldMapOpen?: () => void
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

type GestureState = {
  mode: "none" | "pan" | "pinch"
  moved: boolean
  startCamera: Camera
  startCentroid: Point
  startDistance: number
  anchorWorld: Point
  lastCentroid: Point
  lastTimestamp: number
  velocityX: number
  velocityY: number
}

type PressedMapObject =
  | { kind: "building"; buildingId: string }
  | { kind: "world-map" }
  | null

const DEFAULT_WORLD_SIZE: WorldSize = {
  width: 1600,
  height: 900,
}

const LUXURY_CITY_BACKGROUND = "/game-assets/city-map-luxe.webp"
const LUXURY_BUILDING_ASSETS: Record<BuildingType, string> = {
  villa: "/game-assets/villa-luxe.webp",
  workshop: "/game-assets/workshop-luxe.webp",
  hideout: "/game-assets/hideout-luxe.webp",
  wall: "/game-assets/wall-luxe.webp",
  laboratory: "/game-assets/laboratory-luxe.webp",
  syndicate: "/game-assets/syndicate-luxe.webp",
  factory: "/game-assets/factory-luxe.webp",
}

export default function GameMap({
  cityId,
  buildings,
  onBuildingClick,
  onWorldMapOpen,
}: Props) {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const cameraLayerRef =
    useRef<HTMLDivElement | null>(null)

  const pointersRef =
    useRef<Map<number, Point>>(new Map())

  const inertiaFrameRef =
    useRef<number | null>(null)

  const settleFrameRef =
    useRef<number | null>(null)

  const cameraInitializedRef =
    useRef(false)

  const gestureRef =
    useRef<GestureState>({
      mode: "none",
      moved: false,
      startCamera: { x: 0, y: 0, scale: 1 },
      startCentroid: { x: 0, y: 0 },
      startDistance: 0,
      anchorWorld: { x: 0, y: 0 },
      lastCentroid: { x: 0, y: 0 },
      lastTimestamp: 0,
      velocityX: 0,
      velocityY: 0,
    })

  const suppressClickRef =
    useRef(false)

  const suppressClickTimerRef =
    useRef<number | null>(null)

  const pressedMapObjectRef =
    useRef<PressedMapObject>(null)

  const suppressNativeObjectClickUntilRef =
    useRef(0)

  const cameraRef =
    useRef<Camera>({
      x: 0,
      y: 0,
      scale: 1,
    })

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
      loadBuildingPlacements(
        cityId
      )
  )



  const [
    isMoving,
    setIsMoving,
  ] = useState(false)

  // Comparaison sécurisée de l'ancien renderer DOM et du nouveau renderer GPU.
  // Les interactions et les données du jeu restent exactement les mêmes.
  const [pixiEnabled, setPixiEnabled] = useState(() => {
    try {
      return window.localStorage.getItem("crime-empire-city-renderer") !== "legacy"
    } catch {
      return true
    }
  })
  // Bloc 1 graphique premium : entièrement visuel et réversible. Aucun impact sur Supabase ni la progression.
  const [artStyle, setArtStyle] = useState<"classic" | "luxury">(() => {
    try {
      return window.localStorage.getItem("crime-empire-city-art") === "classic"
        ? "classic" : "luxury"
    } catch {
      return "luxury"
    }
  })
  function toggleArtStyle() {
    const next = artStyle === "luxury" ? "classic" : "luxury"
    setArtStyle(next)
    try { window.localStorage.setItem("crime-empire-city-art", next) } catch { /* private mode */ }
  }

  const [pixiReady, setPixiReady] = useState(false)
  const [pixiUnavailable, setPixiUnavailable] = useState(false)
  const usePixiVisuals = pixiEnabled && pixiReady
  const [seaStatus, setSeaStatus] = useState<"loading" | "active" | "partial" | "fallback" | "paused" | "unavailable">("loading")

  function toggleRenderer() {
    const next = !pixiEnabled
    setPixiReady(false)
    setPixiUnavailable(false)
    setPixiEnabled(next)
    try {
      window.localStorage.setItem(
        "crime-empire-city-renderer",
        next ? "pixi" : "legacy",
      )
    } catch { /* mode navigation privée */ }
  }

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

  const villaLevel =
    useMemo(
      () =>
        getHighestBuildingLevel(
          uniqueBuildings,
          "villa"
        ),
      [uniqueBuildings]
    )

  const getScaleLimits =
    useCallback(() => {
      const viewport = viewportRef.current

      if (!viewport) {
        return { minimum: 0.1, maximum: 4, initial: 1 }
      }

      const viewportWidth = Math.max(1, viewport.clientWidth)
      const viewportHeight = Math.max(1, viewport.clientHeight)
      const containScale = Math.min(
        viewportWidth / worldSize.width,
        viewportHeight / worldSize.height
      )
      const coverScale = Math.max(
        viewportWidth / worldSize.width,
        viewportHeight / worldSize.height
      )
      const isMobile = window.innerWidth < 768

      return {
        minimum: Math.max(0.05, containScale),
        maximum: Math.max(
          containScale * 4,
          coverScale * 2.5,
          2
        ),
        initial: Math.max(
          0.05,
          isMobile
            ? coverScale * 1.08
            : Math.max(containScale, coverScale * 0.92)
        ),
      }
    }, [worldSize.height, worldSize.width])

  const getCameraBounds =
    useCallback(
      (scale: number) => {
        const viewport = viewportRef.current

        if (!viewport) {
          return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        }

        const scaledWidth = worldSize.width * scale
        const scaledHeight = worldSize.height * scale
        const viewportWidth = viewport.clientWidth
        const viewportHeight = viewport.clientHeight

        const maxX =
          scaledWidth <= viewportWidth
            ? (viewportWidth - scaledWidth) / 2
            : 0
        const minX =
          scaledWidth <= viewportWidth
            ? maxX
            : viewportWidth - scaledWidth

        const maxY =
          scaledHeight <= viewportHeight
            ? (viewportHeight - scaledHeight) / 2
            : 0
        const minY =
          scaledHeight <= viewportHeight
            ? maxY
            : viewportHeight - scaledHeight

        return { minX, maxX, minY, maxY }
      },
      [worldSize.height, worldSize.width]
    )

  const clampCamera =
    useCallback(
      (candidate: Camera): Camera => {
        const { minimum, maximum } = getScaleLimits()
        const scale = Math.min(
          maximum,
          Math.max(minimum, candidate.scale)
        )
        const bounds = getCameraBounds(scale)

        return {
          scale,
          x: Math.min(bounds.maxX, Math.max(bounds.minX, candidate.x)),
          y: Math.min(bounds.maxY, Math.max(bounds.minY, candidate.y)),
        }
      },
      [getCameraBounds, getScaleLimits]
    )

  const softenAxis = useCallback(
    (value: number, minimum: number, maximum: number) => {
      const resistance = 0.32
      const maxOverscroll = 90

      if (value < minimum) {
        return minimum - Math.min(
          maxOverscroll,
          (minimum - value) * resistance
        )
      }

      if (value > maximum) {
        return maximum + Math.min(
          maxOverscroll,
          (value - maximum) * resistance
        )
      }

      return value
    },
    []
  )

  const softenCamera =
    useCallback(
      (candidate: Camera): Camera => {
        const { minimum, maximum } = getScaleLimits()
        const scale = Math.min(
          maximum,
          Math.max(minimum, candidate.scale)
        )
        const bounds = getCameraBounds(scale)

        return {
          scale,
          x: softenAxis(candidate.x, bounds.minX, bounds.maxX),
          y: softenAxis(candidate.y, bounds.minY, bounds.maxY),
        }
      },
      [getCameraBounds, getScaleLimits, softenAxis]
    )

  const writeCameraTransform =
    useCallback((next: Camera) => {
      const layer = cameraLayerRef.current

      if (!layer) {
        return
      }

      layer.style.transform =
        `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`
    }, [])

  const updateCamera =
    useCallback(
      (candidate: Camera, options?: { soft?: boolean }) => {
        const next = options?.soft
          ? softenCamera(candidate)
          : clampCamera(candidate)

        cameraRef.current = next
        writeCameraTransform(next)
        return next
      },
      [clampCamera, softenCamera, writeCameraTransform]
    )

  const stopCameraAnimation = useCallback(() => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current)
      inertiaFrameRef.current = null
    }

    if (settleFrameRef.current !== null) {
      window.cancelAnimationFrame(settleFrameRef.current)
      settleFrameRef.current = null
    }
  }, [])

  const settleCamera =
    useCallback(() => {
      if (settleFrameRef.current !== null) {
        window.cancelAnimationFrame(settleFrameRef.current)
      }

      const from = cameraRef.current
      const target = clampCamera(from)
      const distance = Math.hypot(
        target.x - from.x,
        target.y - from.y,
        (target.scale - from.scale) * 180
      )

      if (distance < 0.5) {
        updateCamera(target)
        return
      }

      const startedAt = performance.now()
      const duration = 220

      const step = (timestamp: number) => {
        const progress = Math.min(
          1,
          (timestamp - startedAt) / duration
        )
        const eased = 1 - Math.pow(1 - progress, 3)
        const next = {
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
          scale:
            from.scale +
            (target.scale - from.scale) * eased,
        }

        cameraRef.current = next
        writeCameraTransform(next)

        if (progress < 1) {
          settleFrameRef.current =
            window.requestAnimationFrame(step)
        } else {
          settleFrameRef.current = null
          updateCamera(target)
        }
      }

      settleFrameRef.current =
        window.requestAnimationFrame(step)
    }, [clampCamera, updateCamera, writeCameraTransform])

  const startInertia =
    useCallback(
      (velocityX: number, velocityY: number) => {
        stopCameraAnimation()

        let vx = velocityX
        let vy = velocityY
        let lastTimestamp = performance.now()

        if (Math.hypot(vx, vy) < 0.035) {
          settleCamera()
          return
        }

        const step = (timestamp: number) => {
          const deltaMs = Math.min(
            34,
            Math.max(1, timestamp - lastTimestamp)
          )
          lastTimestamp = timestamp

          const current = cameraRef.current
          const next = updateCamera(
            {
              ...current,
              x: current.x + vx * deltaMs,
              y: current.y + vy * deltaMs,
            },
            { soft: true }
          )
          const hard = clampCamera(next)

          if (Math.abs(next.x - hard.x) > 0.5) {
            vx *= 0.68
          }
          if (Math.abs(next.y - hard.y) > 0.5) {
            vy *= 0.68
          }

          const friction = Math.pow(0.91, deltaMs / 16.67)
          vx *= friction
          vy *= friction

          if (Math.hypot(vx, vy) > 0.018) {
            inertiaFrameRef.current =
              window.requestAnimationFrame(step)
          } else {
            inertiaFrameRef.current = null
            settleCamera()
          }
        }

        inertiaFrameRef.current =
          window.requestAnimationFrame(step)
      },
      [clampCamera, settleCamera, stopCameraAnimation, updateCamera]
    )

  const resetCamera =
    useCallback(() => {
      const viewport = viewportRef.current

      if (!viewport) {
        return
      }

      stopCameraAnimation()
      const { initial } = getScaleLimits()

      updateCamera({
        scale: initial,
        x:
          (viewport.clientWidth - worldSize.width * initial) / 2,
        y:
          (viewport.clientHeight - worldSize.height * initial) / 2,
      })

      cameraInitializedRef.current = true
    }, [
      getScaleLimits,
      stopCameraAnimation,
      updateCamera,
      worldSize.height,
      worldSize.width,
    ])

  const zoomAtPoint =
    useCallback(
      (targetScale: number, viewportPoint: Point) => {
        const current = cameraRef.current
        const worldPoint = {
          x: (viewportPoint.x - current.x) / current.scale,
          y: (viewportPoint.y - current.y) / current.scale,
        }

        updateCamera({
          scale: targetScale,
          x: viewportPoint.x - worldPoint.x * targetScale,
          y: viewportPoint.y - worldPoint.y * targetScale,
        })
      },
      [updateCamera]
    )

  const zoomBy =
    useCallback(
      (multiplier: number) => {
        const viewport = viewportRef.current

        if (!viewport) {
          return
        }

        stopCameraAnimation()
        zoomAtPoint(
          cameraRef.current.scale * multiplier,
          {
            x: viewport.clientWidth / 2,
            y: viewport.clientHeight / 2,
          }
        )
      },
      [stopCameraAnimation, zoomAtPoint]
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
    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (!cameraInitializedRef.current) {
        resetCamera()
        return
      }

      updateCamera(cameraRef.current)
    })

    observer.observe(viewport)

    return () => {
      observer.disconnect()
    }
  }, [resetCamera, updateCamera])

  useLayoutEffect(() => {
    if (!cameraInitializedRef.current) {
      resetCamera()
      return
    }

    updateCamera(cameraRef.current)
  }, [
    resetCamera,
    updateCamera,
    worldSize.height,
    worldSize.width,
  ])

  useEffect(
    () => () => {
      stopCameraAnimation()

      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
    },
    [stopCameraAnimation]
  )

  function getViewportPoint(
    event: ReactPointerEvent<HTMLDivElement>
  ): Point {
    const viewport = viewportRef.current

    if (!viewport) {
      return { x: event.clientX, y: event.clientY }
    }

    const rect = viewport.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function getPointerPair() {
    const pointers = Array.from(pointersRef.current.values())

    if (pointers.length < 2) {
      return null
    }

    const first = pointers[0]
    const second = pointers[1]
    const centroid = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    }
    const distance = Math.max(
      1,
      Math.hypot(second.x - first.x, second.y - first.y)
    )

    return { centroid, distance }
  }

  function beginPan(point: Point) {
    const now = performance.now()

    gestureRef.current = {
      mode: "pan",
      moved: false,
      startCamera: { ...cameraRef.current },
      startCentroid: point,
      startDistance: 0,
      anchorWorld: { x: 0, y: 0 },
      lastCentroid: point,
      lastTimestamp: now,
      velocityX: 0,
      velocityY: 0,
    }
  }

  function beginPinch() {
    const pair = getPointerPair()

    if (!pair) {
      return
    }

    const current = cameraRef.current
    const now = performance.now()

    gestureRef.current = {
      mode: "pinch",
      moved: true,
      startCamera: { ...current },
      startCentroid: pair.centroid,
      startDistance: pair.distance,
      anchorWorld: {
        x: (pair.centroid.x - current.x) / current.scale,
        y: (pair.centroid.y - current.y) / current.scale,
      },
      lastCentroid: pair.centroid,
      lastTimestamp: now,
      velocityX: 0,
      velocityY: 0,
    }

    setIsMoving(true)
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    const target = event.target

    pressedMapObjectRef.current = null

    // Seuls les contrôles flottants bloquent la caméra. Les bâtiments et
    // l'hélicoptère restent cliquables tout en pouvant servir de point de départ
    // à un drag. On mémorise donc l'objet pressé avant de capturer le pointeur.
    if (
      target instanceof Element &&
      target.closest("[data-map-ui]")
    ) {
      return
    }

    if (target instanceof Element) {
      const mapObject = target.closest<HTMLElement>(
        "[data-map-object]"
      )

      if (mapObject?.dataset.mapAction === "world-map") {
        pressedMapObjectRef.current = { kind: "world-map" }
      } else if (mapObject?.dataset.buildingId) {
        pressedMapObjectRef.current = {
          kind: "building",
          buildingId: mapObject.dataset.buildingId,
        }
      }
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return
    }

    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    stopCameraAnimation()
    viewport.setPointerCapture(event.pointerId)

    const point = getViewportPoint(event)
    pointersRef.current.set(event.pointerId, point)

    if (pointersRef.current.size >= 2) {
      beginPinch()
    } else {
      beginPan(point)
    }
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (!pointersRef.current.has(event.pointerId)) {
      return
    }

    const point = getViewportPoint(event)
    pointersRef.current.set(event.pointerId, point)

    if (pointersRef.current.size >= 2) {
      if (gestureRef.current.mode !== "pinch") {
        beginPinch()
      }

      const pair = getPointerPair()
      const gesture = gestureRef.current

      if (!pair || gesture.mode !== "pinch") {
        return
      }

      const ratio = pair.distance / gesture.startDistance
      const targetScale = gesture.startCamera.scale * ratio

      updateCamera(
        {
          scale: targetScale,
          x: pair.centroid.x - gesture.anchorWorld.x * targetScale,
          y: pair.centroid.y - gesture.anchorWorld.y * targetScale,
        },
        { soft: true }
      )

      gestureRef.current = {
        ...gesture,
        moved: true,
        lastCentroid: pair.centroid,
        lastTimestamp: performance.now(),
      }

      setIsMoving(true)
      return
    }

    const gesture = gestureRef.current

    if (gesture.mode !== "pan") {
      beginPan(point)
      return
    }

    const deltaX = point.x - gesture.startCentroid.x
    const deltaY = point.y - gesture.startCentroid.y
    const moved =
      gesture.moved || Math.hypot(deltaX, deltaY) > 5
    const now = performance.now()
    const elapsed = Math.max(1, now - gesture.lastTimestamp)
    const instantVelocityX =
      (point.x - gesture.lastCentroid.x) / elapsed
    const instantVelocityY =
      (point.y - gesture.lastCentroid.y) / elapsed
    const velocityX =
      gesture.velocityX * 0.58 + instantVelocityX * 0.42
    const velocityY =
      gesture.velocityY * 0.58 + instantVelocityY * 0.42

    updateCamera(
      {
        ...gesture.startCamera,
        x: gesture.startCamera.x + deltaX,
        y: gesture.startCamera.y + deltaY,
      },
      { soft: true }
    )

    gestureRef.current = {
      ...gesture,
      moved,
      lastCentroid: point,
      lastTimestamp: now,
      velocityX,
      velocityY,
    }

    if (moved) {
      setIsMoving(true)
    }
  }

  function finishPointer(
    event?: ReactPointerEvent<HTMLDivElement>
  ) {
    if (event) {
      pointersRef.current.delete(event.pointerId)
    } else {
      pointersRef.current.clear()
    }

    const gesture = gestureRef.current

    if (gesture.moved) {
      suppressClickRef.current = true

      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }

      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
        suppressClickTimerRef.current = null
      }, 180)
    }

    if (pointersRef.current.size >= 2) {
      beginPinch()
      return
    }

    if (pointersRef.current.size === 1) {
      const remainingPoint =
        Array.from(pointersRef.current.values())[0]
      beginPan(remainingPoint)
      return
    }

    gestureRef.current = {
      ...gesture,
      mode: "none",
      moved: false,
    }

    setIsMoving(false)

    const pressedMapObject = pressedMapObjectRef.current
    pressedMapObjectRef.current = null

    if (!gesture.moved && pressedMapObject) {
      // Pointer capture retargete le clic vers le viewport sur certains navigateurs
      // desktop. On active donc explicitement l'objet pressé au relâchement, comme
      // sur la World Map, puis on ignore le clic natif qui pourrait suivre.
      suppressNativeObjectClickUntilRef.current =
        performance.now() + 250

      if (pressedMapObject.kind === "world-map") {
        onWorldMapOpen?.()
      } else {
        const building = uniqueBuildings.find(
          (item) => item.id === pressedMapObject.buildingId
        )

        if (building) {
          handleBuildingClick(building)
        }
      }
    }

    if (gesture.mode === "pan" && gesture.moved) {
      startInertia(gesture.velocityX, gesture.velocityY)
    } else {
      settleCamera()
    }
  }

  function cancelPointer(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    pressedMapObjectRef.current = null
    finishPointer(event)
  }

  // Écouteur non-passif pour le zoom molette (évite l'avertissement passive listener).
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      stopCameraAnimation()
      const rect = node.getBoundingClientRect()
      const zoomFactor = Math.exp(-event.deltaY * 0.00135)
      zoomAtPoint(cameraRef.current.scale * zoomFactor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    return () => node.removeEventListener("wheel", onWheel)
  }, [stopCameraAnimation, zoomAtPoint])

  function handleBuildingClick(
    building: Building
  ) {
    if (suppressClickRef.current) {
      return
    }

    const requiredVillaLevel =
      getRequiredVillaLevel(
        building.type
      )

    const isLocked =
      building.type !==
        "villa" &&
      villaLevel <
        requiredVillaLevel

    if (isLocked) {
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
        overscrollBehavior: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
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
        cancelPointer
      }
      onDoubleClick={(
        event:
          ReactMouseEvent<HTMLDivElement>
      ) => {
        const target =
          event.target

        const elementUnderPointer =
          document.elementFromPoint(
            event.clientX,
            event.clientY
          )

        if (
          (target instanceof Element &&
            target.closest(
              "[data-map-ui], [data-map-object]"
            )) ||
          elementUnderPointer?.closest(
            "[data-map-ui], [data-map-object]"
          )
        ) {
          event.preventDefault()
          return
        }

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
        ref={cameraLayerRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width:
            worldSize.width,

          height:
            worldSize.height,

          transformOrigin:
            "0 0",
        }}
      >
        {pixiEnabled && (
          <PixiCityScene
            width={worldSize.width}
            height={worldSize.height}
            buildings={uniqueBuildings}
            placements={placements}
            villaLevel={villaLevel}
            artStyle={artStyle}
            onReady={setPixiReady}
            onUnavailable={setPixiUnavailable}
          />
        )}
        <img
          src={artStyle === "luxury"
            ? LUXURY_CITY_BACKGROUND
            : "/game-assets/city-map.webp"}
          alt="Carte de la ville"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          style={{ opacity: usePixiVisuals ? 0 : 1 }}
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

        {/* L'animation de la mer suit la caméra CSS, avec ou sans PixiJS. */}
        {artStyle === "luxury" && <SeaCanvasOverlay onStatus={setSeaStatus} />}

        {/* Accès au Monde via le HUD. L’hélicoptère reste réservé à la world map. */}

        {uniqueBuildings.map(
          (building) => {
            const placement =
              placements[
                building.type
              ]

            if (!placement) {
              return null
            }

            const currentLevel =
              Math.max(
                0,
                Number(
                  building.level
                ) || 0
              )

            const requiredVillaLevel =
              getRequiredVillaLevel(
                building.type
              )

            const isLocked =
              building.type !==
                "villa" &&
              villaLevel <
                requiredVillaLevel

            const isConstructed =
              currentLevel >= 1

            const isAvailableToBuild =
              !isConstructed &&
              !isLocked

            const buildingName =
              BUILDING_NAMES[
                building.type
              ]

            return (
              <button
                key={building.id}
                type="button"
                data-map-object
                data-building-id={building.id}
                className={`group absolute border-0 bg-transparent p-0 text-left ${
                  isLocked
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                }`}
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
                onClick={(
                  event
                ) => {
                  event.stopPropagation()

                  if (
                    event.detail > 0 &&
                    performance.now() <
                      suppressNativeObjectClickUntilRef.current
                  ) {
                    return
                  }

                  handleBuildingClick(
                    building
                  )
                }}
                disabled={
                  isLocked
                }
                aria-label={
                  isConstructed
                    ? `Ouvrir ${buildingName}`
                    : isLocked
                      ? `${buildingName} verrouillé — Villa niveau ${requiredVillaLevel} requise`
                      : `Construire ${buildingName}`
                }
              >
                <div className="pointer-events-none absolute bottom-[-2%] left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-full bg-black/50 blur-md" />

                <img
                  src={artStyle === "luxury"
                    ? LUXURY_BUILDING_ASSETS[building.type]
                    : `/game-assets/${building.type}.webp`}
                  alt={
                    buildingName
                  }
                  style={{ opacity: usePixiVisuals ? 0 : undefined }}
                  className={`pointer-events-none relative z-10 block w-full select-none transition duration-200 ${
                    isConstructed
                      ? "group-hover:brightness-110"
                      : isLocked
                        ? "opacity-15 grayscale blur-[0.5px]"
                        : "opacity-35 grayscale group-hover:opacity-55 group-hover:drop-shadow-[0_0_18px_rgba(34,197,94,0.8)]"
                  } ${
                    building.is_upgrading
                      ? "brightness-75 saturate-75"
                      : ""
                  }`}
                  draggable={false}
                />

                {isConstructed ? (
                  <div className="pointer-events-none absolute bottom-0 left-1/2 z-30 flex h-6 min-w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-400 bg-zinc-950 px-1 text-xs font-black text-yellow-300 shadow-lg">
                    {currentLevel}
                  </div>
                ) : (
                  <div
                    className={`pointer-events-none absolute bottom-0 left-1/2 z-30 flex h-7 min-w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 bg-zinc-950 px-1 text-xs font-black shadow-lg ${
                      isLocked
                        ? "border-zinc-600 text-zinc-400"
                        : "border-green-400 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                    }`}
                  >
                    {isLocked
                      ? "🔒"
                      : "🏗️"}
                  </div>
                )}

                <div
                  className={`pointer-events-none absolute left-1/2 top-full z-20 mt-5 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-bold shadow-lg backdrop-blur-sm sm:text-xs ${
                    isConstructed
                      ? "border-white/10 bg-black/80 text-white"
                      : isLocked
                        ? "border-zinc-700/60 bg-black/80 text-zinc-500"
                        : "border-green-400/30 bg-green-950/85 text-green-200"
                  }`}
                >
                  {isConstructed
                    ? buildingName
                    : isLocked
                      ? `${buildingName} · Villa ${requiredVillaLevel}`
                      : `Construire ${buildingName}`}
                </div>

                {isAvailableToBuild &&
                  !building.is_upgrading && (
                  <>
                    <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-xl border-2 border-dashed border-green-400/60 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.28)]" />

                    <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
                      <div className="flex items-center gap-1.5 rounded-full border border-green-300/50 bg-zinc-950/90 px-2.5 py-1 shadow-[0_0_14px_rgba(34,197,94,0.35)] backdrop-blur-sm">
                        <span className="text-xs">
                          🏗️
                        </span>

                        <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.12em] text-green-200">
                          Disponible
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {building.is_upgrading && (
                  <>
                    <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-500/5 shadow-[0_0_24px_rgba(251,191,36,0.35)]" />

                    <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
                      <div className="flex items-center gap-2 rounded-full border border-amber-300/60 bg-zinc-950/90 px-3 py-1.5 shadow-[0_0_18px_rgba(251,191,36,0.55)] backdrop-blur-sm">
                        <span className="animate-bounce text-sm">
                          🚧
                        </span>

                        <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.15em] text-amber-200">
                          {isConstructed
                            ? "En travaux"
                            : "Construction"}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {isLocked && (
                  <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-black/40">
                    <div className="rounded-full border border-zinc-600/70 bg-zinc-950/90 px-3 py-1.5 text-center shadow-xl">
                      <p className="text-lg">
                        🔒
                      </p>

                      <p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-400">
                        Villa {requiredVillaLevel}
                      </p>
                    </div>
                  </div>
                )}
              </button>
            )
          }
        )}
      </div>

      <div className="absolute bottom-20 left-3 z-20 flex flex-col items-start gap-2 md:bottom-4">
        <button
          type="button"
          data-map-ui
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            toggleArtStyle()
          }}
          title="Changer les visuels de la ville sans toucher aux sauvegardes"
          aria-pressed={artStyle === "luxury"}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-wide shadow-lg backdrop-blur transition-colors ${
            artStyle === "luxury"
              ? "border-amber-300 bg-gradient-to-r from-amber-950/95 to-zinc-950/95 text-amber-100 hover:border-amber-100"
              : "border-white/30 bg-zinc-950/85 text-white/80 hover:bg-zinc-800"
          }`}
        >
          {artStyle === "luxury" ? "✦ Ville Premium · Bloc 1" : "↺ Ville Classique"}
        </button>
        <button
          type="button"
          data-map-ui
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            toggleRenderer()
          }}
          title="Comparer les graphismes PixiJS et l'ancien affichage"
          className="rounded-full border border-amber-300/40 bg-zinc-950/85 px-3 py-1.5 text-[10px] font-bold text-amber-100 shadow-lg backdrop-blur hover:bg-zinc-800"
        >
          {pixiEnabled
            ? pixiReady
              ? "✦ Rendu PixiJS"
              : pixiUnavailable
                ? "▣ Rendu classique (secours)"
                : "◌ PixiJS en chargement"
            : "▣ Rendu classique"}
        </button>
        {artStyle === "luxury" && (
          <div
            aria-live="polite"
            className={`pointer-events-none rounded-full border px-3 py-1 text-[10px] font-bold backdrop-blur ${
              seaStatus === "active" ? "border-cyan-400/35 bg-cyan-950/80 text-cyan-100"
                : seaStatus === "paused" ? "border-amber-400/40 bg-amber-950/75 text-amber-100"
                  : seaStatus === "partial" || seaStatus === "fallback" || seaStatus === "unavailable"
                    ? "border-rose-400/40 bg-rose-950/75 text-rose-100"
                    : "border-white/20 bg-black/70 text-white/80"
            }`}
            title="État du calque marin indépendant du rendu PixiJS"
          >
            {seaStatus === "active" ? "🌊 Mer animée (2D)"
              : seaStatus === "partial" ? "🌊 Mer animée · textures incomplètes"
                : seaStatus === "fallback" ? "🌊 Vagues seules · textures manquantes"
                  : seaStatus === "paused" ? "🌊 Mouvement réduit (système)"
                    : seaStatus === "unavailable" ? "🌊 Canvas 2D indisponible"
                      : "🌊 Chargement de la mer…"}
          </div>
        )}
        <div className="pointer-events-none rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur">
          Glisser pour déplacer • pincer pour zoomer
        </div>
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
      data-map-ui
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
