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

function formatCompactNumber(
  value: number
) {
  const safeValue =
    Number(value) || 0

  const absoluteValue =
    Math.abs(safeValue)

  function formatScaled(
    divisor: number,
    suffix: string
  ) {
    const scaled =
      safeValue / divisor

    const absoluteScaled =
      Math.abs(scaled)

    const maximumFractionDigits =
      absoluteScaled >= 100
        ? 0
        : absoluteScaled >= 10
          ? 1
          : 2

    return `${new Intl.NumberFormat(
      "fr-FR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits,
      }
    ).format(scaled)}${suffix}`
  }

  if (
    absoluteValue >=
    1_000_000_000
  ) {
    return formatScaled(
      1_000_000_000,
      "Md"
    )
  }

  if (
    absoluteValue >=
    1_000_000
  ) {
    return formatScaled(
      1_000_000,
      "M"
    )
  }

  if (
    absoluteValue >=
    1_000
  ) {
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
  const safeCommanderLevel =
    Math.max(
      1,
      Number(commanderLevel) || 1
    )

  const safeCommanderXp =
    Math.max(
      0,
      Number(commanderXp) || 0
    )

  const safeSkillPoints =
    Math.max(
      0,
      Number(
        commanderSkillPoints
      ) || 0
    )

  const xpToNextLevel =
    safeCommanderLevel * 100

  const xpProgress =
    Math.min(
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
    <header className="h-12 w-full">
      <div className="flex h-full min-w-0 items-center gap-1 overflow-hidden rounded-xl border border-red-900/45 bg-zinc-950/88 px-1.5 shadow-[0_6px_22px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:gap-1.5 sm:px-2">
        {/* COMMANDANT COMPACT */}
        <button
          type="button"
          onClick={
            onCommanderClick
          }
          className="group flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/[0.06] transition hover:border-amber-400/50 hover:bg-amber-500/10 sm:w-[150px] sm:justify-start sm:gap-2 sm:px-1.5"
          title={`${playerName} — Commandant niveau ${safeCommanderLevel}`}
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/60 bg-gradient-to-br from-red-800 to-zinc-950 text-[11px] font-black text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.18)]">
            {playerInitial}

            {safeSkillPoints >
              0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-blue-300/30 bg-blue-600 px-0.5 text-[7px] font-black text-white">
                {safeSkillPoints}
              </span>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 text-left sm:block">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[9px] font-black leading-none text-white">
                {playerName}
              </p>

              <span className="shrink-0 text-[8px] font-black text-amber-200">
                Niv.{" "}
                {safeCommanderLevel}
              </span>
            </div>

            <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-700 to-amber-400"
                style={{
                  width:
                    `${xpProgress}%`,
                }}
              />
            </div>

            <p
              className="mt-0.5 truncate text-[7px] leading-none text-zinc-500"
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
            </p>
          </div>

          <span className="absolute mt-7 text-[7px] font-black text-amber-200 sm:hidden">
            {safeCommanderLevel}
          </span>
        </button>

        {/* RESSOURCES : UNE SEULE LIGNE */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain sm:gap-1.5">
          <ResourceChip
            icon="💵"
            label="Argent"
            value={money}
            rate={moneyPerHour}
            accent="green"
          />

          <ResourceChip
            icon="🧱"
            label="Matériaux"
            value={materials}
            rate={materialsPerHour}
            accent="orange"
          />

          <ResourceChip
            icon="⭐"
            label="Influence"
            value={influence}
            rate={influencePerHour}
            accent="purple"
          />

          <ResourceChip
            icon="🧰"
            label="Équipements"
            value={equipment}
            rate={equipmentPerHour}
            accent="blue"
          />
        </div>

        {/* ACTIONS PC : ICÔNES SEULEMENT */}
        <nav className="hidden shrink-0 items-center gap-1 lg:flex">
          <HudIconButton
            icon="📦"
            label="Coffre"
            onClick={
              onInventoryClick
            }
          />

          <HudIconButton
            icon="🕴️"
            label="Troupes"
            onClick={
              onTroopsClick
            }
          />

          <HudIconButton
            icon="📋"
            label="Missions"
            onClick={
              onMissionsClick
            }
          />
        </nav>
      </div>
    </header>
  )
}

type ResourceChipProps = {
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

function ResourceChip({
  icon,
  label,
  value,
  rate = 0,
  accent,
}: ResourceChipProps) {
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
      "text-green-300",

    orange:
      "text-orange-300",

    purple:
      "text-purple-300",

    blue:
      "text-blue-300",
  }

  const safeRate =
    Math.max(
      0,
      Number(rate) || 0
    )

  return (
    <div
      className={`flex h-10 min-w-[68px] flex-1 items-center gap-1.5 rounded-lg border px-1.5 sm:min-w-[92px] sm:px-2 ${accentClasses[accent]}`}
      title={`${label} : ${formatExactNumber(
        value
      )} — Production : +${formatExactNumber(
        safeRate
      )}/h`}
    >
      <span className="shrink-0 text-[13px]">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black leading-none tabular-nums text-white sm:text-[13px]">
          {formatCompactNumber(
            value
          )}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-1 leading-none">
          <span className="hidden truncate text-[7px] font-black uppercase tracking-wide text-zinc-600 md:inline">
            {label}
          </span>

          {safeRate > 0 && (
            <span
              className={`truncate text-[7px] font-black tabular-nums ${rateClasses[accent]}`}
            >
              +{formatCompactNumber(
                safeRate
              )}/h
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

type HudIconButtonProps = {
  icon: string
  label: string
  onClick?: () => void
}

function HudIconButton({
  icon,
  label,
  onClick,
}: HudIconButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      title={
        label
      }
      aria-label={
        label
      }
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-900/75 text-sm text-zinc-300 transition hover:border-red-500/50 hover:bg-red-950/50 hover:text-white"
    >
      {icon}
    </button>
  )
}
