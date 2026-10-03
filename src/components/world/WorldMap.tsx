import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"

import {
  createWorldNodes,
} from "../../data/worldMapNodes"

import {
  resolveWorldCombat,
} from "../../data/worldCombat"

import {
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
  getPvpTravelSeconds,
  getWorldDistanceKm,
} from "../../data/worldLayout"

import {
  DEFAULT_WORLD_CITY_RENDER_TEMPLATE,
} from "../../data/worldCityRenderTemplate"

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

import {
  ensureCurrentWorldPosition,
  loadAvailableWorldSlots,
  loadWorldPlayerCities,
  MultiplayerWorldMigrationRequiredError,
  relocateCurrentWorldPosition,
} from "../../services/worldMultiplayerService"

import {
  loadWorldCityRenderTemplate,
  saveWorldCityRenderTemplate,
  WorldCityRenderTemplateMigrationRequiredError,
} from "../../services/worldCityRenderTemplateService"

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
  WorldRewardRange,
} from "../../types/worldMap"

import type {
  WorldOperation,
} from "../../types/worldOperation"

import type {
  NewGameNotification,
} from "../../types/gameNotification"

import type {
  WorldPlayerCity,
  WorldSpawnSlot,
} from "../../types/worldPlayer"

import type {
  WorldCityRenderTemplate,
} from "../../types/worldCityRenderTemplate"

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
  isAdmin: boolean
  onNotify?: (notification: NewGameNotification) => void
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

type WorldNoticeTone =
  | "info"
  | "success"
  | "warning"
  | "danger"

