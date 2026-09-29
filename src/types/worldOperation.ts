import type {
  HumanDeploymentSelection,
} from "./deployment"

export type WorldOperation = {
  id: string
  cityId: string

  targetNodeId: string
  targetName: string
  targetIcon: string

  startedAt: string
  arrivalAt: string

  travelSeconds: number

  squadPower: number
  enemyPower: number

  selection: HumanDeploymentSelection
}
