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
  | "deployment_capacity_1"
  | "deployment_capacity_2"
  | "deployment_capacity_3"
  | "criminal_command"

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
