const getMapExport = (geoJson) => {
  return `<html>
  <meta charset='utf-8'>
  
  <head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.8.0/dist/leaflet.css"
      integrity="sha512-hoalWLoI8r4UszCkZ5kL8vayOGVae1oxXe/2A4AO6J9+580uKHDO3JdHb7NzwwzK5xr/Fs0W40kiNHxM9vyTtQ=="
      crossorigin=""/>

    <script src="https://unpkg.com/leaflet@1.8.0/dist/leaflet.js"
      integrity="sha512-BB3hKbKWOc9Ez/TAwyWxNXeoV9c1v6FIeYiBieIWkpLjauysF18NzgR1MBNBXf8/KABdlkX68nAhlwcDFLGPCQ=="
      crossorigin=""></script>      
    
    <script>
    function createMap() {
    map = leaflet.map('map').setView([50, 15], 13);

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '<a href="https://dbgate.io" title="Exported from DbGate">DbGate</a> | © OpenStreetMap',
      })
      .addTo(map);
      
	  leaflet.control.scale().addTo(map);
	  
      const geoJsonObj = leaflet
      .geoJSON(${JSON.stringify(geoJson)}, {
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
    map.fitBounds(geoJsonObj.getBounds());
    }
    </script>

      <style>
        #map {
          position: fixed;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
        }
      </style>
  </head>
  
  <body onload='createMap()'>
      <div id='map'></div>
  </body>
  
  </html>`;
};

module.exports = getMapExport;
