import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { Building } from "../types/building"

import type {
  BuildingProduction,
} from "../data/economy"

import type {
  CityResearch,
} from "../types/research"

import { BUILDING_NAMES } from "../data/buildingNames"

import {
  getConstructionTime,
  getUpgradeCost,
  getUpgradeDetails,
} from "../services/buildingService"

import {
  getBuildingProduction,
} from "../services/economy"

import {
  getBuildingUpgradeXp,
} from "../data/commanderProgression"

import {
  syncCityResearches,
} from "../services/researchService"

import {
  getHideoutProtectionPercent,
  getHideoutStorageCapacitiesByLevel,
  getResourceProtectionBreakdown,
  getStorageResearchBonusPercent,
  getSyndicateInfluenceCapacityByLevel,
} from "../data/storage"

import {
  getRequiredVillaLevel,
} from "../data/buildingUnlocks"

import {
  getInventoryItemDefinition,
  getSpeedupScope,
  getSpeedupSeconds,
  isSpeedupPayload,
} from "../data/inventory"

import {
  getCityInventory,
  useInventorySpeedup,
} from "../services/inventoryService"

import type {
  InventoryItem,
} from "../types/inventory"

type CityResources = {
  id: string
  money: number
  materials: number
  influence: number
  equipment: number
}

type Props = {
  building: Building
  city: CityResources

  /*
   * Niveau réel de la Villa envoyé par App.tsx.
   */
  currentVillaLevel: number

  onClose: () => void
  onUpgrade: () => Promise<void> | void

  /*
   * Optionnel : permet à App.tsx de recharger
   * immédiatement la ville après une accélération.
   */
  onChanged?: () =>
    Promise<void> | void

  onOpenResearches?: () => void
  onOpenTroops?: () => void
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value)
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds)
  )

  const days = Math.floor(
    safeSeconds / 86400
  )

  const hours = Math.floor(
    (safeSeconds % 86400) / 3600
  )

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  )

  const seconds = safeSeconds % 60

  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days} j`)
  }

  if (hours > 0) {
    parts.push(`${hours} h`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} min`)
  }

  if (
    seconds > 0 &&
    days === 0 &&
    hours === 0
  ) {
    parts.push(`${seconds} s`)
  }

  return parts.length > 0
    ? parts.join(" ")
    : "Terminé"
}

function getProductionEffectLines(
  production: BuildingProduction
) {
  const lines: string[] = []

  if (production.moneyPerHour > 0) {
    lines.push(
      `Argent : +${formatNumber(
        production.moneyPerHour
      )} par heure`
    )
  }

  if (
    production.materialsPerHour > 0
  ) {
    lines.push(
      `Matériaux : +${formatNumber(
        production.materialsPerHour
      )} par heure`
    )
  }

  if (
    production.influencePerHour > 0
  ) {
    lines.push(
      `Influence : +${formatNumber(
        production.influencePerHour
      )} par heure`
    )
  }

  if (
    production.equipmentPerHour > 0
  ) {
    lines.push(
      `Équipements : +${formatNumber(
        production.equipmentPerHour
      )} par heure`
    )
  }

  return lines
}

