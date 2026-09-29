import {
  useMemo,
  useState,
} from "react"

import { TROOPS } from "../../data/troops"

import {
  getDeploymentResearchBonus,
  getHumanDeploymentUsage,
  getSecurityDeploymentCapacity,
  getTroopCommandPointCost,
} from "../../data/deployment"

import {
  assessWorldPower,
  calculateWorldSquadPower,
  getTroopOperationUnitPower,
  type WorldPowerAssessment,
} from "../../data/worldCombat"

import {
  getHighestBuildingLevel,
} from "../../services/troopService"

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
  TroopType,
} from "../../types/troop"

import type {
  WorldNode,
} from "../../types/worldMap"

import type {
  WorldOperation,
} from "../../types/worldOperation"

type Props = {
  node: WorldNode
  buildings: Building[]
  cityTroops: CityTroop[]
  researches: CityResearch[]
  commanderLevel: number
  commanderSkills: CommanderSkills
  activeOperation: WorldOperation | null
  loading: boolean
  errorMessage: string | null
  onClose: () => void
  onLaunch: (
    node: WorldNode,
    selection: HumanDeploymentSelection,
    squadPower: number,
    autoAssault: boolean
  ) => Promise<void>
}

const TROOP_TYPES = Object.keys(
  TROOPS
) as TroopType[]

const EMPTY_SELECTION: Record<
  TroopType,
  number
> = {
  henchman_1: 0,
  henchman_2: 0,
  henchman_3: 0,
  lieutenant_1: 0,
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
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds)
  )

  const minutes = Math.floor(
    safeSeconds / 60
  )

  const seconds = safeSeconds % 60

  if (minutes > 0) {
    return seconds > 0
      ? `${minutes} min ${seconds} s`
      : `${minutes} min`
  }

  return `${seconds} s`
}

function getAssessmentPresentation(
  assessment: WorldPowerAssessment
) {
  switch (assessment) {
    case "overwhelming_advantage":
      return {
        label: "Avantage important",
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      }

    case "advantage":
      return {
        label: "Avantage",
        className:
          "border-green-500/30 bg-green-500/10 text-green-200",
      }

    case "balanced":
      return {
        label: "Affrontement équilibré",
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-200",
      }

    case "dangerous":
      return {
        label: "Risque élevé",
        className:
          "border-orange-500/30 bg-orange-500/10 text-orange-200",
      }

    default:
      return {
        label: "Très dangereux",
        className:
          "border-red-500/30 bg-red-500/10 text-red-200",
      }
  }
}

