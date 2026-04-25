import { describe, expect, it } from 'vitest'
import type { Toilet } from '../src/types'
import { filterToilets, getVisibleMapMarkers, isRenderableNzCoordinate } from '../src/utils/toilets'

function toilet(overrides: Partial<Toilet>): Toilet {
  return {
    id: 'test-1',
    source: 'OpenStreetMap',
    sourceId: 'node/1',
    sourceUrl: 'https://www.openstreetmap.org/node/1',
    name: 'Central Park Public Toilet',
    description: null,
    address: null,
    locality: 'Nelson',
    region: 'Tasman',
    coordinates: [-41.27, 173.28],
    openingHours: 'Unknown',
    access: 'public',
    wheelchair: null,
    babyChange: null,
    unisex: null,
    male: null,
    female: null,
    drinkingWater: null,
    fee: null,
    operator: null,
    confidence: 0.75,
    lastVerified: null,
    ...overrides,
  }
}

describe('filterToilets', () => {
  it('searches across name and locality', () => {
    const toilets = [
      toilet({ id: 'nelson', name: 'Riverside Public Toilet', locality: 'Nelson' }),
      toilet({ id: 'otago', name: 'Harbour Toilet', locality: 'Dunedin' }),
    ]

    const filtered = filterToilets({
      toilets,
      query: 'nelson',
      activeFilters: new Set(),
      userLocation: null,
    })

    expect(filtered.map((item) => item.id)).toEqual(['nelson'])
  })

  it('applies facility filters without dropping unknown values for inactive filters', () => {
    const toilets = [
      toilet({ id: 'accessible', wheelchair: true, babyChange: null }),
      toilet({ id: 'not-accessible', wheelchair: false, babyChange: true }),
    ]

    const filtered = filterToilets({
      toilets,
      query: '',
      activeFilters: new Set(['accessible']),
      userLocation: null,
    })

    expect(filtered.map((item) => item.id)).toEqual(['accessible'])
  })

  it('sorts by distance when a user location is available', () => {
    const toilets = [
      toilet({ id: 'far', coordinates: [-41.4, 173.4] }),
      toilet({ id: 'near', coordinates: [-41.271, 173.281] }),
    ]

    const filtered = filterToilets({
      toilets,
      query: '',
      activeFilters: new Set(),
      userLocation: [-41.27, 173.28],
    })

    expect(filtered.map((item) => item.id)).toEqual(['near', 'far'])
  })

  it('clusters very close map markers at regional zoom levels', () => {
    const markers = getVisibleMapMarkers({
      filteredToilets: [
        toilet({ id: 'one', coordinates: [-41.27, 173.28] }),
        toilet({ id: 'two', coordinates: [-41.271, 173.281] }),
      ],
      mapBounds: null,
      mapZoom: 10,
      nearestToilet: null,
      selectedToilet: null,
    })

    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({
      count: 2,
      kind: 'cluster',
    })
  })

  it('anchors clusters to a real toilet coordinate instead of an offshore centroid', () => {
    const one = toilet({ id: 'one', coordinates: [-41.2, 173.1] })
    const two = toilet({ id: 'two', coordinates: [-41.4, 173.3] })

    const markers = getVisibleMapMarkers({
      filteredToilets: [one, two],
      mapBounds: null,
      mapZoom: 6,
      nearestToilet: null,
      selectedToilet: null,
    })

    expect(markers).toHaveLength(1)
    expect([one.coordinates, two.coordinates]).toContain(markers[0].coordinates)
    expect(markers[0].coordinates).not.toEqual([
      (one.coordinates[0] + two.coordinates[0]) / 2,
      (one.coordinates[1] + two.coordinates[1]) / 2,
    ])
  })

  it('keeps impossible coordinates out of rendered map markers while allowing Chatham Islands', () => {
    const mainland = toilet({ id: 'mainland', coordinates: [-41.27, 173.28] })
    const chatham = toilet({ id: 'chatham', coordinates: [-43.8, -176.5] })
    const invalid = toilet({ id: 'invalid', coordinates: [173.28, -41.27] })

    expect(isRenderableNzCoordinate(mainland.coordinates)).toBe(true)
    expect(isRenderableNzCoordinate(chatham.coordinates)).toBe(true)
    expect(isRenderableNzCoordinate(invalid.coordinates)).toBe(false)

    const markers = getVisibleMapMarkers({
      filteredToilets: [mainland, chatham, invalid],
      mapBounds: null,
      mapZoom: 12,
      nearestToilet: null,
      selectedToilet: null,
    })

    expect(markers.map((marker) => marker.id)).toEqual(['mainland', 'chatham'])
  })
})
