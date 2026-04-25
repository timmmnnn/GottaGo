import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { Toilet, ToiletDataset } from '../src/types'

vi.mock('leaflet', () => {
  const mapInstance = {
    flyTo: vi.fn(),
    getBounds: vi.fn(() => ({
      contains: vi.fn(() => true),
      pad: vi.fn(function pad() {
        return this
      }),
    })),
    getZoom: vi.fn(() => 10),
    off: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
  }

  const markerInstance = {
    addTo: vi.fn(() => markerInstance),
    on: vi.fn(),
    remove: vi.fn(),
    setIcon: vi.fn(),
    setLatLng: vi.fn(),
  }

  const leaflet = {
    control: {
      zoom: vi.fn(() => ({ addTo: vi.fn() })),
    },
    divIcon: vi.fn((options) => options),
    map: vi.fn(() => mapInstance),
    marker: vi.fn(() => markerInstance),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  }

  return {
    default: leaflet,
  }
})

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

const dataset: ToiletDataset = {
  metadata: {
    generatedAt: '2026-04-25T00:00:00.000Z',
    primarySource: 'OpenStreetMap amenity=toilets',
    primarySourceUrl: 'https://www.openstreetmap.org',
    recordCount: 2,
    version: '1.0.0',
  },
  toilets: [
    toilet({
      id: 'nelson-square',
      name: '1903 Square Public Toilets',
      coordinates: [-42, 174],
      sourceId: 'way/1324312091',
      wheelchair: true,
      fee: false,
    }),
    toilet({
      id: 'marlborough-stream',
      name: 'Alfred Stream Reserve Public Toilet',
      coordinates: [-41.27, 173.28],
      locality: 'Marlborough',
      operator: 'Marlborough District Council',
      sourceId: 'node/123',
      unisex: true,
    }),
  ],
}

describe('App interactions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      })),
      writable: true,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(dataset),
          ok: true,
        }),
      ),
    )
  })

  afterEach(() => {
    cleanup()
    window.localStorage?.clear?.()
    vi.unstubAllGlobals()
  })

  it('searches, selects a result, and updates the detail card', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(screen.queryByRole('article')).toBeNull()

    await screen.findByText('1903 Square Public Toilets')
    expect(screen.getByText('Getting oriented')).toBeTruthy()
    await user.type(screen.getByRole('searchbox'), 'Alfred')

    expect(screen.queryByText('1903 Square Public Toilets')).toBeNull()
    expect(screen.getByText('5 pts')).toBeTruthy()

    const result = screen.getByRole('button', {
      name: /Alfred Stream Reserve Public Toilet/i,
    })
    await user.click(result)

    const detail = screen.getByRole('article')
    expect(within(detail).getByRole('heading', { name: 'Alfred Stream Reserve Public Toilet' })).toBeTruthy()
    expect(within(detail).getAllByText('Marlborough District Council')).toHaveLength(2)
    expect(screen.getByText('15 pts')).toBeTruthy()
    expect(screen.getByText('Almost ready')).toBeTruthy()

    await user.click(within(detail).getByRole('button', { name: 'Hide place details' }))

    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.getByRole('button', { name: 'Show place details' })).toBeTruthy()

    await waitFor(() => {
      expect(result.getAttribute('data-active')).toBe('true')
    })
  })

  it('uses precise location to highlight the nearest toilet', async () => {
    const user = userEvent.setup()
    const getCurrentPosition = vi.fn((onSuccess: PositionCallback) => {
      onSuccess({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: -41.271,
          longitude: 173.281,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)
    })

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition,
      },
    })

    render(<App />)

    await screen.findByText('1903 Square Public Toilets')
    await user.click(screen.getByRole('button', { name: 'Highlight nearest toilet' }))

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        maximumAge: 0,
      }),
    )

    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.getByText('25 pts')).toBeTruthy()
  })

  it('highlights and focuses the nearest toilet without constraining the current view state', async () => {
    const user = userEvent.setup()
    const getCurrentPosition = vi.fn((onSuccess: PositionCallback) => {
      onSuccess({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: -41.271,
          longitude: 173.281,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)
    })

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition,
      },
    })

    render(<App />)

    await screen.findByText('1903 Square Public Toilets')
    await user.type(screen.getByRole('searchbox'), 'Square')
    await user.click(screen.getByRole('button', { name: 'Highlight nearest toilet' }))

    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Square')
    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.getByText('30 pts')).toBeTruthy()
  })
})
