import { ChevronDown, Route, Sparkles } from 'lucide-react'
import type { Toilet } from '../types'
import { formatFlag } from '../utils/toilets'

type DetailCardProps = {
  onCollapse: () => void
  onOpenDirections: () => void
  selectedDistance: number | null
  selectedToilet: Toilet
}

export function DetailCard({
  onCollapse,
  onOpenDirections,
  selectedDistance,
  selectedToilet,
}: DetailCardProps) {
  return (
    <article className="detail-card" aria-live="polite">
      <button
        className="detail-collapse-button"
        type="button"
        aria-label="Hide place details"
        onClick={onCollapse}
      >
        <ChevronDown aria-hidden="true" />
      </button>
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
            onClick={onOpenDirections}
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
    </article>
  )
}
