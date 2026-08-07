import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { RESEARCHES } from "../data/researches"
import { TROOPS } from "../data/troops"

import {
  getDeploymentResearchBonus,
  getSecurityDeploymentCapacity,
  getTroopCommandPointCost,
} from "../data/deployment"

import {
  getActiveRecruitments,
  getHighestBuildingLevel,
  getRecruitmentRemainingSeconds,
  getRecruitmentTimeSeconds,
  getSecurityRecruitmentLimits,
  getTroopRequirementsState,
  startRecruitment,
  syncCityRecruitments,
} from "../services/troopService"

import {
  syncCityResearches,
} from "../services/researchService"

import type {
  Building,
} from "../types/building"

import type {
  CityResearch,
} from "../types/research"

import type {
  CityTroop,
  TroopType,
} from "../types/troop"

import type {
  CityRecruitment,
} from "../services/troopService"

type CityResources = {
  id: string
  money: number
  equipment: number
  influence: number
}

type Props = {
  city: CityResources
  buildings: Building[]
  onClose: () => void
  onRecruitmentStarted?: () =>
    Promise<void> | void
}

const TROOP_TYPES = Object.keys(
  TROOPS
) as TroopType[]

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "fr-FR"
  ).format(
    Math.floor(Number(value) || 0)
  )
}

