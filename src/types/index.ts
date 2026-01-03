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

export interface PathPoint {
  x: number
  y: number
}

export interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
  time: number
}

export interface ProjectilePathEntry extends Projectile {
  paths: PathPoint[]
}

export interface CannonContextType {
  state: {
    controlPannel: ControlPanelState
    cannonSettings: CannonSettingsType
    targetPosition: { x: number; y: number }
    activeProjectileId: string | null
    projectilePaths: Record<string, ProjectilePathEntry>
    isPlaying: boolean
    isPaused: boolean
    isFired: boolean
    startTime: number
    isRestart: boolean
    isContinue: boolean
    isReset: boolean
  }
  helperState: {
    activeProjectile: ProjectilePathEntry | null
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
    handleAddProjectilePath: (
      id: string | null,
      pathInfo?: ProjectilePathEntry
    ) => void
    handleUpdateProjectilePath: (
      id: string,
      path: PathPoint,
      projectileInfo?: Projectile
    ) => void
    handleUpdateActiveProjectile: (
      updateInfo: Partial<ProjectilePathEntry>
    ) => void
    handleToogleIsPlaying: (value?: boolean) => void
    handleRemoveProjectilePathById: (projectileId: string) => void
    handleToggleFire: (isFire?: boolean) => void
    handleToogleIsPause: (isPaused?: boolean) => void
    handleRestartProjectile: () => void
    handleResumeProjectile: () => void
    handleReset: () => void
  }
}
