import { useDeferredValue, useMemo, useState } from 'react'
import type { FilterKey, Toilet } from '../types'
import { distanceKm, filterToilets, mobileResultRenderLimit, resultRenderLimit } from '../utils/toilets'

export function useToiletFilters(toilets: Toilet[], options: { compactResults?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [nearestToiletId, setNearestToiletId] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)
  const renderLimit = options.compactResults ? mobileResultRenderLimit : resultRenderLimit

  const filteredToilets = useMemo(
    () =>
      filterToilets({
        toilets,
        query: deferredQuery,
        activeFilters,
        userLocation,
      }),
    [activeFilters, deferredQuery, toilets, userLocation],
  )

  const selectedToilet = useMemo(() => {
    if (!selectedId) return null
    return filteredToilets.find((toilet) => toilet.id === selectedId) ?? null
  }, [filteredToilets, selectedId])

  const nearestToilet = useMemo(() => {
    if (!nearestToiletId) return null
    return toilets.find((toilet) => toilet.id === nearestToiletId) ?? null
  }, [nearestToiletId, toilets])

  const displayedToilets = useMemo(
    () => filteredToilets.slice(0, renderLimit),
    [filteredToilets, renderLimit],
  )

  function toggleFilter(filter: FilterKey) {
    setActiveFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
  }

  function resetFilters() {
    setQuery('')
    setActiveFilters(new Set())
    setSelectedId(null)
    setNearestToiletId(null)
    setLocationMessage(null)
  }

  function pickNearest(onNearest?: (location: [number, number]) => void) {
    setLocationMessage('Finding your location...')

    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ]
        let nearest: Toilet | null = null
        let nearestDistance = Number.POSITIVE_INFINITY

        for (const toilet of toilets) {
          const nextDistance = distanceKm(nextLocation, toilet.coordinates)
          if (nextDistance < nearestDistance) {
            nearest = toilet
            nearestDistance = nextDistance
          }
        }

        setUserLocation(nextLocation)
        if (!nearest) {
          setLocationMessage('Location found, but the toilet dataset is not ready yet.')
          return
        }

        setNearestToiletId(nearest.id)
        setLocationMessage(
          `Nearest public toilet highlighted: ${nearest.name} (${nearestDistance.toFixed(1)} km away).`,
        )
        onNearest?.(nearest.coordinates)
      },
      () => {
        setLocationMessage('Location permission was not granted.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    )
  }

  return {
    activeFilterCount: activeFilters.size,
    activeFilters,
    displayedToilets,
    filteredToilets,
    locationMessage,
    nearestToiletId,
    nearestToilet,
    query,
    selectedId,
    selectedToilet,
    setQuery,
    setSelectedId,
    pickNearest,
    resetFilters,
    toggleFilter,
    userLocation,
    visibleCount: filteredToilets.length,
  }
}
