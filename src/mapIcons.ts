import L from 'leaflet'

const mapPinGlyph = `
  <svg class="map-marker-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M20 10c0 5-5.54 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.2 4 15 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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

export function clusterIcon(count: number, active = false) {
  const size = count > 999 ? 66 : count > 99 ? 58 : count > 24 ? 50 : 44
  return L.divIcon({
    className: `toilet-cluster${active ? ' toilet-cluster-active' : ''}`,
    html: `<span class="cluster-bubble" aria-hidden="true"><span>${count.toLocaleString('en-NZ')}</span></span>`,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
  })
}
