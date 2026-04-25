# GottaGo

GottaGo is a New Zealand public-toilet finder built with React, TypeScript, Vite, and Leaflet.

V1 ships with a generated consumer dataset of NZ public toilets in `public/data/`, built from OpenStreetMap `amenity=toilets` records. The app loads the dataset at runtime, displays the toilet locations on a map, and exposes practical details such as accessibility, baby-change status, opening hours, fee/access tags, operator, source link, and nearest-to-user sorting.

## Dataset

Generated files:

- `public/data/toilets.json` - app-facing JSON with metadata and normalized toilet records.
- `public/data/toilets.geojson` - GIS-friendly FeatureCollection.
- `public/data/toilets.csv` - spreadsheet/export format.
- `public/data/metadata.json` - source, generation time, count, and query metadata.

Current V1 count: 4,285 consumer records from 4,507 raw source records. The builder merges exact-coordinate duplicates and conservative same-name/location duplicates within 15 metres, preserving the merged source IDs on each output record.

Primary source: [OpenStreetMap](https://www.openstreetmap.org), queried for New Zealand `amenity=toilets` nodes, ways, and relations. Restricted records tagged `access=private` or `access=no` are excluded.

Important data caveat: coordinates are generally strong, but facility attributes are only as complete as the source tags. Accessibility, baby-change, fees, and opening hours may be `Unknown` where no public source has verified them.

## Refresh The Dataset

```bash
npm run data:toilets
```

The script writes fresh JSON, GeoJSON, CSV, and metadata files to `public/data/`.

Optional endpoint override:

```bash
$env:OVERPASS_ENDPOINT = "https://overpass.kumi.systems/api/interpreter"
npm run data:toilets
```

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run data:toilets
npm run test
npm run lint
npm run build
```

Production builds copy the dataset into `dist/data/`.
