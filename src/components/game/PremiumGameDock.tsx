import "./PremiumHud.css"

type Props = {
  onWorld: () => void
  onCity: () => void
  onInventory: () => void
  onTroops: () => void
  onMissions: () => void
  onCommander: () => void
  onResearch: () => void
  onEditor?: () => void
  isAdmin: boolean
}

export default function PremiumGameDock({
  onWorld, onCity, onInventory, onTroops, onMissions, onCommander, onResearch,
  onEditor, isAdmin,
}: Props) {
  const tabs = [
    { icon: "🌐", name: "Monde", action: onWorld },
    { icon: "🏙", name: "Ville", action: onCity, active: true },
    { icon: "♜", name: "Troupes", action: onTroops },
    { icon: "▣", name: "Inventaire", action: onInventory },
    { icon: "◈", name: "Commandant", action: onCommander },
    { icon: "⚗", name: "Recherches", action: onResearch },
    { icon: "▤", name: "Missions", action: onMissions },
    ...(isAdmin && onEditor ? [{ icon: "⚒", name: "Éditeur", action: onEditor, admin: true }] : []),
  ]

  return (
    <nav className="ce-premium-dock" aria-label="Navigation de Crime Empire">
      {tabs.map(tab => (
        <button
          key={tab.name}
          type="button"
          onClick={tab.action}
          title={tab.name}
          className={`ce-premium-dock-item ${"active" in tab && tab.active ? "is-active" : ""} ${"admin" in tab && tab.admin ? "is-admin" : ""}`}
        >
          <span className="ce-premium-dock-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.name}</span>
        </button>
      ))}
    </nav>
  )
}
