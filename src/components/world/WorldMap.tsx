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

import {
  resolveWorldCombat,
} from "../../data/worldCombat"

import WorldOperationPanel from "./WorldOperationPanel"

import {
  syncCityRecruitments,
} from "../../services/troopService"

import {
  syncCityResearches,
} from "../../services/researchService"

import {
  clearWorldOperation,
  loadWorldOperation,
  saveWorldOperation,
} from "../../services/worldOperationStorage"

import {
  getWorldNodeCooldownRemainingSeconds,
  setWorldNodeCooldown,
} from "../../services/worldCooldownStorage"

import {
  reserveWorldOperationTroops,
  settleWorldOperation,
} from "../../services/worldOperationService"

import type {
  Building,
} from "../../types/building"

import type {
  CommanderSkills,
} from "../../types/commander"

import type {
  HumanDeploymentSelection,
} from "../../types/deployment"

import type {
  CityResearch,
} from "../../types/research"

import type {
  CityTroop,
} from "../../types/troop"

import type {
  WorldNode,
  WorldResourceType,
  WorldRewardRange,
} from "../../types/worldMap"

import type {
  WorldOperation,
} from "../../types/worldOperation"

type Props = {
  onBack: () => void
  onGameChanged: () => Promise<void>

  cityId: string
  playerId: string
  buildings: Building[]

  currentCityName: string
  currentVillaLevel: number
  commanderLevel: number
  commanderSkills: CommanderSkills
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

function countDeployment(
  selection: HumanDeploymentSelection
) {
  return Object.values(selection).reduce(
    (total, quantity) =>
      total +
      Math.max(
        0,
        Math.floor(Number(quantity) || 0)
      ),
    0
  )
}

export default function WorldMap({
  onBack,
  onGameChanged,
  cityId,
  playerId,
  buildings,
  currentCityName,
  currentVillaLevel,
  commanderLevel,
  commanderSkills,
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
  ] = useState<Camera>({
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
    isMoving,
    setIsMoving,
  ] = useState(false)

  const [
    selectedNode,
    setSelectedNode,
  ] = useState<WorldNode | null>(
    null
  )

  const [
    preparingNode,
    setPreparingNode,
  ] = useState<WorldNode | null>(
    null
  )

  const [
    cityTroops,
    setCityTroops,
  ] = useState<CityTroop[]>([])

  const [
    researches,
    setResearches,
  ] = useState<CityResearch[]>([])

  const [
    militaryLoading,
    setMilitaryLoading,
  ] = useState(true)

  const [
    militaryError,
    setMilitaryError,
  ] = useState<string | null>(null)

  const [
    activeOperation,
    setActiveOperation,
  ] = useState<WorldOperation | null>(
    () => loadWorldOperation(cityId)
  )

  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now())

  useEffect(() => {
    if (!cityId) {
      return
    }

    let cancelled = false

    Promise.all([
      syncCityRecruitments(cityId),
      syncCityResearches(cityId),
    ])
      .then(([
        recruitmentResult,
        researchResult,
      ]) => {
        if (cancelled) {
          return
        }

        setCityTroops(
          recruitmentResult.troops
        )

        setResearches(
          researchResult
        )

        setMilitaryError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setMilitaryError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les forces disponibles"
        )
      })
      .finally(() => {
        if (!cancelled) {
          setMilitaryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cityId])

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const operationProcessingRef =
    useRef(false)

  const persistOperation = useCallback(
    (operation: WorldOperation) => {
      saveWorldOperation(operation)
      setActiveOperation(operation)
      setCurrentTime(Date.now())
    },
    []
  )

  const resolveOperationCombat = useCallback(
    (operation: WorldOperation) => {
      if (operation.combatResult) {
        return
      }

      const result = resolveWorldCombat({
        operationId: operation.id,
        squadPower: operation.squadPower,
        enemyPower: operation.enemyPower,
        selection: operation.selection,
        rewardRange: operation.targetRewards,
      })

      const now = Date.now()

      if (
        operation.targetCooldownHours &&
        operation.targetCooldownHours > 0
      ) {
        setWorldNodeCooldown(
          cityId,
          operation.targetNodeId,
          operation.targetCooldownHours,
          now
        )
      }

      persistOperation({
        ...operation,
        phase: "returning",
        combatResult: result,
        returnStartedAt: new Date(now).toISOString(),
        returnAt: new Date(
          now + operation.travelSeconds * 1000
        ).toISOString(),
      })
    },
    [cityId, persistOperation]
  )

  const giveAssaultOrder = useCallback(
    (operation: WorldOperation) => {
      if (
        operation.phase !== "ready" &&
        operation.phase !== "outbound"
      ) {
        return
      }

      const now = Date.now()
      const preparationSeconds = Math.max(
        0,
        Math.floor(
          Number(
            operation.assaultPreparationSeconds
          ) || 0
        )
      )

      if (preparationSeconds <= 0) {
        resolveOperationCombat({
          ...operation,
          phase: "ready",
          assaultOrderedAt:
            new Date(now).toISOString(),
        })
        return
      }

      persistOperation({
        ...operation,
        phase: "assault_preparation",
        assaultOrderedAt:
          new Date(now).toISOString(),
        assaultResolvesAt: new Date(
          now + preparationSeconds * 1000
        ).toISOString(),
      })
    },
    [persistOperation, resolveOperationCombat]
  )

  async function launchOperation(
    node: WorldNode,
    selection: HumanDeploymentSelection,
    squadPower: number,
    autoAssault: boolean
  ) {
    if (activeOperation) {
      throw new Error(
        "Une opération extérieure est déjà en cours."
      )
    }

    const cooldownRemaining =
      getWorldNodeCooldownRemainingSeconds(
        cityId,
        node.id
      )

    if (cooldownRemaining > 0) {
      throw new Error(
        `Cette cible se réorganise encore pendant ${formatDuration(cooldownRemaining)}.`
      )
    }

    const travelSeconds = Math.max(
      1,
      Math.floor(
        Number(node.travelSeconds) || 1
      )
    )

    const refreshedTroops =
      await reserveWorldOperationTroops(
        cityId,
        selection
      )

    setCityTroops(refreshedTroops)

    const startedAt = new Date()
    const arrivalAt = new Date(
      startedAt.getTime() +
        travelSeconds * 1000
    )

    const operation: WorldOperation = {
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `world-${Date.now()}`,

      cityId,
      playerId,
      targetNodeId: node.id,
      targetName: node.name,
      targetIcon: node.icon,
      targetType: node.type,
      startedAt: startedAt.toISOString(),
      arrivalAt: arrivalAt.toISOString(),
      travelSeconds,
      squadPower,
      enemyPower: node.recommendedPower,
      selection: { ...selection },
      troopsReserved: true,
      autoAssault,
      assaultPreparationSeconds:
        node.type === "player_city"
          ? 120
          : 0,
      phase: "outbound",
      targetRewards:
        node.rewards
          ? { ...node.rewards }
          : undefined,
      targetCooldownHours:
        node.cooldownHours,
    }

    persistOperation(operation)
    setPreparingNode(null)
    setSelectedNode(null)

    await onGameChanged()
  }

  function recallOperation() {
    const operation = activeOperation

    if (
      !operation ||
      operation.phase === "returning" ||
      operation.phase === "returned"
    ) {
      return
    }

    const now = Date.now()
    const startedAt = new Date(
      operation.startedAt
    ).getTime()

    const elapsedSeconds =
      Number.isFinite(startedAt)
        ? Math.max(
            0,
            Math.ceil(
              (now - startedAt) / 1000
            )
          )
        : operation.travelSeconds

    const returnSeconds =
      operation.phase === "outbound"
        ? Math.max(
            5,
            Math.min(
              operation.travelSeconds,
              elapsedSeconds
            )
          )
        : operation.travelSeconds

    persistOperation({
      ...operation,
      phase: "returning",
      recalledAt:
        new Date(now).toISOString(),
      returnStartedAt:
        new Date(now).toISOString(),
      returnAt: new Date(
        now + returnSeconds * 1000
      ).toISOString(),
      assaultResolvesAt: undefined,
    })
  }

  function closeOperationReport() {
    clearWorldOperation(cityId)
    setActiveOperation(null)
  }

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

  useEffect(() => {
    const operation = activeOperation

    if (!operation) {
      return
    }

    let transition: (() => void) | null = null

    if (operation.phase === "outbound") {
      const arrivalTime = new Date(
        operation.arrivalAt
      ).getTime()

      if (
        Number.isFinite(arrivalTime) &&
        currentTime >= arrivalTime
      ) {
        transition = () => {
          if (operation.autoAssault) {
            giveAssaultOrder(operation)
          } else {
            persistOperation({
              ...operation,
              phase: "ready",
            })
          }
        }
      }
    } else if (
      operation.phase ===
        "assault_preparation" &&
      operation.assaultResolvesAt
    ) {
      const assaultTime = new Date(
        operation.assaultResolvesAt
      ).getTime()

      if (
        Number.isFinite(assaultTime) &&
        currentTime >= assaultTime
      ) {
        transition = () => {
          resolveOperationCombat(operation)
        }
      }
    }

    if (!transition) {
      return
    }

    const timeoutId = window.setTimeout(
      transition,
      0
    )

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeOperation,
    currentTime,
    giveAssaultOrder,
    persistOperation,
    resolveOperationCombat,
  ])

  useEffect(() => {
    const operation = activeOperation

    if (
      !operation ||
      operation.phase !== "returning" ||
      !operation.returnAt ||
      operationProcessingRef.current
    ) {
      return
    }

    const returnTime = new Date(
      operation.returnAt
    ).getTime()

    if (
      !Number.isFinite(returnTime) ||
      currentTime < returnTime
    ) {
      return
    }

    operationProcessingRef.current = true

    const returningTroops =
      operation.combatResult?.survivors ??
      operation.selection

    settleWorldOperation({
      cityId,
      playerId:
        operation.playerId || playerId,
      returningTroops,
      combatResult:
        operation.combatResult,
      returnTroopsToGarrison:
        operation.troopsReserved,
    })
      .then(async (troops) => {
        setCityTroops(troops)
        setMilitaryError(null)

        const returnedOperation: WorldOperation = {
          ...operation,
          phase: "returned",
          settledAt:
            new Date().toISOString(),
        }

        persistOperation(
          returnedOperation
        )

        await onGameChanged()
      })
      .catch((error: unknown) => {
        setMilitaryError(
          error instanceof Error
            ? error.message
            : "Impossible de finaliser le retour de l'escouade"
        )
      })
      .finally(() => {
        operationProcessingRef.current = false
      })
  }, [
    activeOperation,
    cityId,
    currentTime,
    onGameChanged,
    persistOperation,
    playerId,
  ])

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

      {activeOperation && (
        <ActiveWorldOperationCard
          operation={activeOperation}
          currentTime={currentTime}
          onRecall={recallOperation}
          onAssault={() =>
            giveAssaultOrder(activeOperation)
          }
          onCloseReport={closeOperationReport}
        />
      )}

      {selectedNode && (
        <WorldNodePanel
          node={
            selectedNode
          }
          activeOperation={
            activeOperation
          }
          cooldownRemainingSeconds={
            getWorldNodeCooldownRemainingSeconds(
              cityId,
              selectedNode.id,
              currentTime
            )
          }
          onClose={() =>
            setSelectedNode(
              null
            )
          }
          onBack={
            onBack
          }
          onPrepare={() =>
            setPreparingNode(
              selectedNode
            )
          }
        />
      )}

      {preparingNode && (
        <WorldOperationPanel
          key={preparingNode.id}
          node={preparingNode}
          buildings={buildings}
          cityTroops={cityTroops}
          researches={researches}
          commanderLevel={commanderLevel}
          commanderSkills={commanderSkills}
          activeOperation={activeOperation}
          loading={militaryLoading}
          errorMessage={militaryError}
          onClose={() =>
            setPreparingNode(null)
          }
          onLaunch={launchOperation}
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
  activeOperation: WorldOperation | null
  cooldownRemainingSeconds: number
  onClose: () => void
  onBack: () => void
  onPrepare: () => void
}

function WorldNodePanel({
  node,
  activeOperation,
  cooldownRemainingSeconds,
  onClose,
  onBack,
  onPrepare,
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

        {!isCity &&
          cooldownRemainingSeconds > 0 && (
            <InfoCard
              label="Disponible dans"
              value={formatDuration(cooldownRemainingSeconds)}
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
            onClick={onPrepare}
            disabled={
              Boolean(activeOperation) ||
              cooldownRemainingSeconds > 0
            }
            className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {activeOperation
              ? "🚁 Une opération est déjà en cours"
              : cooldownRemainingSeconds > 0
                ? `⏳ Cible indisponible — ${formatDuration(cooldownRemainingSeconds)}`
                : "⚔️ Préparer l'opération"}
          </button>
        )}
      </div>
    </aside>
  )
}

function ActiveWorldOperationCard({
  operation,
  currentTime,
  onRecall,
  onAssault,
  onCloseReport,
}: {
  operation: WorldOperation
  currentTime: number
  onRecall: () => void
  onAssault: () => void
  onCloseReport: () => void
}) {
  function secondsUntil(
    dateValue?: string
  ) {
    if (!dateValue) {
      return 0
    }

    const targetTime = new Date(
      dateValue
    ).getTime()

    if (!Number.isFinite(targetTime)) {
      return 0
    }

    return Math.max(
      0,
      Math.ceil(
        (targetTime - currentTime) /
          1000
      )
    )
  }

  const arrivalRemaining =
    secondsUntil(operation.arrivalAt)

  const assaultRemaining =
    secondsUntil(
      operation.assaultResolvesAt
    )

  const returnRemaining =
    secondsUntil(operation.returnAt)

  const result =
    operation.combatResult

  const initialUnits =
    countDeployment(
      operation.selection
    )

  const lostUnits = result
    ? countDeployment(
        result.casualties
      )
    : 0

  const survivingUnits = result
    ? countDeployment(
        result.survivors
      )
    : initialUnits

  const isVictory =
    result?.outcome === "victory"

  const { eyebrow, statusText } = (() => {
    if (operation.phase === "outbound") {
      return {
        eyebrow: "Escouade en route",
        statusText: `Arrivée dans ${formatDuration(arrivalRemaining)}`,
      }
    }

    if (operation.phase === "ready") {
      return {
        eyebrow: "Escouade sur zone",
        statusText: operation.autoAssault
          ? "Ordre automatique en cours de transmission"
          : "En attente de ton ordre d'assaut",
      }
    }

    if (
      operation.phase ===
      "assault_preparation"
    ) {
      return {
        eyebrow: "Position d'assaut",
        statusText: `Attaque dans ${formatDuration(assaultRemaining)}`,
      }
    }

    if (operation.phase === "returning") {
      if (operation.recalledAt && !result) {
        return {
          eyebrow: "Escouade rappelée",
          statusText: `Retour dans ${formatDuration(returnRemaining)}`,
        }
      }

      return {
        eyebrow: isVictory
          ? "Victoire — retour en cours"
          : "Défaite — survivants en retour",
        statusText: `Retour à la ville dans ${formatDuration(returnRemaining)}`,
      }
    }

    if (operation.recalledAt && !result) {
      return {
        eyebrow: "Retour terminé",
        statusText: "L'escouade est rentrée sans combattre.",
      }
    }

    return {
      eyebrow: isVictory
        ? "Rapport de victoire"
        : "Rapport de défaite",
      statusText: "L'escouade est revenue en ville.",
    }
  })()

  const showCombatReport =
    Boolean(result) &&
    (operation.phase === "returning" ||
      operation.phase === "returned")

  const canRecall =
    operation.phase === "outbound" ||
    operation.phase === "ready" ||
    operation.phase ===
      "assault_preparation"

  return (
    <aside
      data-world-interactive
      className="absolute left-3 top-24 z-30 max-h-[calc(100%-120px)] w-[min(380px,calc(100%-72px))] overflow-y-auto rounded-2xl border border-red-500/25 bg-black/90 p-3 shadow-2xl backdrop-blur-xl sm:left-5 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-xl">
          {operation.targetIcon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-300/75">
              {eyebrow}
            </p>

            {operation.autoAssault && (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-200">
                Auto
              </span>
            )}
          </div>

          <p className="mt-1 truncate font-black text-white">
            {operation.targetName}
          </p>

          <p className="mt-1 text-xs font-semibold text-zinc-400">
            {statusText}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
          <p className="text-[8px] font-black uppercase tracking-wide text-zinc-600">
            Escouade
          </p>
          <p className="mt-1 font-black text-white">
            {formatNumber(operation.squadPower)}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
          <p className="text-[8px] font-black uppercase tracking-wide text-zinc-600">
            Ennemi
          </p>
          <p className="mt-1 font-black text-red-200">
            {formatNumber(operation.enemyPower)}
          </p>
        </div>
      </div>

      {operation.phase === "ready" && (
        <button
          type="button"
          onClick={onAssault}
          className="mt-3 w-full rounded-xl bg-red-700 px-3 py-3 text-xs font-black text-white transition hover:bg-red-600"
        >
          ⚔️ Donner l'ordre d'assaut
        </button>
      )}

      {operation.phase ===
        "assault_preparation" && (
        <section className="mt-3 rounded-xl border border-orange-500/25 bg-orange-500/10 p-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300/75">
            Phase de réaction
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">
            {formatDuration(
              assaultRemaining
            )}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
            Cette fenêtre est destinée au futur PvP. Le défenseur pourra réorganiser sa garnison avant la résolution automatique du combat.
          </p>
        </section>
      )}

      {showCombatReport && result && (
        <section
          className={`mt-3 rounded-xl border p-3 ${
            isVictory
              ? "border-emerald-500/25 bg-emerald-500/10"
              : "border-red-500/25 bg-red-500/10"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                  isVictory
                    ? "text-emerald-300/80"
                    : "text-red-300/80"
                }`}
              >
                Résultat du combat
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {isVictory
                  ? "Victoire"
                  : "Défaite"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">
                Pertes
              </p>
              <p className="mt-1 font-black text-white">
                {formatNumber(lostUnits)} / {formatNumber(initialUnits)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <p className="text-zinc-500">
                Survivants
              </p>
              <p className="mt-1 font-black text-white">
                {formatNumber(survivingUnits)}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <p className="text-zinc-500">
                Taux de pertes
              </p>
              <p className="mt-1 font-black text-white">
                {result.casualtyPercent} %
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-300/75">
              {operation.phase === "returned"
                ? "Butin récupéré"
                : "Butin en cours de retour"}
            </p>

            <ExactRewardLines
              rewards={result.rewards}
            />
          </div>
        </section>
      )}

      {operation.phase === "returned" &&
        !result && (
          <section className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-3 text-xs font-semibold leading-relaxed text-zinc-300">
            Aucun combat n'a eu lieu. Tous les hommes rappelés ont rejoint la garnison.
          </section>
        )}

      {canRecall && (
        <button
          type="button"
          onClick={onRecall}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          Rappeler l'escouade
        </button>
      )}

      {operation.phase === "returned" && (
        <button
          type="button"
          onClick={onCloseReport}
          className="mt-2 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-xs font-black text-zinc-950 transition hover:bg-white"
        >
          Fermer le rapport
        </button>
      )}
    </aside>
  )
}

function ExactRewardLines({
  rewards,
}: {
  rewards: NonNullable<
    WorldOperation["combatResult"]
  >["rewards"]
}) {
  const lines: string[] = []

  if (rewards.money > 0) {
    lines.push(
      `💵 +${formatNumber(rewards.money)} argent`
    )
  }

  if (rewards.materials > 0) {
    lines.push(
      `🧱 +${formatNumber(rewards.materials)} matériaux`
    )
  }

  if (rewards.equipment > 0) {
    lines.push(
      `🧰 +${formatNumber(rewards.equipment)} équipements`
    )
  }

  if (rewards.influence > 0) {
    lines.push(
      `⭐ +${formatNumber(rewards.influence)} Influence`
    )
  }

  if (rewards.commanderXp > 0) {
    lines.push(
      `🧠 +${formatNumber(rewards.commanderXp)} XP commandant`
    )
  }

  if (lines.length === 0) {
    lines.push("Aucun butin récupéré")
  }

  return (
    <div className="mt-2 space-y-1 text-xs font-bold text-zinc-300">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
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
