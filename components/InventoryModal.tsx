import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  getInventoryItemDefinition,
  getInventorySlotCapacity,
} from "../data/inventory"

import {
  getStorageCapacities,
} from "../data/storage"

import {
  getCityInventory,
  normalizeLootPayload,
  openInventoryLoot,
} from "../services/inventoryService"

import type {
  Building,
} from "../types/building"

import type {
  InventoryItem,
  LootPayload,
} from "../types/inventory"

type CityResources = {
  id: string
  money: number
  materials: number
  influence: number
  equipment: number
}

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

  if (added.materials > 0) {
    parts.push(
      `${formatNumber(
        added.materials
      )} matériaux`
    )
  }

  if (added.influence > 0) {
    parts.push(
      `${formatNumber(
        added.influence
      )} Influence`
    )
  }

  if (added.equipment > 0) {
    parts.push(
      `${formatNumber(
        added.equipment
      )} équipements`
    )
  }

  if (parts.length === 0) {
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
  ] = useState<InventoryItem[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    openingItemId,
    setOpeningItemId,
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
        getStorageCapacities(
          buildings
        ),
      [buildings]
    )

  const loadInventory =
    useCallback(async () => {
      try {
        setErrorMessage(null)

        const result =
          await getCityInventory(
            city.id
          )

        setItems(result)
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
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
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
    if (openingItemId) {
      return
    }

    try {
      setMessage(null)
      setErrorMessage(null)
      setOpeningItemId(itemId)

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
      setOpeningItemId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
        aria-labelledby="inventory-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-amber-500/25 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
      >
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-4xl">
                🧰
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                  Ressources et objets
                </p>

                <h2
                  id="inventory-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  Inventaire
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Les butins restent ici tant
                  que tu ne les transfères pas
                  vers les stockages de la ville.
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
          <section className="grid gap-3 md:grid-cols-5">
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
                Butins disponibles
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Une caisse partiellement ouverte
                reste dans l'inventaire avec son
                contenu restant.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
                Chargement de l'inventaire...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-10 text-center">
                <div className="text-4xl">
                  📭
                </div>

                <h4 className="mt-3 font-black text-white">
                  Inventaire vide
                </h4>

                <p className="mt-2 text-sm text-zinc-500">
                  Les récompenses des futures
                  missions apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map(
                  (item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      opening={
                        openingItemId ===
                        item.id
                      }
                      disabled={
                        Boolean(
                          openingItemId
                        )
                      }
                      onOpen={() =>
                        handleOpenItem(
                          item.id
                        )
                      }
                    />
                  )
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

type InventoryItemCardProps = {
  item: InventoryItem
  opening: boolean
  disabled: boolean
  onOpen: () => void
}

function InventoryItemCard({
  item,
  opening,
  disabled,
  onOpen,
}: InventoryItemCardProps) {
  const definition =
    getInventoryItemDefinition(
      item.item_key
    )

  const payload =
    normalizeLootPayload(
      item.payload
    )

  const isEmpty =
    getPayloadTotal(payload) <= 0

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

            <span className="rounded-full border border-zinc-700 bg-black/20 px-2 py-1 text-[10px] font-black uppercase text-zinc-400">
              Butin
            </span>
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
        {formatNumber(value)}
      </p>
    </div>
  )
}
