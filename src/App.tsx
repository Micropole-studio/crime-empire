import { useEffect, useState } from "react"

import { getPlayerCity } from "./services/gameData"
import {
  calculateEconomy,
} from "./services/economy"

import type {
  EconomyResult,
} from "./services/economy"

import {
  applyCommanderEconomyBonus,
} from "./data/commanderBonuses"

import type {
  CommanderSkills,
} from "./types/commander"

import type {
  Building,
} from "./types/building"

import {
  upgradeBuilding,
  getUpgradeCost,
} from "./services/buildingService"

import { syncEconomy } from "./services/syncEconomy"
import { syncBuildings } from "./services/buildingSync"

import { BUILDING_NAMES } from "./data/buildingNames"

import CityView from "./components/CityView"
import BuildingUpgradeModal from "./components/BuildingUpgradeModal"
import GameHud from "./components/game/GameHud"

import GameMap from "./components/map/GameMap"
import MapEditor from "./components/map/MapEditor"
import LaboratoryResearchModal from "./components/LaboratoryResearchModal"
import SecurityRecruitmentModal from "./components/SecurityRecruitmentModal"
import InventoryModal from "./components/InventoryModal"
import MissionsModal from "./components/MissionsModal"
import CommanderModal from "./components/CommanderModal"

type GameData = {
  player: any
  city: any
  buildings: Building[]
  commanderSkills: CommanderSkills
}

function getSafeRate(
  value: unknown,
  fallback: number
) {
  const numericValue =
    Number(value)

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : fallback
}

// =====================================================
// TIMER
// =====================================================

function getRemainingTime(
  finishDate?: string | null
) {
  if (!finishDate) {
    return {
      total: 0,
      text: "En construction",
    }
  }

  const now = Date.now()
  const end = new Date(finishDate).getTime()

  if (Number.isNaN(end)) {
    return {
      total: 0,
      text: "Date invalide",
    }
  }

  const diff = Math.max(0, end - now)

  const seconds =
    Math.floor(diff / 1000) % 60

  const minutes =
    Math.floor(diff / (1000 * 60)) % 60

  const hours =
    Math.floor(diff / (1000 * 60 * 60))

  return {
    total: diff,

    text: `${hours
      .toString()
      .padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`,
  }
}

