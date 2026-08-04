import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  MISSION_LIST,
  getMissionDefinition,
  getMissionDurationSeconds,
} from "../data/missions"

import {
  applyCommanderMissionRewardBonus,
  applyCommanderMissionTimeBonus,
  getCommanderMissionRewardBonusPercent,
  getCommanderMissionTimeReductionPercent,
} from "../data/commanderBonuses"

import {
  claimCityMissionReward,
  getActiveMission,
  getAssignedTroopQuantity,
  getCompletedMissions,
  getMissionRemainingSeconds,
  startCityMission,
  syncCityMissions,
} from "../services/missionService"

import {
  getCityTroops,
  getHighestBuildingLevel,
} from "../services/troopService"

import type {
  Building,
} from "../types/building"

import type {
  CityMission,
  MissionDefinition,
  MissionType,
} from "../types/mission"

import type {
  CityTroop,
} from "../types/troop"

import type {
  CommanderSkills,
} from "../types/commander"

type CityData = {
  id: string
}

type Props = {
  city: CityData
  buildings: Building[]
  commanderLevel: number
  commanderSkills: CommanderSkills
  onClose: () => void
  onChanged?: () =>
    Promise<void> | void
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

  const hours =
    Math.floor(
      safeSeconds /
        3600
    )

  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) / 60
    )

  const seconds =
    safeSeconds %
    60

  const parts: string[] = []

  if (hours > 0) {
    parts.push(
      `${hours} h`
    )
  }

  if (minutes > 0) {
    parts.push(
      `${minutes} min`
    )
  }

  if (
    seconds > 0 &&
    hours === 0
  ) {
    parts.push(
      `${seconds} s`
    )
  }

  return parts.length > 0
    ? parts.join(" ")
    : "Terminé"
}

function getOwnedTroopQuantity(
  troops: CityTroop[],
  troopKey: string
) {
  return troops
    .filter(
      (troop) =>
        troop.troop_key ===
        troopKey
    )
    .reduce(
      (
        total,
        troop
      ) =>
        total +
        (
          Number(
            troop.quantity
          ) || 0
        ),
      0
    )
}

