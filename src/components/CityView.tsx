import { BUILDING_NAMES } from "../data/buildingNames"

import type {
  BuildingType,
} from "../types/building"

type Props = {
  buildings: any[]
  selectedId: string | null
  onSelect: (id: string) => void
}

type BuildingPosition = {
  left: string
  top: string
  icon: string
}

const BUILDING_POSITIONS: Record<
  BuildingType,
  BuildingPosition
> = {
  villa: {
    left: "45%",
    top: "15%",
    icon: "🏛️",
  },

  workshop: {
    left: "15%",
    top: "58%",
    icon: "🚘",
  },

  hideout: {
    left: "72%",
    top: "55%",
    icon: "🕵️",
  },

  wall: {
    left: "45%",
    top: "78%",
    icon: "🛡️",
  },

  laboratory: {
    left: "45%",
    top: "42%",
    icon: "🧪",
  },

  syndicate: {
    left: "76%",
    top: "22%",
    icon: "🤝",
  },

  factory: {
    left: "18%",
    top: "25%",
    icon: "🏭",
  },
}

export default function CityView({
  buildings,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div
      className="
        relative
        h-[600px]
        w-full
        overflow-hidden
        rounded-xl
        border
        border-gray-800
        bg-cover
        bg-center
      "
      style={{
        backgroundImage:
          "url('/city-map.png')",
      }}
    >
      {/* OVERLAY SOMBRE */}
      <div className="absolute inset-0 bg-black/25" />

      {/* BÂTIMENTS */}
      {buildings.map((building) => {
        const buildingType =
          building.type as BuildingType

        const position =
          BUILDING_POSITIONS[
            buildingType
          ]

        if (!position) {
          return null
        }

        const isSelected =
          selectedId === building.id

        return (
          <div
            key={building.id}
            onClick={() =>
              onSelect(building.id)
            }
            className={`
              absolute
              z-10
              cursor-pointer
              transition-all
              duration-200
              hover:scale-110
              ${
                isSelected
                  ? "z-20 scale-110"
                  : ""
              }
            `}
            style={{
              left: position.left,
              top: position.top,
              transform:
                "translate(-50%, -50%)",
            }}
          >
            <div
              className={`
                min-w-[120px]
                rounded-xl
                border
                px-4
                py-3
                text-center
                shadow-lg
                backdrop-blur-md
                transition-all
                ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-500/20"
                    : "border-gray-700 bg-gray-900/70"
                }
              `}
            >
              {/* ICÔNE */}
              <div className="text-3xl">
                {position.icon}
              </div>

              {/* NOM */}
              <p className="mt-1 text-sm font-bold text-white">
                {BUILDING_NAMES[
                  buildingType
                ] || buildingType}
              </p>

              {/* NIVEAU */}
              <p className="text-xs text-gray-300">
                Niveau {building.level}
              </p>

              {/* AMÉLIORATION */}
              {building.is_upgrading && (
                <p className="mt-1 animate-pulse text-xs text-yellow-400">
                  ⏳ Construction
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}