import { useCallback, useLayoutEffect, useMemo, useState } from 'react'

import type {
  CannonContextType,
  CannonSettingsTypeKey,
  ControlPanelToggleKey,
  Projectile,
  ProjectilePathEntry,
  Target
} from '@/types'

import { CannonStateContext } from './CannonStateContext'
import { CannonActionsContext } from './CannonActionsContext'
import { CannonDerivedContext } from './CannonDerivedContext'
import { generateTargets } from '@/lib/utils'

type StateType = CannonContextType['state']

/* ───────────────── INITIAL STATE ───────────────── */

const initialState: StateType = {
  controlPannel: {
    isVector: false,
    isGrid: true,
    isPath: true,
    isAirResistance: false
  },
  cannonSettings: {
    speed: 32,
    angle: -66,
    position: { x: 40, y: 348 }
  },
  activeProjectileId: null,
  projectilePaths: {},
  isPlaying: false,
  isPaused: false,
  isFired: false,
  startTime: null,
  endTime: null,
  isRestart: false,
  isContinue: false,
  isReset: true,
  isAngleSelected: false,
  targetSummary: {
    currentTargetIndex: 0,
    totolTargets: 0,
    countTotalFire: 0,
    countTargetHit: 0,
    isOpenSuccessModal: false
  }
}

/* ───────────────── PROVIDER ───────────────── */