type WorldNotice = {
  title: string
  message: string
  tone: WorldNoticeTone
  category?: NewGameNotification["category"]
  data?: Record<string, unknown>
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

const DEFAULT_WORLD_SIZE:
  WorldSize = {
    width: WORLD_MAP_WIDTH,
    height: WORLD_MAP_HEIGHT,
  }

function getPlayerCityAsset(
  villaLevel: number
) {
  void villaLevel
  return "/world/cities/world-city-villa.png"
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

function formatSignedNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
      signDisplay: "exceptZero",
    }
  ).format(Number(value) || 0)
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
  isAdmin,
  onNotify,
}: Props) {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const cameraLayerRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const activePointersRef =
    useRef<Map<number, Point>>(
      new Map()
    )

  const inertiaFrameRef =
    useRef<number | null>(null)

  const settleFrameRef =
    useRef<number | null>(null)

  const suppressNodeClickUntilRef =
    useRef(0)

  const pressedNodeIdRef =
    useRef<string | null>(null)

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

  const cameraRef =
    useRef<Camera>({
      x: 0,
      y: 0,
      scale: 1,
    })

  const worldSize = DEFAULT_WORLD_SIZE

  const [
    worldPlayers,
    setWorldPlayers,
  ] = useState<WorldPlayerCity[]>([])

  const [
    multiplayerLoading,
    setMultiplayerLoading,
  ] = useState(true)

  const [
    multiplayerError,
    setMultiplayerError,
  ] = useState<string | null>(null)

  const [
    relocationMode,
    setRelocationMode,
  ] = useState(false)

  const [
    relocationSlots,
    setRelocationSlots,
  ] = useState<WorldSpawnSlot[]>([])

  const [
    relocationLoading,
    setRelocationLoading,
  ] = useState(false)

  const [
    relocationError,
    setRelocationError,
  ] = useState<string | null>(null)

  const [
    cityRenderTemplate,
    setCityRenderTemplate,
  ] = useState<WorldCityRenderTemplate>(
    DEFAULT_WORLD_CITY_RENDER_TEMPLATE
  )

  const [
    cityRenderDraft,
    setCityRenderDraft,
  ] = useState<WorldCityRenderTemplate>(
    DEFAULT_WORLD_CITY_RENDER_TEMPLATE
  )

  const [
    cityRenderEditorOpen,
    setCityRenderEditorOpen,
  ] = useState(false)

  const [
    cityRenderTemplateLoading,
    setCityRenderTemplateLoading,
  ] = useState(true)

  const [
    cityRenderTemplateSaving,
    setCityRenderTemplateSaving,
  ] = useState(false)

  const [
    cityRenderTemplateError,
    setCityRenderTemplateError,
  ] = useState<string | null>(null)

  const focusedOnCurrentCityRef =
    useRef(false)

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

  const [
    operationDetailsOpen,
    setOperationDetailsOpen,
  ] = useState(false)

  const [
    worldNotice,
    setWorldNotice,
  ] = useState<WorldNotice | null>(null)

  const noticeTimerRef =
    useRef<number | null>(null)

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

  const refreshWorldPlayers = useCallback(async () => {
    try {
      await ensureCurrentWorldPosition()
      const players = await loadWorldPlayerCities()

      setWorldPlayers(players)
      setMultiplayerError(null)
    } catch (error) {
      if (
        error instanceof
        MultiplayerWorldMigrationRequiredError
      ) {
        setMultiplayerError(
          "Migration Multiplayer World 1 requise dans Supabase."
        )
      } else {
        setMultiplayerError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les villes des joueurs"
        )
      }
    } finally {
      setMultiplayerLoading(false)
    }
  }, [])

  const refreshCityRenderTemplate = useCallback(async () => {
    setCityRenderTemplateLoading(true)

    try {
      const template = await loadWorldCityRenderTemplate()
      setCityRenderTemplate(template)
      setCityRenderDraft(template)
      setCityRenderTemplateError(null)
    } catch (error) {
      if (
        error instanceof
        WorldCityRenderTemplateMigrationRequiredError
      ) {
        setCityRenderTemplateError(
          "Migration World City Render Template requise dans Supabase."
        )
      } else {
        setCityRenderTemplateError(
          error instanceof Error
            ? error.message
            : "Impossible de charger le gabarit visuel des villes"
        )
      }
    } finally {
      setCityRenderTemplateLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCityRenderTemplate()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [refreshCityRenderTemplate])

  const openCityRenderEditor = useCallback(() => {
    setCityRenderDraft(cityRenderTemplate)
    setCityRenderEditorOpen(true)
    setRelocationMode(false)
    setRelocationSlots([])
    setRelocationError(null)
  }, [cityRenderTemplate])

  const closeCityRenderEditor = useCallback(() => {
    setCityRenderDraft(cityRenderTemplate)
    setCityRenderEditorOpen(false)
    setCityRenderTemplateError(null)
  }, [cityRenderTemplate])

  const saveCityRenderEditor = useCallback(async () => {
    if (!isAdmin) {
      return
    }

    setCityRenderTemplateSaving(true)
    setCityRenderTemplateError(null)

    try {
      const saved = await saveWorldCityRenderTemplate(
        cityRenderDraft
      )

      setCityRenderTemplate(saved)
      setCityRenderDraft(saved)
      setCityRenderEditorOpen(false)
      setWorldNotice({
        title: "Gabarit ville enregistré",
        message:
          "Le même placement sera maintenant utilisé pour toutes les villes de la World Map.",
        tone: "success",
        category: "world",
      })
    } catch (error) {
      setCityRenderTemplateError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le gabarit visuel"
      )
    } finally {
      setCityRenderTemplateSaving(false)
    }
  }, [cityRenderDraft, isAdmin])

  const startRelocationMode = useCallback(async () => {
    setRelocationLoading(true)
    setRelocationError(null)

    try {
      const slots = await loadAvailableWorldSlots()
      setRelocationSlots(slots)
      setSelectedNode(null)
      setRelocationMode(true)
    } catch (error) {
      setRelocationError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les emplacements libres"
      )
    } finally {
      setRelocationLoading(false)
    }
  }, [])

  const cancelRelocationMode = useCallback(() => {
    setRelocationMode(false)
    setRelocationSlots([])
    setRelocationError(null)
  }, [])

  const handleRelocationSlot = useCallback(
    async (slot: WorldSpawnSlot) => {
      const confirmed = window.confirm(
        "Déplacer ta ville sur cet emplacement ?"
      )

      if (!confirmed) {
        return
      }

      setRelocationLoading(true)
      setRelocationError(null)

      try {
        await relocateCurrentWorldPosition(slot.slot_index)
        await refreshWorldPlayers()
        setRelocationMode(false)
        setRelocationSlots([])
        setWorldNotice({
          title: "Ville déplacée",
          message: "Ta ville occupe maintenant ce nouvel emplacement.",
          tone: "success",
          category: "world",
        })
        window.setTimeout(() => {
          setWorldNotice(null)
        }, 3200)
      } catch (error) {
        setRelocationError(
          error instanceof Error
            ? error.message
            : "Impossible de déplacer la ville"
        )
      } finally {
        setRelocationLoading(false)
      }
    },
    [refreshWorldPlayers]
  )

  useEffect(() => {
    let cancelled = false

    const initialTimeoutId = window.setTimeout(() => {
      if (!cancelled) {
        void refreshWorldPlayers()
      }
    }, 0)

    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void refreshWorldPlayers()
      }
    }, 20000)

    return () => {
      cancelled = true
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [refreshWorldPlayers, playerId])

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

  const showWorldNotice = useCallback(
    (notice: WorldNotice) => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(
          noticeTimerRef.current
        )
      }

      setWorldNotice(notice)

      onNotify?.({
        category: notice.category ?? "world",
        tone: notice.tone,
        title: notice.title,
        message: notice.message,
        data: notice.data ?? {},
      })

      noticeTimerRef.current =
        window.setTimeout(() => {
          setWorldNotice(null)
          noticeTimerRef.current = null
        }, 5200)
    },
    [onNotify]
  )

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(
          noticeTimerRef.current
        )
      }
    }
  }, [])

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

      showWorldNotice({
        title:
          result.outcome === "victory"
            ? "Victoire !"
            : "Défaite",
        message:
          `${operation.targetName} • ${countDeployment(result.casualties)} perte${countDeployment(result.casualties) > 1 ? "s" : ""} • retour en cours`,
        tone:
          result.outcome === "victory"
            ? "success"
            : "danger",
        category: "battle",
        data: {
          operationId: operation.id,
          targetNodeId: operation.targetNodeId,
          outcome: result.outcome,
        },
      })

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
    [
      cityId,
      persistOperation,
      showWorldNotice,
    ]
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
    if (
      node.type === "player_city" &&
      !node.isCurrentPlayer
    ) {
      throw new Error(
        "Le combat PvP serveur n'est pas encore activé. Cette phase permet uniquement de préparer et comparer l'escouade."
      )
    }
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
    setOperationDetailsOpen(false)
    setPreparingNode(null)
    setSelectedNode(null)

    showWorldNotice({
      title: "Escouade envoyée",
      message:
        `${node.name} • arrivée dans ${formatDuration(travelSeconds)}`,
      tone: "info",
      category: "world",
      data: {
        operationId: operation.id,
        targetNodeId: node.id,
      },
    })

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

    setOperationDetailsOpen(false)

    showWorldNotice({
      title: "Escouade rappelée",
      message:
        `Retour prévu dans ${formatDuration(returnSeconds)}`,
      tone: "warning",
    })
  }

  function closeOperationReport() {
    clearWorldOperation(cityId)
    setActiveOperation(null)
    setOperationDetailsOpen(false)
  }

  const staticNodes =
    useMemo(
      () => createWorldNodes(),
      []
    )

  const currentWorldPlayer =
    useMemo(
      () =>
        worldPlayers.find(
          (player) => player.is_current
        ) ?? null,
      [worldPlayers]
    )

  const playerNodes =
    useMemo(() => {
      if (worldPlayers.length === 0) {
        return [
          {
            id: "current-player-city-fallback",
            key: "current_player_city_fallback",
            type: "player_city" as const,
            cityKind: "current" as const,
            ownerPlayerId: playerId,
            ownerCityId: cityId,
            username: currentCityName,
            name: currentCityName || "Ma ville",
            description:
              "Le cœur de ton empire criminel.",
            icon: "🏙️",
            mapAssetSrc: getPlayerCityAsset(currentVillaLevel),
            mapAssetAlt: "Votre empire",
            mapAssetWidth: 8.2,
            x: 47.6,
            y: 57.2,
            hotspotWidth: 9.4,
            hotspotHeight: 12.5,
            level: Math.max(1, currentVillaLevel),
            recommendedPower: Math.max(100, commanderLevel * 100),
            travelSeconds: 0,
            distanceKm: 0,
            isCurrentPlayer: true,
          } satisfies WorldNode,
        ]
      }

      return worldPlayers.map((player) => {
        const distanceKm = currentWorldPlayer
          ? getWorldDistanceKm(
              currentWorldPlayer.x,
              currentWorldPlayer.y,
              player.x,
              player.y
            )
          : 0

        const isCurrent =
          player.is_current ||
          player.player_id === playerId

        return {
          id: `player-city-${player.player_id}`,
          key: `player_city_${player.player_id}`,
          type: "player_city" as const,
          cityKind: isCurrent ? "current" as const : "rival" as const,
          ownerPlayerId: player.player_id,
          ownerCityId: player.city_id,
          username: player.username,
          protectionUntil: player.protection_until,
          isCurrentPlayer: isCurrent,
          name: isCurrent
            ? `${player.username} • Votre ville`
            : `Empire de ${player.username}`,
          description: isCurrent
            ? "Votre position persistante dans la Région Sud."
            : "Une ville appartenant à un autre commandant de Crime Empire.",
          icon: isCurrent ? "🏙️" : "🏰",
          mapAssetSrc: getPlayerCityAsset(player.villa_level),
          mapAssetAlt: `Ville de ${player.username}`,
          mapAssetWidth: 8.2,
          x: player.x,
          y: player.y,
          hotspotWidth: 9.4,
          hotspotHeight: 12.5,
          level: Math.max(1, player.villa_level),
          recommendedPower: Math.max(100, player.estimated_power),
          travelSeconds: isCurrent
            ? 0
            : getPvpTravelSeconds(distanceKm),
          distanceKm,
        } satisfies WorldNode
      })
    }, [
      cityId,
      commanderLevel,
      currentCityName,
      currentVillaLevel,
      currentWorldPlayer,
      playerId,
      worldPlayers,
    ])


  const nodes = useMemo(
    () => [...staticNodes, ...playerNodes],
    [playerNodes, staticNodes]
  )

  const effectiveCityRenderTemplate =
    cityRenderEditorOpen && isAdmin
      ? cityRenderDraft
      : cityRenderTemplate

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

            showWorldNotice({
              title: "Escouade sur zone",
              message:
                `${operation.targetName} • ordre d'assaut requis`,
              tone: "warning",
              category: "world",
              data: {
                operationId: operation.id,
                targetNodeId: operation.targetNodeId,
              },
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
    showWorldNotice,
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
      settlementProgress:
        operation.settlementProgress,
      sourceLabel:
        `Opération — ${operation.targetName}`,
      onProgress: (settlementProgress) => {
        persistOperation({
          ...operation,
          settlementProgress,
        })
      },
    })
      .then(async ({
        troops,
        settlementProgress,
      }) => {
        setCityTroops(troops)
        setMilitaryError(null)

        const returnedOperation: WorldOperation = {
          ...operation,
          phase: "returned",
          settlementProgress,
          settledAt:
            new Date().toISOString(),
        }

        persistOperation(
          returnedOperation
        )

        showWorldNotice({
          title: "Escouade revenue",
          message:
            operation.combatResult?.outcome === "victory"
              ? `${operation.targetName} • butin sécurisé`
              : operation.combatResult
                ? `${operation.targetName} • survivants revenus`
                : "Tous les hommes rappelés ont rejoint la garnison",
          tone:
            operation.combatResult?.outcome === "victory"
              ? "success"
              : "info",
          category:
            operation.combatResult
              ? "battle"
              : "world",
          data: {
            operationId: operation.id,
            targetNodeId: operation.targetNodeId,
            returned: true,
          },
        })

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
    showWorldNotice,
  ])

  const getScaleLimits =
    useCallback(() => {
      const viewport =
        viewportRef.current

      if (!viewport) {
        return {
          minimum: 0.06,
          maximum: 2,
          initial: 0.35,
        }
      }

      const viewportWidth =
        Math.max(1, viewport.clientWidth)
      const viewportHeight =
        Math.max(1, viewport.clientHeight)

      const containScale =
        Math.min(
          viewportWidth / worldSize.width,
          viewportHeight / worldSize.height
        )

      const isMobile =
        window.innerWidth < 768

      const desiredInitial =
        isMobile ? 0.34 : 0.52

      return {
        minimum: Math.max(0.045, containScale),
        maximum: Math.max(1.8, desiredInitial * 4),
        initial: Math.max(
          containScale,
          desiredInitial
        ),
      }
    }, [worldSize.height, worldSize.width])

  const getCameraBounds =
    useCallback(
      (scale: number) => {
        const viewport = viewportRef.current

        if (!viewport) {
          return {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0,
          }
        }

        const scaledWidth = worldSize.width * scale
        const scaledHeight = worldSize.height * scale
        const viewportWidth = viewport.clientWidth
        const viewportHeight = viewport.clientHeight

        const minX =
          scaledWidth <= viewportWidth
            ? (viewportWidth - scaledWidth) / 2
            : viewportWidth - scaledWidth

        const maxX =
          scaledWidth <= viewportWidth
            ? minX
            : 0

        const minY =
          scaledHeight <= viewportHeight
            ? (viewportHeight - scaledHeight) / 2
            : viewportHeight - scaledHeight

        const maxY =
          scaledHeight <= viewportHeight
            ? minY
            : 0

        return {
          minX,
          maxX,
          minY,
          maxY,
        }
      },
      [worldSize.height, worldSize.width]
    )

  const clampCamera =
    useCallback(
      (candidate: Camera): Camera => {
        const {
          minimum,
          maximum,
        } = getScaleLimits()

        const scale = Math.min(
          maximum,
          Math.max(minimum, candidate.scale)
        )

        const bounds = getCameraBounds(scale)

        return {
          scale,
          x: Math.min(
            bounds.maxX,
            Math.max(bounds.minX, candidate.x)
          ),
          y: Math.min(
            bounds.maxY,
            Math.max(bounds.minY, candidate.y)
          ),
        }
      },
      [getCameraBounds, getScaleLimits]
    )

  const softenAxis = useCallback(
    (
      value: number,
      minimum: number,
      maximum: number,
      resistance = 0.28,
      maxOverscroll = 88
    ) => {
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
        const {
          minimum,
          maximum,
        } = getScaleLimits()

        const scale = Math.min(
          maximum,
          Math.max(minimum, candidate.scale)
        )

        const bounds = getCameraBounds(scale)

        return {
          scale,
          x: softenAxis(
            candidate.x,
            bounds.minX,
            bounds.maxX
          ),
          y: softenAxis(
            candidate.y,
            bounds.minY,
            bounds.maxY
          ),
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
      (
        candidate: Camera,
        options?: {
          soft?: boolean
        }
      ) => {
        const next = options?.soft
          ? softenCamera(candidate)
          : clampCamera(candidate)

        cameraRef.current = next
        writeCameraTransform(next)

        return next
      },
      [clampCamera, softenCamera, writeCameraTransform]
    )

  const stopCameraAnimation =
    useCallback(() => {
      if (inertiaFrameRef.current !== null) {
        window.cancelAnimationFrame(
          inertiaFrameRef.current
        )
        inertiaFrameRef.current = null
      }

      if (settleFrameRef.current !== null) {
        window.cancelAnimationFrame(
          settleFrameRef.current
        )
        settleFrameRef.current = null
      }
    }, [])

  const settleCamera =
    useCallback(() => {
      if (settleFrameRef.current !== null) {
        window.cancelAnimationFrame(
          settleFrameRef.current
        )
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
          const candidate = {
            ...current,
            x: current.x + vx * deltaMs,
            y: current.y + vy * deltaMs,
          }

          const next = updateCamera(candidate, {
            soft: true,
          })

          const hard = clampCamera(next)
          const hitHorizontalEdge =
            Math.abs(next.x - hard.x) > 0.5
          const hitVerticalEdge =
            Math.abs(next.y - hard.y) > 0.5

          if (hitHorizontalEdge) {
            vx *= 0.68
          }

          if (hitVerticalEdge) {
            vy *= 0.68
          }

          const friction = Math.pow(
            0.91,
            deltaMs / 16.67
          )

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
      const focusX =
        ((currentWorldPlayer?.x ?? 50) / 100) *
        worldSize.width
      const focusY =
        ((currentWorldPlayer?.y ?? 50) / 100) *
        worldSize.height

      updateCamera({
        scale: initial,
        x:
          viewport.clientWidth / 2 -
          focusX * initial,
        y:
          viewport.clientHeight / 2 -
          focusY * initial,
      })

      cameraInitializedRef.current = true
      focusedOnCurrentCityRef.current = Boolean(currentWorldPlayer?.player_id)
    }, [
      currentWorldPlayer?.player_id,
      currentWorldPlayer?.x,
      currentWorldPlayer?.y,
      getScaleLimits,
      stopCameraAnimation,
      updateCamera,
      worldSize.height,
      worldSize.width,
    ])

  const zoomAtPoint =
    useCallback(
      (
        targetScale: number,
        viewportPoint: Point,
        soft = false
      ) => {
        const current = cameraRef.current
        const worldPoint = {
          x:
            (viewportPoint.x - current.x) /
            current.scale,
          y:
            (viewportPoint.y - current.y) /
            current.scale,
        }

        updateCamera(
          {
            scale: targetScale,
            x:
              viewportPoint.x -
              worldPoint.x * targetScale,
            y:
              viewportPoint.y -
              worldPoint.y * targetScale,
          },
          { soft }
        )
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

  useEffect(() => {
    if (
      !currentWorldPlayer ||
      focusedOnCurrentCityRef.current
    ) {
      return
    }

    resetCamera()
  }, [currentWorldPlayer, resetCamera])

  useEffect(
    () => () => {
      stopCameraAnimation()
    },
    [stopCameraAnimation]
  )

  function getViewportPoint(
    event: ReactPointerEvent<HTMLDivElement>
  ): Point {
    const viewport = viewportRef.current

    if (!viewport) {
      return {
        x: event.clientX,
        y: event.clientY,
      }
    }

    const rect = viewport.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function getPointerPair() {
    const pointers = Array.from(
      activePointersRef.current.values()
    )

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
      Math.hypot(
        second.x - first.x,
        second.y - first.y
      )
    )

    return {
      centroid,
      distance,
    }
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
        x:
          (pair.centroid.x - current.x) /
          current.scale,
        y:
          (pair.centroid.y - current.y) /
          current.scale,
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

    pressedNodeIdRef.current = null

    if (
      target instanceof Element &&
      target.closest(
        "[data-world-interactive]"
      )
    ) {
      return
    }

    if (target instanceof Element) {
      const nodeTarget = target.closest<HTMLElement>(
        "[data-world-node-id]"
      )
      pressedNodeIdRef.current =
        nodeTarget?.dataset.worldNodeId ?? null
    }

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return
    }

    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    stopCameraAnimation()

    viewport.setPointerCapture(event.pointerId)

    const point = getViewportPoint(event)
    activePointersRef.current.set(
      event.pointerId,
      point
    )

    if (activePointersRef.current.size >= 2) {
      beginPinch()
    } else {
      beginPan(point)
    }
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      !activePointersRef.current.has(
        event.pointerId
      )
    ) {
      return
    }

    const point = getViewportPoint(event)
    activePointersRef.current.set(
      event.pointerId,
      point
    )

    if (activePointersRef.current.size >= 2) {
      if (gestureRef.current.mode !== "pinch") {
        beginPinch()
      }

      const pair = getPointerPair()
      const gesture = gestureRef.current

      if (!pair || gesture.mode !== "pinch") {
        return
      }

      const ratio =
        pair.distance / gesture.startDistance
      const targetScale =
        gesture.startCamera.scale * ratio

      updateCamera(
        {
          scale: targetScale,
          x:
            pair.centroid.x -
            gesture.anchorWorld.x * targetScale,
          y:
            pair.centroid.y -
            gesture.anchorWorld.y * targetScale,
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

    const deltaX =
      point.x - gesture.startCentroid.x
    const deltaY =
      point.y - gesture.startCentroid.y

    const moved =
      gesture.moved ||
      Math.hypot(deltaX, deltaY) > 5

    const now = performance.now()
    const elapsed = Math.max(
      1,
      now - gesture.lastTimestamp
    )

    const instantVelocityX =
      (point.x - gesture.lastCentroid.x) /
      elapsed
    const instantVelocityY =
      (point.y - gesture.lastCentroid.y) /
      elapsed

    const velocityX =
      gesture.velocityX * 0.58 +
      instantVelocityX * 0.42
    const velocityY =
      gesture.velocityY * 0.58 +
      instantVelocityY * 0.42

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
      activePointersRef.current.delete(
        event.pointerId
      )
    } else {
      activePointersRef.current.clear()
    }

    const gesture = gestureRef.current

    if (gesture.moved) {
      suppressNodeClickUntilRef.current =
        performance.now() + 180
    }

    if (activePointersRef.current.size >= 2) {
      beginPinch()
      return
    }

    if (activePointersRef.current.size === 1) {
      const remainingPoint = Array.from(
        activePointersRef.current.values()
      )[0]
      beginPan(remainingPoint)
      return
    }

    gestureRef.current = {
      ...gesture,
      mode: "none",
      moved: false,
    }

    setIsMoving(false)

    const pressedNodeId = pressedNodeIdRef.current
    pressedNodeIdRef.current = null

    if (!gesture.moved && pressedNodeId) {
      const pressedNode = nodes.find(
        (node) => node.id === pressedNodeId
      )

      if (pressedNode) {
        setSelectedNode(pressedNode)
      }
    }

    if (gesture.mode === "pan" && gesture.moved) {
      startInertia(
        gesture.velocityX,
        gesture.velocityY
      )
    } else {
      settleCamera()
    }
  }

  function handleWheel(
    event: ReactWheelEvent<HTMLDivElement>
  ) {
    event.preventDefault()

    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    stopCameraAnimation()

    const rect = viewport.getBoundingClientRect()
    const zoomFactor = Math.exp(
      -event.deltaY * 0.00135
    )

    zoomAtPoint(
      cameraRef.current.scale * zoomFactor,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
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
              "[data-world-interactive], [data-world-node]"
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
          ref={cameraLayerRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: worldSize.width,
            height: worldSize.height,
            transformOrigin: "0 0",
          }}
        >
          <div className="world-expanse-base pointer-events-none absolute inset-0" />

          {relocationMode && (
            <WorldRelocationSlotsLayer
              slots={relocationSlots}
              loading={relocationLoading}
              onSelect={handleRelocationSlot}
            />
          )}

          <div className="pointer-events-none absolute inset-0 bg-black/[0.015]" />

          {activeOperation && (
            <WorldOperationRoute
              operation={activeOperation}
              nodes={nodes}
              currentTime={currentTime}
              worldSize={worldSize}
            />
          )}

          {cityRenderEditorOpen &&
            isAdmin &&
            currentWorldPlayer && (
              <WorldCityTemplateGuide
                x={currentWorldPlayer.x}
                y={currentWorldPlayer.y}
              />
            )}

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
                cityRenderTemplate={
                  effectiveCityRenderTemplate
                }
                onSelect={() => {
                  if (
                    performance.now() <
                    suppressNodeClickUntilRef.current
                  ) {
                    return
                  }

                  setSelectedNode(node)
                }}
              />
            )
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/10" />

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

        <div className="pointer-events-none flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 shadow-xl backdrop-blur-xl">
          <span aria-hidden="true">🌐</span>
          <span className="text-xs font-black text-white">
            Région Sud
          </span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-[10px] font-bold text-zinc-300">
            {multiplayerLoading
              ? "Synchronisation…"
              : `${worldPlayers.length} empire${worldPlayers.length > 1 ? "s" : ""}`}
          </span>
        </div>
      </header>

      {multiplayerError && (
        <div
          data-world-interactive
          className="absolute left-1/2 top-16 z-30 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-3 py-2 text-center text-[10px] font-bold text-amber-100 shadow-xl backdrop-blur"
        >
          ⚠️ {multiplayerError}
        </div>
      )}

      {relocationMode && (
        <div
          data-world-interactive
          className="absolute left-1/2 top-16 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-400/30 bg-zinc-950/94 px-4 py-3 shadow-2xl backdrop-blur-xl"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
              Déplacement de la ville
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-zinc-400">
              Choisis un emplacement libre sur le terrain.
            </p>
          </div>
          <button
            type="button"
            onClick={cancelRelocationMode}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
          >
            Annuler
          </button>
        </div>
      )}

      {relocationError && (
        <div
          data-world-interactive
          className="absolute left-1/2 top-32 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-950/90 px-3 py-2 text-center text-[10px] font-bold text-red-100 shadow-xl backdrop-blur"
        >
          ⚠️ {relocationError}
        </div>
      )}

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

        {isAdmin && (
          <WorldControlButton
            label="Régler le gabarit global des villes"
            onClick={
              cityRenderEditorOpen
                ? closeCityRenderEditor
                : openCityRenderEditor
            }
          >
            🛠
          </WorldControlButton>
        )}
      </div>

      {cityRenderEditorOpen && isAdmin && (
        <WorldCityRenderEditor
          value={cityRenderDraft}
          loading={cityRenderTemplateLoading}
          saving={cityRenderTemplateSaving}
          error={cityRenderTemplateError}
          onChange={setCityRenderDraft}
          onReset={() =>
            setCityRenderDraft(
              DEFAULT_WORLD_CITY_RENDER_TEMPLATE
            )
          }
          onSave={() => {
            void saveCityRenderEditor()
          }}
          onClose={closeCityRenderEditor}
        />
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur sm:block">
        Glisser pour explorer • pincer à 2 doigts pour zoomer • relâcher pour l'inertie
      </div>

      {activeOperation && (
        <CompactWorldOperationStatus
          operation={activeOperation}
          currentTime={currentTime}
          onOpen={() =>
            setOperationDetailsOpen(true)
          }
        />
      )}

      {activeOperation &&
        operationDetailsOpen && (
          <ActiveWorldOperationCard
            operation={activeOperation}
            currentTime={currentTime}
            onRecall={recallOperation}
            onAssault={() =>
              giveAssaultOrder(activeOperation)
            }
            onCloseReport={closeOperationReport}
            onCollapse={() =>
              setOperationDetailsOpen(false)
            }
          />
        )}

      {worldNotice && (
        <WorldNoticeToast
          notice={worldNotice}
          onDismiss={() =>
            setWorldNotice(null)
          }
          onOpenDetails={
            activeOperation
              ? () => {
                  setWorldNotice(null)
                  setOperationDetailsOpen(true)
                }
              : undefined
          }
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
          currentTime={currentTime}
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
          onRelocate={
            selectedNode.isCurrentPlayer || selectedNode.cityKind === "current"
              ? startRelocationMode
              : undefined
          }
          relocationLoading={relocationLoading}
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
          previewOnly={
            preparingNode.type === "player_city" &&
            !preparingNode.isCurrentPlayer
          }
          onClose={() =>
            setPreparingNode(null)
          }
          onLaunch={launchOperation}
        />
      )}
    </main>
  )
}

type WorldOperationRouteProps = {
  operation: WorldOperation
  nodes: WorldNode[]
  currentTime: number
  worldSize: WorldSize
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function parseTime(value?: string) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function WorldOperationRoute({
  operation,
  nodes,
  currentTime,
  worldSize,
}: WorldOperationRouteProps) {
  const origin = nodes.find(
    (node) =>
      node.type === "player_city" &&
      node.cityKind === "current"
  )
  const target = nodes.find(
    (node) => node.id === operation.targetNodeId
  )

  if (!origin || !target) {
    return null
  }

  const x1 = (origin.x / 100) * worldSize.width
  const y1 = (origin.y / 100) * worldSize.height
  const x2 = (target.x / 100) * worldSize.width
  const y2 = (target.y / 100) * worldSize.height

  let progress = 0
  let returning = false

  if (operation.phase === "outbound") {
    const startedAt = parseTime(operation.startedAt)
    const arrivalAt = parseTime(operation.arrivalAt)

    if (startedAt !== null && arrivalAt !== null) {
      progress = clamp01(
        (currentTime - startedAt) /
          Math.max(1, arrivalAt - startedAt)
      )
    }
  } else if (
    operation.phase === "ready" ||
    operation.phase === "assault_preparation"
  ) {
    progress = 1
  } else if (operation.phase === "returning") {
    returning = true

    const returnStartedAt = parseTime(
      operation.returnStartedAt
    )
    const returnAt = parseTime(operation.returnAt)

    let startProgress = 1

    if (operation.recalledAt) {
      const recalledAt = parseTime(operation.recalledAt)
      const startedAt = parseTime(operation.startedAt)

      if (recalledAt !== null && startedAt !== null) {
        startProgress = clamp01(
          (recalledAt - startedAt) /
            Math.max(1000, operation.travelSeconds * 1000)
        )
      }
    }

    if (returnStartedAt !== null && returnAt !== null) {
      const returnProgress = clamp01(
        (currentTime - returnStartedAt) /
          Math.max(1, returnAt - returnStartedAt)
      )
      progress = startProgress * (1 - returnProgress)
    } else {
      progress = startProgress
    }
  }

  const currentX = x1 + (x2 - x1) * progress
  const currentY = y1 + (y2 - y1) * progress

  /*
   * Le PNG de l'hélicoptère est une vue 3/4, pas un sprite strictement vu
   * du dessus. Le faire tourner librement sur 180° le couche visuellement
   * sur le côté. On conserve donc une assiette crédible : miroir horizontal
   * pour changer de sens, avec seulement une légère correction d'angle.
   */
  const travelDx = returning ? x1 - x2 : x2 - x1
  const travelDy = returning ? y1 - y2 : y2 - y1
  const headingDegrees =
    Math.atan2(travelDy, travelDx) * (180 / Math.PI)

  const facesRight = travelDx >= 0
  const stableHeadingDegrees = facesRight ? 36 : 144

  const normalizeAngle = (value: number) => {
    let normalized = ((value + 180) % 360 + 360) % 360 - 180

    if (normalized === -180) {
      normalized = 180
    }

    return normalized
  }

  const headingDelta = normalizeAngle(
    headingDegrees - stableHeadingDegrees
  )

  const helicopterTiltDegrees = Math.max(
    -10,
    Math.min(10, headingDelta)
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-[8]">
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${worldSize.width} ${worldSize.height}`}
        aria-hidden="true"
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="world-route-shadow"
        />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="world-route-line"
        />
        <circle
          cx={x2}
          cy={y2}
          r="13"
          className="world-route-target-ring"
        />
      </svg>

      <div
        className="world-operation-vehicle absolute z-20"
        style={{
          left: currentX,
          top: currentY,
          width: `${Math.max(72, worldSize.width * 0.075)}px`,
          transform: "translate(-50%, -56%)",
        }}
      >
        <div
          className="world-operation-vehicle-facing"
          style={{
            transform: `rotate(${helicopterTiltDegrees}deg) scaleX(${facesRight ? -1 : 1})`,
          }}
        >
          <img
            src="/world/helicopter.png"
            alt=""
            draggable={false}
            className="h-auto w-full select-none"
          />
        </div>
        <span className="world-operation-vehicle-shadow" />
        <span
          className={`world-operation-status ${
            returning ? "is-returning" : ""
          }`}
        >
          {returning ? "RETOUR" : "EN ROUTE"}
        </span>
      </div>
    </div>
  )
}


type WorldRelocationSlotsLayerProps = {
  slots: WorldSpawnSlot[]
  loading: boolean
  onSelect: (slot: WorldSpawnSlot) => void
}

function WorldRelocationSlotsLayer({
  slots,
  loading,
  onSelect,
}: WorldRelocationSlotsLayerProps) {
  return (
    <div className="absolute inset-0 z-[16] overflow-hidden">
      {slots.map((slot) => (
        <button
          key={slot.slot_index}
          type="button"
          data-world-interactive
          className="world-relocation-slot absolute"
          disabled={loading}
          style={{
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(slot)
          }}
          aria-label={`Déplacer la ville sur l'emplacement ${slot.slot_index}`}
          title="Emplacement libre"
        >
          <span className="world-relocation-slot-core" />
          <span className="world-relocation-slot-plus">{slot.slot_index}</span>
        </button>
      ))}
    </div>
  )
}

type WorldCityTemplateGuideProps = {
  x: number
  y: number
}

function WorldCityTemplateGuide({
  x,
  y,
}: WorldCityTemplateGuideProps) {
  return (
    <div
      className="world-city-template-guide pointer-events-none absolute z-[18]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span>PARCELLE MODÈLE</span>
    </div>
  )
}

type WorldCityRenderEditorProps = {
  value: WorldCityRenderTemplate
  loading: boolean
  saving: boolean
  error: string | null
  onChange: (value: WorldCityRenderTemplate) => void
  onReset: () => void
  onSave: () => void
  onClose: () => void
}

function WorldCityRenderEditor({
  value,
  loading,
  saving,
  error,
  onChange,
  onReset,
  onSave,
  onClose,
}: WorldCityRenderEditorProps) {
  function update<K extends keyof WorldCityRenderTemplate>(
    key: K,
    nextValue: WorldCityRenderTemplate[K]
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    })
  }

  return (
    <section
      data-world-interactive
      className="absolute left-3 top-24 z-50 w-[min(360px,calc(100vw-24px))] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-amber-300/25 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
            Gabarit global des villes
          </p>
          <p className="mt-1 text-[10px] font-bold leading-relaxed text-zinc-400">
            Règle ta ville admin dans sa parcelle. Le même rendu sera appliqué à toutes les villes joueurs.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-black text-white hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <WorldTemplateSlider
          label="Horizontal"
          value={value.offsetX}
          min={-80}
          max={80}
          step={1}
          suffix=" %"
          onChange={(next) => update("offsetX", next)}
        />
        <WorldTemplateSlider
          label="Vertical"
          value={value.offsetY}
          min={-80}
          max={80}
          step={1}
          suffix=" %"
          onChange={(next) => update("offsetY", next)}
        />
        <WorldTemplateSlider
          label="Taille"
          value={value.scale}
          min={0.45}
          max={2.5}
          step={0.05}
          suffix="×"
          onChange={(next) => update("scale", next)}
        />
        <WorldTemplateSlider
          label="Rotation"
          value={value.rotation}
          min={-25}
          max={25}
          step={1}
          suffix="°"
          onChange={(next) => update("rotation", next)}
        />

        <div className="mt-1 border-t border-white/10 pt-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
            Étiquette pseudo / niveau
          </p>
          <div className="grid gap-3">
            <WorldTemplateSlider
              label="Étiquette X"
              value={value.labelOffsetX}
              min={-80}
              max={80}
              step={1}
              suffix=" %"
              onChange={(next) => update("labelOffsetX", next)}
            />
            <WorldTemplateSlider
              label="Étiquette Y"
              value={value.labelOffsetY}
              min={-80}
              max={80}
              step={1}
              suffix=" %"
              onChange={(next) => update("labelOffsetY", next)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/25 bg-red-950/60 px-3 py-2 text-[10px] font-bold text-red-100">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={loading || saving}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10 disabled:opacity-40"
        >
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || saving}
          className="flex-1 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/25 disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "✓ Enregistrer pour toutes les villes"}
        </button>
      </div>
    </section>
  )
}

type WorldTemplateSliderProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}

function WorldTemplateSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: WorldTemplateSliderProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
        <span>{label}</span>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-amber-100">
          {step < 1 ? value.toFixed(2) : Math.round(value)}{suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-400"
      />
    </label>
  )
}

type WorldNodeMarkerProps = {
  node: WorldNode
  selected: boolean
  cityRenderTemplate: WorldCityRenderTemplate
  onSelect: () => void
}

function WorldNodeMarker({
  node,
  selected,
  cityRenderTemplate,
  onSelect,
}: WorldNodeMarkerProps) {
  const isLivePlayerCity =
    node.type === "player_city" &&
    Boolean(node.ownerPlayerId)

  if (isLivePlayerCity) {
    const isCurrent = Boolean(node.isCurrentPlayer)

    return (
      <button
        type="button"
        data-world-node
        data-world-node-id={node.id}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        className="group absolute z-20 border-0 bg-transparent p-0 text-center outline-none"
        style={{
          left: `${node.x}%`,
          top: `${node.y}%`,
          width: `${node.hotspotWidth ?? 5.2}%`,
          height: `${node.hotspotHeight ?? 7}%`,
          transform: "translate(-50%, -50%)",
        }}
        aria-label={`Ouvrir ${node.name}`}
        title={node.name}
      >
        <span
          className="world-player-city-render-layer pointer-events-none absolute h-full w-full"
          style={{
            left: `${50 + cityRenderTemplate.offsetX}%`,
            top: `${50 + cityRenderTemplate.offsetY}%`,
            transform: `translate(-50%, -50%) scale(${cityRenderTemplate.scale}) rotate(${cityRenderTemplate.rotation}deg)`,
          }}
        >
          <span
            className={`world-player-city-halo absolute left-1/2 top-[54%] h-[72%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
              selected
                ? "is-selected"
                : ""
            } ${
              isCurrent
                ? "is-current"
                : "is-rival"
            }`}
          />

          <span className="absolute inset-x-0 bottom-[18%] top-[8%] flex items-end justify-center">
            <img
              src={node.mapAssetSrc ?? "/buildings/villa.png"}
              alt=""
              className="world-player-city-asset max-h-full max-w-full object-contain"
              draggable={false}
            />
          </span>
        </span>

        <span
          className={`world-player-city-label pointer-events-none absolute min-w-max -translate-x-1/2 rounded-full border px-3 py-1 text-[15px] font-black tracking-[0.04em] shadow-lg backdrop-blur ${
            isCurrent
              ? "border-blue-300/40 bg-blue-950/90 text-blue-100"
              : "border-red-300/30 bg-zinc-950/90 text-red-100"
          }`}
          style={{
            left: `${50 + cityRenderTemplate.offsetX + cityRenderTemplate.labelOffsetX}%`,
            top: `${82 + cityRenderTemplate.offsetY + cityRenderTemplate.labelOffsetY}%`,
          }}
        >
          {isCurrent ? "VOUS" : node.username ?? node.name}
          <span className="ml-1 opacity-60">Niv. {node.level}</span>
        </span>
      </button>
    )
  }

  const hotspotWidth = Math.max(
    3.4,
    Math.min(26, node.hotspotWidth ?? 6)
  )
  const hotspotHeight = Math.max(
    3.4,
    Math.min(28, node.hotspotHeight ?? 6)
  )
  const rotation = node.hotspotRotation ?? 0

  return (
    <button
      type="button"
      data-world-node
      data-world-node-id={node.id}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className="group absolute z-10 border-0 bg-transparent p-0 outline-none"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${hotspotWidth}%`,
        height: `${hotspotHeight}%`,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={`Ouvrir ${node.name}`}
      title={node.name}
    >
      <span
        className={`world-background-hotspot pointer-events-none absolute inset-0 rounded-[22%] transition duration-150 ${
          selected ? "is-selected" : ""
        }`}
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      />
    </button>
  )
}

type WorldNodePanelProps = {
  node: WorldNode
  activeOperation: WorldOperation | null
  currentTime: number
  cooldownRemainingSeconds: number
  onClose: () => void
  onBack: () => void
  onPrepare: () => void
  onRelocate?: () => void
  relocationLoading?: boolean
}

function WorldNodePanel({
  node,
  activeOperation,
  currentTime,
  cooldownRemainingSeconds,
  onClose,
  onBack,
  onPrepare,
  onRelocate,
  relocationLoading = false,
}: WorldNodePanelProps) {
  const isPlayerCity =
    node.type === "player_city"
  const isNpcCity =
    node.type === "npc_city"
  const isCurrentCity =
    Boolean(node.isCurrentPlayer) ||
    node.cityKind === "current"
  const protectionSeconds =
    secondsUntilTimestamp(
      currentTime,
      node.protectionUntil ?? undefined
    )
  const isProtected =
    isPlayerCity &&
    !isCurrentCity &&
    protectionSeconds > 0

  const kindLabel = isPlayerCity
    ? isCurrentCity
      ? "Ta ville"
      : "Ville d'un joueur"
    : isNpcCity
      ? "Forteresse stratégique"
      : "Territoire PvE"

  return (
    <aside
      data-world-interactive
      className="absolute inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/94 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[410px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border p-3 text-3xl ${
            isPlayerCity
              ? isCurrentCity
                ? "border-blue-400/30 bg-blue-500/10"
                : "border-red-400/30 bg-red-500/10"
              : "border-amber-500/25 bg-amber-500/10"
          }`}>
            {node.icon}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
              {kindLabel}
            </p>

            <h2 className="mt-1 truncate text-xl font-black text-white">
              {node.name}
            </h2>

            <p className="mt-1 text-xs font-bold text-zinc-500">
              Niveau {node.level}
              {node.distanceKm !== undefined && !isCurrentCity
                ? ` • ${node.distanceKm.toFixed(1)} km`
                : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          ×
        </button>
      </div>

      {node.imageSrc && (
        <div className="relative mt-4 h-44 overflow-hidden rounded-2xl border border-white/10 bg-black sm:h-48">
          <img
            src={node.imageSrc}
            alt={node.imageAlt ?? node.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        </div>
      )}

      {isPlayerCity && node.mapAssetSrc && (
        <div className="mt-4 flex h-36 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.13),transparent_56%),linear-gradient(180deg,rgba(24,24,27,0.85),rgba(0,0,0,0.92))]">
          <img
            src={node.mapAssetSrc}
            alt={node.mapAssetAlt ?? node.name}
            className="max-h-[130px] max-w-[75%] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.8)]"
            draggable={false}
          />
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
        {node.description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoCard
          label={isPlayerCity ? "Puissance estimée" : "Puissance ennemie"}
          value={formatNumber(node.recommendedPower)}
        />

        <InfoCard
          label="Type"
          value={
            isPlayerCity
              ? "Empire joueur"
              : isNpcCity
                ? "Ville stratégique"
                : "Territoire PvE"
          }
        />

        {node.travelSeconds !== undefined && !isCurrentCity && (
          <InfoCard
            label="Temps de trajet"
            value={formatDuration(node.travelSeconds)}
          />
        )}

        {isPlayerCity && !isCurrentCity && (
          <InfoCard
            label="Protection"
            value={
              isProtected
                ? formatDuration(protectionSeconds)
                : "Aucune"
            }
          />
        )}

        {!isPlayerCity && !isNpcCity && node.cooldownHours !== undefined && (
          <InfoCard
            label="Réapparition"
            value={`${node.cooldownHours} h`}
          />
        )}

        {!isPlayerCity && !isNpcCity && cooldownRemainingSeconds > 0 && (
          <InfoCard
            label="Disponible dans"
            value={formatDuration(cooldownRemainingSeconds)}
          />
        )}
      </div>

      {!isPlayerCity && !isNpcCity && node.rewards && (
        <section className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/75">
            Récompenses possibles
          </p>
          <RewardLines rewards={node.rewards} />
        </section>
      )}

      {isPlayerCity && !isCurrentCity && (
        <section className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-xs leading-relaxed text-zinc-300">
          <strong className="text-red-200">Fondation PvP active.</strong>{" "}
          Tu peux déjà reconnaître cette ville et composer l'escouade que tu enverrais contre elle. Le combat serveur et le pillage du défenseur seront branchés dans la phase suivante.
        </section>
      )}

      <div className="mt-4">
        {isCurrentCity ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600"
            >
              🏙️ Ma ville
            </button>

            <button
              type="button"
              onClick={onRelocate}
              disabled={!onRelocate || relocationLoading}
              className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {relocationLoading ? "Chargement…" : "📍 Déplacer ma ville"}
            </button>
          </div>
        ) : isPlayerCity ? (
          <button
            type="button"
            onClick={onPrepare}
            disabled={Boolean(activeOperation) || isProtected}
            className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {activeOperation
              ? "🚁 Une opération est déjà en cours"
              : isProtected
                ? `🛡️ Protection — ${formatDuration(protectionSeconds)}`
                : "⚔️ Préparer une attaque"}
          </button>
        ) : isNpcCity ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-zinc-800 px-4 py-3 text-sm font-black text-zinc-500"
          >
            🌆 Port Sombre — guerres territoriales bientôt
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

function secondsUntilTimestamp(
  currentTime: number,
  dateValue?: string
) {
  if (!dateValue) {
    return 0
  }

  const targetTime =
    new Date(dateValue).getTime()

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

function getCompactOperationStatus(
  operation: WorldOperation,
  currentTime: number
) {
  if (operation.phase === "outbound") {
    return {
      label: "En route",
      detail: formatDuration(
        secondsUntilTimestamp(
          currentTime,
          operation.arrivalAt
        )
      ),
      accent:
        "border-sky-400/25 bg-sky-500/10 text-sky-100",
    }
  }

  if (operation.phase === "ready") {
    return {
      label: "Ordre requis",
      detail: "Assaut prêt",
      accent:
        "border-amber-400/30 bg-amber-500/15 text-amber-100",
    }
  }

  if (
    operation.phase ===
    "assault_preparation"
  ) {
    return {
      label: "Assaut",
      detail: formatDuration(
        secondsUntilTimestamp(
          currentTime,
          operation.assaultResolvesAt
        )
      ),
      accent:
        "border-orange-400/30 bg-orange-500/15 text-orange-100",
    }
  }

  if (operation.phase === "returning") {
    return {
      label:
        operation.combatResult?.outcome ===
        "victory"
          ? "Victoire"
          : operation.combatResult
            ? "Retour"
            : "Rappel",
      detail: formatDuration(
        secondsUntilTimestamp(
          currentTime,
          operation.returnAt
        )
      ),
      accent:
        operation.combatResult?.outcome ===
        "victory"
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : "border-zinc-500/30 bg-zinc-800/80 text-zinc-100",
    }
  }

  return {
    label:
      operation.combatResult?.outcome ===
      "victory"
        ? "Rapport prêt"
        : "Mission terminée",
    detail: "Voir le rapport",
    accent:
      operation.combatResult?.outcome ===
      "victory"
        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
        : "border-zinc-500/30 bg-zinc-800/80 text-zinc-100",
  }
}

function CompactWorldOperationStatus({
  operation,
  currentTime,
  onOpen,
}: {
  operation: WorldOperation
  currentTime: number
  onOpen: () => void
}) {
  const status =
    getCompactOperationStatus(
      operation,
      currentTime
    )

  const attention =
    operation.phase === "ready" ||
    operation.phase === "returned"

  return (
    <button
      type="button"
      data-world-interactive
      onClick={onOpen}
      className={`absolute bottom-4 right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl transition hover:scale-105 sm:right-5 ${status.accent}`}
      aria-label={`${operation.targetName} — ${status.label} — ${status.detail}`}
      title={`${operation.targetName} — ${status.label} — ${status.detail}`}
    >
      <span className="text-lg">
        {operation.phase === "outbound" ||
        operation.phase === "returning"
          ? "🚁"
          : operation.targetIcon}
      </span>

      {attention && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/30 bg-red-600 px-1 text-[9px] font-black text-white">
          !
        </span>
      )}

      <span className="absolute -bottom-1 left-1/2 max-w-[64px] -translate-x-1/2 truncate rounded-full border border-white/10 bg-black/85 px-1.5 py-0.5 text-[7px] font-black text-white/80">
        {status.detail}
      </span>
    </button>
  )
}

function WorldNoticeToast({
  notice,
  onDismiss,
  onOpenDetails,
}: {
  notice: WorldNotice
  onDismiss: () => void
  onOpenDetails?: () => void
}) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-950/90"
      : notice.tone === "danger"
        ? "border-red-400/30 bg-red-950/90"
        : notice.tone === "warning"
          ? "border-amber-400/30 bg-amber-950/90"
          : "border-sky-400/25 bg-slate-950/90"

  return (
    <div
      data-world-interactive
      className={`absolute left-1/2 top-20 z-40 flex w-[min(430px,calc(100%-24px))] -translate-x-1/2 items-start gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-white">
          {notice.title}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-white/70">
          {notice.message}
        </p>
      </div>

      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="shrink-0 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-white/15"
        >
          Voir
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  )
}

function ActiveWorldOperationCard({
  operation,
  currentTime,
  onRecall,
  onAssault,
  onCloseReport,
  onCollapse,
}: {
  operation: WorldOperation
  currentTime: number
  onRecall: () => void
  onAssault: () => void
  onCloseReport: () => void
  onCollapse: () => void
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
      <button
        type="button"
        onClick={onCollapse}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-sm font-black text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        aria-label="Réduire les détails de l'opération"
        title="Réduire"
      >
        ×
      </button>
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
              rewardDefinition={operation.targetRewards}
            />

            {result.specialDrop && (
              <div className="mt-3 rounded-lg border border-purple-400/20 bg-purple-500/10 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-purple-200/80">
                  Butin rare obtenu
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {result.specialDrop.icon} {result.specialDrop.name}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                  {operation.phase === "returned"
                    ? "Ajouté à ton inventaire. Ouvre-le quand tu veux pour récupérer son contenu."
                    : "Le butin rare voyage avec les survivants et sera ajouté à l'inventaire au retour."}
                </p>
              </div>
            )}
          </div>

          {lostUnits > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Coût de remplacement des pertes
              </p>
              <ReplacementCostLines
                cost={result.replacementCost}
              />

              {isVictory && (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Bilan après remplacement
                  </p>
                  <NetOperationBalanceLines
                    rewards={result.rewards}
                    cost={result.replacementCost}
                  />
                  <p className="mt-1.5 text-[9px] font-semibold leading-relaxed text-zinc-600">
                    Le butin rare éventuel n'est pas inclus dans ce bilan tant qu'il n'a pas été ouvert.
                  </p>
                </div>
              )}
            </div>
          )}
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

function exactRewardLine(
  icon: string,
  label: string,
  total: number,
  guaranteed?: number,
  bonusMax?: number
) {
  if (total <= 0) {
    return null
  }

  const hasNewModel =
    guaranteed !== undefined ||
    bonusMax !== undefined

  if (!hasNewModel) {
    return `${icon} +${formatNumber(total)} ${label}`
  }

  const base = Math.max(
    0,
    Math.floor(Number(guaranteed) || 0)
  )
  const bonus = Math.max(0, total - base)

  if (bonus > 0) {
    return `${icon} +${formatNumber(total)} ${label} (${formatNumber(base)} garantis + ${formatNumber(bonus)} bonus)`
  }

  return `${icon} +${formatNumber(total)} ${label} (garanti)`
}

function ExactRewardLines({
  rewards,
  rewardDefinition,
}: {
  rewards: NonNullable<
    WorldOperation["combatResult"]
  >["rewards"]
  rewardDefinition?: WorldRewardRange
}) {
  const lines = [
    exactRewardLine(
      "💵",
      "argent",
      rewards.money,
      rewardDefinition?.moneyGuaranteed,
      rewardDefinition?.moneyBonusMax
    ),
    exactRewardLine(
      "🧱",
      "matériaux",
      rewards.materials,
      rewardDefinition?.materialsGuaranteed,
      rewardDefinition?.materialsBonusMax
    ),
    exactRewardLine(
      "🧰",
      "équipements",
      rewards.equipment,
      rewardDefinition?.equipmentGuaranteed,
      rewardDefinition?.equipmentBonusMax
    ),
    exactRewardLine(
      "⭐",
      "Influence",
      rewards.influence,
      rewardDefinition?.influenceGuaranteed,
      rewardDefinition?.influenceBonusMax
    ),
  ].filter((line): line is string => Boolean(line))

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

function ReplacementCostLines({
  cost,
}: {
  cost: NonNullable<
    WorldOperation["combatResult"]
  >["replacementCost"]
}) {
  const lines: string[] = []

  if (cost.money > 0) {
    lines.push(
      `💵 ${formatNumber(cost.money)} argent`
    )
  }

  if (cost.equipment > 0) {
    lines.push(
      `🧰 ${formatNumber(cost.equipment)} équipements`
    )
  }

  if (cost.influence > 0) {
    lines.push(
      `⭐ ${formatNumber(cost.influence)} Influence`
    )
  }

  if (lines.length === 0) {
    lines.push("Aucun coût de remplacement")
  }

  return (
    <div className="mt-2 space-y-1 text-[11px] font-bold text-zinc-300">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}

function NetOperationBalanceLines({
  rewards,
  cost,
}: {
  rewards: NonNullable<
    WorldOperation["combatResult"]
  >["rewards"]
  cost: NonNullable<
    WorldOperation["combatResult"]
  >["replacementCost"]
}) {
  const balances = [
    {
      icon: "💵",
      label: "argent",
      value: rewards.money - cost.money,
    },
    {
      icon: "🧱",
      label: "matériaux",
      value: rewards.materials,
    },
    {
      icon: "🧰",
      label: "équipements",
      value: rewards.equipment - cost.equipment,
    },
    {
      icon: "⭐",
      label: "Influence",
      value: rewards.influence - cost.influence,
    },
  ].filter((entry) => entry.value !== 0)

  if (balances.length === 0) {
    return (
      <p className="mt-1.5 text-[10px] font-bold text-zinc-400">
        Bilan neutre sur les ressources suivies.
      </p>
    )
  }

  return (
    <div className="mt-1.5 space-y-1 text-[10px] font-bold">
      {balances.map((entry) => (
        <p
          key={entry.label}
          className={entry.value >= 0 ? "text-emerald-300" : "text-red-300"}
        >
          {entry.icon} {formatSignedNumber(entry.value)} {entry.label}
        </p>
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

function rewardPreviewLine(
  icon: string,
  label: string,
  guaranteed: number | undefined,
  bonusMax: number | undefined,
  legacyMin: number | undefined,
  legacyMax: number | undefined
) {
  if (
    guaranteed !== undefined ||
    bonusMax !== undefined
  ) {
    const base = Math.max(
      0,
      Math.floor(Number(guaranteed) || 0)
    )
    const bonus = Math.max(
      0,
      Math.floor(Number(bonusMax) || 0)
    )

    if (base <= 0 && bonus <= 0) {
      return null
    }

    if (bonus > 0) {
      return `${icon} ${formatNumber(base)} ${label} garantis + 0 à ${formatNumber(bonus)} bonus`
    }

    return `${icon} ${formatNumber(base)} ${label} garantis`
  }

  const min = Math.max(
    0,
    Math.floor(Number(legacyMin) || 0)
  )
  const max = Math.max(
    min,
    Math.floor(Number(legacyMax) || min)
  )

  if (max <= 0) {
    return null
  }

  return `${icon} ${formatNumber(min)} à ${formatNumber(max)} ${label}`
}

function RewardLines({
  rewards,
}: {
  rewards: WorldRewardRange
}) {
  const lines = [
    rewardPreviewLine(
      "💵",
      "argent",
      rewards.moneyGuaranteed,
      rewards.moneyBonusMax,
      rewards.moneyMin,
      rewards.moneyMax
    ),
    rewardPreviewLine(
      "🧱",
      "matériaux",
      rewards.materialsGuaranteed,
      rewards.materialsBonusMax,
      rewards.materialsMin,
      rewards.materialsMax
    ),
    rewardPreviewLine(
      "🧰",
      "équipements",
      rewards.equipmentGuaranteed,
      rewards.equipmentBonusMax,
      rewards.equipmentMin,
      rewards.equipmentMax
    ),
    rewardPreviewLine(
      "⭐",
      "Influence",
      rewards.influenceGuaranteed,
      rewards.influenceBonusMax,
      rewards.influenceMin,
      rewards.influenceMax
    ),
  ].filter((line): line is string => Boolean(line))

  if (rewards.commanderXp) {
    lines.push(
      `🧠 +${formatNumber(rewards.commanderXp)} XP commandant`
    )
  }

  return (
    <div className="mt-2 space-y-1.5 text-sm font-semibold text-amber-100">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}

      {rewards.specialDrop && (
        <div className="mt-2 rounded-lg border border-purple-400/20 bg-purple-500/10 p-2 text-xs text-purple-100">
          <span className="font-black">
            {rewards.specialDrop.icon} Butin rare — {rewards.specialDrop.name}
          </span>
          <span className="ml-1 text-purple-200/70">
            ({rewards.specialDrop.chancePercent} %)
          </span>
        </div>
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
