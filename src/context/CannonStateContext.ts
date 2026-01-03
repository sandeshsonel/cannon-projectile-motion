import { createContext, useContext } from 'react'
import type { CannonContextType } from '@/types'

type StateType = CannonContextType['state']

export const CannonStateContext = createContext<StateType | null>(null)

export const useCannonState = () => {
  const ctx = useContext(CannonStateContext)
  if (!ctx) {
    throw new Error('useCannonState must be used within CannonProvider')
  }
  return ctx
}
