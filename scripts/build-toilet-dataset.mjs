import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'public', 'data')
const endpoint = process.env.OVERPASS_ENDPOINT ?? 'https://overpass-api.de/api/interpreter'

const query = `
[out:json][timeout:180];
area["ISO3166-1"="NZ"][admin_level=2]->.nz;
(
  node["amenity"="toilets"](area.nz);
  way["amenity"="toilets"](area.nz);
  relation["amenity"="toilets"](area.nz);
);
out center tags;
`

const boolish = new Map([
  ['yes', true],
  ['true', true],
  ['1', true],
  ['designated', true],
  ['limited', 'limited'],
  ['no', false],
  ['false', false],
  ['0', false],
])

const nzRegionHints = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  'Manawatu-Wanganui',
  'Wellington',
  'Tasman',
  'Nelson',
  'Marlborough',
  'West Coast',
  'Canterbury',
  'Otago',
  'Southland',
]

function clean(value) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text : null
}

function boolFromTags(tags, keys) {
  for (const key of keys) {
    const value = clean(tags[key])
    if (!value) continue
    const normalized = value.toLowerCase()
    return boolish.has(normalized) ? boolish.get(normalized) : value
  }
  return null
}

function firstTag(tags, keys) {
  for (const key of keys) {
    const value = clean(tags[key])
    if (value) return value
  }
  return null
}

function normalizeAccess(tags) {
  const access = firstTag(tags, ['access'])
  if (!access) return 'unknown'
  if (['yes', 'public', 'permissive'].includes(access.toLowerCase())) return 'public'
  if (['customers', 'destination'].includes(access.toLowerCase())) return access.toLowerCase()
  if (['private', 'no'].includes(access.toLowerCase())) return 'restricted'
  return access
}

function confidenceFor(tags) {
  let score = 0.55
  if (tags.name) score += 0.08
  if (tags.opening_hours) score += 0.08
  if (tags.wheelchair || tags['toilets:wheelchair']) score += 0.1
  if (tags.operator || tags['operator:type']) score += 0.06
  if (tags.access) score += 0.05
  return Math.min(0.92, Number(score.toFixed(2)))
}