export default function App() {
  const [data, setData] =
    useState<GameData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [
    effectiveEconomy,
    setEffectiveEconomy,
  ] = useState<EconomyResult | null>(
    null
  )

  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] = useState<string | null>(null)

  const [
    notifications,
    setNotifications,
  ] = useState<string[]>([])

  const [mode, setMode] = useState<
    "city" | "map" | "editor"
  >("city")

  const email = "test@test.com"
  
  const [
    isResearchModalOpen,
    setIsResearchModalOpen,
  ] = useState(false)

  const [
    isRecruitmentModalOpen,
    setIsRecruitmentModalOpen,
  ] = useState(false)
  
  const [
  isInventoryModalOpen,
  setIsInventoryModalOpen,
] = useState(false)

  const [
    isMissionsModalOpen,
    setIsMissionsModalOpen,
  ] = useState(false)

  const [
    isCommanderModalOpen,
    setIsCommanderModalOpen,
  ] = useState(false)


  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  function pushNotification(
    message: string
  ) {
    setNotifications((previous) => [
      ...previous,
      message,
    ])

    window.setTimeout(() => {
      setNotifications((previous) =>
        previous.slice(1)
      )
    }, 3000)
  }

  function changeMode(
    nextMode: "city" | "map" | "editor"
  ) {
    setSelectedBuildingId(null)
    setIsResearchModalOpen(false)
    setIsRecruitmentModalOpen(false)
    setIsInventoryModalOpen(false)
    setIsMissionsModalOpen(false)
    setIsCommanderModalOpen(false)
    setMode(nextMode)
  }

  // =====================================================
  // CHARGEMENT DU JEU
  // =====================================================

  async function loadGame() {
    try {
      /*
       * On termine d'abord les constructions,
       * puis on recalcule l'économie avec les
       * niveaux réellement à jour.
       */
      const initialResult =
        await getPlayerCity(email)

      await syncBuildings(
        initialResult.buildings
      )

      const synchronizedResult =
        await getPlayerCity(email)

      const economyResult =
        await syncEconomy(
          synchronizedResult.city,
          synchronizedResult.buildings
        )

      const refreshed =
        await getPlayerCity(email)

      const baseRates =
        calculateEconomy(
          refreshed.buildings
        )

      const fallbackRates =
        applyCommanderEconomyBonus(
          baseRates,
          refreshed.commanderSkills
        )

      setEffectiveEconomy({
        moneyPerHour:
          getSafeRate(
            economyResult
              ?.effective_money_per_hour,
            fallbackRates.moneyPerHour
          ),

        materialsPerHour:
          getSafeRate(
            economyResult
              ?.effective_materials_per_hour,
            fallbackRates.materialsPerHour
          ),

        influencePerHour:
          getSafeRate(
            economyResult
              ?.effective_influence_per_hour,
            fallbackRates.influencePerHour
          ),

        equipmentPerHour:
          getSafeRate(
            economyResult
              ?.effective_equipment_per_hour,
            fallbackRates.equipmentPerHour
          ),
      })

      setData(refreshed)
      setLoading(false)
    } catch (error) {
      console.error(
        "Erreur pendant le chargement du jeu :",
        error
      )

      setLoading(false)
    }
  }

  useEffect(() => {
    loadGame()

    const interval =
      window.setInterval(() => {
        loadGame()
      }, 10000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  // =====================================================
  // CHARGEMENT
  // =====================================================

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading Crime Empire...
      </div>
    )
  }

  // =====================================================
  // DONNÉES DU JOUEUR
  // =====================================================

  const baseEconomy =
    calculateEconomy(
      data.buildings
    )

  const fallbackEconomy =
    applyCommanderEconomyBonus(
      baseEconomy,
      data.commanderSkills
    )

  const economy =
    effectiveEconomy ??
    fallbackEconomy

  const commanderLevel = Math.max(
    1,
    Number(data.player.commander_level) ||
      1
  )

  const playerName =
    data.player.username ||
    data.player.email ||
    "Commandant"

  // =====================================================
  // NIVEAU RÉEL DE LA VILLA
  // =====================================================

  const villa = data.buildings
    .filter(
      (building) =>
        building.type === "villa"
    )
    .reduce<Building | null>(
      (
        highestVilla,
        currentVilla
      ) => {
        if (!highestVilla) {
          return currentVilla
        }

        return Number(
          currentVilla.level
        ) >
          Number(highestVilla.level)
          ? currentVilla
          : highestVilla
      },
      null
    )

  const currentVillaLevel = Math.max(
    1,
    Number(villa?.level) || 1
  )

  // =====================================================
  // BÂTIMENT SÉLECTIONNÉ
  // =====================================================

  const selectedBuilding =
    data.buildings.find(
      (building) =>
        building.id ===
        selectedBuildingId
    ) ?? null

  // =====================================================
  // AMÉLIORATION DU BÂTIMENT SÉLECTIONNÉ
  // =====================================================

  async function handleSelectedBuildingUpgrade() {
    if (
      !data ||
      !selectedBuilding
    ) {
      return
    }

    await upgradeBuilding(
      selectedBuilding,
      data.city,
      currentVillaLevel
    )

    await loadGame()

    pushNotification(
      `🏗️ ${
        BUILDING_NAMES[
          selectedBuilding.type
        ] || selectedBuilding.type
      } en amélioration`
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 text-white md:p-6">
      {/* =====================================================
          NOTIFICATIONS
      ===================================================== */}

      <div className="fixed right-4 top-4 z-[10000] space-y-2">
        {notifications.map(
          (notification, index) => (
            <div
              key={`${notification}-${index}`}
              className="rounded-lg border border-red-900/50 bg-zinc-950 px-4 py-2 text-white shadow-xl"
            >
              {notification}
            </div>
          )
        )}
      </div>

      {/* =====================================================
          POP-UP DU BÂTIMENT
      ===================================================== */}

      {selectedBuilding && (
        <BuildingUpgradeModal
          building={selectedBuilding}
          city={data.city}
          currentVillaLevel={
            currentVillaLevel
          }
          onClose={() =>
            setSelectedBuildingId(null)
          }
          onUpgrade={
            handleSelectedBuildingUpgrade
          }
          onChanged={async () => {
            await loadGame()
          }}
          onOpenResearches={() => {
            setSelectedBuildingId(null)
            setIsResearchModalOpen(true)
          }}
          onOpenTroops={() => {
            setSelectedBuildingId(null)
            setIsRecruitmentModalOpen(true)
          }}
        />
      )}

      {isResearchModalOpen && (
        <LaboratoryResearchModal
          city={data.city}
          buildings={data.buildings}
          onClose={() =>
            setIsResearchModalOpen(false)
          }
          onResearchStarted={async () => {
            await loadGame()
          }}
        />
      )}

      {isRecruitmentModalOpen && (
        <SecurityRecruitmentModal
          city={data.city}
          buildings={data.buildings}
          onClose={() =>
            setIsRecruitmentModalOpen(false)
          }
          onRecruitmentStarted={async () => {
            await loadGame()
          }}
        />
      )}

      {isInventoryModalOpen && (
        <InventoryModal
          city={data.city}
          buildings={data.buildings}
          onClose={() =>
            setIsInventoryModalOpen(false)
          }
          onChanged={async () => {
            await loadGame()
          }}
        />
      )}

      {isMissionsModalOpen && (
        <MissionsModal
          city={data.city}
          buildings={data.buildings}
          commanderLevel={
            commanderLevel
          }
          commanderSkills={
            data.commanderSkills
          }
          onClose={() =>
            setIsMissionsModalOpen(false)
          }
          onChanged={async () => {
            await loadGame()
          }}
        />
      )}

      {isCommanderModalOpen && (
        <CommanderModal
          player={data.player}
          onClose={() =>
            setIsCommanderModalOpen(false)
          }
          onChanged={async () => {
            await loadGame()
          }}
        />
      )}

      {/* =====================================================
          HUD PRINCIPAL
      ===================================================== */}

      <GameHud
        playerName={playerName}
        commanderLevel={
          commanderLevel
        }
        commanderXp={
          Number(
            data.player.commander_xp
          ) || 0
        }
        commanderSkillPoints={
          Number(
            data.player.commander_skill_points
          ) || 0
        }
        onCommanderClick={() => {
          setSelectedBuildingId(null)
          setIsResearchModalOpen(false)
          setIsRecruitmentModalOpen(false)
          setIsInventoryModalOpen(false)
          setIsMissionsModalOpen(false)
          setIsCommanderModalOpen(true)
        }}
        money={data.city.money}
        materials={
          data.city.materials
        }
        influence={
          data.city.influence
        }
        equipment={
          Number(
            data.city.equipment
          ) || 0
        }
        moneyPerHour={
          economy.moneyPerHour
        }
        materialsPerHour={
          economy.materialsPerHour
        }
        influencePerHour={
          economy.influencePerHour
        }
        equipmentPerHour={
          economy.equipmentPerHour
        }
        onInventoryClick={() => {
          setSelectedBuildingId(null)
          setIsResearchModalOpen(false)
          setIsRecruitmentModalOpen(false)
          setIsMissionsModalOpen(false)
          setIsCommanderModalOpen(false)
          setIsInventoryModalOpen(true)
        }}
        onTroopsClick={() => {
          setSelectedBuildingId(null)
          setIsResearchModalOpen(false)
          setIsInventoryModalOpen(false)
          setIsMissionsModalOpen(false)
          setIsCommanderModalOpen(false)
          setIsRecruitmentModalOpen(true)
        }}
        onMissionsClick={() => {
          setSelectedBuildingId(null)
          setIsResearchModalOpen(false)
          setIsRecruitmentModalOpen(false)
          setIsInventoryModalOpen(false)
          setIsCommanderModalOpen(false)
          setIsMissionsModalOpen(true)
        }}
      />

      {/* =====================================================
          NAVIGATION DE DÉVELOPPEMENT
      ===================================================== */}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 font-semibold transition ${
            mode === "city"
              ? "bg-red-700 text-white"
              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
          onClick={() =>
            changeMode("city")
          }
        >
          Ville
        </button>

        <button
          type="button"
          className={`rounded-lg px-4 py-2 font-semibold transition ${
            mode === "map"
              ? "bg-red-700 text-white"
              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
          onClick={() =>
            changeMode("map")
          }
        >
          Map
        </button>

        <button
          type="button"
          className={`rounded-lg px-4 py-2 font-semibold transition ${
            mode === "editor"
              ? "bg-red-700 text-white"
              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
          onClick={() =>
            changeMode("editor")
          }
        >
          Editor
        </button>
      </div>

      {/* =====================================================
          ANCIENNE CITY VIEW
      ===================================================== */}

      {mode === "city" && (
        <div className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">
            🌆 Ville
          </h2>

          <CityView
            buildings={data.buildings}
            selectedId={
              selectedBuildingId
            }
            onSelect={
              setSelectedBuildingId
            }
          />
        </div>
      )}

      {/* =====================================================
          MAP PRINCIPALE
      ===================================================== */}

      {mode === "map" && (
        <div className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">
            🗺️ Map
          </h2>

          <GameMap
            buildings={data.buildings}
            onBuildingClick={
              setSelectedBuildingId
            }
          />
        </div>
      )}

      {/* =====================================================
          MAP EDITOR
      ===================================================== */}

      {mode === "editor" && (
        <div className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">
            🛠️ Map Editor
          </h2>

          <MapEditor
            onSave={(placement) => {
              console.log(
                "Placement visuel enregistré :",
                placement
              )

              pushNotification(
                `📍 Position de ${
                  BUILDING_NAMES[
                    placement.type
                  ]
                } enregistrée`
              )
            }}
          />
        </div>
      )}

      {/* =====================================================
          LISTE TEMPORAIRE DES BÂTIMENTS
      ===================================================== */}

      <div className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">
          🏗️ Bâtiments
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.buildings.map(
            (building) => {
              const cost =
                getUpgradeCost(
                  building.type,
                  building.level
                )

              return (
                <div
                  key={building.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div>
                    <span className="font-bold text-white">
                      {BUILDING_NAMES[
                        building.type
                      ] || building.type}
                    </span>

                    <p className="mt-1 text-sm text-zinc-400">
                      Niveau{" "}
                      {building.level}
                    </p>

                    <div
                      className={`mt-2 text-xs text-zinc-400 ${
                        building.is_upgrading
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      <p>
                        💰 {cost.money}
                      </p>

                      <p>
                        🧱{" "}
                        {cost.materials}
                      </p>

                      {cost.influence >
                        0 && (
                        <p>
                          ⭐{" "}
                          {
                            cost.influence
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {building.is_upgrading ? (
                    <div className="text-right text-sm text-amber-400">
                      <p className="font-bold">
                        ⏳ En cours
                      </p>

                      <p className="mt-1 font-mono text-xs">
                        {
                          getRemainingTime(
                            building.upgrade_finish
                          ).text
                        }
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
                      onClick={() =>
                        setSelectedBuildingId(
                          building.id
                        )
                      }
                    >
                      Voir
                    </button>
                  )}
                </div>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}