import type {
  BuildingType,
} from "../types/building"

type BuildingConfig = {
  name: string
  icon: string
  image: string
  description: string

  /*
   * Conservé pour les systèmes qui
   * l’utilisent encore.
   *
   * Les coûts réels des niveaux sont
   * définis dans progression.ts.
   */
  baseCost: number

  /*
   * Production d'argent temporaire.
   *
   * Le Syndicat produira de l'Influence
   * et l'Usine produira des Équipements :
   * leur production sera ajoutée
   * séparément dans le système économique.
   */
  baseMoneyPerHour: number

  maxLevel: number
}

export const BUILDINGS_CONFIG: Record<
  BuildingType,
  BuildingConfig
> = {
  villa: {
    name: "Villa",
    icon: "🏛️",
    image: "/buildings/villa.png",
    description:
      "Le quartier général de votre empire. Elle accélère les constructions et débloque de nouveaux bâtiments.",

    baseCost: 100,
    baseMoneyPerHour: 0,
    maxLevel: 10,
  },

  workshop: {
    name: "Garage",
    icon: "🚘",
    image: "/buildings/workshop.png",
    description:
      "Gère vos véhicules, leur capacité, leurs améliorations et les revenus des missions.",

    baseCost: 80,
    baseMoneyPerHour: 50,
    maxLevel: 10,
  },

  hideout: {
    name: "Planque",
    icon: "🏚️",
    image: "/buildings/hideout.png",
    description:
      "Augmente votre capacité de stockage et protège une partie de vos ressources.",

    baseCost: 100,
    baseMoneyPerHour: 30,
    maxLevel: 10,
  },

  wall: {
    name: "Sécurité",
    icon: "🛡️",
    image: "/buildings/wall.png",
    description:
      "Permet de recruter des hommes de main, de défendre la ville et de lancer des attaques.",

    baseCost: 150,
    baseMoneyPerHour: 0,
    maxLevel: 10,
  },

  laboratory: {
    name: "Laboratoire",
    icon: "🧪",
    image: "/buildings/laboratory.png",
    description:
      "Permet de lancer des recherches offrant des bonus permanents à la ville, aux véhicules et aux troupes.",

    baseCost: 1000,
    baseMoneyPerHour: 0,
    maxLevel: 10,
  },

  syndicate: {
    name: "Syndicat",
    icon: "🤝",
    image: "/buildings/syndicate.png",
    description:
      "Développe votre réseau criminel et produit de l'Influence pour étendre votre contrôle sur la ville.",

    baseCost: 750,
    baseMoneyPerHour: 0,
    maxLevel: 10,
  },

  factory: {
    name: "Usine",
    icon: "🏭",
    image: "/buildings/factory.png",
    description:
      "Produit des équipements servant à renforcer et améliorer les troupes recrutées par le poste de Sécurité.",

    baseCost: 1200,
    baseMoneyPerHour: 0,
    maxLevel: 10,
  },
}