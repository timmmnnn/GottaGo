import { useCallback, useMemo, useState } from 'react'

export type GamificationAction = 'searched' | 'checkedFit' | 'foundNearest' | 'selectedPlace' | 'openedDirections'

export type GamificationStep = {
  action: GamificationAction
  label: string
  points: number
}

export type GamificationSummary = {
  completedActions: Set<GamificationAction>
  level: string
  progress: number
  score: number
  steps: GamificationStep[]
}

const storageKey = 'gottago.tripReadiness.v1'

const steps: GamificationStep[] = [
  { action: 'searched', label: 'Search the area', points: 5 },
  { action: 'checkedFit', label: 'Check fit', points: 10 },
  { action: 'selectedPlace', label: 'Inspect a place', points: 10 },
  { action: 'foundNearest', label: 'Find nearest', points: 25 },
  { action: 'openedDirections', label: 'Start route', points: 30 },
]

function readInitialActions() {
  if (typeof window === 'undefined') return new Set<GamificationAction>()

  try {
    if (typeof window.localStorage?.getItem !== 'function') return new Set<GamificationAction>()
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return new Set<GamificationAction>()
    const values = JSON.parse(stored) as GamificationAction[]
    return new Set(values.filter((value) => steps.some((step) => step.action === value)))
  } catch {
    return new Set<GamificationAction>()
  }
}

function writeActions(actions: Set<GamificationAction>) {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.localStorage?.setItem !== 'function') return
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(actions)))
  } catch {
    // Progress is a local nicety; restricted storage should not block the map workflow.
  }
}

export function useGamification() {
  const [completedActions, setCompletedActions] = useState<Set<GamificationAction>>(readInitialActions)

  const award = useCallback((action: GamificationAction) => {
    setCompletedActions((current) => {
      if (current.has(action)) return current
      const next = new Set(current).add(action)
      writeActions(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const next = new Set<GamificationAction>()
    writeActions(next)
    setCompletedActions(next)
  }, [])

  const summary = useMemo(() => {
    const completedSteps = steps.filter((step) => completedActions.has(step.action))
    const score = completedSteps.reduce((total, step) => total + step.points, 0)
    const progress = Math.round((completedSteps.length / steps.length) * 100)
    const level =
      completedActions.has('openedDirections') && completedActions.has('foundNearest')
        ? 'Route ready'
        : completedActions.has('foundNearest') || completedActions.has('selectedPlace')
          ? 'Almost ready'
          : 'Getting oriented'

    return {
      completedActions,
      level,
      progress,
      score,
      steps,
    }
  }, [completedActions])

  return {
    award,
    reset,
    summary,
  }
}
