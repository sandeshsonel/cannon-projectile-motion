import { createContext, useContext } from 'react'
import type { CannonContextType } from '@/types'

type ActionsType = CannonContextType['stateHandler']

export const CannonActionsContext = createContext<ActionsType | null>(null)

export const useCannonActions = () => {
  const ctx = useContext(CannonActionsContext)
  if (!ctx) {
    throw new Error('useCannonActions must be used within CannonProvider')
  }
  return ctx
}