function normalizeComparableText(value) {
  return clean(value)
    ?.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function distanceMeters(a, b) {
  const earthRadius = 6371000
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function dedupeKey(record) {
  return [
    normalizeComparableText(record.name) ?? 'public toilet',
    normalizeComparableText(record.address) ?? '',
    normalizeComparableText(record.operator) ?? '',
  ].join('|')
}

function hasSpecificName(record) {
  return normalizeComparableText(record.name) !== 'public toilet'
}

function mergeValue(primary, secondary) {
  if (primary === null || primary === undefined || primary === 'Unknown') return secondary ?? primary
  return primary
}

function pickPrimary(records) {
  return [...records].sort((a, b) => {
    if (hasSpecificName(a) !== hasSpecificName(b)) return hasSpecificName(a) ? -1 : 1
    if (a.confidence !== b.confidence) return b.confidence - a.confidence
    if (a.sourceId.startsWith('way/') !== b.sourceId.startsWith('way/')) {
      return a.sourceId.startsWith('way/') ? -1 : 1
    }
    return a.id.localeCompare(b.id)
  })[0]
}

function mergeDuplicateGroup(records) {
  const primary = pickPrimary(records)
  const merged = { ...primary }
  const sourceIds = new Set(records.flatMap((record) => record.sourceIds ?? [record.sourceId]))

  for (const record of records) {
    merged.description = mergeValue(merged.description, record.description)
    merged.address = mergeValue(merged.address, record.address)
    merged.locality = mergeValue(merged.locality, record.locality)
    merged.region = mergeValue(merged.region, record.region)
    merged.openingHours = mergeValue(merged.openingHours, record.openingHours)
    merged.access = mergeValue(merged.access, record.access)
    merged.wheelchair = mergeValue(merged.wheelchair, record.wheelchair)
    merged.babyChange = mergeValue(merged.babyChange, record.babyChange)
    merged.unisex = mergeValue(merged.unisex, record.unisex)
    merged.male = mergeValue(merged.male, record.male)
    merged.female = mergeValue(merged.female, record.female)
    merged.drinkingWater = mergeValue(merged.drinkingWater, record.drinkingWater)
    merged.fee = mergeValue(merged.fee, record.fee)
    merged.operator = mergeValue(merged.operator, record.operator)
    merged.lastVerified = mergeValue(merged.lastVerified, record.lastVerified)
    merged.confidence = Math.max(merged.confidence, record.confidence)
    merged.rawTags = { ...record.rawTags, ...merged.rawTags }
  }

  merged.sourceIds = [...sourceIds].sort()
  merged.duplicateCount = records.length - 1
  return merged
}

export function dedupeRecords(records) {
  const buckets = new Map()

  for (const record of records) {
    const key = normalizeComparableText(record.name) ?? 'public toilet'

    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(record)
  }

  const output = []
  let duplicateRecordsRemoved = 0
  let duplicateGroups = 0

  for (const bucketRecords of buckets.values()) {
    const groups = []

    for (const record of bucketRecords) {
      const group = groups.find(
        (candidate) => {
          const distance = distanceMeters(candidate[0].coordinates, record.coordinates)
          return (
            (dedupeKey(candidate[0]) === dedupeKey(record) && distance <= 15) ||
            distance <= 1
          )
        },
      )

      if (group) group.push(record)
      else groups.push([record])
    }

    for (const group of groups) {
      if (group.length > 1) {
        duplicateGroups += 1
        duplicateRecordsRemoved += group.length - 1
      }
      output.push(group.length > 1 ? mergeDuplicateGroup(group) : group[0])
    }
  }

  return {
    toilets: output.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    duplicateGroups,
    duplicateRecordsRemoved,
  }
}

function titleCaseFallback(tags) {
  const place = firstTag(tags, [
    'name',
    'addr:housename',
    'addr:street',
    'description',
    'note',
  ])
  return place ?? 'Public toilet'
}

function compactAddress(tags) {
  const house = firstTag(tags, ['addr:housenumber'])
  const street = firstTag(tags, ['addr:street'])
  const suburb = firstTag(tags, ['addr:suburb', 'addr:quarter', 'addr:neighbourhood'])
  const city = firstTag(tags, ['addr:city', 'addr:town', 'addr:village'])
  return [house && street ? `${house} ${street}` : street, suburb, city].filter(Boolean).join(', ') || null
}

function regionHint(tags) {
  const explicit = firstTag(tags, ['addr:region', 'region', 'is_in:region'])
  if (explicit) return explicit

  const haystack = [
    tags.name,
    tags['addr:city'],
    tags['addr:suburb'],
    tags.description,
    tags.operator,
    tags['is_in'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return nzRegionHints.find((region) => haystack.includes(region.toLowerCase())) ?? null
}

export function normalizeElement(element) {
  const tags = element.tags ?? {}
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const wheelchair = boolFromTags(tags, ['wheelchair', 'toilets:wheelchair', 'wheelchair:toilets'])
  const babyChange = boolFromTags(tags, [
    'changing_table',
    'baby_change',
    'toilets:changing_table',
  ])
  const fee = boolFromTags(tags, ['fee'])
  const access = normalizeAccess(tags)

  return {
    id: `osm-${element.type}-${element.id}`,
    source: 'OpenStreetMap',
    sourceId: `${element.type}/${element.id}`,
    sourceIds: [`${element.type}/${element.id}`],
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    name: titleCaseFallback(tags),
    description: firstTag(tags, ['description', 'note', 'tourism']) ?? null,
    address: compactAddress(tags),
    locality:
      firstTag(tags, ['addr:suburb', 'addr:quarter', 'addr:neighbourhood', 'addr:city']) ?? null,
    region: regionHint(tags),
    coordinates: [Number(latitude.toFixed(7)), Number(longitude.toFixed(7))],
    openingHours: firstTag(tags, ['opening_hours']) ?? 'Unknown',
    access,
    wheelchair,
    babyChange,
    unisex: boolFromTags(tags, ['unisex', 'gender_neutral']),
    male: boolFromTags(tags, ['male']),
    female: boolFromTags(tags, ['female']),
    drinkingWater: boolFromTags(tags, ['drinking_water']),
    fee,
    operator: firstTag(tags, ['operator', 'brand', 'network']) ?? null,
    rawTags: tags,
    confidence: confidenceFor(tags),
    duplicateCount: 0,
    lastVerified: firstTag(tags, ['check_date', 'survey:date', 'lastcheck']) ?? null,
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join('|') : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(records) {
  const headers = [
    'id',
    'name',
    'description',
    'address',
    'locality',
    'region',
    'latitude',
    'longitude',
    'openingHours',
    'access',
    'wheelchair',
    'babyChange',
    'unisex',
    'male',
    'female',
    'drinkingWater',
    'fee',
    'operator',
    'source',
    'sourceId',
    'sourceIds',
    'sourceUrl',
    'confidence',
    'lastVerified',
  ]

  const rows = records.map((record) =>
    headers
      .map((header) => {
        if (header === 'latitude') return csvEscape(record.coordinates[0])
        if (header === 'longitude') return csvEscape(record.coordinates[1])
        return csvEscape(record[header])
      })
      .join(','),
  )

  return `${headers.join(',')}\n${rows.join('\n')}\n`
}

function toGeoJson(records, metadata) {
  return {
    type: 'FeatureCollection',
    name: 'GottaGo NZ Public Toilets V1',
    metadata,
    features: records.map((record) => {
      const { coordinates, rawTags, ...properties } = record
      return {
        type: 'Feature',
        id: record.id,
        geometry: {
          type: 'Point',
          coordinates: [coordinates[1], coordinates[0]],
        },
        properties: {
          ...properties,
          rawTags,
        },
      }
    }),
  }
}

async function fetchOverpass() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': 'GottaGo/1.0 public-toilet-dataset-builder',
    },
    body: new URLSearchParams({ data: query }),
  })

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export function buildDatasetFromOsm(osm, fetchedAt = new Date().toISOString()) {
  const normalizedToilets = (osm.elements ?? [])
    .map(normalizeElement)
    .filter(Boolean)
    .filter((record) => record.access !== 'restricted')

  const { toilets, duplicateGroups, duplicateRecordsRemoved } = dedupeRecords(normalizedToilets)

  const metadata = {
    version: '1.0.0',
    generatedAt: fetchedAt,
    country: 'NZ',
    recordCount: toilets.length,
    rawRecordCount: normalizedToilets.length,
    duplicateGroups,
    duplicateRecordsRemoved,
    primarySource: 'OpenStreetMap amenity=toilets',
    primarySourceUrl: 'https://www.openstreetmap.org',
    query,
    notes: [
      'V1 includes public toilet features tagged amenity=toilets in OpenStreetMap within New Zealand.',
      'Accessibility and facility attributes are normalized from source tags and may be null when unverified.',
      'Restricted access records tagged access=private or access=no are excluded.',
    ],
  }

  return { metadata, toilets }
}

async function main() {
  const osm = await fetchOverpass()
  const { metadata, toilets } = buildDatasetFromOsm(osm)

  await mkdir(dataDir, { recursive: true })
  await writeFile(path.join(dataDir, 'toilets.json'), `${JSON.stringify({ metadata, toilets }, null, 2)}\n`)
  await writeFile(path.join(dataDir, 'toilets.geojson'), `${JSON.stringify(toGeoJson(toilets, metadata), null, 2)}\n`)
  await writeFile(path.join(dataDir, 'toilets.csv'), toCsv(toilets))
  await writeFile(path.join(dataDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)

  console.log(`Generated ${toilets.length} public toilet records in ${dataDir}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