export default function MissionsModal({
  city,
  buildings,
  commanderLevel,
  commanderSkills,
  onClose,
  onChanged,
}: Props) {
  const [
    missions,
    setMissions,
  ] = useState<CityMission[]>([])

  const [
    troops,
    setTroops,
  ] = useState<CityTroop[]>([])

  const [
    quantities,
    setQuantities,
  ] = useState<
    Record<
      MissionType,
      number
    >
  >({
    market_collection: 2,
    construction_recovery: 3,
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    startingMission,
    setStartingMission,
  ] = useState<MissionType | null>(
    null
  )

  const [
    claimingMissionId,
    setClaimingMissionId,
  ] = useState<string | null>(
    null
  )

  const [
    message,
    setMessage,
  ] = useState<string | null>(
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
  ] = useState(
    () => Date.now()
  )

  const syncInProgress =
    useRef(false)

  const loadMissions =
    useCallback(async () => {
      try {
        setErrorMessage(null)

        const [
          missionResult,
          troopResult,
        ] = await Promise.all([
          syncCityMissions(
            city.id
          ),

          getCityTroops(
            city.id
          ),
        ])

        setMissions(
          missionResult
        )

        setTroops(
          troopResult
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les missions"
        )
      } finally {
        setLoading(false)
      }
    }, [city.id])

  useEffect(() => {
    loadMissions()
  }, [loadMissions])

  useEffect(() => {
    const intervalId =
      window.setInterval(
        () => {
          setCurrentTime(
            Date.now()
          )
        },
        1000
      )

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

  const activeMission =
    useMemo(
      () =>
        getActiveMission(
          missions
        ),
      [missions]
    )

  const completedMissions =
    useMemo(
      () =>
        getCompletedMissions(
          missions
        ),
      [missions]
    )

  const activeRemainingSeconds =
    useMemo(
      () =>
        activeMission
          ? getMissionRemainingSeconds(
              activeMission,
              currentTime
            )
          : 0,
      [
        activeMission,
        currentTime,
      ]
    )

  useEffect(() => {
    if (
      !activeMission ||
      activeRemainingSeconds > 0 ||
      syncInProgress.current
    ) {
      return
    }

    syncInProgress.current =
      true

    loadMissions().finally(
      () => {
        syncInProgress.current =
          false
      }
    )
  }, [
    activeMission,
    activeRemainingSeconds,
    loadMissions,
  ])

  const securityLevel =
    getHighestBuildingLevel(
      buildings,
      "wall"
    )

  const totalHenchmen =
    getOwnedTroopQuantity(
      troops,
      "henchman_1"
    )

  const assignedHenchmen =
    getAssignedTroopQuantity(
      activeMission,
      "henchman_1"
    )

  const availableHenchmen =
    Math.max(
      0,
      totalHenchmen -
        assignedHenchmen
    )

  function changeQuantity(
    missionType: MissionType,
    value: number
  ) {
    const definition =
      getMissionDefinition(
        missionType
      )

    const safeValue =
      Math.max(
        definition.minimumTroops,
        Math.min(
          availableHenchmen,
          Math.floor(
            Number(value) ||
              definition.minimumTroops
          )
        )
      )

    setQuantities(
      (previous) => ({
        ...previous,
        [missionType]:
          safeValue,
      })
    )
  }

  async function handleStartMission(
    definition: MissionDefinition
  ) {
    if (
      startingMission ||
      activeMission
    ) {
      return
    }

    const quantity =
      quantities[
        definition.key
      ]

    try {
      setMessage(null)
      setErrorMessage(null)

      setStartingMission(
        definition.key
      )

      await startCityMission(
        city.id,
        definition.key,
        "henchman_1",
        quantity
      )

      setMessage(
        `${definition.name} lancée. Les troupes sont maintenant en opération.`
      )

      await onChanged?.()
      await loadMissions()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de lancer cette mission"
      )
    } finally {
      setStartingMission(
        null
      )
    }
  }

  async function handleClaimMission(
    missionId: string
  ) {
    if (
      claimingMissionId
    ) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)

      setClaimingMissionId(
        missionId
      )

      const result =
        await claimCityMissionReward(
          missionId
        )

      const levelMessage =
        result.levels_gained > 0
          ? ` Niveau supérieur atteint : commandant niveau ${result.commander_level}.`
          : ""

      setMessage(
        `Butin ajouté à l'inventaire. +${result.xp_gained} XP de commandant.${levelMessage}`
      )

      await onChanged?.()
      await loadMissions()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le butin"
      )
    } finally {
      setClaimingMissionId(
        null
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
        aria-labelledby="missions-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-red-500/25 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
      >
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-4xl">
                📋
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
                  Opérations extérieures
                </p>

                <h2
                  id="missions-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  Missions
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Envoyez vos troupes récupérer
                  des ressources dans les
                  quartiers voisins.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <div className="space-y-5 p-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Hommes de main I"
              value={formatNumber(
                totalHenchmen
              )}
            />

            <SummaryCard
              label="Disponibles"
              value={formatNumber(
                availableHenchmen
              )}
              warning={
                availableHenchmen <=
                0
              }
            />

            <SummaryCard
              label="File d'opération"
              value={
                activeMission
                  ? "1 / 1"
                  : "0 / 1"
              }
              warning={
                Boolean(
                  activeMission
                )
              }
            />
          </section>

          {message && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-200">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {errorMessage}
            </div>
          )}

          {activeMission && (
            <ActiveMissionCard
              mission={
                activeMission
              }
              remainingSeconds={
                activeRemainingSeconds
              }
            />
          )}

          {completedMissions.length >
            0 && (
            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
              <h3 className="font-black text-amber-200">
                Butins à récupérer
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                Les troupes sont déjà revenues.
                Le butin sera envoyé dans
                l'inventaire.
              </p>

              <div className="mt-4 space-y-3">
                {completedMissions.map(
                  (mission) => (
                    <CompletedMissionCard
                      key={
                        mission.id
                      }
                      mission={
                        mission
                      }
                      claiming={
                        claimingMissionId ===
                        mission.id
                      }
                      disabled={
                        Boolean(
                          claimingMissionId
                        )
                      }
                      onClaim={() =>
                        handleClaimMission(
                          mission.id
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">
                Missions disponibles
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Les durées actuelles sont
                volontairement courtes pour
                tester le système.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement des missions...
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {MISSION_LIST.map(
                  (definition) => {
                    const quantity =
                      quantities[
                        definition.key
                      ]

                    const hasSecurityLevel =
                      securityLevel >=
                      definition.requiredSecurityLevel

                    const hasEnoughTroops =
                      availableHenchmen >=
                      definition.minimumTroops

                    const canStart =
                      !activeMission &&
                      hasSecurityLevel &&
                      hasEnoughTroops &&
                      !startingMission

                    return (
                      <MissionCard
                        key={
                          definition.key
                        }
                        definition={
                          definition
                        }
                        quantity={
                          quantity
                        }
                        availableTroops={
                          availableHenchmen
                        }
                        currentSecurityLevel={
                          securityLevel
                        }
                        commanderLevel={
                          commanderLevel
                        }
                        commanderSkills={
                          commanderSkills
                        }
                        activeMission={
                          Boolean(
                            activeMission
                          )
                        }
                        starting={
                          startingMission ===
                          definition.key
                        }
                        canStart={
                          canStart
                        }
                        onQuantityChange={(
                          nextQuantity
                        ) =>
                          changeQuantity(
                            definition.key,
                            nextQuantity
                          )
                        }
                        onStart={() =>
                          handleStartMission(
                            definition
                          )
                        }
                      />
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
  label: string
  value: string
  warning?: boolean
}

function SummaryCard({
  label,
  value,
  warning = false,
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        warning
          ? "border-orange-500/30 bg-orange-500/10"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          warning
            ? "text-orange-200"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

type ActiveMissionCardProps = {
  mission: CityMission
  remainingSeconds: number
}

function ActiveMissionCard({
  mission,
  remainingSeconds,
}: ActiveMissionCardProps) {
  const definition =
    getMissionDefinition(
      mission.mission_key
    )

  const troopQuantity =
    getAssignedTroopQuantity(
      mission,
      "henchman_1"
    )

  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="text-3xl">
            {definition.icon}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-300">
              Mission en cours
            </p>

            <h3 className="mt-1 text-lg font-black text-white">
              {definition.name}
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              {troopQuantity} Homme(s) de
              main I en opération
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-black/25 px-5 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Retour dans
          </p>

          <p className="mt-1 text-xl font-black text-red-100">
            ⏱{" "}
            {formatDuration(
              remainingSeconds
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

type CompletedMissionCardProps = {
  mission: CityMission
  claiming: boolean
  disabled: boolean
  onClaim: () => void
}

function CompletedMissionCard({
  mission,
  claiming,
  disabled,
  onClaim,
}: CompletedMissionCardProps) {
  const definition =
    getMissionDefinition(
      mission.mission_key
    )

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-white">
          {definition.icon}{" "}
          {definition.name}
        </p>

        <p className="mt-1 text-xs text-zinc-400">
          Mission terminée — troupes
          revenues
        </p>

        <p className="mt-1 text-xs font-bold text-blue-300">
          +{mission.reward_xp} XP de commandant
        </p>
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={disabled}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {claiming
          ? "Récupération..."
          : "Récupérer le butin"}
      </button>
    </div>
  )
}

type MissionCardProps = {
  definition: MissionDefinition
  quantity: number
  availableTroops: number
  currentSecurityLevel: number
  commanderLevel: number
  commanderSkills: CommanderSkills
  activeMission: boolean
  starting: boolean
  canStart: boolean
  onQuantityChange: (
    quantity: number
  ) => void
  onStart: () => void
}

function MissionCard({
  definition,
  quantity,
  availableTroops,
  currentSecurityLevel,
  commanderLevel,
  commanderSkills,
  activeMission,
  starting,
  canStart,
  onQuantityChange,
  onStart,
}: MissionCardProps) {
  const baseDuration =
    getMissionDurationSeconds(
      definition.key
    )

  const duration =
    applyCommanderMissionTimeBonus(
      baseDuration,
      commanderSkills
    )

  const missionTimeReduction =
    getCommanderMissionTimeReductionPercent(
      commanderSkills
    )

  const hasSecurityLevel =
    currentSecurityLevel >=
    definition.requiredSecurityLevel

  const hasEnoughTroops =
    availableTroops >=
    definition.minimumTroops

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-3xl">
          {definition.icon}
        </div>

        <div>
          <h4 className="font-black text-white">
            {definition.name}
          </h4>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-black/20 p-3">
        <RequirementLine
          valid={
            hasSecurityLevel
          }
          text={`Sécurité niveau ${definition.requiredSecurityLevel}`}
          current={`Actuel : ${currentSecurityLevel}`}
        />

        <RequirementLine
          valid={
            hasEnoughTroops
          }
          text={`${definition.minimumTroops} Hommes de main I minimum`}
          current={`Disponibles : ${availableTroops}`}
        />
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-300/70">
          Récompense envoyée dans
          l'inventaire
        </p>

        <div className="mt-2 text-sm font-semibold text-amber-100">
          <RewardRange
            definition={
              definition
            }
            commanderLevel={
              commanderLevel
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Troupes envoyées
          </label>

          <input
            type="number"
            min={
              definition.minimumTroops
            }
            max={
              Math.max(
                definition.minimumTroops,
                availableTroops
              )
            }
            value={quantity}
            disabled={
              activeMission ||
              !hasEnoughTroops
            }
            onChange={(event) =>
              onQuantityChange(
                Number(
                  event.target.value
                )
              )
            }
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-black text-white outline-none transition focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Durée estimée
          </p>

          <p className="mt-1 font-black text-white">
            ⏱{" "}
            {formatDuration(
              duration
            )}
          </p>

          {missionTimeReduction > 0 && (
            <p className="mt-1 text-[10px] font-semibold text-blue-300">
              Bonus Logistique : -{missionTimeReduction} %
            </p>
          )}

        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="mt-4 w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {starting
          ? "Départ..."
          : activeMission
            ? "Une mission est déjà en cours"
            : !hasSecurityLevel
              ? "Niveau de Sécurité insuffisant"
              : !hasEnoughTroops
                ? "Pas assez de troupes"
                : "Lancer la mission"}
      </button>
    </article>
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

      <span className="text-zinc-500">
        {current}
      </span>
    </div>
  )
}

function RewardRange({
  definition,
  commanderLevel,
}: {
  definition: MissionDefinition
  commanderLevel: number
}) {
  const reward =
    applyCommanderMissionRewardBonus(
      definition.rewardRange,
      commanderLevel
    )

  const rewardBonusPercent =
    getCommanderMissionRewardBonusPercent(
      commanderLevel
    )

  const parts: string[] = []

  if (reward.moneyMax > 0) {
    parts.push(
      `💵 ${formatNumber(
        reward.moneyMin
      )} à ${formatNumber(
        reward.moneyMax
      )} €`
    )
  }

  if (
    reward.materialsMax >
    0
  ) {
    parts.push(
      `🧱 ${formatNumber(
        reward.materialsMin
      )} à ${formatNumber(
        reward.materialsMax
      )} matériaux`
    )
  }

  if (
    reward.influenceMax >
    0
  ) {
    parts.push(
      `⭐ ${formatNumber(
        reward.influenceMin
      )} à ${formatNumber(
        reward.influenceMax
      )} Influence`
    )
  }

  if (
    reward.equipmentMax >
    0
  ) {
    parts.push(
      `🧰 ${formatNumber(
        reward.equipmentMin
      )} à ${formatNumber(
        reward.equipmentMax
      )} équipements`
    )
  }

  if (
    definition.commanderXp >
    0
  ) {
    parts.push(
      `🧠 +${formatNumber(
        definition.commanderXp
      )} XP de commandant`
    )
  }

  return (
    <div className="space-y-1">
      {rewardBonusPercent > 0 && (
        <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">
          Bonus Commandant : +{rewardBonusPercent.toFixed(
            2
          )} %
        </p>
      )}

      {parts.map(
        (part) => (
          <p key={part}>
            {part}
          </p>
        )
      )}
    </div>
  )
}
