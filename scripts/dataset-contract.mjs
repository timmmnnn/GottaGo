const nullableStringFields = [
  'description',
  'address',
  'locality',
  'region',
  'operator',
  'lastVerified',
]

const facilityFields = [
  'wheelchair',
  'babyChange',
  'unisex',
  'male',
  'female',
  'drinkingWater',
  'fee',
]

const requiredStringFields = [
  'id',
  'source',
  'sourceId',
  'sourceUrl',
  'name',
  'openingHours',
  'access',
]

export function isRenderableNzCoordinate(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false

  const [lat, lng] = coordinates
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -48 || lat > -33) return false

  const isMainlandNzLongitude = lng >= 165 && lng <= 180
  const isChathamLongitude = lng >= -180 && lng <= -175

  return isMainlandNzLongitude || isChathamLongitude
}

function pushError(errors, path, message) {
  errors.push(`${path}: ${message}`)
}

function validateString(value, errors, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    pushError(errors, path, 'expected a non-empty string')
  }
}

function validateNullableString(value, errors, path) {
  if (value !== null && typeof value !== 'string') {
    pushError(errors, path, 'expected null or string')
  }
}

function validateFacilityFlag(value, errors, path) {
  const validPrimitive = value === null || typeof value === 'boolean' || typeof value === 'string'
  if (!validPrimitive) pushError(errors, path, 'expected null, boolean, or string')
}

export function validateMetadata(metadata, toilets = []) {
  const errors = []

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return ['metadata: expected object']
  }

  for (const field of ['version', 'generatedAt', 'primarySource', 'primarySourceUrl']) {
    validateString(metadata[field], errors, `metadata.${field}`)
  }

  if (metadata.country !== undefined && metadata.country !== 'NZ') {
    pushError(errors, 'metadata.country', 'expected NZ when present')
  }

  if (!Number.isInteger(metadata.recordCount) || metadata.recordCount < 0) {
    pushError(errors, 'metadata.recordCount', 'expected a non-negative integer')
  }

  if (toilets.length && metadata.recordCount !== toilets.length) {
    pushError(errors, 'metadata.recordCount', `expected ${toilets.length}`)
  }

  for (const field of ['rawRecordCount', 'duplicateGroups', 'duplicateRecordsRemoved']) {
    if (metadata[field] !== undefined && (!Number.isInteger(metadata[field]) || metadata[field] < 0)) {
      pushError(errors, `metadata.${field}`, 'expected a non-negative integer')
    }
  }

  if (metadata.notes !== undefined && !Array.isArray(metadata.notes)) {
    pushError(errors, 'metadata.notes', 'expected an array when present')
  }

  return errors
}

export function validateToiletRecord(toilet, index) {
  const errors = []
  const path = `toilets[${index}]`

  if (!toilet || typeof toilet !== 'object' || Array.isArray(toilet)) {
    return [`${path}: expected object`]
  }

  for (const field of requiredStringFields) {
    validateString(toilet[field], errors, `${path}.${field}`)
  }

  for (const field of nullableStringFields) {
    validateNullableString(toilet[field], errors, `${path}.${field}`)
  }

  for (const field of facilityFields) {
    validateFacilityFlag(toilet[field], errors, `${path}.${field}`)
  }

  if (!isRenderableNzCoordinate(toilet.coordinates)) {
    pushError(errors, `${path}.coordinates`, 'expected renderable NZ [latitude, longitude]')
  }

  if (typeof toilet.confidence !== 'number' || toilet.confidence < 0 || toilet.confidence > 1) {
    pushError(errors, `${path}.confidence`, 'expected number from 0 to 1')
  }

  if (toilet.sourceIds !== undefined && !Array.isArray(toilet.sourceIds)) {
    pushError(errors, `${path}.sourceIds`, 'expected array when present')
  }

  if (toilet.duplicateCount !== undefined && (!Number.isInteger(toilet.duplicateCount) || toilet.duplicateCount < 0)) {
    pushError(errors, `${path}.duplicateCount`, 'expected non-negative integer when present')
  }

  return errors
}

export function validateDataset(dataset) {
  const errors = []

  if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
    return ['dataset: expected object']
  }

  if (!Array.isArray(dataset.toilets)) {
    errors.push('toilets: expected array')
  }

  const toilets = Array.isArray(dataset.toilets) ? dataset.toilets : []
  errors.push(...validateMetadata(dataset.metadata, toilets))

  const ids = new Set()
  const sourceIds = new Set()

  toilets.forEach((toilet, index) => {
    errors.push(...validateToiletRecord(toilet, index))

    if (typeof toilet?.id === 'string') {
      if (ids.has(toilet.id)) pushError(errors, `toilets[${index}].id`, 'duplicate id')
      ids.add(toilet.id)
    }

    if (typeof toilet?.sourceId === 'string') {
      if (sourceIds.has(toilet.sourceId)) pushError(errors, `toilets[${index}].sourceId`, 'duplicate sourceId')
      sourceIds.add(toilet.sourceId)
    }
  })

  return errors
}

export function validateGeoJson(geoJson, dataset) {
  const errors = []

  if (!geoJson || typeof geoJson !== 'object' || Array.isArray(geoJson)) {
    return ['geojson: expected object']
  }

  if (geoJson.type !== 'FeatureCollection') {
    pushError(errors, 'geojson.type', 'expected FeatureCollection')
  }

  if (!Array.isArray(geoJson.features)) {
    pushError(errors, 'geojson.features', 'expected array')
    return errors
  }

  if (dataset?.toilets && geoJson.features.length !== dataset.toilets.length) {
    pushError(errors, 'geojson.features.length', `expected ${dataset.toilets.length}`)
  }

  geoJson.features.forEach((feature, index) => {
    const path = `geojson.features[${index}]`
    if (feature.type !== 'Feature') pushError(errors, `${path}.type`, 'expected Feature')
    if (feature.geometry?.type !== 'Point') pushError(errors, `${path}.geometry.type`, 'expected Point')

    const coordinates = feature.geometry?.coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      pushError(errors, `${path}.geometry.coordinates`, 'expected [longitude, latitude]')
      return
    }

    const [lng, lat] = coordinates
    if (!isRenderableNzCoordinate([lat, lng])) {
      pushError(errors, `${path}.geometry.coordinates`, 'expected renderable NZ coordinates')
    }
  })

  return errors
}

export function assertValidDataset(dataset, label = 'dataset') {
  const errors = validateDataset(dataset)
  if (errors.length) {
    throw new Error(`${label} contract failed:\n${errors.slice(0, 25).join('\n')}`)
  }
}