export default function BuildingUpgradeModal({
  building,
  city,
  currentVillaLevel,
  onClose,
  onUpgrade,
  onChanged,
  onOpenResearches,
  onOpenTroops,
}: Props) {
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null)

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null)

  const [
    speedupItems,
    setSpeedupItems,
  ] = useState<InventoryItem[]>([])

  const [
    speedupsLoading,
    setSpeedupsLoading,
  ] = useState(false)

  const [
    usingSpeedupItemId,
    setUsingSpeedupItemId,
  ] = useState<string | null>(null)

  const [
    effectiveFinishAt,
    setEffectiveFinishAt,
  ] = useState<string | null>(
    building.upgrade_finish ?? null
  )

  const [
    locallyCompleted,
    setLocallyCompleted,
  ] = useState(false)

  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now())

  const [
    researches,
    setResearches,
  ] = useState<
    CityResearch[]
  >([])

  const safeVillaLevel = Math.max(
    1,
    Number(currentVillaLevel) || 1
  )

  const cost = useMemo(
    () =>
      getUpgradeCost(
        building.type,
        building.level
      ),
    [
      building.type,
      building.level,
    ]
  )

  const upgradeDetails = useMemo(
    () =>
      getUpgradeDetails(
        building.type,
        building.level
      ),
    [
      building.type,
      building.level,
    ]
  )

  const villaSpeedBonus =
    Math.max(0, safeVillaLevel - 1) * 3

  const constructionTime = useMemo(
    () =>
      getConstructionTime(
        building.type,
        building.level,
        safeVillaLevel
      ),
    [
      building.type,
      building.level,
      safeVillaLevel,
    ]
  )

  const nextLevel =
    building.target_level ??
    building.level + 1

  const commanderXpReward =
    getBuildingUpgradeXp(
      building.type,
      nextLevel
    )

  const storageResearchBonusPercent =
    getStorageResearchBonusPercent(
      researches
    )

  const currentProduction =
    useMemo(
      () =>
        getBuildingProduction(
          building.type,
          building.level
        ),
      [
        building.type,
        building.level,
      ]
    )

  const nextProduction =
    useMemo(
      () =>
        getBuildingProduction(
          building.type,
          nextLevel
        ),
      [
        building.type,
        nextLevel,
      ]
    )

  const currentHideoutStorage =
    getHideoutStorageCapacitiesByLevel(
      building.level,
      storageResearchBonusPercent
    )

  const nextHideoutStorage =
    getHideoutStorageCapacitiesByLevel(
      nextLevel,
      storageResearchBonusPercent
    )

  const currentProtectionPercent =
    getHideoutProtectionPercent(
      building.level
    )

  const nextProtectionPercent =
    getHideoutProtectionPercent(
      nextLevel
    )

  const currentSyndicateCapacity =
    getSyndicateInfluenceCapacityByLevel(
      building.level,
      storageResearchBonusPercent
    )

  const nextSyndicateCapacity =
    getSyndicateInfluenceCapacityByLevel(
      nextLevel,
      storageResearchBonusPercent
    )

  const currentEffectLines =
    useMemo(() => {
      const lines =
        getProductionEffectLines(
          currentProduction
        )

      if (
        building.type ===
        "hideout"
      ) {
        lines.push(
          `Argent stockable : ${formatNumber(
            currentHideoutStorage.money
          )}`,

          `Matériaux stockables : ${formatNumber(
            currentHideoutStorage.materials
          )}`,

          `Équipements stockables : ${formatNumber(
            currentHideoutStorage.equipment
          )}`,

          `Protection prévue : ${currentProtectionPercent} %`
        )
      }

      if (
        building.type ===
        "syndicate"
      ) {
        lines.push(
          `Capacité d'Influence : ${formatNumber(
            currentSyndicateCapacity
          )}`
        )
      }

      return lines
    }, [
      building.type,
      currentHideoutStorage.equipment,
      currentHideoutStorage.materials,
      currentHideoutStorage.money,
      currentProduction,
      currentProtectionPercent,
      currentSyndicateCapacity,
    ])

  const nextEffectLines =
    useMemo(() => {
      const lines =
        getProductionEffectLines(
          nextProduction
        )

      if (
        building.type ===
        "hideout"
      ) {
        lines.push(
          `Argent stockable : ${formatNumber(
            nextHideoutStorage.money
          )}`,

          `Matériaux stockables : ${formatNumber(
            nextHideoutStorage.materials
          )}`,

          `Équipements stockables : ${formatNumber(
            nextHideoutStorage.equipment
          )}`,

          `Protection prévue : ${nextProtectionPercent} %`
        )
      }

      if (
        building.type ===
        "syndicate"
      ) {
        lines.push(
          `Capacité d'Influence : ${formatNumber(
            nextSyndicateCapacity
          )}`
        )
      }

      return lines
    }, [
      building.type,
      nextHideoutStorage.equipment,
      nextHideoutStorage.materials,
      nextHideoutStorage.money,
      nextProduction,
      nextProtectionPercent,
      nextSyndicateCapacity,
    ])

  const moneyProtection =
    getResourceProtectionBreakdown(
      city.money,
      currentHideoutStorage.money,
      currentProtectionPercent
    )

  const materialsProtection =
    getResourceProtectionBreakdown(
      city.materials,
      currentHideoutStorage.materials,
      currentProtectionPercent
    )

  const equipmentProtection =
    getResourceProtectionBreakdown(
      city.equipment,
      currentHideoutStorage.equipment,
      currentProtectionPercent
    )

  const hasEnoughMoney =
    city.money >= cost.money

  const hasEnoughMaterials =
    city.materials >= cost.materials

  const hasEnoughInfluence =
    city.influence >= cost.influence

  const hasEnoughResources =
    hasEnoughMoney &&
    hasEnoughMaterials &&
    hasEnoughInfluence

  /*
 * Première règle :
 * chaque bâtiment possède un niveau
 * minimal de Villa pour être débloqué.
 */
