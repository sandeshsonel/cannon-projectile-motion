import { type ReactNode } from 'react'

import Navbar from './Navbar'
import Footer from './Footer'
import { SimulationResultDialog } from '../SimulationResultDialog'
import { useCannonState } from '@/context'

interface Props {
  children: ReactNode
}

function unixToTime(ts: number) {
  const d = new Date(ts * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const AppLayout = ({ children }: Props) => {
  const {
    startTime,
    endTime,
    targetSummary: { isOpenSuccessModal, countTargetHit, countTotalFire }
  } = useCannonState()

  const totalTime =
    startTime && endTime
      ? unixToTime(Math.floor((endTime - startTime) / 1000))
      : '00:00:00'

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
