import "./PremiumHud.css"

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
  isAdmin?: boolean
  onEditorClick?: () => void
  onCommanderClick?: () => void
  onInventoryClick?: () => void
  onTroopsClick?: () => void
  onMissionsClick?: () => void
  onLogoutClick?: () => void
}

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })
const exact = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })

function amount(n: number) {
  return compact.format(Number(n) || 0)
}

function Resource({ symbol, label, value, rate, color }: {
  symbol: string
  label: string
  value: number
  rate: number
  color: string
}) {
  return (
    <div className="ce-hud-resource" title={`${label} : ${exact.format(Number(value) || 0)} · Production : +${exact.format(Math.max(0, Number(rate) || 0))}/h`}>
      <span className="ce-hud-resource-icon" style={{ color }} aria-hidden="true">{symbol}</span>
      <span className="ce-hud-resource-content">
        <strong>{amount(value)}</strong>
        <small>{label}</small>
      </span>
      {rate > 0 && <span className="ce-hud-resource-rate">+{amount(rate)}/h</span>}
    </div>
  )
}

function HudAction({ label, icon, onClick, accent = false }: {
  label: string
  icon: string
  onClick?: () => void
  accent?: boolean
}) {
  return (
    <button type="button" className={`ce-hud-action ${accent ? "ce-hud-action-accent" : ""}`} aria-label={label} title={label} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

export default function GameHud({
  playerName, commanderLevel, commanderXp = 0, commanderSkillPoints = 0,
  money, materials, influence, equipment,
  moneyPerHour = 0, materialsPerHour = 0, influencePerHour = 0, equipmentPerHour = 0,
  isAdmin = false, onEditorClick, onCommanderClick, onInventoryClick,
  onTroopsClick, onMissionsClick, onLogoutClick,
}: Props) {
  const level = Math.max(1, Number(commanderLevel) || 1)
  const xp = Math.max(0, Number(commanderXp) || 0)
  const maxXp = Math.max(1, level * 100)
  const progress = Math.min(100, (xp / maxXp) * 100)
  const initial = playerName.trim().slice(0, 1).toUpperCase() || "C"

  return (
    <header className="ce-premium-hud" aria-label="Barre d'informations de Crime Empire">
      <button className="ce-hud-profile" type="button" onClick={onCommanderClick} title="Voir le commandant">
        <span className="ce-hud-avatar">{initial}</span>
        <span className="ce-hud-identity">
          <strong>CRIME EMPIRE</strong>
          <span className="ce-hud-identity-sub">{playerName} · NIV. {level}{commanderSkillPoints > 0 ? ` · ${commanderSkillPoints} pts` : ""}</span>
          <span className="ce-hud-progress"><span style={{ width: `${progress}%` }} /></span>
        </span>
      </button>

      <div className="ce-hud-resources" role="group" aria-label="Ressources de la ville">
        <Resource symbol="▣" label="Argent" value={money} rate={moneyPerHour} color="#a9d9a3" />
        <Resource symbol="▤" label="Matériaux" value={materials} rate={materialsPerHour} color="#e4ad69" />
        <Resource symbol="✦" label="Influence" value={influence} rate={influencePerHour} color="#d0b0f2" />
        <Resource symbol="⬡" label="Équipements" value={equipment} rate={equipmentPerHour} color="#a1c7df" />
      </div>

      <nav className="ce-hud-actions" aria-label="Raccourcis du jeu">
        <HudAction icon="▣" label="Inventaire" onClick={onInventoryClick} />
        <HudAction icon="♜" label="Troupes" onClick={onTroopsClick} />
        <HudAction icon="☷" label="Missions" onClick={onMissionsClick} />
        {isAdmin && <HudAction icon="⚒" label="Éditeur administrateur" accent onClick={onEditorClick} />}
        <HudAction icon="⏻" label="Déconnexion" onClick={onLogoutClick} />
      </nav>
    </header>
  )
}
