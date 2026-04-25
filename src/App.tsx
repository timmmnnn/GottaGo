import { useEffect, useMemo, useRef, useState } from 'react'
import L, { type LatLngExpression, type Map as LeafletMap, type Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Accessibility,
  Baby,
  Clock,
  Database,
  Layers,
  ListFilter,
  LocateFixed,
  MapPinned,
  MapPin,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Toilet,
  X,
} from 'lucide-react'
import './App.css'

type FacilityFlag = boolean | 'limited' | string | null

type Toilet = {
  id: string
  source: string
  sourceId: string
  sourceUrl: string
  name: string
  description: string | null
  address: string | null
  locality: string | null
  region: string | null
  coordinates: [number, number]
  openingHours: string
  access: string
  wheelchair: FacilityFlag
  babyChange: FacilityFlag
  unisex: FacilityFlag
  male: FacilityFlag
  female: FacilityFlag
  drinkingWater: FacilityFlag
  fee: FacilityFlag
  operator: string | null
  confidence: number
  lastVerified: string | null
}

type ToiletDataset = {
  metadata: {
    version: string
    generatedAt: string
    recordCount: number
    primarySource: string
    primarySourceUrl: string
  }
  toilets: Toilet[]
}

type FilterKey = 'accessible' | 'babyChange' | 'openNow' | 'nearby'

const defaultCenter: LatLngExpression = [-41.55, 172.8]
const datasetStats = {
  records: 4285,
  source: 'OpenStreetMap amenity=toilets',
  updated: '25 Apr 2026',
}
const markerRenderLimit = 320
const resultRenderLimit = 80

const filterCopy: Record<FilterKey, string> = {
  accessible: 'Accessible',
  babyChange: 'Baby change',
  openNow: 'Open now',
  nearby: 'Nearby',
}

const markerIcon = L.divIcon({
  className: 'toilet-marker',
  html: '<span aria-hidden="true">WC</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
})

const activeMarkerIcon = L.divIcon({
  className: 'toilet-marker toilet-marker-active',
  html: '<span aria-hidden="true">WC</span>',
  iconSize: [44, 44],
  iconAnchor: [22, 42],
})

function isPositive(value: FacilityFlag) {
  return value === true || value === 'yes' || value === 'limited'
}

function formatFlag(value: FacilityFlag) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === 'limited') return 'Limited'
  if (value) return String(value)
  return 'Unknown'
}

function isOpenNow(toilet: Toilet) {
  const hours = toilet.openingHours.toLowerCase()
  return hours === '24/7' || hours.includes('open 24') || hours.includes('24 hours')
}