function formatDuration(
  totalSeconds: number
) {
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

  const seconds =
    safeSeconds % 60

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

export default function SecurityRecruitmentModal({
  city,
  buildings,
  onClose,
  onRecruitmentStarted,
}: Props) {
  const [
    cityTroops,
    setCityTroops,
  ] = useState<CityTroop[]>([])

  const [
    recruitments,
    setRecruitments,
  ] = useState<CityRecruitment[]>(
    []
  )

  const [
    researches,
    setResearches,
  ] = useState<CityResearch[]>([])

  const [
    quantities,
    setQuantities,
  ] = useState<
    Record<TroopType, number>
  >({
    henchman_1: 1,
    henchman_2: 1,
    henchman_3: 1,
    lieutenant_1: 1,
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    startingTroop,
    setStartingTroop,
  ] = useState<TroopType | null>(
    null
  )

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null)

  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now())

  const syncInProgress =
    useRef(false)

  const loadMilitaryData =
    useCallback(async () => {
      if (!city?.id) {
        return
      }

      try {
        setErrorMessage(null)

        const [
          recruitmentResult,
          researchResult,
        ] = await Promise.all([
          syncCityRecruitments(
            city.id
          ),
          syncCityResearches(
            city.id
          ),
        ])

        setCityTroops(
          recruitmentResult.troops
        )

        setRecruitments(
          recruitmentResult.recruitments
        )

        setResearches(
          researchResult
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger les troupes"

        setErrorMessage(message)
      } finally {
        setLoading(false)
      }
    }, [city.id])

  useEffect(() => {
    loadMilitaryData()
  }, [loadMilitaryData])

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

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

  const securityLevel =
    useMemo(
      () =>
        getHighestBuildingLevel(
          buildings,
          "wall"
        ),
      [buildings]
    )

  const laboratoryLevel =
    useMemo(
      () =>
        getHighestBuildingLevel(
          buildings,
          "laboratory"
        ),
      [buildings]
    )

  const limits =
    useMemo(
      () =>
        getSecurityRecruitmentLimits(
          securityLevel,
          researches
        ),
      [
        securityLevel,
        researches,
      ]
    )

  const totalOwned =
    useMemo(
      () =>
        cityTroops.reduce(
          (total, troop) =>
            total +
            (Number(
              troop.quantity
            ) || 0),
          0
        ),
      [cityTroops]
    )

  const deploymentResearchBonus =
    useMemo(
      () =>
        getDeploymentResearchBonus(
          researches
        ),
      [researches]
    )

  const deploymentCapacity =
    useMemo(
      () =>
        getSecurityDeploymentCapacity(
          securityLevel,
          0,
          deploymentResearchBonus
        ),
      [
        securityLevel,
        deploymentResearchBonus,
      ]
    )

  const activeRecruitments =
    useMemo(
      () =>
        getActiveRecruitments(
          recruitments
        ).sort(
          (
            first,
            second
          ) =>
            new Date(
              first.started_at
            ).getTime() -
            new Date(
              second.started_at
            ).getTime()
        ),
      [recruitments]
    )

  const availableQueueCount =
    Math.max(
      0,
      limits.queueCount -
        activeRecruitments.length
    )

  const hasAvailableRecruitmentQueue =
    availableQueueCount >
    0

  const activeRecruitmentStates =
    useMemo(
      () =>
        activeRecruitments.map(
          (
            recruitment,
            index
          ) => ({
            queueNumber:
              index + 1,

            recruitment,

            remainingSeconds:
              getRecruitmentRemainingSeconds(
                recruitment,
                currentTime
              ),
          })
        ),
      [
        activeRecruitments,
        currentTime,
      ]
    )

  const hasFinishedRecruitment =
    activeRecruitmentStates.some(
      (state) =>
        state.remainingSeconds <=
        0
    )

  useEffect(() => {
    if (
      !hasFinishedRecruitment ||
      syncInProgress.current
    ) {
      return
    }

    syncInProgress.current =
      true

    loadMilitaryData()
      .then(async () => {
        await onRecruitmentStarted?.()
      })
      .finally(() => {
        syncInProgress.current =
          false
      })
  }, [
    hasFinishedRecruitment,
    loadMilitaryData,
    onRecruitmentStarted,
  ])

  function getOwnedQuantity(
    troopType: TroopType
  ) {
    return (
      cityTroops.find(
        (troop) =>
          troop.troop_key ===
          troopType
      )?.quantity ?? 0
    )
  }

  function updateQuantity(
    troopType: TroopType,
    value: number
  ) {
    const safeMaximum =
      Math.max(
        1,
        limits.maxOrder
      )

    const safeValue = Math.min(
      safeMaximum,
      Math.max(
        1,
        Math.floor(
          Number(value) || 1
        )
      )
    )

    setQuantities((previous) => ({
      ...previous,
      [troopType]: safeValue,
    }))
  }

  async function handleRecruit(
    troopType: TroopType
  ) {
    if (startingTroop) {
      return
    }

    try {
      setErrorMessage(null)
      setStartingTroop(troopType)

      await startRecruitment(
        city.id,
        troopType,
        quantities[troopType]
      )

      await onRecruitmentStarted?.()
      await loadMilitaryData()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de lancer le recrutement"

      setErrorMessage(message)
    } finally {
      setStartingTroop(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
        aria-labelledby="security-recruitment-title"
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-red-500/30 bg-zinc-950 shadow-[0_25px_80px_rgba(0,0,0,0.8)]"
      >
        {/* EN-TÊTE */}
        <div className="sticky top-0 z-20 overflow-hidden border-b border-zinc-800 bg-zinc-950/95 px-6 py-5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/70 via-zinc-950 to-zinc-950" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/buildings/wall.png"
                alt=""
                className="h-20 w-20 object-contain"
                draggable={false}
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                  Centre de recrutement
                </p>

                <h2
                  id="security-recruitment-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  Poste de Sécurité
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Recrutez vos hommes et
                  développez votre force
                  militaire.
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
          {/* RÉSUMÉ */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryCard
              label="Sécurité"
              value={`Niv. ${securityLevel}`}
              icon="🛡️"
            />

            <SummaryCard
              label="Laboratoire"
              value={`Niv. ${laboratoryLevel}`}
              icon="🧪"
            />

            <SummaryCard
              label="Troupes possédées"
              value={formatNumber(
                totalOwned
              )}
              icon="🕴️"
            />

            <SummaryCard
              label="Déploiement"
              value={`${deploymentCapacity.totalCommandPoints} pts`}
              icon="🎯"
            />

            <SummaryCard
              label="Commande max."
              value={`${limits.maxOrder}`}
              icon="📋"
            />

            <SummaryCard
              label="Vitesse"
              value={`+${limits.speedPercent} %`}
              icon="⚡"
            />

            <SummaryCard
              label="Files"
              value={`${activeRecruitments.length} / ${limits.queueCount}`}
              icon="⏩"
            />
          </section>

          <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.07] px-4 py-3">
            <p className="text-sm font-black text-cyan-100">
              Stock d'armée sans limite de jeu
            </p>

            <p className="mt-1 text-xs leading-relaxed text-cyan-100/70">
              Le Poste de Sécurité ne limite plus le nombre total
              de soldats possédés. Capacité actuelle :
              {" "}
              {deploymentCapacity.totalCommandPoints}
              {" "}
              points
              {" "}
              (
              {deploymentCapacity.baseCommandPoints}
              {" "}
              de base
              {deploymentResearchBonus >
              0
                ? ` + ${deploymentResearchBonus} grâce aux recherches`
                : ""}
              ).
              Ces points serviront à préparer les opérations sur la
              World Map.
            </p>
          </section>

          {/* RESSOURCES */}
          <section className="grid gap-3 sm:grid-cols-3">
            <ResourceSummary
              icon="💵"
              label="Argent"
              value={city.money}
            />

            <ResourceSummary
              icon="🧰"
              label="Équipements"
              value={city.equipment}
            />

            <ResourceSummary
              icon="⭐"
              label="Influence"
              value={city.influence}
            />
          </section>

          {/* FILES DE RECRUTEMENT */}
          <section className="rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                  Files de recrutement
                </p>

                <h3 className="mt-1 text-lg font-black text-white">
                  {activeRecruitments.length}
                  {" / "}
                  {limits.queueCount}
                  {" occupée(s)"}
                </h3>

                <p className="mt-1 text-sm text-zinc-400">
                  {limits.queueCount >
                  1
                    ? "Le Centre d'entraînement parallèle permet deux recrutements simultanés."
                    : "Une deuxième file peut être débloquée dans les recherches militaires."}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${
                  hasAvailableRecruitmentQueue
                    ? "border-green-400/25 bg-green-500/10 text-green-200"
                    : "border-red-400/25 bg-red-500/10 text-red-200"
                }`}
              >
                {availableQueueCount}
                {" file(s) libre(s)"}
              </span>
            </div>

            <div
              className={`mt-4 grid gap-3 ${
                limits.queueCount >
                1
                  ? "md:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {Array.from({
                length:
                  limits.queueCount,
              }).map(
                (
                  _,
                  queueIndex
                ) => {
                  const state =
                    activeRecruitmentStates[
                      queueIndex
                    ]

                  if (!state) {
                    return (
                      <div
                        key={
                          queueIndex
                        }
                        className="rounded-xl border border-dashed border-green-500/30 bg-green-500/[0.06] p-4"
                      >
                        <p className="text-[10px] font-black uppercase tracking-wider text-green-300/70">
                          File{" "}
                          {queueIndex +
                            1}
                        </p>

                        <p className="mt-2 font-black text-green-200">
                          ✓ Disponible
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Une nouvelle commande
                          peut être lancée.
                        </p>
                      </div>
                    )
                  }

                  const definition =
                    TROOPS[
                      state.recruitment
                        .troop_key
                    ]

                  return (
                    <div
                      key={
                        state.recruitment
                          .id
                      }
                      className="rounded-xl border border-amber-400/25 bg-black/25 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300/70">
                            File{" "}
                            {
                              state.queueNumber
                            }
                          </p>

                          <p className="mt-1 font-black text-white">
                            {
                              definition?.name
                            }
                            {" × "}
                            {
                              state.recruitment
                                .quantity
                            }
                          </p>
                        </div>

                        <span className="text-lg">
                          {
                            definition?.icon ??
                            "🕴️"
                          }
                        </span>
                      </div>

                      <div className="mt-3 rounded-lg border border-amber-400/15 bg-black/30 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Temps restant
                        </p>

                        <p className="mt-1 font-black text-amber-200">
                          ⏱{" "}
                          {formatDuration(
                            state.remainingSeconds
                          )}
                        </p>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </section>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {errorMessage}
            </div>
          )}

          {/* UNITÉS */}
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">
                Unités disponibles
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Toutes les unités restent
                visibles. Les niveaux de
                Sécurité et les recherches
                militaires déterminent celles
                qui peuvent être recrutées.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement des troupes...
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {TROOP_TYPES.map(
                  (troopType) => {
                    const definition =
                      TROOPS[troopType]

                    const state =
                      getTroopRequirementsState(
                        troopType,
                        buildings,
                        researches
                      )

                    const quantity =
                      quantities[troopType]

                    const ownedQuantity =
                      getOwnedQuantity(
                        troopType
                      )

                    const totalMoney =
                      definition.cost.money *
                      quantity

                    const totalEquipment =
                      definition.cost
                        .equipment *
                      quantity

                    const totalInfluence =
                      definition.cost
                        .influence *
                      quantity

                    const hasEnoughMoney =
                      Number(city.money) >=
                      totalMoney

                    const hasEnoughEquipment =
                      Number(
                        city.equipment
                      ) >=
                      totalEquipment

                    const hasEnoughInfluence =
                      Number(
                        city.influence
                      ) >=
                      totalInfluence

                    const hasEnoughResources =
                      hasEnoughMoney &&
                      hasEnoughEquipment &&
                      hasEnoughInfluence

                    const maxSelectable =
                      limits.maxOrder

                    const canRecruit =
                      state.unlocked &&
                      hasEnoughResources &&
                      maxSelectable > 0 &&
                      hasAvailableRecruitmentQueue &&
                      !startingTroop

                    const researchName =
                      definition.researchRequired
                        ? RESEARCHES[
                            definition
                              .researchRequired
                          ]?.name
                        : null

                    const recruitmentTime =
                      getRecruitmentTimeSeconds(
                        troopType,
                        quantity,
                        securityLevel,
                        researches
                      )

                    return (
                      <article
                        key={troopType}
                        className={`rounded-2xl border p-5 transition ${
                          state.unlocked
                            ? "border-red-500/25 bg-red-500/5"
                            : "border-zinc-800 bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/30 text-3xl">
                            {
                              definition.icon
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-black text-white">
                                {
                                  definition.name
                                }
                              </h4>

                              <TroopStatusBadge
                                unlocked={
                                  state.unlocked
                                }
                              />
                            </div>

                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                              {
                                definition.description
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded-full border border-zinc-700 bg-black/25 px-2 py-1 text-zinc-300">
                                Possédés :{" "}
                                {formatNumber(
                                  ownedQuantity
                                )}
                              </span>

                              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                                🎯{" "}
                                {getTroopCommandPointCost(
                                  troopType
                                )}
                                {" pt / unité"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* STATISTIQUES */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <StatItem
                            label="Attaque"
                            value={
                              definition.stats
                                .attack
                            }
                          />

                          <StatItem
                            label="Défense"
                            value={
                              definition.stats
                                .defense
                            }
                          />

                          <StatItem
                            label="Vie"
                            value={
                              definition.stats
                                .health
                            }
                          />
                        </div>

                        {/* CONDITIONS */}
                        <div className="mt-4 space-y-2 rounded-xl bg-black/20 p-3">
                          <RequirementLine
                            valid={
                              state.hasSecurityLevel
                            }
                            text={`Sécurité niveau ${definition.securityLevelRequired}`}
                            current={`Actuel : ${state.securityLevel}`}
                          />

                          {definition.laboratoryLevelRequired >
                            0 && (
                            <RequirementLine
                              valid={
                                state.hasLaboratoryLevel
                              }
                              text={`Laboratoire niveau ${definition.laboratoryLevelRequired}`}
                              current={`Actuel : ${state.laboratoryLevel}`}
                            />
                          )}

                          {definition.researchRequired && (
                            <RequirementLine
                              valid={
                                state.hasRequiredResearch
                              }
                              text={`Recherche « ${researchName} »`}
                              current={
                                state.hasRequiredResearch
                                  ? "Terminée"
                                  : "Non terminée"
                              }
                            />
                          )}
                        </div>

                        {/* QUANTITÉ */}
                        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-black/20 p-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Quantité
                            </p>

                            <p className="mt-1 text-xs text-zinc-400">
                              Maximum actuel :{" "}
                              {Math.max(
                                0,
                                maxSelectable
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  troopType,
                                  quantity - 1
                                )
                              }
                              disabled={
                                quantity <= 1
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 font-black text-white disabled:opacity-40"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={Math.max(
                                1,
                                maxSelectable
                              )}
                              value={quantity}
                              onChange={(event) =>
                                updateQuantity(
                                  troopType,
                                  Number(
                                    event.target
                                      .value
                                  )
                                )
                              }
                              className="h-9 w-16 rounded-lg border border-zinc-700 bg-zinc-950 text-center font-black text-white outline-none focus:border-red-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  troopType,
                                  quantity + 1
                                )
                              }
                              disabled={
                                quantity >=
                                Math.max(
                                  1,
                                  maxSelectable
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 font-black text-white disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* COÛT */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <CostItem
                            icon="💵"
                            value={
                              totalMoney
                            }
                            valid={
                              hasEnoughMoney
                            }
                          />

                          <CostItem
                            icon="🧰"
                            value={
                              totalEquipment
                            }
                            valid={
                              hasEnoughEquipment
                            }
                          />

                          <CostItem
                            icon="⭐"
                            value={
                              totalInfluence
                            }
                            valid={
                              hasEnoughInfluence
                            }
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-zinc-500">
                            Temps total
                          </span>

                          <span className="font-bold text-zinc-300">
                            ⏱{" "}
                            {formatDuration(
                              recruitmentTime
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!canRecruit}
                          onClick={() =>
                            handleRecruit(
                              troopType
                            )
                          }
                          className="mt-4 w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {!state.unlocked
                            ? definition.researchRequired &&
                              !state.hasRequiredResearch
                              ? "Recherche militaire requise"
                              : "Conditions non remplies"
                            : !hasAvailableRecruitmentQueue
                              ? limits.queueCount >
                                1
                                ? "Toutes les files sont occupées"
                                : "Un recrutement est déjà en cours"
                              : !hasEnoughResources
                                ? "Ressources insuffisantes"
                                : startingTroop ===
                                    troopType
                                  ? "Lancement..."
                                  : `Recruter × ${quantity}`}
                        </button>
                      </article>
                    )
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

type SummaryCardProps = {
  icon: string
  label: string
  value: string
}

function SummaryCard({
  icon,
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

type ResourceSummaryProps = {
  icon: string
  label: string
  value: number
}

function ResourceSummary({
  icon,
  label,
  value,
}: ResourceSummaryProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">
        {formatNumber(value)}
      </p>
    </div>
  )
}

type RequirementLineProps = {
  valid: boolean
  text: string
  current: string
}

function RequirementLine({
  valid,
  text,
  current,
}: RequirementLineProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span
        className={
          valid
            ? "font-semibold text-green-300"
            : "font-semibold text-red-300"
        }
      >
        {valid ? "✓" : "✗"} {text}
      </span>

      <span className="text-zinc-500">
        {current}
      </span>
    </div>
  )
}

type CostItemProps = {
  icon: string
  value: number
  valid: boolean
}

function CostItem({
  icon,
  value,
  valid,
}: CostItemProps) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-center text-xs font-bold ${
        valid
          ? "border-green-500/20 bg-green-500/5 text-green-200"
          : "border-red-500/20 bg-red-500/5 text-red-200"
      }`}
    >
      {icon} {formatNumber(value)}
    </div>
  )
}

type StatItemProps = {
  label: string
  value: number
}

function StatItem({
  label,
  value,
}: StatItemProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/20 px-2 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {formatNumber(value)}
      </p>
    </div>
  )
}

function TroopStatusBadge({
  unlocked,
}: {
  unlocked: boolean
}) {
  if (unlocked) {
    return (
      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-bold uppercase text-green-300">
        Disponible
      </span>
    )
  }

  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500">
      Verrouillée
    </span>
  )
}
