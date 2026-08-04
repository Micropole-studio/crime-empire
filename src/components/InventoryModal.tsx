import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  getCompatibleSpeedupTargets,
  getInventoryItemDefinition,
  getInventorySlotCapacity,
  getSpeedupScope,
  getSpeedupSeconds,
  isSpeedupPayload,
} from "../data/inventory"

import {
  getDisplayedStorageCapacities,
  getStorageResearchBonusPercent,
} from "../data/storage"

import {
  syncCityResearches,
} from "../services/researchService"

import {
  getCityInventory,
  getCitySpeedupTargets,
  normalizeLootPayload,
  useInventorySpeedup,
  openInventoryLoot,
} from "../services/inventoryService"

import type {
  Building,
} from "../types/building"

import type {
  InventoryItem,
  LootPayload,
  SpeedupTarget,
} from "../types/inventory"

import type {
  CityResearch,
} from "../types/research"

type CityResources = {
  id: string
  money: number
  materials: number
  influence: number
  equipment: number
}

type InventoryFilter =
  | "all"
  | "loot"
  | "boost"

type Props = {
  city: CityResources
  buildings: Building[]
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
      maximumFractionDigits: 2,
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

function getRemainingSeconds(
  finishAt: string,
  currentTime: number
) {
  const finishTime =
    new Date(
      finishAt
    ).getTime()

  if (
    Number.isNaN(
      finishTime
    )
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (
        finishTime -
        currentTime
      ) / 1000
    )
  )
}

function getPayloadTotal(
  payload: LootPayload
) {
  return (
    payload.money +
    payload.materials +
    payload.influence +
    payload.equipment
  )
}

function buildAddedMessage(
  added: LootPayload
) {
  const parts: string[] = []

  if (added.money > 0) {
    parts.push(
      `${formatNumber(
        added.money
      )} €`
    )
  }

  if (
    added.materials > 0
  ) {
    parts.push(
      `${formatNumber(
        added.materials
      )} matériaux`
    )
  }

  if (
    added.influence > 0
  ) {
    parts.push(
      `${formatNumber(
        added.influence
      )} Influence`
    )
  }

  if (
    added.equipment > 0
  ) {
    parts.push(
      `${formatNumber(
        added.equipment
      )} équipements`
    )
  }

  if (
    parts.length === 0
  ) {
    return "Aucune ressource n'a pu être transférée : les stockages sont pleins."
  }

  return `Ressources transférées : ${parts.join(
    ", "
  )}.`
}

