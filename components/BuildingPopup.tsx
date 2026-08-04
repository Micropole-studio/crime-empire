import { useEffect, useState } from "react"

type UpgradeCost = {
  money: number
  materials: number
  influence?: number
}

type BuildingPopupProps = {
  name: string
  level: number
  isUpgrading: boolean
  upgradeFinish?: string | null
  cost: UpgradeCost
  onClose: () => void
  onUpgrade: () => Promise<void>
}

function formatRemainingTime(finishDate?: string | null) {
  if (!finishDate) {
    return "En construction"
  }

  const now = Date.now()
  const end = new Date(finishDate).getTime()

  if (Number.isNaN(end)) {
    return "Date invalide"
  }

  const diff = Math.max(0, end - now)

  const seconds = Math.floor(diff / 1000) % 60
  const minutes = Math.floor(diff / (1000 * 60)) % 60
  const hours = Math.floor(diff / (1000 * 60 * 60))

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export default function BuildingPopup({
  name,
  level,
  isUpgrading,
  upgradeFinish,
  cost,
  onClose,
  onUpgrade,
}: BuildingPopupProps) {
  const [remainingTime, setRemainingTime] = useState(
    formatRemainingTime(upgradeFinish)
  )

  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    setRemainingTime(formatRemainingTime(upgradeFinish))

    if (!isUpgrading || !upgradeFinish) {
      return
    }

    const interval = window.setInterval(() => {
      setRemainingTime(formatRemainingTime(upgradeFinish))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isUpgrading, upgradeFinish])

  const handleUpgrade = async () => {
    if (upgradeLoading || isUpgrading) {
      return
    }

    try {
      setUpgradeLoading(true)
      await onUpgrade()
    } finally {
      setUpgradeLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-2xl shadow-black"
        onClick={(event) => event.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-4">
          <div>
            <h2 className="text-2xl font-black tracking-wide text-white">
              {name}
            </h2>

            <p className="mt-1 text-sm font-semibold text-amber-300">
              Niveau {level}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-2xl text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* APERÇU TEMPORAIRE */}
        <div className="flex min-h-52 items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
          <div className="text-center">
            <div className="text-7xl">🏢</div>

            <p className="mt-3 text-sm text-gray-500">
              Image du bâtiment à ajouter
            </p>
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="mb-3 font-bold text-gray-200">
              Coût de l’amélioration
            </h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-gray-400">💰 Argent</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {cost.money}
                </p>
              </div>

              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-gray-400">🧱 Matériaux</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {cost.materials}
                </p>
              </div>

              {(cost.influence ?? 0) > 0 && (
                <div className="col-span-2 rounded-lg bg-white/5 p-3">
                  <p className="text-gray-400">⭐ Influence</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {cost.influence}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isUpgrading ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
              <p className="font-bold text-yellow-300">
                ⏳ Amélioration en cours
              </p>

              <p className="mt-2 font-mono text-2xl font-black text-white">
                {remainingTime}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="w-full rounded-xl border border-green-400/40 bg-gradient-to-b from-green-500 to-green-700 px-5 py-4 text-lg font-black text-white shadow-lg shadow-green-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upgradeLoading
                ? "Amélioration en cours de lancement..."
                : "⬆️ Améliorer"}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}