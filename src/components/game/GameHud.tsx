type Props = {
  playerName: string
  commanderLevel: number
  commanderXp?: number
  commanderSkillPoints?: number

  money: number
  materials: number
  influence: number
  equipment: number

  moneyPerHour?: number
  materialsPerHour?: number
  influencePerHour?: number
  equipmentPerHour?: number

  onCommanderClick?: () => void
  onInventoryClick?: () => void
  onTroopsClick?: () => void
  onMissionsClick?: () => void
}

/*
 * Affichage compact destiné au HUD :
 *
 * 999       -> 999
 * 1 250     -> 1,3K
 * 25 000    -> 25K
 * 123 700   -> 124K
 * 1 250 000 -> 1,3M
 * 2 milliards -> 2Md
 */
function formatCompactNumber(
  value: number
) {
  const safeValue =
    Number(value) || 0

  const absoluteValue =
    Math.abs(safeValue)

  const formatScaled = (
    divisor: number,
    suffix: string
  ) => {
    const scaledValue =
      safeValue / divisor

    const absoluteScaledValue =
      Math.abs(scaledValue)

    const maximumFractionDigits =
      absoluteScaledValue >= 100
        ? 0
        : absoluteScaledValue >= 10
          ? 1
          : 2

    const formatted =
      new Intl.NumberFormat(
        "fr-FR",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits,
        }
      ).format(
        scaledValue
      )

    return `${formatted}${suffix}`
  }

  if (absoluteValue >= 1_000_000_000) {
    return formatScaled(
      1_000_000_000,
      "Md"
    )
  }

  if (absoluteValue >= 1_000_000) {
    return formatScaled(
      1_000_000,
      "M"
    )
  }

  if (absoluteValue >= 1_000) {
    return formatScaled(
      1_000,
      "K"
    )
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits:
        absoluteValue < 10
          ? 2
          : absoluteValue < 100
            ? 1
            : 0,
    }
  ).format(
    safeValue
  )
}

function formatExactNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value) || 0
  )
}

export default function GameHud({
  playerName,
  commanderLevel,
  commanderXp = 0,
  commanderSkillPoints = 0,

  money,
  materials,
  influence,
  equipment,

  moneyPerHour = 0,
  materialsPerHour = 0,
  influencePerHour = 0,
  equipmentPerHour = 0,

  onCommanderClick,
  onInventoryClick,
  onTroopsClick,
  onMissionsClick,
}: Props) {
  const safeCommanderLevel = Math.max(
    1,
    Number(commanderLevel) || 1
  )

  const safeCommanderXp = Math.max(
    0,
    Number(commanderXp) || 0
  )

  const safeSkillPoints = Math.max(
    0,
    Number(commanderSkillPoints) || 0
  )

  const xpToNextLevel =
    safeCommanderLevel * 100

  const xpProgress = Math.min(
    100,
    Math.max(
      0,
      (
        safeCommanderXp /
        xpToNextLevel
      ) * 100
    )
  )

  const playerInitial =
    playerName
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "C"

  return (
    <header className="sticky top-0 z-[1000]">
      <div className="overflow-hidden rounded-xl border border-red-900/40 bg-gradient-to-r from-zinc-950 via-red-950/30 to-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 p-2.5 lg:flex-row lg:items-stretch">
          {/* COMMANDANT */}
          <button
            type="button"
            onClick={onCommanderClick}
            className="group flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-amber-500/25 hover:bg-amber-500/[0.05] lg:w-[215px] lg:shrink-0"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/60 bg-gradient-to-br from-red-800 to-zinc-950 text-sm font-black text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.22)] transition group-hover:scale-105">
              {playerInitial}

              {safeSkillPoints > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-blue-300/40 bg-blue-600 px-1 text-[8px] font-black text-white">
                  {safeSkillPoints}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-red-400">
                Crime Empire
              </p>

              <p className="truncate text-[11px] font-black text-white">
                {playerName}
              </p>

              <div className="mt-0.5 flex items-center justify-between gap-2 text-[8px] font-bold text-amber-200">
                <span className="truncate">
                  👑 Niv.{" "}
                  {safeCommanderLevel}
                </span>

                <span
                  className="shrink-0 text-[7px] text-zinc-500"
                  title={`${formatExactNumber(
                    safeCommanderXp
                  )} / ${formatExactNumber(
                    xpToNextLevel
                  )} XP`}
                >
                  {formatCompactNumber(
                    safeCommanderXp
                  )}
                  /
                  {formatCompactNumber(
                    xpToNextLevel
                  )} XP
                </span>
              </div>

              <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-700 to-amber-400 transition-all"
                  style={{
                    width: `${xpProgress}%`,
                  }}
                />
              </div>
            </div>
          </button>

          {/* RESSOURCES */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 xl:grid-cols-4">
            <ResourcePill
              icon="💵"
              label="Argent"
              value={money}
              rate={moneyPerHour}
              accent="green"
            />

            <ResourcePill
              icon="🧱"
              label="Matériaux"
              value={materials}
              rate={materialsPerHour}
              accent="orange"
            />

            <ResourcePill
              icon="⭐"
              label="Influence"
              value={influence}
              rate={influencePerHour}
              accent="purple"
            />

            <ResourcePill
              icon="🧰"
              label="Équipements"
              value={equipment}
              rate={equipmentPerHour}
              accent="blue"
            />
          </div>

          {/* MENUS */}
          <nav className="grid grid-cols-3 gap-1.5 lg:w-[228px] lg:shrink-0">
            <HudButton
              icon="📦"
              label="Coffre"
              onClick={onInventoryClick}
            />

            <HudButton
              icon="🕴️"
              label="Troupes"
              onClick={onTroopsClick}
            />

            <HudButton
              icon="📋"
              label="Missions"
              onClick={onMissionsClick}
            />
          </nav>
        </div>

        {/* BARRE INFÉRIEURE */}
        <div className="hidden items-center justify-between border-t border-white/5 bg-black/20 px-3 py-1 text-[8px] text-zinc-600 sm:flex">
          <p>
            Survole une ressource pour voir sa valeur exacte.
          </p>

          <div className="flex items-center gap-1">
            <span>◆</span>
            <span>Monnaie premium à définir</span>
          </div>
        </div>
      </div>
    </header>
  )
}