function matchesSearch(toilet: Toilet, query: string) {
  const value = [
    toilet.name,
    toilet.locality,
    toilet.region,
    toilet.address,
    toilet.operator,
    toilet.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return value.includes(query.trim().toLowerCase())
}

function distanceKm(from: [number, number], to: [number, number]) {
  const earthRadius = 6371
  const dLat = ((to[0] - from[0]) * Math.PI) / 180
  const dLon = ((to[1] - from[1]) * Math.PI) / 180
  const lat1 = (from[0] * Math.PI) / 180
  const lat2 = (to[0] * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDate(date: string | undefined) {
  if (!date) return 'Unknown'
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function App() {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const map = useRef<LeafletMap | null>(null)
  const markers = useRef<Map<string, Marker>>(new Map())
  const hasSyncedInitialSelection = useRef(false)
  const [dataset, setDataset] = useState<ToiletDataset | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)

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
        setSelectedId(nextDataset.toilets[0]?.id ?? null)
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

  const filteredToilets = useMemo(() => {
    const filtered = toilets.filter((toilet) => {
      if (query && !matchesSearch(toilet, query)) return false
      if (activeFilters.has('accessible') && !isPositive(toilet.wheelchair)) return false
      if (activeFilters.has('babyChange') && !isPositive(toilet.babyChange)) return false
      if (activeFilters.has('openNow') && !isOpenNow(toilet)) return false
      if (activeFilters.has('nearby') && userLocation) {
        return distanceKm(userLocation, toilet.coordinates) <= 25
      }
      return true
    })

    if (!userLocation) return filtered

    return [...filtered].sort(
      (a, b) => distanceKm(userLocation, a.coordinates) - distanceKm(userLocation, b.coordinates),
    )
  }, [activeFilters, query, toilets, userLocation])

  const selectedToilet = useMemo(() => {
    return filteredToilets.find((toilet) => toilet.id === selectedId) ?? filteredToilets[0] ?? null
  }, [filteredToilets, selectedId])

  const visibleMarkerToilets = useMemo(() => {
    const markerToilets = filteredToilets.slice(0, markerRenderLimit)
    if (selectedToilet && !markerToilets.some((toilet) => toilet.id === selectedToilet.id)) {
      return [...markerToilets, selectedToilet]
    }
    return markerToilets
  }, [filteredToilets, selectedToilet])

  useEffect(() => {
    if (!mapNode.current || map.current) return

    const markerStore = markers.current
    const leafletMap = L.map(mapNode.current, {
      center: defaultCenter,
      zoom: 5,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(leafletMap)

    map.current = leafletMap

    return () => {
      leafletMap.remove()
      map.current = null
      markerStore.clear()
    }
  }, [])

  useEffect(() => {
    if (!map.current) return

    const visibleIds = new Set(visibleMarkerToilets.map((toilet) => toilet.id))

    markers.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove()
        markers.current.delete(id)
      }
    })

    visibleMarkerToilets.forEach((toilet) => {
      const existingMarker = markers.current.get(toilet.id)

      if (existingMarker) {
        existingMarker.setIcon(toilet.id === selectedToilet?.id ? activeMarkerIcon : markerIcon)
        return
      }

      const marker = L.marker(toilet.coordinates, {
        icon: toilet.id === selectedToilet?.id ? activeMarkerIcon : markerIcon,
        title: toilet.name,
      })

      marker.on('click', () => setSelectedId(toilet.id))
      marker.addTo(map.current as LeafletMap)
      markers.current.set(toilet.id, marker)
    })
  }, [selectedToilet?.id, visibleMarkerToilets])

  useEffect(() => {
    if (!selectedToilet) return

    const marker = markers.current.get(selectedToilet.id)
    if (!map.current || !marker) return

    marker.setIcon(activeMarkerIcon)
    if (!hasSyncedInitialSelection.current) {
      hasSyncedInitialSelection.current = true
      return
    }

    map.current.flyTo(selectedToilet.coordinates, Math.max(map.current.getZoom(), 12), {
      duration: 0.7,
    })
  }, [selectedToilet])

  function toggleFilter(filter: FilterKey) {
    setActiveFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
  }

  function showAll() {
    setQuery('')
    setActiveFilters(new Set())
    setLocationMessage(null)
    if (map.current) {
      map.current.flyTo(defaultCenter, 5, { duration: 0.7 })
    }
  }

  function pickNearest() {
    setLocationMessage('Finding your location...')
    setActiveFilters((current) => new Set(current).add('nearby'))

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
        setUserLocation(nextLocation)
        setLocationMessage('Showing toilets within 25 km, sorted by distance.')
        if (map.current) {
          map.current.flyTo(nextLocation, 12, { duration: 0.7 })
        }
      },
      () => {
        setLocationMessage('Location permission was not granted.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const filterEntries: Array<[FilterKey, typeof Accessibility]> = [
    ['accessible', Accessibility],
    ['babyChange', Baby],
    ['openNow', Clock],
    ['nearby', LocateFixed],
  ]

  const totalRecords = dataset?.metadata.recordCount ?? datasetStats.records
  const activeFilterCount = activeFilters.size
  const visibleCount = filteredToilets.length
  const displayedToilets = useMemo(
    () => filteredToilets.slice(0, resultRenderLimit),
    [filteredToilets],
  )
  const openNowCount = useMemo(() => toilets.filter(isOpenNow).length, [toilets])
  const selectedDistance =
    selectedToilet && userLocation ? distanceKm(userLocation, selectedToilet.coordinates) : null

  return (
    <main className="app-shell">
      <nav className="app-rail" aria-label="Primary">
        <div className="rail-brand" aria-label="GottaGo">
          <Toilet aria-hidden="true" />
        </div>
        <button className="rail-button rail-button-active" type="button" aria-label="Map">
          <MapPinned aria-hidden="true" />
        </button>
        <button className="rail-button" type="button" aria-label="Filters">
          <ListFilter aria-hidden="true" />
        </button>
        <button className="rail-button" type="button" aria-label="Dataset">
          <Database aria-hidden="true" />
        </button>
      </nav>

      <aside className="control-panel" aria-label="Toilet search and filters">
        <header className="panel-hero">
          <div>
            <p className="eyebrow">Aotearoa utility map</p>
            <h1>GottaGo</h1>
            <p className="hero-copy">Find a public toilet quickly, then get moving.</p>
          </div>
          <div className="brand-mark" aria-hidden="true">
            <MapPin />
          </div>
        </header>

        <section className="search-card" aria-label="Find public toilets">
          <div className="section-head">
            <div>
              <p className="section-kicker">Find a public toilet</p>
              <h2>Search New Zealand</h2>
            </div>
            <span>{totalRecords.toLocaleString('en-NZ')}</span>
          </div>

          <label className="search-box">
            <Search aria-hidden="true" />
            <span className="sr-only">Search town, suburb, landmark</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search town, suburb, landmark"
              type="search"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                <X />
              </button>
            ) : null}
          </label>

          <div className="quick-stats" aria-label="Dataset status">
            <div>
              <strong>{visibleCount.toLocaleString('en-NZ')}</strong>
              <span>visible</span>
            </div>
            <div>
              <strong>{openNowCount.toLocaleString('en-NZ')}</strong>
              <span>24 hr</span>
            </div>
            <div>
              <strong>{activeFilterCount}</strong>
              <span>filters</span>
            </div>
          </div>

          <div className="dataset-note">
            <Database aria-hidden="true" />
            <p className="muted">
              {dataset
                ? `${dataset.metadata.primarySource}. Updated ${formatDate(dataset.metadata.generatedAt)}.`
                : 'Loading the public toilet dataset.'}
            </p>
          </div>
        </section>

        <section className="filter-card" aria-label="Filters">
          <div className="section-head">
            <div>
              <p className="section-kicker">Refine</p>
              <h2>Facilities</h2>
            </div>
            <button type="button" onClick={showAll}>
              Reset
            </button>
          </div>

          <div className="filter-row" aria-label="Filters">
            {filterEntries.map(([key, Icon]) => (
              <button
                key={key}
                className="filter-button"
                data-active={activeFilters.has(key)}
                type="button"
                onClick={key === 'nearby' ? pickNearest : () => toggleFilter(key)}
              >
                <Icon aria-hidden="true" />
                {filterCopy[key]}
              </button>
            ))}
          </div>

          {locationMessage ? <p className="inline-note">{locationMessage}</p> : null}
          {loadError ? <p className="inline-note error-note">{loadError}</p> : null}
        </section>

        <section className="result-section" aria-label="Filtered toilet list">
          <div className="result-heading">
            <div>
              <p className="section-kicker">{visibleCount.toLocaleString('en-NZ')} places</p>
              <h2>All facilities</h2>
            </div>
            <button type="button" onClick={showAll}>
              Show all
            </button>
          </div>

          <div className="result-list">
            {visibleCount > displayedToilets.length ? (
              <div className="result-limit-note">
                Showing first {displayedToilets.length.toLocaleString('en-NZ')}. Search or filter to narrow the map.
              </div>
            ) : null}
            {displayedToilets.map((toilet) => {
              const distance = userLocation ? distanceKm(userLocation, toilet.coordinates) : null
              return (
                <button
                  key={toilet.id}
                  className="result-item"
                  data-active={toilet.id === selectedToilet?.id}
                  type="button"
                  onClick={() => setSelectedId(toilet.id)}
                >
                  <span>
                    <strong>{toilet.name}</strong>
                    <small>
                      {[toilet.locality, toilet.region, distance ? `${distance.toFixed(1)} km` : null]
                        .filter(Boolean)
                        .join(' · ') || toilet.sourceId}
                    </small>
                    <em>
                      {formatFlag(toilet.wheelchair)} accessible · {formatFlag(toilet.babyChange)} baby change
                    </em>
                  </span>
                  <Navigation aria-hidden="true" />
                </button>
              )
            })}
            {!filteredToilets.length ? (
              <div className="empty-state">
                <strong>No matching toilets</strong>
                <span>Try clearing a filter or searching a wider place name.</span>
              </div>
            ) : null}
          </div>
        </section>
      </aside>

      <section className="map-panel" aria-label="Map of public toilets in New Zealand">
        <div className="map-topbar">
          <div className="map-title-card">
            <p className="section-kicker">Live map</p>
            <h2>Public toilets across Aotearoa</h2>
          </div>
          <div className="map-tools" aria-label="Map status">
            <span className="trust-chip">
              <ShieldCheck aria-hidden="true" />
              {dataset ? `${totalRecords.toLocaleString('en-NZ')} mapped` : 'Loading dataset'}
            </span>
            <span className="trust-chip">
              <Layers aria-hidden="true" />
              {visibleMarkerToilets.length.toLocaleString('en-NZ')} markers
            </span>
          </div>
        </div>

        <div ref={mapNode} className="map-canvas" />

        <article className="detail-card" aria-live="polite">
          {selectedToilet ? (
            <>
              <img
                className="facility-photo"
                src="/images/facility-preview.png"
                alt=""
                width="220"
                height="124"
              />
              <div className="detail-content">
                <div className="detail-header">
                  <div>
                    <p className="section-kicker">
                      {[selectedToilet.locality, selectedToilet.region].filter(Boolean).join(' · ') ||
                        selectedToilet.source}
                    </p>
                    <h2>{selectedToilet.name}</h2>
                  </div>
                  <div className="status-pill">
                    <Sparkles aria-hidden="true" />
                    {selectedToilet.openingHours}
                  </div>
                </div>

                <p className="address">
                  {selectedToilet.address ??
                    `${selectedToilet.coordinates[0].toFixed(5)}, ${selectedToilet.coordinates[1].toFixed(5)}`}
                </p>
                <p className="muted">
                  {selectedToilet.description ??
                    selectedToilet.operator ??
                    `Source confidence ${Math.round(selectedToilet.confidence * 100)}%.`}
                </p>

                <dl className="facility-grid">
                  <div>
                    <dt>Accessible</dt>
                    <dd>{formatFlag(selectedToilet.wheelchair)}</dd>
                  </div>
                  <div>
                    <dt>Baby change</dt>
                    <dd>{formatFlag(selectedToilet.babyChange)}</dd>
                  </div>
                  <div>
                    <dt>Access</dt>
                    <dd>{selectedToilet.access}</dd>
                  </div>
                  <div>
                    <dt>Unisex</dt>
                    <dd>{formatFlag(selectedToilet.unisex)}</dd>
                  </div>
                  <div>
                    <dt>Fee</dt>
                    <dd>{formatFlag(selectedToilet.fee)}</dd>
                  </div>
                  <div>
                    <dt>Distance</dt>
                    <dd>{selectedDistance ? `${selectedDistance.toFixed(1)} km` : 'Unknown'}</dd>
                  </div>
                </dl>

                <div className="detail-actions">
                  <a
                    className="primary-action"
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedToilet.coordinates[0]},${selectedToilet.coordinates[1]}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Route aria-hidden="true" />
                    Open directions
                  </a>
                  <a href={selectedToilet.sourceUrl} target="_blank" rel="noreferrer">
                    View source
                  </a>
                  <span>{selectedToilet.operator ?? selectedToilet.sourceId}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="detail-empty">
              <p className="section-kicker">No result selected</p>
              <h2>No public toilets match those filters</h2>
              <p className="muted">Clear search or turn off Open now to bring more facilities back onto the map.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default App