export default function WorldOperationPanel({
  node,
  buildings,
  cityTroops,
  researches,
  commanderLevel,
  commanderSkills,
  activeOperation,
  loading,
  errorMessage,
  onClose,
  onLaunch,
}: Props) {
  const [selection, setSelection] =
    useState<Record<TroopType, number>>(
      EMPTY_SELECTION
    )

  const [autoAssault, setAutoAssault] =
    useState(true)

  const [isLaunching, setIsLaunching] =
    useState(false)

  const [launchError, setLaunchError] =
    useState<string | null>(null)

  const securityLevel = useMemo(
    () =>
      getHighestBuildingLevel(
        buildings,
        "wall"
      ),
    [buildings]
  )

  const deploymentResearchBonus =
    useMemo(
      () =>
        getDeploymentResearchBonus(
          researches
        ),
      [researches]
    )

  const deploymentCapacity = useMemo(
    () =>
      getSecurityDeploymentCapacity(
        securityLevel,
        0,
        deploymentResearchBonus
      ),
    [
      deploymentResearchBonus,
      securityLevel,
    ]
  )

  const deploymentUsage = useMemo(
    () =>
      getHumanDeploymentUsage(
        selection,
        deploymentCapacity
      ),
    [
      deploymentCapacity,
      selection,
    ]
  )

  const ownedByType = useMemo(() => {
    const result: Record<
      TroopType,
      number
    > = {
      ...EMPTY_SELECTION,
    }

    for (const troop of cityTroops) {
      const troopType = troop.troop_key

      if (!(troopType in result)) {
        continue
      }

      result[troopType] += Math.max(
        0,
        Math.floor(
          Number(troop.quantity) || 0
        )
      )
    }

    return result
  }, [cityTroops])

  const squadPower = useMemo(
    () =>
      calculateWorldSquadPower(
        selection,
        commanderLevel,
        commanderSkills
      ),
    [
      commanderLevel,
      commanderSkills,
      selection,
    ]
  )

  const selectedUnitCount = useMemo(
    () =>
      TROOP_TYPES.reduce(
        (total, troopType) =>
          total +
          Math.max(
            0,
            selection[troopType] ?? 0
          ),
        0
      ),
    [selection]
  )

  const assessment =
    assessWorldPower(
      squadPower.totalPower,
      node.recommendedPower
    )

  const assessmentPresentation =
    getAssessmentPresentation(
      assessment
    )

  function updateQuantity(
    troopType: TroopType,
    nextQuantity: number
  ) {
    const owned =
      ownedByType[troopType] ?? 0

    const safeQuantity = Math.max(
      0,
      Math.min(
        owned,
        Math.floor(
          Number(nextQuantity) || 0
        )
      )
    )

    const candidate = {
      ...selection,
      [troopType]: safeQuantity,
    }

    const candidateUsage =
      getHumanDeploymentUsage(
        candidate,
        deploymentCapacity
      )

    if (
      !candidateUsage.isWithinCapacity
    ) {
      return
    }

    setSelection(candidate)
  }

  function selectMaximum(
    troopType: TroopType
  ) {
    const cost =
      getTroopCommandPointCost(
        troopType
      )

    const currentQuantity =
      selection[troopType] ?? 0

    const pointsWithoutThisType =
      deploymentUsage.usedCommandPoints -
      currentQuantity * cost

    const remainingForThisType =
      Math.max(
        0,
        deploymentCapacity.totalCommandPoints -
          pointsWithoutThisType
      )

    const maximumByCapacity =
      Math.floor(
        remainingForThisType / cost
      )

    updateQuantity(
      troopType,
      Math.min(
        ownedByType[troopType] ?? 0,
        maximumByCapacity
      )
    )
  }

  function clearSelection() {
    setSelection({
      ...EMPTY_SELECTION,
    })
  }

  const canLaunch =
    !loading &&
    !errorMessage &&
    !activeOperation &&
    !isLaunching &&
    selectedUnitCount > 0 &&
    squadPower.totalPower > 0 &&
    deploymentUsage.isWithinCapacity

  async function handleLaunch() {
    if (!canLaunch) {
      return
    }

    try {
      setIsLaunching(true)
      setLaunchError(null)

      await onLaunch(
        node,
        selection,
        squadPower.totalPower,
        autoAssault
      )
    } catch (error) {
      setLaunchError(
        error instanceof Error
          ? error.message
          : "Impossible de lancer l'opération"
      )
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div
      data-world-interactive
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-operation-title"
        className="max-h-[92%] w-full max-w-5xl overflow-y-auto rounded-2xl border border-red-500/25 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
      >
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-2xl">
                {node.icon}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
                  Préparation de l'opération
                </p>

                <h2
                  id="world-operation-title"
                  className="mt-1 truncate text-xl font-black text-white sm:text-2xl"
                >
                  {node.name}
                </h2>

                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  Niveau {node.level} • trajet {formatDuration(node.travelSeconds ?? 0)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        {node.imageSrc && (
          <div className="relative h-40 overflow-hidden border-b border-zinc-800 sm:h-52">
            <img
              src={node.imageSrc}
              alt={node.imageAlt ?? node.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/20 to-black/50" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent px-4 pb-4 pt-14 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300/80">
                    Reconnaissance de la cible
                  </p>
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-zinc-300 sm:text-sm">
                    {node.description}
                  </p>
                </div>
                <div className="rounded-xl border border-red-500/25 bg-black/70 px-3 py-2 text-right shadow-xl backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">
                    Puissance ennemie
                  </p>
                  <p className="mt-0.5 text-lg font-black text-red-100">
                    {formatNumber(node.recommendedPower)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Force à déployer
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    Compose ton escouade
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedUnitCount === 0}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Vider
                </button>
              </div>

              {loading ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm font-semibold text-zinc-400">
                  Chargement des troupes et des recherches...
                </div>
              ) : errorMessage ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                  {errorMessage}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {TROOP_TYPES.map((troopType) => {
                    const definition = TROOPS[troopType]
                    const owned = ownedByType[troopType] ?? 0
                    const selected = selection[troopType] ?? 0
                    const pointCost = getTroopCommandPointCost(troopType)
                    const unitPower = getTroopOperationUnitPower(troopType)

                    const canAdd =
                      selected < owned &&
                      deploymentUsage.usedCommandPoints + pointCost <=
                        deploymentCapacity.totalCommandPoints

                    return (
                      <article
                        key={troopType}
                        className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/55 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-black/30 text-xl">
                            {definition.icon}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h4 className="font-black text-white">
                                {definition.name}
                              </h4>

                              <span className="rounded-full border border-zinc-700 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400">
                                {pointCost} pt{pointCost > 1 ? "s" : ""}
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                              Possédées {formatNumber(owned)} • puissance/unité {formatNumber(unitPower)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                troopType,
                                selected - 1
                              )
                            }
                            disabled={selected <= 0}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-lg font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            −
                          </button>

                          <div className="min-w-12 text-center text-lg font-black tabular-nums text-white">
                            {selected}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                troopType,
                                selected + 1
                              )
                            }
                            disabled={!canAdd}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/35 bg-red-950/60 text-lg font-black text-red-100 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              selectMaximum(troopType)
                            }
                            disabled={owned <= 0}
                            className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Max
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300/75">
                    Points de commandement
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-400">
                    Sécurité niv. {securityLevel}
                    {deploymentResearchBonus > 0
                      ? ` • +${deploymentResearchBonus} recherches`
                      : ""}
                  </p>
                </div>

                <p className="text-xl font-black tabular-nums text-white">
                  {deploymentUsage.usedCommandPoints} / {deploymentCapacity.totalCommandPoints}
                </p>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/40">
                <div
                  className={`h-full rounded-full transition-all ${
                    deploymentUsage.usedCommandPoints >
                    deploymentCapacity.totalCommandPoints * 0.9
                      ? "bg-red-500"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      deploymentCapacity.totalCommandPoints > 0
                        ? (deploymentUsage.usedCommandPoints /
                            deploymentCapacity.totalCommandPoints) *
                          100
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Comparatif
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-800 bg-black/25 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                    Ton escouade
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-white">
                    {formatNumber(squadPower.totalPower)}
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-red-300/60">
                    Ennemi
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-red-100">
                    {formatNumber(node.recommendedPower)}
                  </p>
                </div>
              </div>

              <div
                className={`mt-3 rounded-xl border px-3 py-3 text-center text-sm font-black ${assessmentPresentation.className}`}
              >
                {selectedUnitCount > 0
                  ? assessmentPresentation.label
                  : "Sélectionne des troupes"}
              </div>

              <div className="mt-3 space-y-2 text-xs text-zinc-500">
                <p className="flex items-center justify-between gap-3">
                  <span>Unités sélectionnées</span>
                  <strong className="text-zinc-300">
                    {formatNumber(selectedUnitCount)}
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3">
                  <span>Puissance brute</span>
                  <strong className="text-zinc-300">
                    {formatNumber(squadPower.basePower)}
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3">
                  <span>Bonus commandant</span>
                  <strong className="text-amber-200">
                    +{squadPower.commanderBonusPercent.toFixed(1)} %
                  </strong>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/75">
                Plan de route
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center justify-between gap-3 text-zinc-400">
                  <span>Destination</span>
                  <strong className="text-right text-white">
                    {node.name}
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3 text-zinc-400">
                  <span>Temps de trajet</span>
                  <strong className="text-white">
                    {formatDuration(node.travelSeconds ?? 0)}
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3 text-zinc-400">
                  <span>Réapparition cible</span>
                  <strong className="text-white">
                    {node.cooldownHours ?? 0} h
                  </strong>
                </p>
              </div>
            </section>

            {activeOperation && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs font-semibold leading-relaxed text-orange-100">
                Une opération est déjà engagée vers {activeOperation.targetName}. Une seule escouade extérieure peut être active pour le moment.
              </div>
            )}

            {!loading &&
              !errorMessage &&
              deploymentCapacity.totalCommandPoints <= 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold leading-relaxed text-red-200">
                  Construis le bâtiment Sécurité pour obtenir des points de commandement et déployer des troupes.
                </div>
              )}

            <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoAssault}
                  onChange={(event) =>
                    setAutoAssault(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 accent-red-600"
                />

                <span className="min-w-0">
                  <span className="block text-sm font-black text-white">
                    Donner l'ordre d'assaut automatiquement à l'arrivée
                  </span>

                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    En PvE, le combat sera résolu immédiatement dès l'arrivée. En futur PvP, cette option lancera automatiquement la phase de préparation d'assaut sans supprimer le délai de réaction du défenseur.
                  </span>
                </span>
              </label>
            </section>

            {launchError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold leading-relaxed text-red-200">
                {launchError}
              </div>
            )}

            <button
              type="button"
              onClick={handleLaunch}
              disabled={!canLaunch}
              className="w-full rounded-xl bg-red-700 px-4 py-3.5 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {isLaunching
                ? "🚁 Déploiement de l'escouade..."
                : activeOperation
                  ? "Une opération est déjà en cours"
                  : selectedUnitCount <= 0
                    ? "Sélectionne une escouade"
                    : `🚁 Lancer l'opération — ${formatNumber(squadPower.totalPower)} puissance`}
            </button>

            <p className="px-1 text-center text-[10px] leading-relaxed text-zinc-600">
              Les hommes envoyés quittent réellement la garnison pendant l'expédition. Après le combat, seuls les survivants reviennent en ville.
            </p>
          </aside>
        </div>
      </section>
    </div>
  )
}