type ResourcePillProps = {
  icon: string
  label: string
  value: number
  rate?: number

  accent:
    | "green"
    | "orange"
    | "purple"
    | "blue"
}

function ResourcePill({
  icon,
  label,
  value,
  rate = 0,
  accent,
}: ResourcePillProps) {
  const accentClasses = {
    green:
      "border-green-500/20 bg-green-500/[0.055]",

    orange:
      "border-orange-500/20 bg-orange-500/[0.055]",

    purple:
      "border-purple-500/20 bg-purple-500/[0.055]",

    blue:
      "border-blue-500/20 bg-blue-500/[0.055]",
  }

  const rateClasses = {
    green:
      "border-green-400/20 bg-green-500/10 text-green-300",

    orange:
      "border-orange-400/20 bg-orange-500/10 text-orange-300",

    purple:
      "border-purple-400/20 bg-purple-500/10 text-purple-300",

    blue:
      "border-blue-400/20 bg-blue-500/10 text-blue-300",
  }

  const safeRate =
    Math.max(
      0,
      Number(rate) || 0
    )

  return (
    <div
      className={`min-w-0 rounded-lg border px-2.5 py-2 ${accentClasses[accent]}`}
      title={`${label} : ${formatExactNumber(
        value
      )} — Production : +${formatExactNumber(
        safeRate
      )}/h`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/5 bg-black/30 text-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[8px] font-black uppercase leading-none tracking-[0.08em] text-zinc-500">
            {label}
          </p>

          <p className="mt-1 truncate text-[15px] font-black leading-none tabular-nums text-white sm:text-base">
            {formatCompactNumber(
              value
            )}
          </p>
        </div>
      </div>

      {safeRate > 0 && (
        <div
          className={`mt-2 flex items-center justify-center rounded-md border px-2 py-1 text-[9px] font-black tabular-nums ${rateClasses[accent]}`}
        >
          +{formatCompactNumber(
            safeRate
          )}/h
        </div>
      )}
    </div>
  )
}

type HudButtonProps = {
  icon: string
  label: string
  onClick?: () => void
}

function HudButton({
  icon,
  label,
  onClick,
}: HudButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-2 py-2 text-zinc-400 transition hover:border-red-500/50 hover:bg-red-950/40 hover:text-white"
    >
      <span className="text-sm transition group-hover:scale-110">
        {icon}
      </span>

      <span className="truncate text-[7px] font-black uppercase tracking-wide">
        {label}
      </span>
    </button>
  )
}
