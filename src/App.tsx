import { useCallback, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { AppRail, ControlPanel } from './components/ControlPanel'
import type { PanelPage } from './components/ControlPanel'
import { MapPanel } from './components/MapPanel'
import type { GamificationAction } from './hooks/useGamification'
import { useGamification } from './hooks/useGamification'
import { useLeafletMarkers } from './hooks/useLeafletMarkers'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useToiletDataset } from './hooks/useToiletDataset'
import { useToiletFilters } from './hooks/useToiletFilters'
import type { Toilet } from './types'
import { datasetStats, distanceKm, isOpenNow } from './utils/toilets'
import './App.css'

function App() {
  const [panelPage, setPanelPage] = useState<PanelPage>('map')
  const isMobile = useMediaQuery('(max-width: 820px)')
  const { award, summary: gamification } = useGamification()
  const { dataset, loadError, toilets } = useToiletDataset()
  const {
    activeFilterCount,
    activeFilters,
    displayedToilets,
    filteredToilets,
    locationMessage,
    nearestToiletId,
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
  } = useToiletFilters(toilets, { compactResults: isMobile })

  const { flyToLocation, mapNode, mapZoom, resetMap, visibleMapMarkers } = useLeafletMarkers({
    compactMarkers: isMobile,
    filteredToilets,
    nearestToiletId,
    nearestToilet,
    selectedToilet,
    onSelectToilet: setSelectedId,
  })

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
    (filter: Parameters<typeof toggleFilter>[0]) => {
      award('checkedFit')
      toggleFilter(filter)
    },
    [award, toggleFilter],
  )

  const getDistanceKm = useCallback(
    (toilet: Toilet) => (userLocation ? distanceKm(userLocation, toilet.coordinates) : null),
    [userLocation],
  )

  return (
    <main className="app-shell">
      <AppRail activePage={panelPage} onPageChange={setPanelPage} />
      <ControlPanel
        activeFilterCount={activeFilterCount}
        activeFilters={activeFilters}
        dataset={dataset}
        displayedToilets={displayedToilets}
        gamification={gamification}
        getDistanceKm={getDistanceKm}
        loadError={loadError}
        locationMessage={locationMessage}
        openNowCount={openNowCount}
        page={panelPage}
        query={query}
        selectedId={selectedId}
        totalRecords={totalRecords}
        visibleCount={visibleCount}
        onClearSearch={() => setQuery('')}
        onPageChange={setPanelPage}
        onPickNearest={pickNearestToilet}
        onQueryChange={queryChanged}
        onReset={resetExperience}
        onSelectToilet={selectToilet}
        onToggleFilter={toggleFacilityFilter}
      />
      <MapPanel
        hasDataset={Boolean(dataset)}
        mapNode={mapNode}
        mapZoom={mapZoom}
        onAward={awardAction}
        selectedDistance={selectedDistance}
        selectedToilet={selectedToilet}
        totalRecords={totalRecords}
        visibleMapMarkers={visibleMapMarkers}
      />
    </main>
  )
}

export default App
