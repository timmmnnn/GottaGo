import type { LatLngBounds } from 'leaflet'
import type { FacilityFlag, FilterKey, MapMarker, Toilet } from '../types'

export const defaultCenter: [number, number] = [-41.55, 172.8]
export const desktopMarkerRenderLimit = 50
export const mobileMarkerRenderLimit = 50
export const resultRenderLimit = 80
export const mobileResultRenderLimit = 28

export const datasetStats = {
  records: 4285,
  source: 'OpenStreetMap amenity=toilets',
  updated: '25 Apr 2026',
}

export const filterCopy: Record<FilterKey, string> = {
  accessible: 'Accessible',
  babyChange: 'Baby change',
  openNow: 'Open now',
  nearby: 'Nearby',
}

export function isPositive(value: FacilityFlag) {
  return value === true || value === 'yes' || value === 'limited'
}

export function formatFlag(value: FacilityFlag) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === 'limited') return 'Limited'
  if (value) return String(value)
  return 'Unknown'
}

export function isOpenNow(toilet: Toilet) {
  const hours = toilet.openingHours.toLowerCase()
  return hours === '24/7' || hours.includes('open 24') || hours.includes('24 hours')
}

export function matchesSearch(toilet: Toilet, query: string) {
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

export function distanceKm(from: [number, number], to: [number, number]) {
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

function coordinateDeltaScore(from: [number, number], to: [number, number]) {
  const dLat = to[0] - from[0]
  const dLng = to[1] - from[1]
  return dLat * dLat + dLng * dLng
}

export function isRenderableNzCoordinate(coordinates: [number, number]) {
  const [lat, lng] = coordinates
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -48 || lat > -33) return false

  const isMainlandNzLongitude = lng >= 165 && lng <= 180
  const isChathamLongitude = lng >= -180 && lng <= -175

  return isMainlandNzLongitude || isChathamLongitude
}

export function formatDate(date: string | undefined) {
  if (!date) return 'Unknown'
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function clusterStepForZoom(zoom: number) {
  if (zoom <= 5) return 2.2
  if (zoom <= 6) return 1.2
  if (zoom <= 7) return 0.65
  if (zoom <= 8) return 0.35
  if (zoom <= 9) return 0.18
  if (zoom <= 10) return 0.09
  if (zoom <= 11) return 0.04
  return 0
}

export function isWithinBounds(toilet: Toilet, bounds: LatLngBounds | null) {
  if (!isRenderableNzCoordinate(toilet.coordinates)) return false
  if (!bounds) return true
  const [lat, lng] = toilet.coordinates
  return bounds.pad(0.15).contains([lat, lng])
}

export function filterToilets({
  toilets,
  query,
  activeFilters,
  userLocation,
}: {
  toilets: Toilet[]
  query: string
  activeFilters: Set<FilterKey>
  userLocation: [number, number] | null
}) {
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

  return filtered
    .map((toilet) => ({
      distance: distanceKm(userLocation, toilet.coordinates),
      toilet,
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ toilet }) => toilet)
}

export function getVisibleMapMarkers({
  filteredToilets,
  mapZoom,
  mapBounds,
  nearestToilet,
  selectedToilet,
  markerLimit = desktopMarkerRenderLimit,
}: {
  filteredToilets: Toilet[]
  mapZoom: number
  mapBounds: LatLngBounds | null
  nearestToilet: Toilet | null
  selectedToilet: Toilet | null
  markerLimit?: number
}): MapMarker[] {
  const clusterStep = clusterStepForZoom(mapZoom)
  const mapVisibleToilets = filteredToilets.filter((toilet) => isWithinBounds(toilet, mapBounds))

  if (clusterStep) {
    const clusters = new Map<
      string,
      {
        latTotal: number
        lngTotal: number
        count: number
        hasSelected: boolean
        toilets: Toilet[]
      }
    >()

    mapVisibleToilets.forEach((toilet) => {
      const latCell = Math.floor(toilet.coordinates[0] / clusterStep)
      const lngCell = Math.floor(toilet.coordinates[1] / clusterStep)
      const key = `${latCell}:${lngCell}`
      const existing = clusters.get(key)

      if (existing) {
        existing.latTotal += toilet.coordinates[0]
        existing.lngTotal += toilet.coordinates[1]
        existing.count += 1
        existing.hasSelected = existing.hasSelected || toilet.id === selectedToilet?.id
        existing.toilets.push(toilet)
        return
      }

      clusters.set(key, {
        latTotal: toilet.coordinates[0],
        lngTotal: toilet.coordinates[1],
        count: 1,
        hasSelected: toilet.id === selectedToilet?.id,
        toilets: [toilet],
      })
    })

    return Array.from(clusters.entries()).map<MapMarker>(([id, cluster]) => {
      const centroid: [number, number] = [cluster.latTotal / cluster.count, cluster.lngTotal / cluster.count]
      const anchorToilet = cluster.toilets.reduce((closest, toilet) =>
        coordinateDeltaScore(centroid, toilet.coordinates) <
        coordinateDeltaScore(centroid, closest.coordinates)
          ? toilet
          : closest,
      )

      return {
        id: `cluster:${id}`,
        kind: 'cluster',
        coordinates: anchorToilet.coordinates,
        count: cluster.count,
        hasSelected: cluster.hasSelected,
      }
    })
  }

  const markers = mapVisibleToilets.slice(0, markerLimit).map<MapMarker>((toilet) => ({
    id: toilet.id,
    kind: 'toilet',
    coordinates: toilet.coordinates,
    toilet,
  }))

  if (selectedToilet && !markers.some((marker) => marker.id === selectedToilet.id)) {
    markers.push({
      id: selectedToilet.id,
      kind: 'toilet',
      coordinates: selectedToilet.coordinates,
      toilet: selectedToilet,
    })
  }

  if (nearestToilet && !markers.some((marker) => marker.id === nearestToilet.id)) {
    markers.push({
      id: nearestToilet.id,
      kind: 'toilet',
      coordinates: nearestToilet.coordinates,
      toilet: nearestToilet,
    })
  }

  return markers
}
