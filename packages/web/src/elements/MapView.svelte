<script lang="ts" context="module">
  export function selectionCouldBeShownOnMap(selection) {
    console.log('selection', selection);
    if (selection.length > 0 && _.find(selection, x => isWktGeometry(x.value))) {
      return true;
    }

    if (
      selection.find(x => x.column.toLowerCase().includes('lat')) &&
      (selection.find(x => x.column.toLowerCase().includes('lon')) ||
        selection.find(x => x.column.toLowerCase().includes('lng')))
    ) {
      return true;
    }
    return false;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { onMount, tick } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import leaflet from 'leaflet';
  import wellknown from 'wellknown';
  import { isWktGeometry, ScriptWriter, ScriptWriterJson } from 'dbgate-tools';
  import resizeObserver from '../utility/resizeObserver';
  import openNewTab from '../utility/openNewTab';
  import contextMenu from '../utility/contextMenu';
  import { saveExportedFile, saveFileToDisk } from '../utility/exportFileTools';
  import { getCurrentConfig } from '../stores';
  import { apiCall } from '../utility/api';

  export let selection;

  let refContainer;
  let map;

  let selectionLayers = [];
  let geoJson;

  function createColumnsTable(cells) {
    return `<table>${cells.map(cell => `<tr><td>${cell.column}</td><td>${cell.value}</td></tr>`).join('\n')}</table>`;
  }

  function addSelectionToMap() {
    if (!map) return;
    if (!selection) return;

    for (const selectionLayer of selectionLayers) {
      selectionLayer.remove();
    }
    selectionLayers = [];

    const selectedRows = _.groupBy(selection || [], 'row');

    const features = [];

    for (const rowKey of _.keys(selectedRows)) {
      const cells = selectedRows[rowKey];
      const lat = cells.find(x => x.column.toLowerCase().includes('lat'));
      const lon = cells.find(x => x.column.toLowerCase().includes('lon') || x.column.toLowerCase().includes('lng'));

      const geoValues = cells.map(x => x.value).filter(isWktGeometry);

      if (lat && lon) {
        features.push({
          type: 'Feature',
          properties: {
            popupContent: createColumnsTable(cells),
          },
          geometry: {
            type: 'Point',
            coordinates: [lon.value, lat.value],
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

    const geoJsonObj = leaflet
      .geoJSON(geoJson, {
        style: function () {
          return {
            weight: 2,
            fillColor: '#ff7800',
            color: '#ff7800',
            opacity: 0.8,
            fillOpacity: 0.4,
          };
        },
        pointToLayer: (feature, latlng) => {
          return leaflet.circleMarker(latlng, {
            radius: 7,
            weight: 2,
            fillColor: '#ff0000',
            color: '#ff0000',
            opacity: 0.9,
            fillOpacity: 0.9,
          });
        },
        onEachFeature: (feature, layer) => {
          // does this feature have a property named popupContent?
          if (feature.properties && feature.properties.popupContent) {
            layer.bindPopup(feature.properties.popupContent);
            layer.bindTooltip(feature.properties.popupContent);
          }
        },
      })
      .addTo(map);
    // geoJsonObj.bindPopup('This is the Transamerica Pyramid'); //.openPopup();
    map.fitBounds(geoJsonObj.getBounds());
    selectionLayers.push(geoJsonObj);
  }

  onMount(() => {
    map = leaflet.map(refContainer).setView([50, 15], 13);

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      })
      .addTo(map);

    addSelectionToMap();
    // map.fitBounds([
    //   [50, 15],
    //   [50.1, 15],
    //   [50, 15.1],
    // ]);

    // const marker = leaflet.marker([50, 15]).addTo(map);
    // <div bind:this={refContainer} class="flex1 map-container" />
  });

  $: {
    selection;
    addSelectionToMap();
  }

  function createMenu() {
    return [
      {
        text: 'Open on new tab',
        onClick: () => {
          openNewTab({
            title: 'Map',
            icon: 'img map',
            tabComponent: 'MapTab',
            props: {
              selection,
            },
          });
        },
      },
      {
        text: 'Save to file',
        onClick: () => {
          saveFileToDisk(async filePath => {
            await apiCall('files/export-map', {
              geoJson,
              filePath,
            });
          });
        },
      },
    ];
  }
</script>

<div
  bind:this={refContainer}
  use:contextMenu={createMenu}
  class="flex1"
  use:resizeObserver={true}
  on:resize={async e => {
    await tick();
    map.invalidateSize();
  }}
/>
