import { useEffect, useMemo, useState } from 'react'
import type { ToiletDataset } from '../types'

export function useToiletDataset() {
  const [dataset, setDataset] = useState<ToiletDataset | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/data/toilets.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`)
        return response.json() as Promise<ToiletDataset>
      })
      .then((nextDataset) => {
        if (cancelled) return
        setDataset(nextDataset)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Unable to load toilet dataset')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const toilets = useMemo(() => dataset?.toilets ?? [], [dataset])

  return {
    dataset,
    loadError,
    toilets,
  }
}
