type ControlPanelState = {
  isVector: boolean
  isGrid: boolean
  isPath: boolean
  isAirResistance: boolean
}

type CannonSettingsType = {
  speed: number
  angle: number
  position: { x: number; y: number }
}

export type ControlPanelToggleKey = keyof ControlPanelState

export type CannonSettingsTypeKey = keyof CannonSettingsType

export interface CannonContextType {
  state: {
    controlPannel: ControlPanelState
    cannonSettings: CannonSettingsType
    targetPosition: { x: number; y: number }
  }
  stateHandler: {
    handleToggleControlPannel: (
      key: ControlPanelToggleKey,
      value: boolean
    ) => void
    handleChangeSettings: (key: CannonSettingsTypeKey, value: number) => void
    handleChangePosition: (
      postion: { x: number; y: number } | 'x' | 'y',
      value?: number
    ) => void
    handleTargetPosition: (position: 'x' | 'y', value?: number) => void
  }
}
