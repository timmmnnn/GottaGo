import L from 'leaflet'

const mapPinGlyph = `
  <svg class="map-marker-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M20 10c0 5-5.54 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.2 4 15 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
`

const rareMapPinGlyph = `
  <svg class="map-marker-icon rare-marker-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rare-marker-gradient" x1="3" y1="3" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ff3b8d" />
        <stop offset="22%" stop-color="#ffb000" />
        <stop offset="45%" stop-color="#f8ff4a" />
        <stop offset="67%" stop-color="#18d27f" />
        <stop offset="84%" stop-color="#2fb4ff" />
        <stop offset="100%" stop-color="#9b5cff" />
      </linearGradient>
    </defs>
    <path d="M20 10c0 5-5.54 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.2 4 15 4 10a8 8 0 0 1 16 0Z" fill="url(#rare-marker-gradient)" />
    <circle cx="12" cy="10" r="3" fill="#fff" />
  </svg>
`

export const markerIcon = L.divIcon({
  className: 'toilet-marker',
  html: mapPinGlyph,
  iconSize: [34, 42],
  iconAnchor: [17, 41],
})

export const activeMarkerIcon = L.divIcon({
  className: 'toilet-marker toilet-marker-active',
  html: mapPinGlyph,
  iconSize: [40, 48],
  iconAnchor: [20, 47],
})

export const rareNearestMarkerIcon = L.divIcon({
  className: 'toilet-marker toilet-marker-rare',
  html: rareMapPinGlyph,
  iconSize: [48, 58],
  iconAnchor: [24, 57],
})

export function clusterIcon(count: number, active = false) {
  const size = count > 999 ? 66 : count > 99 ? 58 : count > 24 ? 50 : 44
  return L.divIcon({
    className: `toilet-cluster${active ? ' toilet-cluster-active' : ''}`,
    html: `<span aria-hidden="true">${count.toLocaleString('en-NZ')}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
