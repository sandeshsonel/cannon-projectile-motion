import type {
  CannonContextType,
  CannonSettingsTypeKey,
  ControlPanelToggleKey,
  Projectile,
  ProjectilePathEntry
} from '@/types'
import { useContext, useMemo, useState } from 'react'

import { createContext } from 'react'

type StateType = CannonContextType['state']

const initalState: StateType = {
  controlPannel: {
    isVector: false,
    isGrid: true,
    isPath: true,
    isAirResistance: false
  },
  cannonSettings: {
    speed: 32,
    angle: -66,
    position: {
      x: 60,
      y: 348
    }
  },
  targetPosition: {
    x: 100,
    y: 0
  },
  activeProjectileId: null,
  projectilePaths: {},
  isPlaying: false,
  isPaused: false,
  isFired: false,
  startTime: 0,
  isRestart: false,
  isContinue: false,
  isReset: true
}

const CannonContext = createContext<CannonContextType>({
  state: initalState,
  helperState: { activeProjectile: null },
  stateHandler: {
    handleToggleControlPannel: () => {},
    handleChangeSettings: () => {},
    handleChangePosition: () => {},
    handleTargetPosition: () => {},
    handleAddProjectilePath: () => {},
    handleUpdateProjectilePath: () => {},
    handleUpdateActiveProjectile: () => {},
    handleToogleIsPlaying: () => {},
    handleRemoveProjectilePathById: () => {},
    handleToggleFire: () => {},
    handleToogleIsPause: () => {},
    handleRestartProjectile: () => {},
    handleResumeProjectile: () => {},
    handleReset: () => {}
  }
})

export const CannonProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<StateType>(initalState)

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

  const handleToogleIsPlaying = (isPlaying?: boolean) => {
    handleStateChange((prev) => ({
      ...prev,
      isPlaying: isPlaying ?? !prev.isPlaying
    }))
  }

  const handleToogleIsPause = (isPaused?: boolean) => {
    handleStateChange((prev) => ({
      ...prev,
      isPaused: isPaused ?? !prev.isPaused,
      isPlaying: false
    }))
  }

  const handleResumeProjectile = () => {
    handleStateChange((prev) => ({
      ...prev,
      isPaused: false,
      isContinue: true
    }))
  }

  const handleReset = (isReset?: boolean) => {
    handleStateChange(() => ({
      ...initalState,
      isReset: isReset ?? true
    }))

    setTimeout(() => {
      handleReset(false)
    }, 100)
  }

  const handleRestartProjectile = () => {
    handleStateChange((prev) => ({
      ...prev,
      isRestart: !prev.isRestart
    }))

    setInterval(() => {
      handleRestartProjectile()
    }, 200)
  }

  const handleToggleFire = (isFire?: boolean) => {
    handleStateChange((prev) => ({
      ...prev,
      isFired: isFire ?? !prev.isFired,
      startTime: 1
    }))
    setTimeout(() => {
      handleToggleFire(false)
    }, 0)
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

  const handleAddProjectilePath = (
    id: string | null,
    pathInfo?: ProjectilePathEntry
  ) => {
    handleStateChange((prev) => ({
      ...prev,
      activeProjectileId: id,
      isPlaying: true,
      ...(id &&
        pathInfo && {
          projectilePaths: { ...prev.projectilePaths, [id]: pathInfo }
        })
    }))
  }

  const handleRemoveProjectilePathById = (projectileId: string) => {
    handleStateChange((prev) => {
      const newProjectilePaths = { ...prev.projectilePaths }
      delete newProjectilePaths[projectileId]
      return {
        ...prev,
        projectilePaths: newProjectilePaths
      }
    })
  }

  const handleUpdateActiveProjectile = (
    updateInfo: Partial<ProjectilePathEntry>
  ) => {
    const activeProjectileId = state.activeProjectileId
    if (!activeProjectileId) return
    handleStateChange((prev) => ({
      ...prev,
      projectilePaths: {
        ...prev.projectilePaths,
        [activeProjectileId]: {
          ...prev.projectilePaths[activeProjectileId],
          ...updateInfo
        }
      }
    }))
  }

  const handleUpdateProjectilePath = (
    id: string,
    path: { x: number; y: number },
    projectileInfo?: Projectile
  ) => {
    handleStateChange((prev) => ({
      ...prev,
      projectilePaths: {
        ...prev.projectilePaths,
        [id]: {
          ...prev.projectilePaths[id],
          ...(projectileInfo ?? {}),
          paths: [...(prev.projectilePaths?.[id]?.paths ?? []), path]
        }
      }
    }))
  }

  const activeProjectile = useMemo(() => {
    if (!state.activeProjectileId) return null
    return state.projectilePaths[state.activeProjectileId]
  }, [state.activeProjectileId, state.projectilePaths])

  const values: CannonContextType = {
    state,
    helperState: { activeProjectile },
    stateHandler: {
      handleToggleControlPannel,
      handleChangeSettings,
      handleChangePosition,
      handleTargetPosition,
      handleUpdateProjectilePath,
      handleAddProjectilePath,
      handleUpdateActiveProjectile,
      handleToogleIsPlaying,
      handleRemoveProjectilePathById,
      handleToggleFire,
      handleToogleIsPause,
      handleRestartProjectile,
      handleResumeProjectile,
      handleReset
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
