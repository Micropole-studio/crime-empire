export type ResearchCategory =
  | "military"
  | "economy"
  | "organization"

export type ResearchType =
  | "reinforced_training"
  | "recruitment_capacity_1"
  | "recruitment_speed_1"
  | "recruitment_capacity_2"
  | "henchman_doctrine"
  | "second_recruitment_queue"
  | "criminal_command"

  /*
   * Affaires clandestines
   */
  | "underground_accounting_1"
  | "supplier_network_1"
  | "ghost_workshops_1"
  | "influence_network_1"
  | "hidden_warehouses_1"

  /*
   * Réseau & Territoire
   */
  | "clandestine_routes_1"
  | "clandestine_routes_2"
  | "loot_organization_1"
  | "loot_organization_2"
  | "experienced_teams_1"

export type ResearchStatus =
  | "researching"
  | "completed"

export type CityResearch = {
  id: string
  city_id: string
  research_key: ResearchType
  status: ResearchStatus
  started_at: string | null
  finish_at: string | null
  completed_at: string | null
}
