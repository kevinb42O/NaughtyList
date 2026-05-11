import { useContext } from 'react'
import { IntelContext } from './intelContext.js'

export function useIntel() {
  const context = useContext(IntelContext)

  if (!context) {
    throw new Error('useIntel must be used inside IntelProvider')
  }

  return context
}