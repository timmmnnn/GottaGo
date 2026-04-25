import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isRenderableNzCoordinate,
  validateDataset,
  validateGeoJson,
  validateMetadata,
} from '../scripts/dataset-contract.mjs'

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
}

test('published toilets.json satisfies the dataset contract', async () => {
  const dataset = await readJson('../public/data/toilets.json')
  const errors = validateDataset(dataset)

  assert.deepEqual(errors, [])
})

test('published metadata.json matches toilets.json counts and source contract', async () => {
  const dataset = await readJson('../public/data/toilets.json')
  const metadata = await readJson('../public/data/metadata.json')
  const errors = validateMetadata(metadata, dataset.toilets)

  assert.deepEqual(errors, [])
  assert.equal(metadata.recordCount, dataset.metadata.recordCount)
  assert.equal(metadata.primarySource, dataset.metadata.primarySource)
})

test('published GeoJSON mirrors toilets.json point coordinates', async () => {
  const dataset = await readJson('../public/data/toilets.json')
  const geoJson = await readJson('../public/data/toilets.geojson')
  const errors = validateGeoJson(geoJson, dataset)

  assert.deepEqual(errors, [])
  assert.equal(geoJson.features.length, dataset.toilets.length)

  const firstToilet = dataset.toilets[0]
  const firstFeature = geoJson.features.find((feature) => feature.id === firstToilet.id)

  assert.ok(firstFeature)
  assert.deepEqual(firstFeature.geometry.coordinates, [
    firstToilet.coordinates[1],
    firstToilet.coordinates[0],
  ])
})

test('coordinate contract catches swapped coordinates while allowing Chatham Islands', () => {
  assert.equal(isRenderableNzCoordinate([-41.27, 173.28]), true)
  assert.equal(isRenderableNzCoordinate([-43.8, -176.5]), true)
  assert.equal(isRenderableNzCoordinate([173.28, -41.27]), false)
})
