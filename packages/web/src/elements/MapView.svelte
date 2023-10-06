<script lang="ts">
  import _ from 'lodash';
  import { onMount, tick } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import leaflet from 'leaflet';
  import resizeObserver from '../utility/resizeObserver';
  import openNewTab from '../utility/openNewTab';
  import contextMenu from '../utility/contextMenu';
  import { saveFileToDisk } from '../utility/exportFileTools';
  import { apiCall } from '../utility/api';

  let refContainer;
  let map;

  let layers = [];
  export let geoJson;

  function addObjectToMap() {
    if (!map) return;
    if (!geoJson) return;

    for (const layer of layers) {
      layer.remove();
    }
    layers = [];

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
    layers.push(geoJsonObj);
  }

  onMount(() => {
    map = leaflet.map(refContainer).setView([50, 15], 13);

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      })
      .addTo(map);

    addObjectToMap();
  });

  $: {
    geoJson;
    addObjectToMap();
  }

  function createMenu() {
    return [
      {
        text: 'Open on new tab',
        onClick: () => {
          openNewTab(
            {
              title: 'Map',
              icon: 'img map',
              tabComponent: 'MapTab',
            },
            { editor: geoJson }
          );
        },
      },
      {
        text: 'Export to HTML file',
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
