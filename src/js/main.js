const dataUrl = './src/data/rivers.json';

const map = L.map('map', {
    center: [13.4443, 144.7937],
    zoom: 12,
    zoomControl: false,
})

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap'
});

// ESRI World Imagery 
const ewi = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | DKValerio, MWZapata, JBulaklak, NCHabana 2022'
}).addTo(map); 

const baseLayers = {
    'ESRI World Imagery': ewi,
    'Open Street Map': osm,
}

const layerControl = L.control.layers(baseLayers, null, { position: 'bottomright'}).addTo(map);

L.control.zoom({
    position: 'bottomright',
}).addTo(map);

const mapTitle = L.control({ position: 'topleft' });

mapTitle.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'mapTitle'); 
    this._div.innerHTML = '<img src="./src/assets/WERI MAppFx_Title Card_Ugum FDC.png" height="150">';
    return this._div;
}

mapTitle.addTo(map);

let plotData
const plotFDC = () => {
    const eps = [0, 10, 30, 50, 80, 95]
    const fdcTrace = {
        x: eps,
        y: eps.map(ep => plotData[`Q${ep}`]),
        type: 'scatter',
        name: 'Flow Duration Curve',
    };
    const layout = {
        title: {
            text: `Flow Duration Curve for ${plotData.streamName} - Reach ID ${plotData.ARCID}`,
            font: {
                size: 20
            }
        },
        xaxis: {
            title: "Exceedance Probability (%)",
            range: [0, 100],
            nticks: 50,
        },
        yaxis: {
            title: "Discharge (cfs)",
            type: "log"
        }
    }
    Plotly.newPlot('plot-div', [fdcTrace,], layout)
}

const download = () => {
    const eps = [0, 10, 30, 50, 80, 95]
    const a = document.createElement('a')
    a.href = "data:text/csv;charset=utf-8,Exceedance Probability, Discharge (cfs),\n" + eps.map(ep => [ep, plotData[`Q${ep}`]].join(",")).join(",\n")
    a.download = "flow_duration_curve.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

var riverGeoJSON;

fetch(dataUrl)
  .then(response => response.json())
  .then(geojson => {
      const getFDCValues = (feature, layer) => {
          layer.bindPopup(
            'Stream Name: ' + feature.properties.streamName + '<br>Reach ID: ' + feature.properties.ARCID + '<br><br>'+ 
            [0, 10, 30, 50, 80, 95, 'AVG'].map(ep => `Q${ep}: ${feature.properties[`Q${ep}`]}<br>`).join('') +
            '<button type="button" class="btn btn-primary" data-bs-toggle="modal" onclick="plotFDC()" data-bs-target="#exampleModal">Plot FDC</button>' +
            '<button type="button" class="btn btn-success" onclick="download()">Download CSV</button>'
          );
          layer.on('click', a => plotData = a.target.feature.properties)
      }
      riverGeoJSON = L.geoJSON(geojson, { onEachFeature: getFDCValues }).addTo(map);
  })

function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 5, 
        color: 'white',
        fillOpacity: 0.7,
    });

    layer.bringToFront();
}

function resetHighlight(e) {
    riverGeoJSON.resetStyle(e.target);
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
    });
}
