import { Toaster } from '@/components/ui/sonner'

import ControlPanel from './components/controls/ControlPanel'
import { ElapsedTimer } from './components/ElapsedTimer'
import { AppLayout } from './components/layout/AppLayout'
import { CannonProvider } from './context/CannonProvider'
import CanvasScene from './components/simulation/CanvasScene'

function App() {
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