export const CannonProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<StateType>(initialState)

  /* ─────────────── CORE HELPER ─────────────── */

  const handleStateChange = useCallback(
    (
      updater: keyof StateType | ((prev: StateType) => StateType),
      value?: StateType[keyof StateType]
    ) => {
      setState((prev) =>
        typeof updater === 'function'
          ? updater(prev)
          : { ...prev, [updater]: value }
      )
    },
    []
  )

  /* ─────────────── PLAYBACK ─────────────── */

  const handleToogleIsPlaying = useCallback(
    (isPlaying?: boolean) => {
      handleStateChange((prev) => ({
        ...prev,
        isPlaying: isPlaying ?? !prev.isPlaying
      }))
    },
    [handleStateChange]
  )

  const handleToogleIsPause = useCallback(
    (isPaused?: boolean) => {
      handleStateChange((prev) => ({
        ...prev,
        isPaused: isPaused ?? !prev.isPaused,
        isPlaying: false
      }))
    },
    [handleStateChange]
  )

  const handleResumeProjectile = useCallback(() => {
    handleStateChange((prev) => ({
      ...prev,
      isPaused: false,
      isContinue: true
    }))
  }, [handleStateChange])

  /* ─────────────── RESET ─────────────── */

  const handleReset = useCallback(() => {
    setState({ ...initialState, isReset: true })
  }, [])

  const handleRestartProjectile = useCallback(() => {
    handleStateChange((prev) => ({
      ...prev,
      isRestart: !prev.isRestart
    }))
  }, [handleStateChange])

  /* ─────────────── FIRE ─────────────── */

  const handleToggleFire = useCallback(
    (isFire?: boolean) => {
      handleStateChange((prev) => ({
        ...prev,
        isFired: isFire ?? !prev.isFired,
        startTime: !prev.startTime ? new Date().getTime() : null
      }))

      if (isFire !== false) {
        setTimeout(() => {
          handleStateChange((prev) => ({
            ...prev,
            isFired: false
          }))
        }, 100)
      }
    },
    [handleStateChange]
  )

  /* ─────────────── UI CONTROLS ─────────────── */

  const handleToggleControlPannel = useCallback(
    (type: ControlPanelToggleKey) => {
      handleStateChange((prev) => ({
        ...prev,
        controlPannel: {
          ...prev.controlPannel,
          [type]: !prev.controlPannel[type]
        }
      }))
    },
    [handleStateChange]
  )

  const handleChangeSettings = useCallback(
    (type: CannonSettingsTypeKey, value: number) => {
      handleStateChange((prev) => ({
        ...prev,
        cannonSettings: {
          ...prev.cannonSettings,
          [type]: value
        }
      }))
    },
    [handleStateChange]
  )

  const handleChangePosition = useCallback(
    (position: { x: number; y: number } | 'x' | 'y', value?: number) => {
      handleStateChange((prev) => ({
        ...prev,
        cannonSettings: {
          ...prev.cannonSettings,
          position:
            typeof position === 'string'
              ? { ...prev.cannonSettings.position, [position]: value! }
              : { ...prev.cannonSettings.position, ...position }
        }
      }))
    },
    [handleStateChange]
  )

  // const handleTargetPosition = useCallback(
  //   (position: 'x' | 'y', value?: number) => {
  //     handleStateChange((prev) => ({
  //       ...prev,
  //       targetPosition: {
  //         ...prev.targetPosition,
  //         [position]: value
  //       }
  //     }))
  //   },
  //   [handleStateChange]
  // )

  /* ─────────────── PROJECTILES ─────────────── */

  const handleAddProjectilePath = useCallback(
    (id: string | null, pathInfo?: ProjectilePathEntry) => {
      handleStateChange((prev) => ({
        ...prev,
        activeProjectileId: id,
        isPlaying: true,
        ...(id &&
          pathInfo && {
            projectilePaths: {
              ...prev.projectilePaths,
              [id]: pathInfo
            }
          })
      }))
    },
    [handleStateChange]
  )

  const handleRemoveProjectilePathById = useCallback(
    (projectileId: string) => {
      handleStateChange((prev) => {
        const next = { ...prev.projectilePaths }
        delete next[projectileId]
        return { ...prev, projectilePaths: next }
      })
    },
    [handleStateChange]
  )

  const handleUpdateActiveProjectile = useCallback(
    (updateInfo: Partial<ProjectilePathEntry>) => {
      handleStateChange((prev) => {
        if (!prev.activeProjectileId) return prev
        const id = prev.activeProjectileId
        return {
          ...prev,
          projectilePaths: {
            ...prev.projectilePaths,
            [id]: {
              ...prev.projectilePaths[id],
              ...updateInfo
            }
          }
        }
      })
    },
    [handleStateChange]
  )

  const handleUpdateProjectilePath = useCallback(
    (
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
            paths: [...(prev.projectilePaths[id]?.paths ?? []), path]
          }
        }
      }))
    },
    [handleStateChange]
  )

  const handleSelectCannonAngle = useCallback(
    (isSelect?: boolean) => {
      handleStateChange((prev) => ({
        ...prev,
        isAngleSelected: isSelect || !prev.isAngleSelected
      }))
    },
    [handleStateChange]
  )

  const handleSetCurrentTarget = useCallback(
    (targets: Target[]) => {
      handleStateChange((prev) => ({
        ...prev,
        targetSummary: {
          ...prev.targetSummary,
          totolTargets: targets.length,
          currentTarget: targets[prev.targetSummary.currentTargetIndex]
        }
      }))
    },
    [handleStateChange]
  )

  /* ─────────────── DERIVED ─────────────── */

  const activeProjectile = useMemo(() => {
    if (!state.activeProjectileId) return null
    return state.projectilePaths[state.activeProjectileId]
  }, [state.activeProjectileId, state.projectilePaths])

  const totalTargets = useMemo(() => generateTargets(), [])

  const currentTarget = useMemo(
    () => totalTargets[state.targetSummary.currentTargetIndex] ?? null,
    [totalTargets, state.targetSummary.currentTargetIndex]
  )

  /* ─────────────── DERIVED ─────────────── */

  const handleChangeFireSummary = useCallback(
    (isTargetHit?: boolean) => {
      handleStateChange((prev) => {
        const nextHitCount = isTargetHit
          ? prev.targetSummary.countTargetHit + 1
          : prev.targetSummary.countTargetHit

        const isCompleted = nextHitCount === totalTargets.length

        return {
          ...prev,
          endTime: isCompleted ? Date.now() : null,
          targetSummary: {
            ...prev.targetSummary,
            currentTargetIndex: isTargetHit
              ? prev.targetSummary.currentTargetIndex + 1
              : prev.targetSummary.currentTargetIndex,
            countTotalFire: prev.targetSummary.countTotalFire + 1,
            countTargetHit: nextHitCount,
            isOpenSuccessModal: isCompleted
          }
        }
      })
    },
    [handleStateChange, totalTargets]
  )

  useLayoutEffect(() => {
    const timeout = setTimeout(() => {
      handleSetCurrentTarget(totalTargets)
    }, 0)
    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const actions = useMemo(
    () => ({
      handleToggleControlPannel,
      handleChangeSettings,
      handleChangePosition,
      // handleTargetPosition,
      handleUpdateProjectilePath,
      handleAddProjectilePath,
      handleUpdateActiveProjectile,
      handleToogleIsPlaying,
      handleRemoveProjectilePathById,
      handleToggleFire,
      handleToogleIsPause,
      handleRestartProjectile,
      handleResumeProjectile,
      handleReset,
      handleSelectCannonAngle,
      handleChangeFireSummary
    }),
    [
      handleToggleControlPannel,
      handleChangeSettings,
      handleChangePosition,
      // handleTargetPosition,
      handleUpdateProjectilePath,
      handleAddProjectilePath,
      handleUpdateActiveProjectile,
      handleToogleIsPlaying,
      handleRemoveProjectilePathById,
      handleToggleFire,
      handleToogleIsPause,
      handleRestartProjectile,
      handleResumeProjectile,
      handleReset,
      handleSelectCannonAngle,
      handleChangeFireSummary
    ]
  )

  return (
    <CannonStateContext.Provider value={state}>
      <CannonActionsContext.Provider value={actions}>
        <CannonDerivedContext.Provider
          value={{ activeProjectile, currentTarget }}>
          {children}
        </CannonDerivedContext.Provider>
      </CannonActionsContext.Provider>
    </CannonStateContext.Provider>
  )
}
