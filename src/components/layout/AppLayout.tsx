import { type ReactNode } from 'react'

import Navbar from './Navbar'
import Footer from './Footer'
import { SimulationResultDialog } from '../SimulationResultDialog'
import { useCannonState } from '@/context'

interface Props {
  children: ReactNode
}

function formatElapsedTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':')
}

const AppLayout = ({ children }: Props) => {
  const {
    startTime,
    endTime,
    targetSummary: { isOpenSuccessModal, countTargetHit, countTotalFire }
  } = useCannonState()

  const totalTime =
    startTime && endTime ? formatElapsedTime(endTime - startTime) : '00:00:00'

  return (
    <>
      <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 relative overflow-hidden">{children}</main>
        <Footer />
      </div>
      {isOpenSuccessModal && (
        <SimulationResultDialog
          open={isOpenSuccessModal}
          shots={countTotalFire}
          accuracy={Number(
            ((countTargetHit / countTotalFire) * 100).toFixed(2)
          )}
          targetsHit={countTargetHit}
          totalTime={totalTime}
        />
      )}
    </>
  )
}

export default AppLayout
