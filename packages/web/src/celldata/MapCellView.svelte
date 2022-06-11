<script lang="ts">
  import _ from 'lodash';
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import leaflet from 'leaflet';
  import wellknown from 'wellknown';
  import { isWktGeometry } from 'dbgate-tools';

  //   import Map from 'ol/Map';
  //   import View from 'ol/View';
  //   import TileLayer from 'ol/layer/Tile';
  //   import XYZ from 'ol/source/XYZ';

  export let selection;
  export let wrap;

  let refContainer;
  let map;

  let selectionLayers = [];

  function addSelectionToMap() {
    if (!map) return;
    if (!selection) return;

    for (const selectionLayer of selectionLayers) {
      selectionLayer.remove();
    }
    selectionLayers = [];

    const geoValues = selection.map(x => x.value).filter(isWktGeometry);

    if (geoValues.length > 0) {
      // parse WKT to geoJSON array
      const geometries = geoValues.map(wellknown);
      const geoJson = {
        type: 'GeometryCollection',
        geometries,
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
          pointToLayer: function (feature, latlng) {
            return leaflet.circleMarker(latlng, {
              radius: 7,
              weight: 2,
              fillColor: '#ff7800',
              color: '#ff7800',
              opacity: 0.8,
              fillOpacity: 0.4,
            });
          },
        })
        .addTo(map);
      map.fitBounds(geoJsonObj.getBounds());
      selectionLayers.push(geoJsonObj);
    }
  }

  onMount(() => {
    // new Map({
    //   target: refContainer,
    //   layers: [
    //     new TileLayer({
    //       source: new XYZ({
    //         url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    //       }),
    //     }),
    //   ],
    //   view: new View({
    //     center: [0, 0],
    //     zoom: 2,
    //   }),
    // });

    map = leaflet.map(refContainer); // .setView([51.505, -0.09], 13);

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
</script>

<div bind:this={refContainer} class="flex1" />
