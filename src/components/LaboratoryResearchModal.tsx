import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  RESEARCHES,
} from "../data/researches"

import ActionSpeedupsPanel from "./ActionSpeedupsPanel"

import {
  getActiveResearch,
  getResearchRemainingSeconds,
  getResearchRequirementsState,
  startResearch,
  syncCityResearches,
} from "../services/researchService"

import type {
  Building,
} from "../types/building"

import type {
  CityResearch,
  ResearchCategory,
  ResearchType,
} from "../types/research"

type CityResources = {
  id: string
  money: number
  materials: number
  influence: number
}

type Props = {
  city: CityResources
  buildings: Building[]
  onClose: () => void
  onResearchStarted?: () =>
    Promise<void> | void
}

type CategoryDefinition = {
  key: ResearchCategory
  label: string
  shortLabel: string
  subtitle: string
  icon: string
}

const RESEARCH_CATEGORIES: CategoryDefinition[] = [
  {
    key: "military",
    label: "Guerre des rues",
    shortLabel: "Militaire",
    subtitle:
      "Troupes, recrutement, attaque et défense.",
    icon: "⚔️",
  },
  {
    key: "economy",
    label: "Affaires clandestines",
    shortLabel: "Économie",
    subtitle:
      "Production, stockage et collecte.",
    icon: "💰",
  },
  {
    key: "organization",
    label: "Réseau & Territoire",
    shortLabel: "Réseau",
    subtitle:
      "Déplacements, missions et contrôle des zones.",
    icon: "🗺️",
  },
]

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

function isCompletedResearch(
  researches: CityResearch[],
  researchType: ResearchType
) {
  return researches.some(
    (research) =>
      research.research_key ===
        researchType &&
      research.status ===
        "completed"
  )
}

function getCategoryDefinition(
  category: ResearchCategory
) {
  return (
    RESEARCH_CATEGORIES.find(
      (item) =>
        item.key === category
    ) ??
    RESEARCH_CATEGORIES[0]
  )
}

