import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L, { type Map as LeafletMap, type Marker } from 'leaflet'
import type { MapMarker, Toilet } from '../types'
import { activeMarkerIcon, clusterIcon, markerIcon, rareNearestMarkerIcon } from '../mapIcons'
import { defaultCenter, desktopMarkerRenderLimit, getVisibleMapMarkers, mobileMarkerRenderLimit } from '../utils/toilets'

export function useLeafletMarkers({
  filteredToilets,
  nearestToiletId,
  nearestToilet,
  selectedToilet,
  compactMarkers = false,
  onSelectToilet,
}: {
  filteredToilets: Toilet[]
  nearestToiletId: string | null
  nearestToilet: Toilet | null
  selectedToilet: Toilet | null
  compactMarkers?: boolean
  onSelectToilet: (id: string) => void
}) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const map = useRef<LeafletMap | null>(null)
  const markers = useRef<Map<string, Marker>>(new Map())
  const hasSyncedInitialSelection = useRef(false)
  const [mapZoom, setMapZoom] = useState(5)
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)

  const mobileUsableViewportOffset = useCallback(() => {
    if (!compactMarkers || typeof window === 'undefined') return 0

    const readinessCard = document.querySelector<HTMLElement>('.trip-readiness')
    const overlayBottom = readinessCard?.getBoundingClientRect().bottom ?? 0

    return Math.max(0, overlayBottom / 2)
  }, [compactMarkers])

  const adjustCenterForUsableViewport = useCallback(
    (location: [number, number], zoom: number) => {
      if (!map.current) return location

      const offset = mobileUsableViewportOffset()
      if (!offset) return location

      const projected = map.current.project(location, zoom)
      const adjusted = map.current.unproject([projected.x, projected.y - offset], zoom)

      return [adjusted.lat, adjusted.lng] as [number, number]
    },
    [mobileUsableViewportOffset],
  )

  const flyToAdjustedLocation = useCallback(
    (location: [number, number], zoom: number, duration: number) => {
      map.current?.flyTo(adjustCenterForUsableViewport(location, zoom), zoom, { duration })
    },
    [adjustCenterForUsableViewport],
  )

  const visibleMapMarkers = useMemo<MapMarker[]>(
    () =>
      getVisibleMapMarkers({
        filteredToilets,
        mapZoom,
        mapBounds,
        markerLimit: compactMarkers ? mobileMarkerRenderLimit : desktopMarkerRenderLimit,
        nearestToilet,
        selectedToilet,
      }),
    [compactMarkers, filteredToilets, mapBounds, mapZoom, nearestToilet, selectedToilet],
  )

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

    const syncMapView = () => {
      setMapZoom(leafletMap.getZoom())
      setMapBounds(leafletMap.getBounds())
    }

    leafletMap.on('moveend zoomend', syncMapView)
    map.current = leafletMap
    syncMapView()

    return () => {
      leafletMap.off('moveend zoomend', syncMapView)
      leafletMap.remove()
      map.current = null
      markerStore.clear()
    }
  }, [])

  useEffect(() => {
    if (!map.current || !compactMarkers) return

    const frame = window.requestAnimationFrame(() => {
      map.current?.setView(adjustCenterForUsableViewport(defaultCenter, 5), 5, {
        animate: false,
      })
      setMapZoom(map.current?.getZoom() ?? 5)
      setMapBounds(map.current?.getBounds() ?? null)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [adjustCenterForUsableViewport, compactMarkers])

  useEffect(() => {
    if (!map.current) return

    const visibleIds = new Set(visibleMapMarkers.map((marker) => marker.id))

    markers.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove()
        markers.current.delete(id)
      }
    })

    visibleMapMarkers.forEach((mapMarker) => {
      const existingMarker = markers.current.get(mapMarker.id)
      const icon =
        mapMarker.kind === 'cluster'
          ? clusterIcon(mapMarker.count, mapMarker.hasSelected)
          : mapMarker.toilet.id === nearestToiletId
            ? rareNearestMarkerIcon
          : mapMarker.toilet.id === selectedToilet?.id
            ? activeMarkerIcon
            : markerIcon

      if (existingMarker) {
        existingMarker.setLatLng(mapMarker.coordinates)
        existingMarker.setIcon(icon)
        return
      }

      const marker = L.marker(mapMarker.coordinates, {
        icon,
        title:
          mapMarker.kind === 'cluster'
            ? `${mapMarker.count.toLocaleString('en-NZ')} toilets`
            : mapMarker.toilet.name,
      })

      marker.on('click', () => {
        if (mapMarker.kind === 'cluster') {
          flyToAdjustedLocation(mapMarker.coordinates, Math.min((map.current?.getZoom() ?? 5) + 2, 11), 0.55)
          return
        }

        onSelectToilet(mapMarker.toilet.id)
      })
      marker.addTo(map.current as LeafletMap)
      markers.current.set(mapMarker.id, marker)
    })
  }, [flyToAdjustedLocation, nearestToiletId, onSelectToilet, selectedToilet?.id, visibleMapMarkers])

  useEffect(() => {
    if (!selectedToilet) return

    const marker = markers.current.get(selectedToilet.id)
    if (!map.current || !marker) return

    marker.setIcon(selectedToilet.id === nearestToiletId ? rareNearestMarkerIcon : activeMarkerIcon)
    if (!hasSyncedInitialSelection.current) {
      hasSyncedInitialSelection.current = true
      return
    }

    flyToAdjustedLocation(selectedToilet.coordinates, Math.max(map.current.getZoom(), 12), 0.7)
  }, [flyToAdjustedLocation, nearestToiletId, selectedToilet])

  function resetMap() {
    flyToAdjustedLocation(defaultCenter, 5, 0.7)
  }

  function flyToLocation(location: [number, number]) {
    flyToAdjustedLocation(location, 12, 0.7)
  }

  return {
    flyToLocation,
    mapNode,
    mapZoom,
    resetMap,
    visibleMapMarkers,
  }
}
