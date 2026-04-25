import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDatasetFromOsm, dedupeRecords, normalizeElement } from '../scripts/build-toilet-dataset.mjs'

function element(overrides) {
  return {
    type: 'node',
    id: 1,
    lat: -41,
    lon: 174,
    tags: {
      amenity: 'toilets',
      name: 'Test Public Toilets',
      access: 'yes',
    },
    ...overrides,
  }
}

test('normalizeElement excludes restricted access through dataset build', () => {
  const { toilets, metadata } = buildDatasetFromOsm(
    {
      elements: [
        element({ id: 10, tags: { amenity: 'toilets', name: 'Public', access: 'yes' } }),
        element({ id: 11, tags: { amenity: 'toilets', name: 'Private', access: 'private' } }),
        element({ id: 12, tags: { amenity: 'toilets', name: 'No Access', access: 'no' } }),
      ],
    },
    '2026-04-25T00:00:00.000Z',
  )

  assert.equal(toilets.length, 1)
  assert.equal(toilets[0].name, 'Public')
  assert.equal(metadata.rawRecordCount, 1)
  assert.equal(metadata.recordCount, 1)
})

test('dedupeRecords merges exact-coordinate duplicates and preserves source ids', () => {
  const first = normalizeElement(
    element({
      id: 21,
      tags: {
        amenity: 'toilets',
        name: 'Park Toilet',
        access: 'yes',
        wheelchair: 'yes',
      },
    }),
  )
  const second = normalizeElement(
    element({
      id: 22,
      tags: {
        amenity: 'toilets',
        name: 'Park Toilet',
        access: 'yes',
        changing_table: 'yes',
      },
    }),
  )

  const { toilets, duplicateGroups, duplicateRecordsRemoved } = dedupeRecords([first, second])

  assert.equal(toilets.length, 1)
  assert.equal(duplicateGroups, 1)
  assert.equal(duplicateRecordsRemoved, 1)
  assert.deepEqual(toilets[0].sourceIds, ['node/21', 'node/22'])
  assert.equal(toilets[0].wheelchair, true)
  assert.equal(toilets[0].babyChange, true)
})

test('buildDatasetFromOsm metadata counts match normalized output', () => {
  const { toilets, metadata } = buildDatasetFromOsm(
    {
      elements: [
        element({ id: 31, tags: { amenity: 'toilets', name: 'A', access: 'yes' } }),
        element({ id: 32, tags: { amenity: 'toilets', name: 'A', access: 'yes' } }),
        element({ id: 33, tags: { amenity: 'toilets', name: 'B', access: 'customers' } }),
      ],
    },
    '2026-04-25T00:00:00.000Z',
  )

  assert.equal(metadata.recordCount, toilets.length)
  assert.equal(metadata.rawRecordCount, 3)
  assert.equal(metadata.duplicateGroups, 1)
  assert.equal(metadata.duplicateRecordsRemoved, 1)
  assert.equal(metadata.primarySource, 'OpenStreetMap amenity=toilets')
})