const requiredVillaLevel =
  getRequiredVillaLevel(
    building.type
  )

const isBelowUnlockLevel =
  building.type !== "villa" &&
  safeVillaLevel <
    requiredVillaLevel

/*
 * Deuxième règle :
 * un bâtiment ne peut jamais dépasser
 * le niveau actuel de la Villa.
 */
const isAboveVillaLimit =
  building.type !== "villa" &&
  nextLevel > safeVillaLevel

const isBlockedByVilla =
  isBelowUnlockLevel ||
  isAboveVillaLimit

/*
 * Niveau de Villa à afficher dans
 * le message de blocage.
 */
const requiredVillaLevelForUpgrade =
  Math.max(
    requiredVillaLevel,
    nextLevel
  )

  const activeConstruction =
    building.is_upgrading &&
    !locallyCompleted

  const loadConstructionSpeedups =
    useCallback(async () => {
      if (
        !city.id ||
        !activeConstruction
      ) {
        setSpeedupItems([])
        setSpeedupsLoading(false)
        return
      }

      try {
        setSpeedupsLoading(true)

        const inventory =
          await getCityInventory(
            city.id
          )

        const compatibleItems =
          inventory.filter(
            (item) => {
              if (
                !isSpeedupPayload(
                  item.payload
                )
              ) {
                return false
              }

              const scope =
                getSpeedupScope(
                  item.payload
                )

              return (
                scope ===
                  "construction" ||
                scope ===
                  "universal"
              )
            }
          )

        setSpeedupItems(
          compatibleItems
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les accélérateurs"
        )
      } finally {
        setSpeedupsLoading(false)
      }
    }, [
      activeConstruction,
      city.id,
    ])

  const remainingSeconds = useMemo(() => {
    if (
      !activeConstruction ||
      !effectiveFinishAt
    ) {
      return null
    }

    const finishTime = new Date(
      effectiveFinishAt
    ).getTime()

    if (Number.isNaN(finishTime)) {
      return null
    }

    return Math.max(
      0,
      Math.ceil(
        (finishTime - currentTime) / 1000
      )
    )
  }, [
    activeConstruction,
    effectiveFinishAt,
    currentTime,
  ])

  useEffect(() => {
    setLocallyCompleted(false)
    setSuccessMessage(null)
    setEffectiveFinishAt(
      building.upgrade_finish ??
        null
    )
  }, [building.id])

  useEffect(() => {
    if (
      building.is_upgrading &&
      building.upgrade_finish
    ) {
      setEffectiveFinishAt(
        building.upgrade_finish
      )
    }
  }, [
    building.is_upgrading,
    building.upgrade_finish,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadResearches() {
      try {
        const result =
          await syncCityResearches(
            city.id
          )

        if (!cancelled) {
          setResearches(result)
        }
      } catch (error) {
        console.error(
          "Impossible de charger les bonus de recherche du bâtiment :",
          error
        )
      }
    }

    loadResearches()

    return () => {
      cancelled = true
    }
  }, [city.id])

  useEffect(() => {
    loadConstructionSpeedups()
  }, [loadConstructionSpeedups])

  /*
   * Si le chronomètre arrive naturellement à zéro
   * pendant que la fenêtre est ouverte, on affiche
   * immédiatement la fin de la construction.
   */
  useEffect(() => {
    if (
      !activeConstruction ||
      remainingSeconds === null ||
      remainingSeconds > 0
    ) {
      return
    }

    setLocallyCompleted(true)
    setSuccessMessage(
      "Construction terminée."
    )

    onChanged?.()
  }, [
    activeConstruction,
    onChanged,
    remainingSeconds,
  ])

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      "hidden"

    window.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [onClose])

  useEffect(() => {
    if (!activeConstruction) {
      return
    }

    const intervalId =
      window.setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeConstruction])

  async function handleUseSpeedup(
    item: InventoryItem
  ) {
    if (
      usingSpeedupItemId ||
      !activeConstruction
    ) {
      return
    }

    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      setUsingSpeedupItemId(
        item.id
      )

      const result =
        await useInventorySpeedup(
          item.id,
          "construction",
          building.id
        )

      setEffectiveFinishAt(
        result.new_finish_at
      )

      if (result.completed) {
        setLocallyCompleted(true)

        setSuccessMessage(
          `Accélération appliquée : ${formatDuration(
            result.seconds_applied
          )}. Construction terminée.`
        )
      } else {
        setSuccessMessage(
          `Accélération appliquée : ${formatDuration(
            result.seconds_applied
          )}. Nouveau temps restant : ${formatDuration(
            result.remaining_seconds
          )}.`
        )
      }

      await onChanged?.()
      await loadConstructionSpeedups()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'utiliser cet accélérateur"
      )
    } finally {
      setUsingSpeedupItemId(
        null
      )
    }
  }

  async function handleUpgrade() {
    if (
      activeConstruction ||
      !hasEnoughResources ||
      isBlockedByVilla ||
      isSubmitting
    ) {
      return
    }

    try {
      setErrorMessage(null)
      setIsSubmitting(true)

      await onUpgrade()

      /*
       * App.tsx recharge ensuite
       * les données depuis Supabase.
       */
      onClose()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de lancer l'amélioration"

      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="building-upgrade-title"
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        {/* EN-TÊTE */}
        <div className="relative overflow-hidden border-b border-zinc-800 px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/60 via-zinc-950 to-zinc-950" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={`/buildings/${building.type}.png`}
                alt=""
                className="h-20 w-20 object-contain"
                draggable={false}
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                  Gestion du bâtiment
                </p>

                <h2
                  id="building-upgrade-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  {
                    BUILDING_NAMES[
                      building.type
                    ]
                  }
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Niveau {building.level}
                  {" → "}
                  niveau {nextLevel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {activeConstruction ? (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-5 text-center">
              <div className="text-3xl">
                🚧
              </div>

              <h3 className="mt-2 text-lg font-black text-orange-300">
                Amélioration en cours
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                Passage vers le niveau{" "}
                {nextLevel}
              </p>

              <div className="mt-4 rounded-lg bg-black/30 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Temps restant
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {remainingSeconds !== null
                    ? formatDuration(
                        remainingSeconds
                      )
                    : "Calcul en cours..."}
                </p>
              </div>

              <div className="mt-4 border-t border-orange-400/15 pt-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-300">
                      Accélérer la construction
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Accélérateurs de construction
                      et universels disponibles dans
                      l'inventaire.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-200">
                    {speedupItems.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        Math.max(
                          1,
                          Number(
                            item.quantity
                          ) || 1
                        ),
                      0
                    )} disponible(s)
                  </span>
                </div>

                {speedupsLoading ? (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-4 text-center text-sm text-zinc-500">
                    Chargement des accélérateurs...
                  </div>
                ) : speedupItems.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-4 text-center">
                    <p className="text-sm font-bold text-zinc-400">
                      Aucun accélérateur compatible
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Les accélérateurs de recrutement
                      ou de recherche ne peuvent pas
                      être utilisés ici.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {speedupItems.map(
                      (item) => {
                        const definition =
                          getInventoryItemDefinition(
                            item.item_key
                          )

                        const seconds =
                          getSpeedupSeconds(
                            item.payload
                          )

                        const scope =
                          getSpeedupScope(
                            item.payload
                          )

                        const quantity =
                          Math.max(
                            1,
                            Number(
                              item.quantity
                            ) || 1
                          )

                        const finishesConstruction =
                          remainingSeconds !==
                            null &&
                          seconds >=
                            remainingSeconds

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              handleUseSpeedup(
                                item
                              )
                            }
                            disabled={
                              Boolean(
                                usingSpeedupItemId
                              )
                            }
                            className="group rounded-xl border border-blue-500/25 bg-blue-500/[0.07] p-3 text-left transition hover:border-blue-400/50 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-black/20 text-xl">
                                {
                                  definition.icon
                                }
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-black text-white">
                                      {formatDuration(
                                        seconds
                                      )}
                                    </p>

                                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
                                      {scope ===
                                      "universal"
                                        ? "Universel"
                                        : "Construction"}
                                    </p>
                                  </div>

                                  <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] font-black text-blue-200">
                                    x{quantity}
                                  </span>
                                </div>

                                <p className="mt-2 text-xs font-semibold text-zinc-400">
                                  {usingSpeedupItemId ===
                                  item.id
                                    ? "Application..."
                                    : finishesConstruction
                                      ? "Terminer maintenant"
                                      : `Retirer ${formatDuration(
                                          seconds
                                        )}`}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      }
                    )}
                  </div>
                )}

                <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
                  Une unité entière est consommée,
                  même si le temps restant est plus
                  court que la durée de l'accélérateur.
                </p>
              </div>
            </div>
          ) : locallyCompleted ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center">
              <div className="text-3xl">
                ✅
              </div>

              <h3 className="mt-2 text-lg font-black text-green-300">
                Construction terminée
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                {
                  BUILDING_NAMES[
                    building.type
                  ]
                } est maintenant au niveau{" "}
                {nextLevel}.
              </p>
            </div>
          ) : (
            <>
              {/* EFFETS RÉELLEMENT ACTIFS */}
              {(currentEffectLines.length >
                0 ||
                nextEffectLines.length >
                  0) && (
                <section className="grid gap-3 sm:grid-cols-2">
                  <EffectSummaryCard
                    title={`Effets actifs — niveau ${building.level}`}
                    lines={
                      currentEffectLines
                    }
                    variant="current"
                  />

                  <EffectSummaryCard
                    title={`Après amélioration — niveau ${nextLevel}`}
                    lines={
                      nextEffectLines
                    }
                    variant="next"
                  />
                </section>
              )}

              {building.type ===
                "hideout" && (
                <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.07] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-cyan-200">
                        Ressources protégées
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Cette protection servira au
                        futur système de pillage.
                        Pour le moment, elle est
                        affichée comme indicateur.
                      </p>
                    </div>

                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">
                      {currentProtectionPercent} %
                      protégés
                    </span>
                  </div>

                  {storageResearchBonusPercent >
                    0 && (
                    <p className="mt-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200">
                      🏚️ Entrepôts dissimulés :
                      +{storageResearchBonusPercent} %
                      de capacité déjà inclus.
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <ProtectionCard
                      icon="💰"
                      label="Argent"
                      protectedAmount={
                        moneyProtection.protectedAmount
                      }
                      exposedAmount={
                        moneyProtection.exposedAmount
                      }
                      protectedCapacity={
                        moneyProtection.protectedCapacity
                      }
                    />

                    <ProtectionCard
                      icon="🧱"
                      label="Matériaux"
                      protectedAmount={
                        materialsProtection.protectedAmount
                      }
                      exposedAmount={
                        materialsProtection.exposedAmount
                      }
                      protectedCapacity={
                        materialsProtection.protectedCapacity
                      }
                    />

                    <ProtectionCard
                      icon="🧰"
                      label="Équipements"
                      protectedAmount={
                        equipmentProtection.protectedAmount
                      }
                      exposedAmount={
                        equipmentProtection.exposedAmount
                      }
                      protectedCapacity={
                        equipmentProtection.protectedCapacity
                      }
                    />
                  </div>
                </section>
              )}

              {building.type ===
                "workshop" && (
                <section className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                  <h3 className="font-black text-amber-200">
                    🚗 Système de véhicules en préparation
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-amber-100/75">
                    Les emplacements de véhicules,
                    revenus des véhicules,
                    réparations et convois ne sont
                    pas encore actifs. L'effet réel
                    du Garage est actuellement sa
                    production de matériaux.
                  </p>
                </section>
              )}

              {/* COÛT */}
              <section>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-zinc-300">
                  Coût de l’amélioration
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ResourceCard
                    icon="💰"
                    label="Argent"
                    required={cost.money}
                    available={city.money}
                  />

                  <ResourceCard
                    icon="🧱"
                    label="Matériaux"
                    required={cost.materials}
                    available={city.materials}
                  />

                  <ResourceCard
                    icon="⭐"
                    label="Influence"
                    required={cost.influence}
                    available={city.influence}
                  />
                </div>
              </section>

              {/* DURÉE */}
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white">
                      Temps de construction
                    </h3>

                    <div className="mt-1 text-sm text-zinc-400">
                      <p>
                        Villa actuelle : niveau{" "}
                        <strong className="text-white">
                          {safeVillaLevel}
                        </strong>
                      </p>

                      <p>
                        Bonus de vitesse appliqué :{" "}
                        <strong className="text-green-400">
                          +{villaSpeedBonus} %
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="whitespace-nowrap rounded-lg bg-black/30 px-4 py-2 text-lg font-black text-blue-300">
                    ⏱{" "}
                    {formatDuration(
                      constructionTime
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-amber-200">
                      👑 Expérience du commandant
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      L'XP est accordée lorsque le
                      niveau est réellement terminé,
                      y compris avec un accélérateur.
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-xl font-black text-amber-200">
                    +{formatNumber(
                      commanderXpReward
                    )} XP
                  </p>
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
                  La récompense possède une clé
                  unique côté Supabase : plusieurs
                  synchronisations ne peuvent pas
                  donner cette XP deux fois.
                </p>
              </section>

              {/* BONUS ET DÉBLOCAGES */}
              <section className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                <h3 className="font-bold text-purple-200">
                  Résultats du niveau{" "}
                  {nextLevel}
                </h3>

                {building.type !==
                    "hideout" &&
                  building.type !==
                    "workshop" &&
                  upgradeDetails?.bonuses &&
                  upgradeDetails.bonuses.length >
                    0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-purple-300/70">
                        Bonus obtenus
                      </p>

                      <ul className="mt-2 space-y-1 text-sm text-purple-100">
                        {upgradeDetails.bonuses.map(
                          (bonus) => (
                            <li
                              key={bonus}
                              className="flex gap-2"
                            >
                              <span>✓</span>
                              <span>
                                {bonus}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {building.type !==
                    "hideout" &&
                  building.type !==
                    "workshop" &&
                  upgradeDetails?.unlocks &&
                upgradeDetails.unlocks.length >
                  0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-300/70">
                      Déblocages
                    </p>

                    <ul className="mt-2 space-y-1 text-sm font-semibold text-purple-100">
                      {upgradeDetails.unlocks.map(
                        (unlock) => (
                          <li
                            key={unlock}
                            className="flex gap-2"
                          >
                            <span>🔓</span>
                            <span>
                              {unlock}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : building.type !==
                    "hideout" &&
                  building.type !==
                    "workshop" ? (
                  <p className="mt-3 text-sm text-purple-100/70">
                    Aucun nouveau contenu
                    débloqué à ce niveau.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-purple-100/70">
                    Les effets réellement actifs
                    sont affichés juste au-dessus.
                  </p>
                )}
              </section>

              {/* PLAFOND DE LA VILLA */}
             {isBlockedByVilla && (
  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-200">
    Villa niveau{" "}
    {requiredVillaLevelForUpgrade}{" "}
    nécessaire pour améliorer ce
    bâtiment.

    <div className="mt-1 text-xs font-normal text-orange-100/70">
      Niveau actuel de la Villa :{" "}
      {safeVillaLevel}
    </div>

    {isBelowUnlockLevel && (
      <div className="mt-2 text-xs font-normal text-orange-100/80">
        Ce bâtiment se débloque avec
        une Villa niveau{" "}
        {requiredVillaLevel}.
      </div>
    )}

    {!isBelowUnlockLevel &&
      isAboveVillaLimit && (
        <div className="mt-2 text-xs font-normal text-orange-100/80">
          Le niveau d’un bâtiment ne
          peut pas dépasser celui de
          la Villa.
        </div>
      )}
  </div>
)}

              {!hasEnoughResources && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                  Tu ne possèdes pas encore les
                  ressources nécessaires.
                </div>
              )}
            </>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-200">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {errorMessage}
            </div>
          )}

          {/* GESTION SPÉCIFIQUE DU BÂTIMENT */}
          {(building.type === "laboratory" ||
            building.type === "wall") && (
            <div className="grid gap-3 sm:grid-cols-2">
              {building.type === "laboratory" &&
                onOpenResearches && (
                  <button
                    type="button"
                    onClick={onOpenResearches}
                    className="rounded-lg border border-purple-500/40 bg-purple-700 px-5 py-3 font-black text-white transition hover:bg-purple-600"
                  >
                    🧪 Ouvrir les recherches
                  </button>
                )}

              {building.type === "wall" &&
                onOpenTroops && (
                  <button
                    type="button"
                    onClick={onOpenTroops}
                    className="rounded-lg border border-red-500/40 bg-red-700 px-5 py-3 font-black text-white transition hover:bg-red-600"
                  >
                    🕴️ Gérer les troupes
                  </button>
                )}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800"
            >
              Fermer
            </button>

            {!activeConstruction &&
              !locallyCompleted && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={
                  !hasEnoughResources ||
                  isBlockedByVilla ||
                  isSubmitting
                }
                className="rounded-lg bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isSubmitting
                  ? "Lancement..."
                  : isBlockedByVilla
                    ? `Villa niveau ${nextLevel} requise`
                    : `Améliorer vers le niveau ${nextLevel}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type EffectSummaryCardProps = {
  title: string
  lines: string[]
  variant: "current" | "next"
}

function EffectSummaryCard({
  title,
  lines,
  variant,
}: EffectSummaryCardProps) {
  const classes =
    variant === "current"
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-blue-500/25 bg-blue-500/[0.08]"

  return (
    <div
      className={`rounded-xl border p-4 ${classes}`}
    >
      <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
        {title}
      </p>

      {lines.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-white">
          {lines.map((line) => (
            <li
              key={line}
              className="flex gap-2"
            >
              <span className="text-green-400">
                ✓
              </span>

              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          Aucun effet économique direct.
        </p>
      )}
    </div>
  )
}

type ProtectionCardProps = {
  icon: string
  label: string
  protectedAmount: number
  exposedAmount: number
  protectedCapacity: number
}

function ProtectionCard({
  icon,
  label,
  protectedAmount,
  exposedAmount,
  protectedCapacity,
}: ProtectionCardProps) {
  return (
    <div className="rounded-xl border border-cyan-400/15 bg-black/20 p-3">
      <p className="text-xs font-black text-white">
        {icon} {label}
      </p>

      <div className="mt-2 space-y-1 text-[11px]">
        <p className="flex justify-between gap-2 text-green-300">
          <span>Protégé</span>

          <strong>
            {formatNumber(
              protectedAmount
            )}
          </strong>
        </p>

        <p className="flex justify-between gap-2 text-red-300">
          <span>Exposé</span>

          <strong>
            {formatNumber(
              exposedAmount
            )}
          </strong>
        </p>

        <p className="flex justify-between gap-2 border-t border-white/5 pt-1 text-zinc-500">
          <span>Protection max.</span>

          <strong>
            {formatNumber(
              protectedCapacity
            )}
          </strong>
        </p>
      </div>
    </div>
  )
}

type ResourceCardProps = {
  icon: string
  label: string
  required: number
  available: number
}

function ResourceCard({
  icon,
  label,
  required,
  available,
}: ResourceCardProps) {
  const hasEnough =
    available >= required

  return (
    <div
      className={`rounded-xl border p-3 ${
        hasEnough
          ? "border-green-500/20 bg-green-500/10"
          : "border-red-500/30 bg-red-500/10"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
        {icon} {label}
      </p>

      <p
        className={`mt-2 text-lg font-black ${
          hasEnough
            ? "text-green-300"
            : "text-red-300"
        }`}
      >
        {formatNumber(required)}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        Disponible :{" "}
        {formatNumber(available)}
      </p>
    </div>
  )
}