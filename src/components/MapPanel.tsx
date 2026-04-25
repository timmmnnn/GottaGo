import { ChevronUp, Layers, ShieldCheck } from 'lucide-react'
import { memo, useState, type RefObject } from 'react'
import type { GamificationAction } from '../hooks/useGamification'
import type { MapMarker, Toilet } from '../types'
import { clusterStepForZoom } from '../utils/toilets'
import { DetailCard } from './DetailCard'

type MapPanelProps = {
  mapNode: RefObject<HTMLDivElement | null>
  mapZoom: number
  onAward: (action: GamificationAction) => void
  selectedDistance: number | null
  selectedToilet: Toilet | null
  totalRecords: number
  visibleMapMarkers: MapMarker[]
  hasDataset: boolean
}

export const MapPanel = memo(function MapPanel({
  mapNode,
  mapZoom,
  onAward,
  selectedDistance,
  selectedToilet,
  totalRecords,
  visibleMapMarkers,
  hasDataset,
}: MapPanelProps) {
  const [collapsedToiletId, setCollapsedToiletId] = useState<string | null>(null)
  const isDetailCollapsed = Boolean(selectedToilet && collapsedToiletId === selectedToilet.id)

  return (
    <section className="map-panel" aria-label="Map of public toilets in New Zealand">
      <div className="map-topbar">
        <div className="map-title-card">
          <p className="section-kicker">Live map</p>
          <h2>Public toilets across Aotearoa</h2>
        </div>
        <div className="map-tools" aria-label="Map status">
          <span className="trust-chip">
            <ShieldCheck aria-hidden="true" />
            {hasDataset ? `${totalRecords.toLocaleString('en-NZ')} mapped` : 'Loading dataset'}
          </span>
          <span className="trust-chip">
            <Layers aria-hidden="true" />
            {visibleMapMarkers.length.toLocaleString('en-NZ')}{' '}
            {clusterStepForZoom(mapZoom) ? 'clusters' : 'markers'}
          </span>
        </div>
      </div>

      <div ref={mapNode} className="map-canvas" />

      {selectedToilet && !isDetailCollapsed ? (
        <DetailCard
          onCollapse={() => setCollapsedToiletId(selectedToilet.id)}
          onOpenDirections={() => onAward('openedDirections')}
          selectedDistance={selectedDistance}
          selectedToilet={selectedToilet}
        />
      ) : null}

      {selectedToilet && isDetailCollapsed ? (
        <button
          className="detail-restore-button"
          type="button"
          onClick={() => setCollapsedToiletId(null)}
          aria-label="Show place details"
        >
          <ChevronUp aria-hidden="true" />
          <span>{selectedToilet.name}</span>
        </button>
      ) : null}
    </section>
  )
})
