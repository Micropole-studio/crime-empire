import type {
  GameNotification,
} from "../../types/gameNotification"

type Props = {
  notifications: GameNotification[]
  open: boolean
  onToggle: () => void
  onClose: () => void
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: () => void
}

function getCategoryIcon(
  notification: GameNotification
) {
  switch (notification.category) {
    case "battle":
      return "⚔️"
    case "world":
      return "🚁"
    case "building":
      return "🏗️"
    case "research":
      return "🔬"
    case "recruitment":
      return "🕴️"
    case "inventory":
      return "🎁"
    default:
      return "🔔"
  }
}

function getToneClasses(
  notification: GameNotification
) {
  if (notification.tone === "success") {
    return "border-emerald-500/25 bg-emerald-500/[0.07]"
  }

  if (notification.tone === "danger") {
    return "border-red-500/30 bg-red-500/[0.08]"
  }

  if (notification.tone === "warning") {
    return "border-amber-500/25 bg-amber-500/[0.07]"
  }

  return "border-sky-500/20 bg-sky-500/[0.055]"
}

function formatRelativeTime(
  createdAt: string
) {
  const timestamp = new Date(createdAt).getTime()

  if (!Number.isFinite(timestamp)) {
    return ""
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  )

  if (seconds < 60) {
    return "à l'instant"
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `il y a ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `il y a ${hours} h`
  }

  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export default function NotificationCenter({
  notifications,
  open,
  onToggle,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length

  return (
    <div className="pointer-events-none absolute right-3 top-16 z-[9500] sm:right-4">
      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-zinc-950/90 text-lg text-white shadow-2xl backdrop-blur-xl transition hover:bg-zinc-900"
        aria-label="Ouvrir les notifications"
        title="Notifications"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-red-300/40 bg-red-600 px-1 text-[9px] font-black text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <aside className="pointer-events-auto absolute right-0 mt-2 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/96 shadow-[0_25px_90px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-300/70">
                Crime Empire
              </p>
              <h2 className="mt-0.5 text-sm font-black text-white">
                Notifications
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-black text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  Tout lire
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer les notifications"
              >
                ×
              </button>
            </div>
          </div>

          <div className="max-h-[min(62vh,520px)] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl">🔕</div>
                <p className="mt-2 text-sm font-black text-zinc-300">
                  Rien à signaler
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  Les combats, retours d'escouade et autres événements importants apparaîtront ici.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onMarkRead(notification.id)}
                  className={`mb-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-white/[0.06] ${getToneClasses(notification)} ${
                    notification.read_at ? "opacity-65" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-base">
                    {getCategoryIcon(notification)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black text-white">
                        {notification.title}
                      </span>

                      {!notification.read_at && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                    </span>

                    {notification.message && (
                      <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-zinc-400">
                        {notification.message}
                      </span>
                    )}

                    <span className="mt-1.5 block text-[9px] font-bold uppercase tracking-wide text-zinc-600">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
