import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  getInventoryItemDefinition,
  getSpeedupScope,
  getSpeedupSeconds,
  isSpeedupPayload,
} from "../data/inventory"

import {
  getCityInventory,
  useInventorySpeedup,
} from "../services/inventoryService"

import type {
  InventoryItem,
  SpeedupTargetType,
  UseInventorySpeedupResult,
} from "../types/inventory"

type Accent =
  | "amber"
  | "purple"
  | "blue"

type Props = {
  cityId: string
  targetType: SpeedupTargetType
  targetId: string
  remainingSeconds: number
  title: string
  description: string
  accent?: Accent
  onApplied?: (
    result: UseInventorySpeedupResult
  ) => Promise<void> | void
}

function formatDuration(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        Number(
          totalSeconds
        ) || 0
      )
    )

  const hours =
    Math.floor(
      safeSeconds / 3600
    )

  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) / 60
    )

  const seconds =
    safeSeconds % 60

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

const ACCENT_CLASSES: Record<
  Accent,
  {
    border: string
    background: string
    title: string
    badge: string
    button: string
  }
> = {
  amber: {
    border:
      "border-amber-400/20",
    background:
      "bg-amber-500/[0.05]",
    title:
      "text-amber-300",
    badge:
      "border-amber-400/25 bg-amber-500/10 text-amber-200",
    button:
      "border-amber-400/25 bg-amber-500/[0.08] hover:border-amber-400/50 hover:bg-amber-500/15",
  },

  purple: {
    border:
      "border-purple-400/20",
    background:
      "bg-purple-500/[0.05]",
    title:
      "text-purple-300",
    badge:
      "border-purple-400/25 bg-purple-500/10 text-purple-200",
    button:
      "border-purple-400/25 bg-purple-500/[0.08] hover:border-purple-400/50 hover:bg-purple-500/15",
  },

  blue: {
    border:
      "border-blue-400/20",
    background:
      "bg-blue-500/[0.05]",
    title:
      "text-blue-300",
    badge:
      "border-blue-400/25 bg-blue-500/10 text-blue-200",
    button:
      "border-blue-400/25 bg-blue-500/[0.08] hover:border-blue-400/50 hover:bg-blue-500/15",
  },
}

export default function ActionSpeedupsPanel({
  cityId,
  targetType,
  targetId,
  remainingSeconds,
  title,
  description,
  accent = "blue",
  onApplied,
}: Props) {
  const [
    speedupItems,
    setSpeedupItems,
  ] = useState<InventoryItem[]>(
    []
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    usingItemId,
    setUsingItemId,
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

  const classes =
    ACCENT_CLASSES[accent]

  const loadSpeedups =
    useCallback(async () => {
      if (
        !cityId ||
        !targetId
      ) {
        setSpeedupItems([])
        setLoading(false)
        return
      }

      try {
        setErrorMessage(null)

        const inventory =
          await getCityInventory(
            cityId
          )

        const compatibleItems =
          inventory.filter(
            (item) => {
              if (
                !isSpeedupPayload(
                  item.payload
                )
              ) {
                return false
              }

              const scope =
                getSpeedupScope(
                  item.payload
                )

              return (
                scope ===
                  targetType ||
                scope ===
                  "universal"
              )
            }
          )

        setSpeedupItems(
          compatibleItems
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les accélérateurs"
        )
      } finally {
        setLoading(false)
      }
    }, [
      cityId,
      targetId,
      targetType,
    ])

  useEffect(() => {
    setMessage(null)
    setErrorMessage(null)
    setLoading(true)

    loadSpeedups()
  }, [loadSpeedups])

  const totalQuantity =
    useMemo(
      () =>
        speedupItems.reduce(
          (
            total,
            item
          ) =>
            total +
            Math.max(
              1,
              Number(
                item.quantity
              ) || 1
            ),
          0
        ),
      [speedupItems]
    )

  async function handleUse(
    item: InventoryItem
  ) {
    if (
      usingItemId ||
      remainingSeconds <= 0
    ) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)

      setUsingItemId(
        item.id
      )

      const result =
        await useInventorySpeedup(
          item.id,
          targetType,
          targetId
        )

      setMessage(
        result.completed
          ? `Accélération appliquée : ${formatDuration(
              result.seconds_applied
            )}. Action terminée.`
          : `Accélération appliquée : ${formatDuration(
              result.seconds_applied
            )}. Nouveau temps restant : ${formatDuration(
              result.remaining_seconds
            )}.`
      )

      await onApplied?.(
        result
      )

      await loadSpeedups()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'utiliser cet accélérateur"
      )
    } finally {
      setUsingItemId(
        null
      )
    }
  }

  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${classes.border} ${classes.background}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-wider ${classes.title}`}
          >
            {title}
          </p>

          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${classes.badge}`}
        >
          {totalQuantity} disponible(s)
        </span>
      </div>

      {message && (
        <div className="mt-3 rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-black/20 px-4 py-4 text-center text-sm text-zinc-500">
          Chargement des accélérateurs...
        </div>
      ) : speedupItems.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-700 bg-black/15 px-4 py-4 text-center">
          <p className="text-sm font-bold text-zinc-400">
            Aucun accélérateur compatible
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Les accélérateurs universels sont
            également acceptés ici.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {speedupItems.map(
            (item) => {
              const definition =
                getInventoryItemDefinition(
                  item.item_key
                )

              const seconds =
                getSpeedupSeconds(
                  item.payload
                )

              const scope =
                getSpeedupScope(
                  item.payload
                )

              const quantity =
                Math.max(
                  1,
                  Number(
                    item.quantity
                  ) || 1
                )

              const finishesAction =
                seconds >=
                remainingSeconds

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleUse(
                      item
                    )
                  }
                  disabled={
                    Boolean(
                      usingItemId
                    ) ||
                    remainingSeconds <=
                      0
                  }
                  className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${classes.button}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xl">
                      {
                        definition.icon
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-white">
                            {formatDuration(
                              seconds
                            )}
                          </p>

                          <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                            {scope ===
                            "universal"
                              ? "Universel"
                              : targetType ===
                                  "recruitment"
                                ? "Recrutement"
                                : targetType ===
                                    "research"
                                  ? "Recherche"
                                  : "Construction"}
                          </p>
                        </div>

                        <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] font-black text-zinc-200">
                          x{quantity}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] font-semibold text-zinc-400">
                        {usingItemId ===
                        item.id
                          ? "Application..."
                          : finishesAction
                            ? "Terminer maintenant"
                            : `Retirer ${formatDuration(
                                seconds
                              )}`}
                      </p>
                    </div>
                  </div>
                </button>
              )
            }
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
        Une unité entière est consommée, même si
        le temps restant est inférieur à la durée
        de l'accélérateur.
      </p>
    </div>
  )
}
