import { createContext, useContext } from 'react'
import type { ProjectilePathEntry, Target } from '@/types'

interface CannonDerivedState {
  activeProjectile: ProjectilePathEntry | null
  currentTarget: Target | null
}

export const CannonDerivedContext = createContext<CannonDerivedState | null>(
  null
)

export const useCannonDerived = () => {
  const ctx = useContext(CannonDerivedContext)
  if (!ctx) {
    throw new Error('useCannonDerived must be used within CannonProvider')
  }
  return ctx
}
