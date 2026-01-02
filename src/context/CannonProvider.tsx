import type {
  CannonContextType,
  CannonSettingsTypeKey,
  ControlPanelToggleKey
} from '@/types'
import { useContext, useState } from 'react'

import { createContext } from 'react'

type StateType = CannonContextType['state']

const initalState: StateType = {
  controlPannel: {
    isVector: false,
    isGrid: true,
    isPath: false,
    isAirResistance: false
  },
  cannonSettings: {
    speed: 30,
    angle: -45,
    position: {
      x: 60,
      y: 348
    }
  },
  targetPosition: {
    x: 100,
    y: 0
  }
}

const CannonContext = createContext<CannonContextType>({
  state: initalState,
  stateHandler: {
    handleToggleControlPannel: () => {},
    handleChangeSettings: () => {},
    handleChangePosition: () => {},
    handleTargetPosition: () => {}
  }
})

export const CannonProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<StateType>(initalState)

  console.log('xoxo-state', state)

  function handleStateChange<K extends keyof StateType>(
    key: K,
    value: StateType[K]
  ): void

  function handleStateChange(updater: (prev: StateType) => StateType): void

  function handleStateChange(
    arg1: keyof StateType | ((prev: StateType) => StateType),
    arg2?: StateType[keyof StateType]
  ) {
    setState((prev) => {
      if (typeof arg1 === 'function') {
        return arg1(prev)
      }

      return {
        ...prev,
        [arg1]: arg2
      }
    })
  }

  const handleToggleControlPannel = (type: ControlPanelToggleKey) => {
    handleStateChange((prev) => ({
      ...prev,
      controlPannel: {
        ...prev.controlPannel,
        [type]: !prev.controlPannel[type]
      }
    }))
  }

  const handleChangeSettings = (type: CannonSettingsTypeKey, value: number) => {
    handleStateChange((prev) => ({
      ...prev,
      cannonSettings: {
        ...prev.cannonSettings,
        [type]: value
      }
    }))
  }

  const handleChangePosition = (
    position: { x: number; y: number } | 'x' | 'y',
    value?: number
  ) => {
    handleStateChange((prev) => ({
      ...prev,
      cannonSettings: {
        ...prev.cannonSettings,
        position:
          typeof position === 'string'
            ? {
                ...prev.cannonSettings.position,
                [position]: value!
              }
            : {
                ...prev.cannonSettings.position,
                ...position
              }
      }
    }))
  }

  const handleTargetPosition = (position: 'x' | 'y', value?: number) => {
    handleStateChange((prev) => ({
      ...prev,
      targetPosition: {
        ...prev.targetPosition,
        [position]: value
      }
    }))
  }

  const values: CannonContextType = {
    state,
    stateHandler: {
      handleToggleControlPannel,
      handleChangeSettings,
      handleChangePosition,
      handleTargetPosition
    }
  }

  return (
    <CannonContext.Provider value={values}>{children}</CannonContext.Provider>
  )
}

export const useCannonContext = () => {
  const context = useContext(CannonContext)

  if (!context) {
    throw new Error('useCannonContext must be used within a ThemeProvider')
  }

  return context
}
