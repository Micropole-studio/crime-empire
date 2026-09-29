import {
  useEffect,
  useState,
} from "react"

import {
  getPlayerCity,
} from "./services/gameData"

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
} from "./services/buildingService"

import {
  syncEconomy,
} from "./services/syncEconomy"

import {
  syncBuildings,
} from "./services/buildingSync"

import {
  BUILDING_NAMES,
} from "./data/buildingNames"

import BuildingUpgradeModal from "./components/BuildingUpgradeModal"
import GameHud from "./components/game/GameHud"
import GameMap from "./components/map/GameMap"
import MapEditor from "./components/map/MapEditor"
import LaboratoryResearchModal from "./components/LaboratoryResearchModal"
import SecurityRecruitmentModal from "./components/SecurityRecruitmentModal"
import InventoryModal from "./components/InventoryModal"
import MissionsModal from "./components/MissionsModal"
import CommanderModal from "./components/CommanderModal"
import WorldMap from "./components/world/WorldMap"

type GameData = {
  player: any
  city: any
  buildings: Building[]
  commanderSkills: CommanderSkills
}

type GameMode =
  | "city"
  | "world"
  | "editor"

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

export default function App() {
  const [
    data,
    setData,
  ] =
    useState<GameData | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    effectiveEconomy,
    setEffectiveEconomy,
  ] =
    useState<EconomyResult | null>(
      null
    )

  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] =
    useState<string | null>(
      null
    )

  const [
    notifications,
    setNotifications,
  ] =
    useState<string[]>(
      []
    )

  const [
    mode,
    setMode,
  ] =
    useState<GameMode>(
      "city"
    )

  const email =
    "test@test.com"

  const [
    isResearchModalOpen,
    setIsResearchModalOpen,
  ] =
    useState(false)

  const [
    isRecruitmentModalOpen,
    setIsRecruitmentModalOpen,
  ] =
    useState(false)

  const [
    isInventoryModalOpen,
    setIsInventoryModalOpen,
  ] =
    useState(false)

  const [
    isMissionsModalOpen,
    setIsMissionsModalOpen,
  ] =
    useState(false)

  const [
    isCommanderModalOpen,
    setIsCommanderModalOpen,
  ] =
    useState(false)

  function pushNotification(
    message: string
  ) {
    setNotifications(
      (previous) => [
        ...previous,
        message,
      ]
    )

    window.setTimeout(
      () => {
        setNotifications(
          (previous) =>
            previous.slice(1)
        )
      },
      3000
    )
  }

  function closeAllPanels() {
    setSelectedBuildingId(
      null
    )

    setIsResearchModalOpen(
      false
    )

    setIsRecruitmentModalOpen(
      false
    )

    setIsInventoryModalOpen(
      false
    )

    setIsMissionsModalOpen(
      false
    )

    setIsCommanderModalOpen(
      false
    )
  }

  function openInventory() {
    closeAllPanels()

    setIsInventoryModalOpen(
      true
    )
  }

  function openTroops() {
    closeAllPanels()

    setIsRecruitmentModalOpen(
      true
    )
  }

  function openMissions() {
    closeAllPanels()

    setIsMissionsModalOpen(
      true
    )
  }

  function openCommander() {
    closeAllPanels()

    setIsCommanderModalOpen(
      true
    )
  }

  function openCity() {
    closeAllPanels()

    setMode(
      "city"
    )
  }

  function openWorldMap() {
    closeAllPanels()

    setMode(
      "world"
    )
  }

  function openEditor() {
    closeAllPanels()

    setMode(
      "editor"
    )
  }

  async function loadGame() {
    try {
      const initialResult =
        await getPlayerCity(
          email
        )

      await syncBuildings(
        initialResult.buildings
      )

      const synchronizedResult =
        await getPlayerCity(
          email
        )

      const economyResult =
        await syncEconomy(
          synchronizedResult.city,
          synchronizedResult.buildings
        )

      const refreshed =
        await getPlayerCity(
          email
        )

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

      setData(
        refreshed
      )

      setLoading(
        false
      )
    } catch (error) {
      console.error(
        "Erreur pendant le chargement du jeu :",
        error
      )

      setLoading(
        false
      )
    }
  }

  useEffect(() => {
    loadGame()

    const interval =
      window.setInterval(
        () => {
          loadGame()
        },
        10000
      )

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [])

  if (
    loading ||
    !data
  ) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white">
        Loading Crime Empire...
      </div>
    )
  }

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

  const commanderLevel =
    Math.max(
      1,
      Number(
        data.player
          .commander_level
      ) ||
        1
    )

  const playerName =
    data.player.username ||
    data.player.email ||
    "Commandant"

  const villa =
    data.buildings
      .filter(
        (building) =>
          building.type ===
          "villa"
      )
      .reduce<Building | null>(
        (
          highestVilla,
          currentVilla
        ) => {
          if (
            !highestVilla
          ) {
            return currentVilla
          }

          return Number(
            currentVilla.level
          ) >
            Number(
              highestVilla.level
            )
            ? currentVilla
            : highestVilla
        },
        null
      )

  const currentVillaLevel =
    Math.max(
      0,
      Number(
        villa?.level
      ) ||
        0
    )

  const selectedBuilding =
    data.buildings.find(
      (building) =>
        building.id ===
        selectedBuildingId
    ) ??
    null

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
      currentVillaLevel,
      data.buildings
    )

    await loadGame()

    pushNotification(
      `🏗️ ${
        BUILDING_NAMES[
          selectedBuilding.type
        ] ||
        selectedBuilding.type
      } : construction lancée`
    )
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="fixed right-3 top-32 z-[10000] max-w-[calc(100vw-24px)] space-y-2 md:right-4 md:top-28">
        {notifications.map(
          (
            notification,
            index
          ) => (
            <div
              key={`${notification}-${index}`}
              className="rounded-lg border border-red-900/50 bg-zinc-950 px-4 py-2 text-sm text-white shadow-xl"
            >
              {notification}
            </div>
          )
        )}
      </div>

      {selectedBuilding && (
        <BuildingUpgradeModal
          building={
            selectedBuilding
          }
          buildings={
            data.buildings
          }
          city={
            data.city
          }
          currentVillaLevel={
            currentVillaLevel
          }
          onClose={() =>
            setSelectedBuildingId(
              null
            )
          }
          onUpgrade={
            handleSelectedBuildingUpgrade
          }
          onChanged={
            loadGame
          }
          onOpenResearches={() => {
            setSelectedBuildingId(
              null
            )

            setIsResearchModalOpen(
              true
            )
          }}
          onOpenTroops={() => {
            setSelectedBuildingId(
              null
            )

            setIsRecruitmentModalOpen(
              true
            )
          }}
        />
      )}

      {isResearchModalOpen && (
        <LaboratoryResearchModal
          city={
            data.city
          }
          buildings={
            data.buildings
          }
          onClose={() =>
            setIsResearchModalOpen(
              false
            )
          }
          onResearchStarted={
            loadGame
          }
        />
      )}

      {isRecruitmentModalOpen && (
        <SecurityRecruitmentModal
          city={
            data.city
          }
          buildings={
            data.buildings
          }
          onClose={() =>
            setIsRecruitmentModalOpen(
              false
            )
          }
          onRecruitmentStarted={
            loadGame
          }
        />
      )}

      {isInventoryModalOpen && (
        <InventoryModal
          city={
            data.city
          }
          buildings={
            data.buildings
          }
          onClose={() =>
            setIsInventoryModalOpen(
              false
            )
          }
          onChanged={
            loadGame
          }
        />
      )}

      {isMissionsModalOpen && (
        <MissionsModal
          city={
            data.city
          }
          buildings={
            data.buildings
          }
          commanderLevel={
            commanderLevel
          }
          commanderSkills={
            data.commanderSkills
          }
          onClose={() =>
            setIsMissionsModalOpen(
              false
            )
          }
          onChanged={
            loadGame
          }
        />
      )}

      {isCommanderModalOpen && (
        <CommanderModal
          player={
            data.player
          }
          onClose={() =>
            setIsCommanderModalOpen(
              false
            )
          }
          onChanged={
            loadGame
          }
        />
      )}

      {mode === "city" && (
        <>
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              top:
                "calc(52px + env(safe-area-inset-top))",
            }}
          >
            <GameMap
              cityId={
                String(
                  data.city.id
                )
              }
              buildings={
                data.buildings
              }
              onBuildingClick={
                setSelectedBuildingId
              }
              onWorldMapOpen={
                openWorldMap
              }
            />
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-1 sm:px-2"
            style={{
              paddingTop:
                "max(4px, env(safe-area-inset-top))",
            }}
          >
            <div className="pointer-events-auto">
              <GameHud
                playerName={
                  playerName
                }
                commanderLevel={
                  commanderLevel
                }
                commanderXp={
                  Number(
                    data.player
                      .commander_xp
                  ) ||
                  0
                }
                commanderSkillPoints={
                  Number(
                    data.player
                      .commander_skill_points
                  ) ||
                  0
                }
                money={
                  data.city.money
                }
                materials={
                  data.city.materials
                }
                influence={
                  data.city.influence
                }
                equipment={
                  Number(
                    data.city
                      .equipment
                  ) ||
                  0
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
                onCommanderClick={
                  openCommander
                }
                onInventoryClick={
                  openInventory
                }
                onTroopsClick={
                  openTroops
                }
                onMissionsClick={
                  openMissions
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={
              openEditor
            }
            className="absolute bottom-4 left-4 z-[900] hidden rounded-xl border border-blue-500/30 bg-zinc-950/85 px-4 py-2 text-sm font-black text-blue-200 shadow-xl backdrop-blur transition hover:bg-blue-950 lg:block"
          >
            🛠️ Éditeur de ville
          </button>

          <MobileBottomNavigation
            onCity={
              openCity
            }
            onInventory={
              openInventory
            }
            onTroops={
              openTroops
            }
            onMissions={
              openMissions
            }
          />
        </>
      )}

      {mode === "world" && (
        <WorldMap
          onBack={
            openCity
          }
          cityId={
            String(data.city.id)
          }
          buildings={
            data.buildings
          }
          currentCityName={
            playerName
          }
          currentVillaLevel={
            currentVillaLevel
          }
          commanderLevel={
            commanderLevel
          }
          commanderSkills={
            data.commanderSkills
          }
        />
      )}

      {mode === "editor" && (
        <div className="h-full overflow-y-auto bg-black p-4 pb-16 text-white md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Développement
                </p>

                <h1 className="mt-1 text-2xl font-black">
                  Éditeur de ville
                </h1>
              </div>

              <button
                type="button"
                onClick={
                  openCity
                }
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 font-black text-white transition hover:bg-zinc-800"
              >
                ← Retour au jeu
              </button>
            </div>

            <MapEditor
              cityId={
                String(
                  data.city.id
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

type MobileBottomNavigationProps = {
  onCity: () => void
  onInventory: () => void
  onTroops: () => void
  onMissions: () => void
}

function MobileBottomNavigation({
  onCity,
  onInventory,
  onTroops,
  onMissions,
}: MobileBottomNavigationProps) {
  return (
    <nav className="absolute inset-x-2 bottom-2 z-[950] grid grid-cols-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
      <MobileNavButton
        icon="🏙️"
        label="Ville"
        onClick={
          onCity
        }
        active
      />

      <MobileNavButton
        icon="📦"
        label="Coffre"
        onClick={
          onInventory
        }
      />

      <MobileNavButton
        icon="🕴️"
        label="Troupes"
        onClick={
          onTroops
        }
      />

      <MobileNavButton
        icon="📋"
        label="Missions"
        onClick={
          onMissions
        }
      />
    </nav>
  )
}

type MobileNavButtonProps = {
  icon: string
  label: string
  onClick: () => void
  active?: boolean
}

function MobileNavButton({
  icon,
  label,
  onClick,
  active = false,
}: MobileNavButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition ${
        active
          ? "bg-red-700/80 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="text-base">
        {icon}
      </span>

      <span className="truncate text-[8px] font-black uppercase tracking-wide">
        {label}
      </span>
    </button>
  )
}