export default function InventoryModal({
  city,
  buildings,
  onClose,
  onChanged,
}: Props) {
  const [
    items,
    setItems,
  ] = useState<
    InventoryItem[]
  >([])

  const [
    speedupTargets,
    setSpeedupTargets,
  ] = useState<
    SpeedupTarget[]
  >([])

  const [
    researches,
    setResearches,
  ] = useState<
    CityResearch[]
  >([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    openingItemId,
    setOpeningItemId,
  ] = useState<
    string | null
  >(null)

  const [
    usingSpeedupItemId,
    setUsingSpeedupItemId,
  ] = useState<
    string | null
  >(null)

  const [
    selectedTargetByItem,
    setSelectedTargetByItem,
  ] = useState<
    Record<string, string>
  >({})

  const [
    filter,
    setFilter,
  ] = useState<
    InventoryFilter
  >("all")

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => Date.now()
  )

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null)

  const slotCapacity =
    useMemo(
      () =>
        getInventorySlotCapacity(
          buildings
        ),
      [buildings]
    )

  const storageCapacities =
    useMemo(
      () =>
        getDisplayedStorageCapacities(
          buildings,
          researches
        ),
      [
        buildings,
        researches,
      ]
    )

  const storageResearchBonusPercent =
    useMemo(
      () =>
        getStorageResearchBonusPercent(
          researches
        ),
      [researches]
    )

  const filteredItems =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return items
      }

      if (
        filter === "boost"
      ) {
        return items.filter(
          (item) =>
            isSpeedupPayload(
              item.payload
            )
        )
      }

      return items.filter(
        (item) =>
          !isSpeedupPayload(
            item.payload
          )
      )
    }, [
      filter,
      items,
    ])

  const speedupCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            isSpeedupPayload(
              item.payload
            )
        ).length,
      [items]
    )

  const lootCount =
    items.length -
    speedupCount

  const loadInventory =
    useCallback(async () => {
      try {
        setErrorMessage(
          null
        )

        const [
          inventoryResult,
          targetResult,
          researchResult,
        ] =
          await Promise.all([
            getCityInventory(
              city.id
            ),

            getCitySpeedupTargets(
              city.id
            ),

            syncCityResearches(
              city.id
            ),
          ])

        setItems(
          inventoryResult
        )

        setSpeedupTargets(
          targetResult
        )

        setResearches(
          researchResult
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger l'inventaire"
        )
      } finally {
        setLoading(false)
      }
    }, [city.id])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

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

  async function handleOpenItem(
    itemId: string
  ) {
    if (
      openingItemId ||
      usingSpeedupItemId
    ) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)

      setOpeningItemId(
        itemId
      )

      const result =
        await openInventoryLoot(
          itemId
        )

      setMessage(
        buildAddedMessage(
          result.added
        )
      )

      await onChanged?.()
      await loadInventory()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir ce butin"
      )
    } finally {
      setOpeningItemId(
        null
      )
    }
  }

  async function handleUseSpeedup(
    item: InventoryItem,
    target: SpeedupTarget
  ) {
    if (
      usingSpeedupItemId ||
      openingItemId
    ) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)

      setUsingSpeedupItemId(
        item.id
      )

      const result =
        await useInventorySpeedup(
          item.id,
          target.target_type,
          target.id
        )

      const appliedLabel =
        formatDuration(
          result.seconds_applied
        )

      const endLabel =
        result.completed
          ? "L'action est terminée."
          : `Temps restant : ${formatDuration(
              result.remaining_seconds
            )}.`

      setMessage(
        `Accélération appliquée : ${appliedLabel}. ${endLabel}`
      )

      await onChanged?.()
      await loadInventory()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'utiliser cet accélérateur"
      )
    } finally {
      setUsingSpeedupItemId(
        null
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(
        event
      ) => {
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
        aria-labelledby="inventory-title"
        className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-amber-500/25 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
      >
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-3xl sm:h-16 sm:w-16 sm:text-4xl">
                🧰
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 sm:text-xs">
                  Ressources et objets
                </p>

                <h2
                  id="inventory-title"
                  className="mt-1 text-xl font-black text-white sm:text-2xl"
                >
                  Inventaire
                </h2>

                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Ouvrez vos butins ou utilisez
                  vos accélérateurs sur une action
                  en cours.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Emplacements"
              value={`${items.length} / ${slotCapacity}`}
              warning={
                items.length >=
                slotCapacity
              }
            />

            <SummaryCard
              label="Argent"
              value={`${formatNumber(
                city.money
              )} / ${formatNumber(
                storageCapacities.money
              )}`}
            />

            <SummaryCard
              label="Matériaux"
              value={`${formatNumber(
                city.materials
              )} / ${formatNumber(
                storageCapacities.materials
              )}`}
            />

            <SummaryCard
              label="Influence"
              value={`${formatNumber(
                city.influence
              )} / ${formatNumber(
                storageCapacities.influence
              )}`}
            />

            <SummaryCard
              label="Équipements"
              value={`${formatNumber(
                city.equipment
              )} / ${formatNumber(
                storageCapacities.equipment
              )}`}
            />
          </section>

          {storageResearchBonusPercent >
            0 && (
            <div className="rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-200">
              🏚️ Entrepôts dissimulés :
              +{storageResearchBonusPercent} %
              aux capacités de stockage.
            </div>
          )}

          <section className="flex flex-wrap gap-2">
            <FilterButton
              active={
                filter === "all"
              }
              label={`Tout (${items.length})`}
              onClick={() =>
                setFilter("all")
              }
            />

            <FilterButton
              active={
                filter === "loot"
              }
              label={`Butins (${lootCount})`}
              onClick={() =>
                setFilter("loot")
              }
            />

            <FilterButton
              active={
                filter === "boost"
              }
              label={`Accélérateurs (${speedupCount})`}
              onClick={() =>
                setFilter("boost")
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

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white">
                {filter ===
                "boost"
                  ? "Accélérateurs disponibles"
                  : filter ===
                      "loot"
                    ? "Butins disponibles"
                    : "Objets disponibles"}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Les accélérateurs sont consommés
                à l'utilisation, même si le temps
                restant est plus court que leur
                durée totale.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement de l'inventaire...
              </div>
            ) : filteredItems.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-10 text-center">
                <div className="text-4xl">
                  📭
                </div>

                <h4 className="mt-3 font-black text-white">
                  Aucun objet dans cette catégorie
                </h4>

                <p className="mt-2 text-sm text-zinc-500">
                  Les récompenses des missions et
                  des événements apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredItems.map(
                  (item) => {
                    if (
                      isSpeedupPayload(
                        item.payload
                      )
                    ) {
                      return (
                        <SpeedupItemCard
                          key={
                            item.id
                          }
                          item={
                            item
                          }
                          targets={
                            speedupTargets
                          }
                          currentTime={
                            currentTime
                          }
                          selectedTargetKey={
                            selectedTargetByItem[
                              item.id
                            ]
                          }
                          using={
                            usingSpeedupItemId ===
                            item.id
                          }
                          disabled={
                            Boolean(
                              usingSpeedupItemId ||
                                openingItemId
                            )
                          }
                          onTargetChange={(
                            targetKey
                          ) =>
                            setSelectedTargetByItem(
                              (
                                current
                              ) => ({
                                ...current,
                                [item.id]:
                                  targetKey,
                              })
                            )
                          }
                          onUse={(
                            target
                          ) =>
                            handleUseSpeedup(
                              item,
                              target
                            )
                          }
                        />
                      )
                    }

                    return (
                      <InventoryLootCard
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        opening={
                          openingItemId ===
                          item.id
                        }
                        disabled={
                          Boolean(
                            openingItemId ||
                              usingSpeedupItemId
                          )
                        }
                        onOpen={() =>
                          handleOpenItem(
                            item.id
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

type FilterButtonProps = {
  active: boolean
  label: string
  onClick: () => void
}

function FilterButton({
  active,
  label,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
        active
          ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {label}
    </button>
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
      className={`rounded-xl border px-3 py-3 ${
        warning
          ? "border-red-500/30 bg-red-500/10"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          warning
            ? "text-red-200"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

type InventoryLootCardProps = {
  item: InventoryItem
  opening: boolean
  disabled: boolean
  onOpen: () => void
}

function InventoryLootCard({
  item,
  opening,
  disabled,
  onOpen,
}: InventoryLootCardProps) {
  const definition =
    getInventoryItemDefinition(
      item.item_key
    )

  const payload =
    normalizeLootPayload(
      item.payload
    )

  const isEmpty =
    getPayloadTotal(
      payload
    ) <= 0

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-3xl">
          {definition.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-black text-white">
                {definition.name}
              </h4>

              {item.source_label && (
                <p className="mt-1 text-xs font-semibold text-amber-300/80">
                  {item.source_label}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.quantity >
                1 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-200">
                  x{item.quantity}
                </span>
              )}

              <span className="rounded-full border border-zinc-700 bg-black/20 px-2 py-1 text-[10px] font-black uppercase text-zinc-400">
                Butin
              </span>
            </div>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PayloadCell
          icon="💵"
          label="Argent"
          value={payload.money}
        />

        <PayloadCell
          icon="🧱"
          label="Matériaux"
          value={payload.materials}
        />

        <PayloadCell
          icon="⭐"
          label="Influence"
          value={payload.influence}
        />

        <PayloadCell
          icon="🧰"
          label="Équipements"
          value={payload.equipment}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={
          disabled ||
          isEmpty
        }
        className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {opening
          ? "Transfert..."
          : isEmpty
            ? "Butin vide"
            : "Ouvrir et transférer"}
      </button>
    </article>
  )
}

type SpeedupItemCardProps = {
  item: InventoryItem
  targets: SpeedupTarget[]
  currentTime: number
  selectedTargetKey?: string
  using: boolean
  disabled: boolean
  onTargetChange: (
    targetKey: string
  ) => void
  onUse: (
    target: SpeedupTarget
  ) => void
}

function SpeedupItemCard({
  item,
  targets,
  currentTime,
  selectedTargetKey,
  using,
  disabled,
  onTargetChange,
  onUse,
}: SpeedupItemCardProps) {
  const definition =
    getInventoryItemDefinition(
      item.item_key
    )

  const scope =
    getSpeedupScope(
      item.payload
    )

  const seconds =
    getSpeedupSeconds(
      item.payload
    )

  const compatibleTargets =
    scope
      ? getCompatibleSpeedupTargets(
          targets,
          scope
        ).filter(
          (target) =>
            getRemainingSeconds(
              target.finish_at,
              currentTime
            ) > 0
        )
      : []

  const defaultTarget =
    compatibleTargets[0] ??
    null

  const selectedTarget =
    compatibleTargets.find(
      (target) =>
        `${target.target_type}:${target.id}` ===
        selectedTargetKey
    ) ??
    defaultTarget

  const scopeLabel =
    scope ===
    "construction"
      ? "Construction"
      : scope ===
          "recruitment"
        ? "Recrutement"
        : scope ===
            "research"
          ? "Recherche"
          : "Universel"

  return (
    <article className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950/30 via-zinc-900/70 to-zinc-900/70 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-3xl">
          {definition.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-black text-white">
                {definition.name}
              </h4>

              <p className="mt-1 text-sm font-black text-blue-200">
                ⏩{" "}
                {formatDuration(
                  seconds
                )}
              </p>

              {item.source_label && (
                <p className="mt-1 text-xs font-semibold text-blue-300/70">
                  {item.source_label}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.quantity >
                1 && (
                <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-200">
                  x{item.quantity}
                </span>
              )}

              <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase text-blue-200">
                {scopeLabel}
              </span>
            </div>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
          Action à accélérer
        </p>

        {compatibleTargets.length >
        0 ? (
          <>
            <select
              value={
                selectedTarget
                  ? `${selectedTarget.target_type}:${selectedTarget.id}`
                  : ""
              }
              onChange={(
                event
              ) =>
                onTargetChange(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-blue-500"
            >
              {compatibleTargets.map(
                (target) => (
                  <option
                    key={`${target.target_type}:${target.id}`}
                    value={`${target.target_type}:${target.id}`}
                  >
                    {target.label} —{" "}
                    {formatDuration(
                      getRemainingSeconds(
                        target.finish_at,
                        currentTime
                      )
                    )}
                  </option>
                )
              )}
            </select>

            {selectedTarget && (
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-zinc-500">
                  Temps actuel
                </span>

                <span className="font-black text-white">
                  {formatDuration(
                    getRemainingSeconds(
                      selectedTarget.finish_at,
                      currentTime
                    )
                  )}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm font-semibold text-zinc-500">
            Aucune action compatible
            n'est actuellement en cours.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (
            selectedTarget
          ) {
            onUse(
              selectedTarget
            )
          }
        }}
        disabled={
          disabled ||
          !selectedTarget
        }
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {using
          ? "Accélération..."
          : selectedTarget
            ? `Utiliser — ${formatDuration(
                seconds
              )}`
            : "Aucune cible disponible"}
      </button>
    </article>
  )
}

type PayloadCellProps = {
  icon: string
  label: string
  value: number
}

function PayloadCell({
  icon,
  label,
  value,
}: PayloadCellProps) {
  const active =
    Number(value) > 0

  return (
    <div
      className={`rounded-lg border px-2 py-2 text-center ${
        active
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-zinc-800 bg-black/15 opacity-40"
      }`}
    >
      <p className="text-[10px] font-bold uppercase text-zinc-500">
        {icon} {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {formatNumber(
          value
        )}
      </p>
    </div>
  )
}
