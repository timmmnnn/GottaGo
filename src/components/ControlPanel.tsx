import {
  Accessibility,
  Baby,
  CheckCircle2,
  Clock,
  Database,
  FileJson,
  ListFilter,
  LocateFixed,
  MapPin,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { memo } from 'react'
import type { GamificationSummary } from '../hooks/useGamification'
import type { FilterKey, ToiletDataset, Toilet } from '../types'
import { datasetStats, filterCopy, formatDate, formatFlag } from '../utils/toilets'

export type PanelPage = 'map' | 'filters' | 'dataset'

type ControlPanelProps = {
  activeFilterCount: number
  activeFilters: Set<FilterKey>
  displayedToilets: Toilet[]
  dataset: ToiletDataset | null
  gamification: GamificationSummary
  loadError: string | null
  locationMessage: string | null
  openNowCount: number
  page: PanelPage
  query: string
  selectedId: string | null
  totalRecords: number
  visibleCount: number
  onClearSearch: () => void
  onPickNearest: () => void
  onPageChange: (page: PanelPage) => void
  onQueryChange: (query: string) => void
  onReset: () => void
  onSelectToilet: (id: string) => void
  onToggleFilter: (filter: FilterKey) => void
  getDistanceKm: (toilet: Toilet) => number | null
}

const filterEntries: Array<[FilterKey, typeof Accessibility]> = [
  ['accessible', Accessibility],
  ['babyChange', Baby],
  ['openNow', Clock],
  ['nearby', LocateFixed],
]

const navItems: Array<[PanelPage, string, typeof MapPinned]> = [
  ['map', 'Map', MapPinned],
  ['filters', 'Filters', ListFilter],
  ['dataset', 'Dataset', Database],
]

function LogoMark() {
  return <img className="logo-mark" src="/logo.svg" alt="" width="64" height="64" aria-hidden="true" />
}

export const AppRail = memo(function AppRail({
  activePage,
  onPageChange,
}: {
  activePage: PanelPage
  onPageChange: (page: PanelPage) => void
}) {
  return (
    <nav className="app-rail" aria-label="Primary">
      <div className="rail-brand" aria-label="Got2go.co">
        <LogoMark />
      </div>
      {navItems.map(([page, label, Icon]) => (
        <button
          key={page}
          className="rail-button"
          data-active={activePage === page}
          type="button"
          aria-label={label}
          aria-current={activePage === page ? 'page' : undefined}
          onClick={() => onPageChange(page)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
})

export function ControlPanel({
  activeFilterCount,
  activeFilters,
  displayedToilets,
  dataset,
  gamification,
  loadError,
  locationMessage,
  openNowCount,
  page,
  query,
  selectedId,
  totalRecords,
  visibleCount,
  onClearSearch,
  onPickNearest,
  onPageChange,
  onQueryChange,
  onReset,
  onSelectToilet,
  onToggleFilter,
  getDistanceKm,
}: ControlPanelProps) {
  return (
    <aside className="control-panel" data-page={page} aria-label="Toilet search and filters">
      <header className="panel-hero">
        <div>
          <p className="eyebrow">Aotearoa utility map</p>
          <h1>Got2Go</h1>
          <p className="hero-copy">Find a public toilet quickly, then get moving.</p>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <LogoMark />
        </div>
      </header>

      <div className="panel-tabs" aria-label="Panel pages">
        {navItems.map(([nextPage, label, Icon]) => (
          <button
            key={nextPage}
            type="button"
            data-active={page === nextPage}
            onClick={() => onPageChange(nextPage)}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {page === 'map' ? (
        <div className="panel-page panel-page-map">
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
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search town, suburb, landmark"
                type="search"
              />
              {query ? (
                <button type="button" onClick={onClearSearch} aria-label="Clear search">
                  <X />
                </button>
              ) : null}
            </label>

            <button className="nearest-action" type="button" onClick={onPickNearest}>
              <LocateFixed aria-hidden="true" />
              Highlight nearest toilet
            </button>

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

            <TripReadiness summary={gamification} />
          </section>

          <section className="result-section" aria-label="Filtered toilet list">
            <div className="result-heading">
              <div>
                <p className="section-kicker">{visibleCount.toLocaleString('en-NZ')} places</p>
                <h2>All facilities</h2>
              </div>
              <button type="button" onClick={onReset}>
                Show all
              </button>
            </div>

            <div className="result-list">
              {activeFilterCount ? (
                <div className="result-limit-note">
                  {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'} narrowing the list.
                </div>
              ) : null}
              {visibleCount > displayedToilets.length ? (
                <div className="result-limit-note">
                  Showing first {displayedToilets.length.toLocaleString('en-NZ')}. Search or filter to narrow the map.
                </div>
              ) : null}
              {displayedToilets.map((toilet) => {
                const distance = getDistanceKm(toilet)
                return (
                  <ResultItem
                    key={toilet.id}
                    distance={distance}
                    selected={toilet.id === selectedId}
                    toilet={toilet}
                    onSelectToilet={onSelectToilet}
                  />
                )
              })}
              {!visibleCount ? (
                <div className="empty-state">
                  <strong>No matching toilets</strong>
                  <span>Try clearing a filter or searching a wider place name.</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {page === 'filters' ? (
        <div className="panel-page panel-page-filters">
          <section className="filter-card filter-card-large" aria-label="Filters">
            <div className="section-head">
              <div>
                <p className="section-kicker">Refine</p>
                <h2>Facilities</h2>
              </div>
              <button type="button" onClick={onReset}>
                Reset
              </button>
            </div>

            <div className="filter-row filter-row-large" aria-label="Filters">
              {filterEntries.map(([key, Icon]) => (
                <button
                  key={key}
                  className="filter-button"
                  data-active={activeFilters.has(key)}
                  type="button"
                  onClick={key === 'nearby' ? onPickNearest : () => onToggleFilter(key)}
                >
                  <Icon aria-hidden="true" />
                  {filterCopy[key]}
                </button>
              ))}
            </div>

            {locationMessage ? <p className="inline-note">{locationMessage}</p> : null}
            {loadError ? <p className="inline-note error-note">{loadError}</p> : null}
          </section>

          <section className="insight-card" aria-label="Filter summary">
            <div className="section-head">
              <div>
                <p className="section-kicker">Current view</p>
                <h2>{visibleCount.toLocaleString('en-NZ')} matching places</h2>
              </div>
              <ShieldCheck aria-hidden="true" />
            </div>
            <div className="metric-list">
              <div>
                <strong>{openNowCount.toLocaleString('en-NZ')}</strong>
                <span>known 24 hr facilities</span>
              </div>
              <div>
                <strong>{activeFilterCount}</strong>
                <span>active filters</span>
              </div>
            </div>
          </section>

          <section className="result-section compact-results" aria-label="Filtered preview">
            <div className="result-heading">
              <div>
                <p className="section-kicker">Preview</p>
                <h2>Filtered results</h2>
              </div>
              <button type="button" onClick={() => onPageChange('map')}>
                View map
              </button>
            </div>
            <div className="result-list">
              {displayedToilets.slice(0, 5).map((toilet) => (
                <ResultItem
                  key={toilet.id}
                  distance={getDistanceKm(toilet)}
                  selected={toilet.id === selectedId}
                  toilet={toilet}
                  onSelectToilet={onSelectToilet}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {page === 'dataset' ? (
        <div className="panel-page panel-page-dataset">
          <section className="dataset-hero-card" aria-label="Dataset overview">
            <div className="section-head">
              <div>
                <p className="section-kicker">Dataset</p>
                <h2>{totalRecords.toLocaleString('en-NZ')} mapped facilities</h2>
              </div>
              <FileJson aria-hidden="true" />
            </div>
            <p className="muted">
              {dataset
                ? `${dataset.metadata.primarySource}. Updated ${formatDate(dataset.metadata.generatedAt)}.`
                : `Loading ${datasetStats.source}.`}
            </p>
          </section>

          <section className="dataset-grid" aria-label="Dataset files">
            <div>
              <CheckCircle2 aria-hidden="true" />
              <strong>toilets.json</strong>
              <span>App-facing records and metadata</span>
            </div>
            <div>
              <CheckCircle2 aria-hidden="true" />
              <strong>toilets.geojson</strong>
              <span>GIS-friendly feature collection</span>
            </div>
            <div>
              <CheckCircle2 aria-hidden="true" />
              <strong>toilets.csv</strong>
              <span>Spreadsheet export format</span>
            </div>
            <div>
              <RefreshCw aria-hidden="true" />
              <strong>metadata.json</strong>
              <span>Source and generation details</span>
            </div>
          </section>

          <section className="insight-card" aria-label="Coverage notes">
            <div>
              <p className="section-kicker">Coverage notes</p>
              <h2>Public OSM records, cleaned for app use</h2>
            </div>
            <p className="muted">
              Restricted access records are excluded. Facility attributes depend on public source tags, so
              accessibility, baby-change, fee, and opening-hour fields can remain unknown.
            </p>
          </section>
        </div>
      ) : null}

      <PanelFooter />
    </aside>
  )
}

const PanelFooter = memo(function PanelFooter() {
  return (
    <footer className="panel-footer" aria-label="Site footer">
      <span className="footer-brand">Dream Creative</span>
      <span>For Lucy | 2026</span>
    </footer>
  )
})

const TripReadiness = memo(function TripReadiness({ summary }: { summary: GamificationSummary }) {
  return (
    <div className="trip-readiness" aria-label="Trip readiness">
      <div className="trip-readiness-head">
        <span>
          <Trophy aria-hidden="true" />
          {summary.score} pts
        </span>
        <strong>{summary.level}</strong>
      </div>
      <div className="readiness-meter" aria-hidden="true">
        <span style={{ inlineSize: `${summary.progress}%` }} />
      </div>
      <div className="quest-list">
        {summary.steps.map((step) => {
          const complete = summary.completedActions.has(step.action)
          return (
            <span key={step.action} data-complete={complete}>
              <Sparkles aria-hidden="true" />
              {step.label}
            </span>
          )
        })}
      </div>
    </div>
  )
})

const ResultItem = memo(function ResultItem({
  distance,
  selected,
  toilet,
  onSelectToilet,
}: {
  distance: number | null
  selected: boolean
  toilet: Toilet
  onSelectToilet: (id: string) => void
}) {
  return (
    <button
      className="result-item"
      data-active={selected}
      type="button"
      onClick={() => onSelectToilet(toilet.id)}
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
      <MapPin aria-hidden="true" />
    </button>
  )
})
