import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'
import { Toaster } from '@/components/ui/sonner'

import { CannonProvider } from './context/CannonProvider'

import ControlPanel from './components/controls/ControlPanel'
import AppLayout from './components/layout/AppLayout'
import CanvasScene from './components/simulation/CanvasScene'
import ElapsedTimer from './components/ElapsedTimer'

function App() {
  useEffect(() => {
    if (import.meta.env.PROD) {
      Clarity.init(import.meta.env.VITE_APP_CLARITY_ID)
    }
  }, [])
  return (
    <>
      <CannonProvider>
        <AppLayout>
          <CanvasScene />
          <ElapsedTimer />
          <ControlPanel />
        </AppLayout>
      </CannonProvider>
      <Toaster />
    </>
  )
}

export default App
