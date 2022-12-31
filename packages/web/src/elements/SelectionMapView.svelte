<script lang="ts" context="module">
  function findLatLonPaths(obj, attrTest, res = [], prefix = '') {
    for (const key of Object.keys(obj)) {
      if (attrTest(key, obj[key])) {
        res.push(prefix + key);
      }
      if (_.isPlainObject(obj[key])) {
        findLatLonPaths(obj[key], attrTest, res, prefix + key + '.');
      }
    }
    return res;
  }
  export function findLatPaths(obj) {
    return findLatLonPaths(obj, x => x.includes('lat'));
  }
  export function findLonPaths(obj) {
    return findLatLonPaths(obj, x => x.includes('lon') || x.includes('lng'));
  }
  export function findAllObjectPaths(obj) {
    return findLatLonPaths(obj, (_k, v) => v != null && !_.isNaN(Number(v)));
  }

  export function selectionCouldBeShownOnMap(selection) {
    if (selection.length > 0 && _.find(selection, x => isWktGeometry(x.value))) {
      return true;
    }

    if (
      selection.length > 0 &&
      _.find(selection, x => findLatPaths(x.rowData).length > 0 && findLonPaths(x.rowData).length > 0)
    ) {
      return true;
    }
    return false;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import 'leaflet/dist/leaflet.css';
  import wellknown from 'wellknown';
  import { isWktGeometry, stringifyCellValue } from 'dbgate-tools';
  import MapView from './MapView.svelte';

  export let selection;

  export let latitudeField = '';
  export let longitudeField = '';

  let geoJson;

  function createColumnsTable(cells) {
    if (cells.length == 0) return '';
    return `<table>${cells
      .map(cell => `<tr><td>${cell.column}</td><td>${stringifyCellValue(cell.value)}</td></tr>`)
      .join('\n')}</table>`;
  }

  function createGeoJson() {
    const selectedRows = _.groupBy(selection || [], 'row');

    const features = [];

    for (const rowKey of _.keys(selectedRows)) {
      const cells = selectedRows[rowKey];

      const geoValues = cells.map(x => x.value).filter(isWktGeometry);

      const lat = latitudeField ? Number(_.get(cells[0].rowData, latitudeField)) : NaN;
      const lon = longitudeField ? Number(_.get(cells[0].rowData, longitudeField)) : NaN;

      if (!_.isNaN(lat) && !_.isNaN(lon)) {
        features.push({
          type: 'Feature',
          properties: {
            popupContent: createColumnsTable(cells),
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(lon), Number(lat)],
          },
        });
      }

      if (geoValues.length > 0) {
        // parse WKT to geoJSON array
        features.push(
          ...geoValues.map(wellknown).map(geometry => ({
            type: 'Feature',
            properties: {
              popupContent: createColumnsTable(cells.filter(x => !isWktGeometry(x.value))),
            },
            geometry,
          }))
        );
      }
    }

    if (features.length == 0) {
      return;
    }

    geoJson = {
      type: 'FeatureCollection',
      features,
    };
  }

  $: {
    selection;
    latitudeField;
    longitudeField;
    createGeoJson();
  }
</script>

<MapView {geoJson} />