export default function LaboratoryResearchModal({
  city,
  buildings,
  onClose,
  onResearchStarted,
}: Props) {
  const [
    researches,
    setResearches,
  ] = useState<CityResearch[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    startingResearch,
    setStartingResearch,
  ] = useState<ResearchType | null>(
    null
  )

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  )

  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now())

  const [
    activeCategory,
    setActiveCategory,
  ] = useState<ResearchCategory>(
    "military"
  )

  const [
    showCompleted,
    setShowCompleted,
  ] = useState(false)

  const syncInProgress =
    useRef(false)

  const loadResearches =
    useCallback(async () => {
      if (!city?.id) {
        return
      }

      try {
        setErrorMessage(null)

        const result =
          await syncCityResearches(
            city.id
          )

        setResearches(result)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger les recherches"

        setErrorMessage(message)
      } finally {
        setLoading(false)
      }
    }, [city.id])

  useEffect(() => {
    loadResearches()
  }, [loadResearches])

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)

    return () => {
      window.clearInterval(
        intervalId
      )
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
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

  const activeResearch =
    useMemo(
      () =>
        getActiveResearch(
          researches
        ),
      [researches]
    )

  const activeRemainingSeconds =
    useMemo(() => {
      if (!activeResearch) {
        return 0
      }

      return getResearchRemainingSeconds(
        activeResearch,
        currentTime
      )
    }, [
      activeResearch,
      currentTime,
    ])

  const completedResearchCount =
    useMemo(
      () =>
        Object.values(
          RESEARCHES
        ).filter(
          (definition) =>
            isCompletedResearch(
              researches,
              definition.type
            )
        ).length,
      [researches]
    )

  const visibleDefinitions =
    useMemo(
      () =>
        Object.values(
          RESEARCHES
        ).filter(
          (definition) => {
            if (
              definition.category !==
              activeCategory
            ) {
              return false
            }

            const completed =
              isCompletedResearch(
                researches,
                definition.type
              )

            return showCompleted
              ? completed
              : !completed
          }
        ),
      [
        activeCategory,
        researches,
        showCompleted,
      ]
    )

  const activeCategoryDefinition =
    getCategoryDefinition(
      activeCategory
    )

  /*
   * Lorsque le chronomètre arrive à zéro,
   * le service termine automatiquement
   * la recherche.
   */
  useEffect(() => {
    if (
      !activeResearch ||
      activeRemainingSeconds > 0 ||
      syncInProgress.current
    ) {
      return
    }

    syncInProgress.current = true

    loadResearches().finally(() => {
      syncInProgress.current = false
    })
  }, [
    activeResearch,
    activeRemainingSeconds,
    loadResearches,
  ])

  async function handleStartResearch(
    researchType: ResearchType
  ) {
    if (startingResearch) {
      return
    }

    try {
      setErrorMessage(null)

      setStartingResearch(
        researchType
      )

      await startResearch(
        city.id,
        researchType
      )

      await onResearchStarted?.()
      await loadResearches()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de lancer cette recherche"

      setErrorMessage(message)
    } finally {
      setStartingResearch(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
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
        aria-labelledby="laboratory-research-title"
        className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-purple-500/30 bg-zinc-950 shadow-[0_25px_80px_rgba(0,0,0,0.8)]"
      >
        {/* EN-TÊTE */}
        <div className="sticky top-0 z-30 overflow-hidden border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-950/70 via-zinc-950 to-zinc-950" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <img
                src="/buildings/laboratory.png"
                alt=""
                className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20"
                draggable={false}
              />

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 sm:text-xs">
                  Centre de recherches
                </p>

                <h2
                  id="laboratory-research-title"
                  className="mt-1 text-xl font-black text-white sm:text-2xl"
                >
                  Laboratoire
                </h2>

                <p className="mt-1 max-w-2xl text-xs text-zinc-400 sm:text-sm">
                  Développez votre puissance,
                  vos affaires et votre réseau
                  criminel.
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

        <div className="space-y-5 p-4 sm:p-6">
          {/* RESSOURCES */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ResourceSummary
              icon="💵"
              label="Argent"
              value={city.money}
            />

            <ResourceSummary
              icon="🧱"
              label="Matériaux"
              value={city.materials}
            />

            <ResourceSummary
              icon="⭐"
              label="Influence"
              value={city.influence}
            />
          </section>

          {/* RECHERCHE ACTIVE */}
          {activeResearch && (
            <section className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">
                    Recherche en cours
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {
                        RESEARCHES[
                          activeResearch
                            .research_key
                        ]?.name
                      }
                    </h3>

                    <span className="rounded-full border border-purple-400/25 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-purple-200">
                      {
                        getCategoryDefinition(
                          RESEARCHES[
                            activeResearch
                              .research_key
                          ]?.category ??
                            "military"
                        ).shortLabel
                      }
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-zinc-400">
                    Le Laboratoire ne peut
                    effectuer qu’une recherche
                    à la fois.
                  </p>
                </div>

                <div className="rounded-xl border border-purple-400/20 bg-black/30 px-5 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Temps restant
                  </p>

                  <p className="mt-1 whitespace-nowrap text-xl font-black text-purple-200">
                    ⏱{" "}
                    {formatDuration(
                      activeRemainingSeconds
                    )}
                  </p>
                </div>
              </div>

              <ActionSpeedupsPanel
                cityId={city.id}
                targetType="research"
                targetId={
                  activeResearch.id
                }
                remainingSeconds={
                  activeRemainingSeconds
                }
                title="Accélérer la recherche"
                description="Utilisez un accélérateur de recherche ou un accélérateur universel directement sur cette étude."
                accent="purple"
                onApplied={async () => {
                  await loadResearches()
                  await onResearchStarted?.()
                }}
              />
            </section>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {errorMessage}
            </div>
          )}

          {/* NAVIGATION DES BRANCHES */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-3 sm:p-4">
            <div className="grid gap-2 md:grid-cols-3">
              {RESEARCH_CATEGORIES.map(
                (category) => {
                  const categoryDefinitions =
                    Object.values(
                      RESEARCHES
                    ).filter(
                      (definition) =>
                        definition.category ===
                        category.key
                    )

                  const completedCount =
                    categoryDefinitions.filter(
                      (definition) =>
                        isCompletedResearch(
                          researches,
                          definition.type
                        )
                    ).length

                  const remainingCount =
                    categoryDefinitions.length -
                    completedCount

                  const active =
                    activeCategory ===
                    category.key

                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() =>
                        setActiveCategory(
                          category.key
                        )
                      }
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-purple-400/50 bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                          : "border-zinc-800 bg-black/20 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {category.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`truncate text-sm font-black ${
                                active
                                  ? "text-purple-100"
                                  : "text-white"
                              }`}
                            >
                              {category.label}
                            </p>

                            <span className="shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-black text-zinc-400">
                              {showCompleted
                                ? completedCount
                                : remainingCount}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                            {category.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                }
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  {activeCategoryDefinition.icon}{" "}
                  {activeCategoryDefinition.label}
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  {showCompleted
                    ? "Archives de cette branche"
                    : activeCategoryDefinition.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCompleted(
                    (current) =>
                      !current
                  )
                }
                className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                  showCompleted
                    ? "border-purple-400/40 bg-purple-500/15 text-purple-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-purple-500/40 hover:text-white"
                }`}
              >
                {showCompleted
                  ? "← Revenir aux recherches"
                  : `✓ Recherches terminées (${completedResearchCount})`}
              </button>
            </div>
          </section>

          {/* LISTE DES RECHERCHES */}
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">
                {showCompleted
                  ? "Recherches terminées"
                  : "Recherches disponibles"}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                {showCompleted
                  ? "Les recherches maîtrisées sont rangées ici afin de garder la liste principale plus lisible."
                  : "Les niveaux de Sécurité, du Laboratoire et les recherches précédentes déterminent les technologies accessibles."}
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement des recherches...
              </div>
            ) : visibleDefinitions.length === 0 ? (
              <EmptyResearchState
                category={
                  activeCategoryDefinition
                }
                completedMode={
                  showCompleted
                }
              />
            ) : showCompleted ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {visibleDefinitions.map(
                  (definition) => (
                    <CompletedResearchCard
                      key={
                        definition.type
                      }
                      definition={
                        definition
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleDefinitions.map(
                  (definition) => {
                    const state =
                      getResearchRequirementsState(
                        definition.type,
                        buildings,
                        researches
                      )

                    const hasEnoughMoney =
                      Number(
                        city.money
                      ) >=
                      definition.cost.money

                    const hasEnoughMaterials =
                      Number(
                        city.materials
                      ) >=
                      definition.cost
                        .materials

                    const hasEnoughInfluence =
                      Number(
                        city.influence
                      ) >=
                      definition.cost
                        .influence

                    const hasEnoughResources =
                      hasEnoughMoney &&
                      hasEnoughMaterials &&
                      hasEnoughInfluence

                    const anotherResearchActive =
                      Boolean(
                        activeResearch &&
                          activeResearch
                            .research_key !==
                            definition.type
                      )

                    const canStart =
                      state.canStart &&
                      hasEnoughResources &&
                      !anotherResearchActive &&
                      !startingResearch

                    return (
                      <article
                        key={
                          definition.type
                        }
                        className={`rounded-2xl border p-4 transition sm:p-5 ${
                          state.researching
                            ? "border-purple-400/40 bg-purple-500/10"
                            : state.canStart &&
                                hasEnoughResources
                              ? "border-blue-500/30 bg-blue-500/10"
                              : "border-zinc-800 bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/30 text-2xl">
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

                              <ResearchStatusBadge
                                completed={
                                  false
                                }
                                researching={
                                  state.researching
                                }
                                available={
                                  state.canStart &&
                                  hasEnoughResources
                                }
                              />
                            </div>

                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                              {
                                definition.description
                              }
                            </p>
                          </div>
                        </div>

                        {/* CONDITIONS */}
                        <div className="mt-4 space-y-2 rounded-xl bg-black/20 p-3">
                          <RequirementLine
                            valid={
                              state.hasLaboratoryLevel
                            }
                            text={`Laboratoire niveau ${definition.laboratoryLevelRequired}`}
                            current={`Actuel : ${state.laboratoryLevel}`}
                          />

                          <RequirementLine
                            valid={
                              state.hasSecurityLevel
                            }
                            text={`Sécurité niveau ${definition.securityLevelRequired}`}
                            current={`Actuel : ${state.securityLevel}`}
                          />

                          {state.prerequisiteStates.map(
                            (
                              prerequisite
                            ) => (
                              <RequirementLine
                                key={
                                  prerequisite.researchType
                                }
                                valid={
                                  prerequisite.completed
                                }
                                text={
                                  prerequisite.name
                                }
                                current="Recherche préalable"
                              />
                            )
                          )}
                        </div>

                        {/* COÛT */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <CostItem
                            icon="💵"
                            value={
                              definition.cost.money
                            }
                            valid={
                              hasEnoughMoney
                            }
                          />

                          <CostItem
                            icon="🧱"
                            value={
                              definition.cost
                                .materials
                            }
                            valid={
                              hasEnoughMaterials
                            }
                          />

                          <CostItem
                            icon="⭐"
                            value={
                              definition.cost
                                .influence
                            }
                            valid={
                              hasEnoughInfluence
                            }
                          />
                        </div>

                        {/* DURÉE */}
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                          <span className="text-zinc-500">
                            Durée de recherche
                          </span>

                          <span className="font-bold text-zinc-300">
                            ⏱{" "}
                            {formatDuration(
                              definition.researchTimeSeconds
                            )}
                          </span>
                        </div>

                        {/* DÉBLOCAGES */}
                        <div className="mt-4 rounded-xl border border-purple-500/15 bg-purple-500/5 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300/70">
                            Débloque
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-purple-100">
                            {definition.unlocks.map(
                              (unlock) => (
                                <li
                                  key={
                                    unlock
                                  }
                                  className="flex gap-2"
                                >
                                  <span>
                                    🔓
                                  </span>

                                  <span>
                                    {
                                      unlock
                                    }
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {/* ACTION */}
                        <button
                          type="button"
                          disabled={
                            !canStart
                          }
                          onClick={() =>
                            handleStartResearch(
                              definition.type
                            )
                          }
                          className="mt-4 w-full rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {state.researching
                            ? "⏳ Recherche en cours"
                            : anotherResearchActive
                              ? "Une autre recherche est en cours"
                              : !state.hasLaboratoryLevel ||
                                  !state.hasSecurityLevel ||
                                  !state.hasPrerequisiteResearches
                                ? "Conditions non remplies"
                                : !hasEnoughResources
                                  ? "Ressources insuffisantes"
                                  : startingResearch ===
                                      definition.type
                                    ? "Lancement..."
                                    : "Lancer la recherche"}
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

type CompletedResearchCardProps = {
  definition: (typeof RESEARCHES)[ResearchType]
}

function CompletedResearchCard({
  definition,
}: CompletedResearchCardProps) {
  return (
    <article className="rounded-2xl border border-green-500/25 bg-green-500/[0.07] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-green-500/15 bg-black/25 text-xl">
          {definition.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-black text-white">
              {definition.name}
            </h4>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[9px] font-black uppercase text-green-300">
              Maîtrisée
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-green-500/10 bg-black/20 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-green-300/70">
          Avantages obtenus
        </p>

        <ul className="mt-2 space-y-1 text-sm text-green-100">
          {definition.unlocks.map(
            (unlock) => (
              <li
                key={unlock}
                className="flex gap-2"
              >
                <span>✓</span>
                <span>{unlock}</span>
              </li>
            )
          )}
        </ul>
      </div>
    </article>
  )
}

type EmptyResearchStateProps = {
  category: CategoryDefinition
  completedMode: boolean
}

function EmptyResearchState({
  category,
  completedMode,
}: EmptyResearchStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
      <div className="text-4xl">
        {category.icon}
      </div>

      <h4 className="mt-3 font-black text-white">
        {completedMode
          ? "Aucune recherche terminée"
          : "Branche en préparation"}
      </h4>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
        {completedMode
          ? `Aucune recherche de la branche « ${category.label} » n’a encore été terminée.`
          : `Les futures recherches de la branche « ${category.label} » apparaîtront ici. L’interface est déjà prête à les recevoir.`}
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
        {valid ? "✓" : "✗"}{" "}
        {text}
      </span>

      <span className="shrink-0 text-right text-zinc-500">
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
      {icon}{" "}
      {formatNumber(value)}
    </div>
  )
}

type ResearchStatusBadgeProps = {
  completed: boolean
  researching: boolean
  available: boolean
}

function ResearchStatusBadge({
  completed,
  researching,
  available,
}: ResearchStatusBadgeProps) {
  if (completed) {
    return (
      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-bold uppercase text-green-300">
        Terminée
      </span>
    )
  }

  if (researching) {
    return (
      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-bold uppercase text-purple-300">
        En cours
      </span>
    )
  }

  if (available) {
    return (
      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase text-blue-300">
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
