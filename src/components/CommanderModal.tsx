import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  COMMANDER_SKILL_LIST,
  getCommanderSkillBonus,
  getCommanderSkillLevel,
} from "../data/commanderSkills"

import {
  getCommanderPower,
  getCommanderSkills,
  upgradeCommanderSkill,
} from "../services/commanderService"

import type {
  CommanderPlayer,
  CommanderPowerBreakdown,
  CommanderSkillKey,
  CommanderSkills,
} from "../types/commander"

type Props = {
  player: CommanderPlayer
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

export default function CommanderModal({
  player,
  onClose,
  onChanged,
}: Props) {
  const [
    skills,
    setSkills,
  ] = useState<CommanderSkills | null>(
    null
  )

  const [
    localPlayer,
    setLocalPlayer,
  ] = useState<CommanderPlayer>(
    player
  )

  const [
    power,
    setPower,
  ] = useState<
    CommanderPowerBreakdown | null
  >(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    upgradingSkill,
    setUpgradingSkill,
  ] = useState<CommanderSkillKey | null>(
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

  const loadProfile =
    useCallback(async () => {
      try {
        setErrorMessage(null)

        const [
          skillsResult,
          powerResult,
        ] =
          await Promise.all([
            getCommanderSkills(
              player.id
            ),

            getCommanderPower(
              player.id
            ),
          ])

        setSkills(
          skillsResult
        )

        setPower(
          powerResult
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le commandant"
        )
      } finally {
        setLoading(false)
      }
    }, [player.id])

  useEffect(() => {
    setLocalPlayer(player)
  }, [player])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  /*
   * La puissance dépend des troupes, bâtiments,
   * recherches et compétences. Elle est donc
   * recalculée régulièrement pendant que la
   * fenêtre reste ouverte.
   */
  useEffect(() => {
    const intervalId =
      window.setInterval(
        async () => {
          try {
            const result =
              await getCommanderPower(
                player.id
              )

            setPower(result)
          } catch (error) {
            console.error(
              "Impossible d'actualiser la puissance :",
              error
            )
          }
        },
        10000
      )

    return () => {
      window.clearInterval(
        intervalId
      )
    }
  }, [player.id])

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

  const commanderLevel =
    Math.max(
      1,
      Number(
        localPlayer.commander_level
      ) || 1
    )

  const commanderXp =
    Math.max(
      0,
      Number(
        localPlayer.commander_xp
      ) || 0
    )

  const xpToNextLevel =
    commanderLevel * 100

  const xpProgress =
    Math.min(
      100,
      Math.max(
        0,
        (
          commanderXp /
          xpToNextLevel
        ) * 100
      )
    )

  const skillPoints =
    Math.max(
      0,
      Number(
        localPlayer.commander_skill_points
      ) || 0
    )

  const commanderName =
    localPlayer.username ||
    localPlayer.email ||
    "Commandant"

  const initial =
    commanderName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "C"

  const passiveTroopBonus =
    Math.max(
      0,
      commanderLevel - 1
    ) * 0.5

  const passiveMissionBonus =
    Math.max(
      0,
      commanderLevel - 1
    ) * 0.25

  const spentPoints =
    useMemo(() => {
      if (!skills) {
        return 0
      }

      return (
        Number(
          skills.military_power
        ) +
        Number(
          skills.operation_logistics
        ) +
        Number(
          skills.underground_management
        )
      )
    }, [skills])

  async function handleUpgrade(
    skillKey: CommanderSkillKey
  ) {
    if (
      !skills ||
      upgradingSkill ||
      skillPoints < 1
    ) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)
      setUpgradingSkill(
        skillKey
      )

      const result =
        await upgradeCommanderSkill(
          player.id,
          skillKey
        )

      setSkills(
        result.skills
      )

      setLocalPlayer(
        result.player
      )

      const refreshedPower =
        await getCommanderPower(
          player.id
        )

      setPower(
        refreshedPower
      )

      setMessage(
        "Compétence améliorée avec succès."
      )

      await onChanged?.()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'améliorer cette compétence"
      )
    } finally {
      setUpgradingSkill(
        null
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
        aria-labelledby="commander-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-amber-500/30 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
      >
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/60 bg-gradient-to-br from-red-800 to-zinc-950 text-3xl font-black text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                {initial}
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                  Chef de l'empire
                </p>

                <h2
                  id="commander-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  {commanderName}
                </h2>

                <p className="mt-1 text-sm font-semibold text-zinc-400">
                  Commandant niveau{" "}
                  {commanderLevel}
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
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Progression
                  </p>

                  <p className="mt-1 text-xl font-black text-white">
                    Niveau{" "}
                    {commanderLevel}
                  </p>
                </div>

                <p className="font-black text-amber-200">
                  {formatNumber(
                    commanderXp
                  )}{" "}
                  /{" "}
                  {formatNumber(
                    xpToNextLevel
                  )}{" "}
                  XP
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full border border-zinc-800 bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-700 via-amber-600 to-amber-300 transition-all"
                  style={{
                    width: `${xpProgress}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Les missions et les améliorations
                de bâtiments terminées ajoutent de
                l'XP au commandant.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-blue-300/70">
                Points de compétence
              </p>

              <p className="mt-2 text-4xl font-black text-blue-200">
                {skillPoints}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                1 point gagné à chaque montée
                de niveau.
              </p>

              <p className="mt-3 text-xs font-semibold text-zinc-400">
                Points déjà investis :{" "}
                {spentPoints}
              </p>
            </div>
          </section>

          {power && (
            <section className="rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300/70">
                    Force globale du réseau
                  </p>

                  <h3 className="mt-1 text-xl font-black text-white">
                    Puissance de l'Empire
                  </h3>

                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
                    Cette valeur sert d'indicateur,
                    de classement et de préparation
                    au futur matchmaking. Elle ne
                    décidera pas seule du résultat
                    d'un combat.
                  </p>
                </div>

                <p className="text-4xl font-black tabular-nums text-red-200">
                  {formatNumber(
                    power.total_power
                  )}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PowerBreakdownCard
                  icon="⚔️"
                  label="Force militaire"
                  value={
                    power.troops.power
                  }
                  detail={`${formatNumber(
                    power.troops.total_units
                  )} troupe(s) • +${power.troops.bonus_percent.toFixed(
                    2
                  )} %`}
                />

                <PowerBreakdownCard
                  icon="🏙️"
                  label="Infrastructure"
                  value={
                    power.buildings.power
                  }
                  detail="Niveaux et importance des bâtiments"
                />

                <PowerBreakdownCard
                  icon="🧪"
                  label="Recherches"
                  value={
                    power.researches.power
                  }
                  detail={`${formatNumber(
                    power.researches.completed_count
                  )} recherche(s) terminée(s)`}
                />

                <PowerBreakdownCard
                  icon="👑"
                  label="Commandement"
                  value={
                    power.commander.power
                  }
                  detail={`Niveau ${power.commander.level} • ${power.commander.spent_skill_points} point(s) investi(s)`}
                />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Calcul militaire
                  </p>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="flex justify-between gap-3 text-zinc-400">
                      <span>Puissance brute</span>

                      <strong className="text-white">
                        {formatNumber(
                          power.troops.base_power
                        )}
                      </strong>
                    </p>

                    <p className="flex justify-between gap-3 text-zinc-400">
                      <span>Bonus du niveau</span>

                      <strong className="text-amber-200">
                        +
                        {power.troops.passive_commander_bonus_percent.toFixed(
                          2
                        )} %
                      </strong>
                    </p>

                    <p className="flex justify-between gap-3 text-zinc-400">
                      <span>Autorité militaire</span>

                      <strong className="text-amber-200">
                        +
                        {power.troops.military_skill_bonus_percent.toFixed(
                          2
                        )} %
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Formule actuelle
                  </p>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    Troupes bonifiées + bâtiments
                    + recherches terminées +
                    niveau et compétences du
                    commandant.
                  </p>

                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                    Une perte de troupes fera
                    baisser la puissance, mais ne
                    retirera jamais de niveau ou
                    d'XP au commandant.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-black text-white">
              Bonus liés au niveau
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PassiveBonusCard
                icon="🛡️"
                label="Autorité du commandant"
                value={`+${passiveTroopBonus.toFixed(
                  2
                )} %`}
                description="Ce bonus sera utilisé dès l’arrivée des combats."
              />

              <PassiveBonusCard
                icon="🎯"
                label="Expérience du terrain"
                value={`+${passiveMissionBonus.toFixed(
                  2
                )} %`}
                description="Bonus actif sur les récompenses des nouvelles missions."
              />
            </div>
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

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">
                Compétences du commandant
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Chaque amélioration coûte un
                point. Une compétence ne peut
                pas dépasser le niveau 5.
              </p>
            </div>

            {loading || !skills ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement des compétences...
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {COMMANDER_SKILL_LIST.map(
                  (definition) => {
                    const level =
                      getCommanderSkillLevel(
                        skills,
                        definition.key
                      )

                    const bonus =
                      getCommanderSkillBonus(
                        skills,
                        definition.key
                      )

                    const maximumReached =
                      level >=
                      definition.maximumLevel

                    const canUpgrade =
                      skillPoints > 0 &&
                      !maximumReached &&
                      !upgradingSkill

                    return (
                      <article
                        key={
                          definition.key
                        }
                        className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/65 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-2xl">
                            {
                              definition.icon
                            }
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                              {
                                definition.branch
                              }
                            </p>

                            <h4 className="mt-1 font-black text-white">
                              {
                                definition.name
                              }
                            </h4>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                          {
                            definition.description
                          }
                        </p>

                        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-zinc-400">
                              Niveau
                            </span>

                            <span className="font-black text-white">
                              {level} /{" "}
                              {
                                definition.maximumLevel
                              }
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-zinc-400">
                              {
                                definition.effectLabel
                              }
                            </span>

                            <span className="font-black text-amber-200">
                              +{bonus}
                              {
                                definition.bonusUnit
                              }
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                          {
                            definition.implementationNote
                          }
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpgrade(
                              definition.key
                            )
                          }
                          disabled={
                            !canUpgrade
                          }
                          className="mt-auto pt-4"
                        >
                          <span className="block w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                            {upgradingSkill ===
                            definition.key
                              ? "Amélioration..."
                              : maximumReached
                                ? "Niveau maximum"
                                : skillPoints < 1
                                  ? "Aucun point disponible"
                                  : "Améliorer — 1 point"}
                          </span>
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

type PowerBreakdownCardProps = {
  icon: string
  label: string
  value: number
  detail: string
}

function PowerBreakdownCard({
  icon,
  label,
  value,
  detail,
}: PowerBreakdownCardProps) {
  return (
    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </p>

      <p className="mt-2 text-2xl font-black tabular-nums text-white">
        {formatNumber(value)}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        {detail}
      </p>
    </div>
  )
}

type PassiveBonusCardProps = {
  icon: string
  label: string
  value: string
  description: string
}

function PassiveBonusCard({
  icon,
  label,
  value,
  description,
}: PassiveBonusCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-white">
          {icon} {label}
        </p>

        <p className="font-black text-amber-200">
          {value}
        </p>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {description}
      </p>
    </div>
  )
}
