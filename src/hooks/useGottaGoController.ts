import { useCallback, useMemo, useState } from 'react'
import type { PanelPage } from '../components/ControlPanel'
import type { GamificationAction } from './useGamification'
import { useGamification } from './useGamification'
import { useLeafletMarkers } from './useLeafletMarkers'
import { useMediaQuery } from './useMediaQuery'
import { useToiletDataset } from './useToiletDataset'
import { useToiletFilters } from './useToiletFilters'
import type { FilterKey, Toilet } from '../types'
import { datasetStats, distanceKm, isOpenNow } from '../utils/toilets'

export function useGottaGoController() {
  const [panelPage, setPanelPage] = useState<PanelPage>('map')
  const isMobile = useMediaQuery('(max-width: 820px)')
  const { award, summary: gamification } = useGamification()
  const { dataset, loadError, toilets } = useToiletDataset()
  const filters = useToiletFilters(toilets, { compactResults: isMobile })

  const {
    activeFilterCount,
    activeFilters,
    displayedToilets,
    filteredToilets,
    locationMessage,
    nearestToilet,
    pickNearest,
    query,
    resetFilters,
    selectedId,
    selectedToilet,
    setQuery,
    setSelectedId,
    toggleFilter,
    userLocation,
    visibleCount,
  } = filters

  const map = useLeafletMarkers({
    compactMarkers: isMobile,
    filteredToilets,
    nearestToilet,
    selectedToilet,
    onSelectToilet: setSelectedId,
  })

  const { flyToLocation, resetMap } = map
  const totalRecords = dataset?.metadata.recordCount ?? datasetStats.records
  const openNowCount = useMemo(() => toilets.filter(isOpenNow).length, [toilets])
  const selectedDistance =
    selectedToilet && userLocation ? distanceKm(userLocation, selectedToilet.coordinates) : null

  const resetExperience = useCallback(() => {
    resetFilters()
    resetMap()
  }, [resetFilters, resetMap])

  const pickNearestToilet = useCallback(() => {
    pickNearest((location) => {
      award('foundNearest')
      flyToLocation(location)
    })
  }, [award, flyToLocation, pickNearest])

  const awardAction = useCallback(
    (action: GamificationAction) => {
      award(action)
    },
    [award],
  )

  const queryChanged = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery)
      if (nextQuery.trim().length >= 2) award('searched')
    },
    [award, setQuery],
  )

  const selectToilet = useCallback(
    (id: string) => {
      award('selectedPlace')
      setSelectedId(id)
    },
    [award, setSelectedId],
  )

  const toggleFacilityFilter = useCallback(
    (filter: FilterKey) => {
      award('checkedFit')
      toggleFilter(filter)
    },
    [award, toggleFilter],
  )

  const getDistanceKm = useCallback(
    (toilet: Toilet) => (userLocation ? distanceKm(userLocation, toilet.coordinates) : null),
    [userLocation],
  )

  return {
    controlPanelProps: {
      activeFilterCount,
      activeFilters,
      dataset,
      displayedToilets,
      gamification,
      getDistanceKm,
      loadError,
      locationMessage,
      openNowCount,
      page: panelPage,
      query,
      selectedId,
      totalRecords,
      visibleCount,
      onClearSearch: () => setQuery(''),
      onPageChange: setPanelPage,
      onPickNearest: pickNearestToilet,
      onQueryChange: queryChanged,
      onReset: resetExperience,
      onSelectToilet: selectToilet,
      onToggleFilter: toggleFacilityFilter,
    },
    mapPanelProps: {
      hasDataset: Boolean(dataset),
      mapNode: map.mapNode,
      mapZoom: map.mapZoom,
      onAward: awardAction,
      selectedDistance,
      selectedToilet,
      totalRecords,
      visibleMapMarkers: map.visibleMapMarkers,
    },
    panelPage,
    setPanelPage,
  }
}
