import type { LatLngBounds } from 'leaflet'

export type FacilityFlag = boolean | 'limited' | string | null

export type Toilet = {
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

export type ToiletDataset = {
  metadata: {
    version: string
    generatedAt: string
    recordCount: number
    primarySource: string
    primarySourceUrl: string
  }
  toilets: Toilet[]
}

export type FilterKey = 'accessible' | 'babyChange' | 'openNow' | 'nearby'

export type MapMarker =
  | {
      id: string
      kind: 'toilet'
      coordinates: [number, number]
      toilet: Toilet
    }
  | {
      id: string
      kind: 'cluster'
      coordinates: [number, number]
      count: number
      hasSelected: boolean
    }

export type MapView = {
  zoom: number
  bounds: LatLngBounds | null
}
