const dataUrl = './src/data/river2_lat_lon_wgs84.json';

const center = [13.3578327,144.6614373];
const defaultZoom = 12;
const maxZoom = 19;

const map = L.map('map', {
    center: center,
    zoom: defaultZoom,
    zoomControl: false,
})

const devs = ` | <a href="https://weri.uog.edu/">WERI</a>-<a href="https://guamhydrologicsurvey.uog.edu/">GHS</a>: NCHabana, LFHeitz, DKValerio MWZapata 2023`;

// Open Street Map tiles
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: maxZoom,
    attribution: '© OpenStreetMap' + devs,
});

// ESRI World Imagery tiles 
const ewi = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: maxZoom,
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' + devs,
}).addTo(map); 

// ESRI World Gray Canvas 
var ewgc = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ' + devs,
	maxZoom: maxZoom,
});

// Carto DB Dark Matter tiles
var cdbd = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' + devs,
	subdomains: 'abcd',
	maxZoom: maxZoom,
});

const baseLayers = {
    'ESRI World Imagery': ewi,
    'Open Street Map': osm,
    'Gray Canvas': ewgc,
    'Dark Canvas': cdbd,
}

const layerControl = L.control.layers(baseLayers, null, { position: 'bottomright'}).addTo(map);

L.control.zoom({
    position: 'bottomright',
}).addTo(map);

// Control: Reset map view (goes to initial map zoom on page load)
var resetZoomBtn = L.easyButton('<i class="fa-regular fa-map"></i>', function() {
    map.setView(center, 12);
}, "Reset map view");

const controlBar = L.easyBar([
    resetZoomBtn,
], { position: 'bottomright'})

controlBar.addTo(map);

const mapTitle = L.control({ position: 'topleft' });

mapTitle.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'mapTitle'); 
    this._div.innerHTML = '<img src="./src/assets/WERI MAppFx_Title Card_Ugum FDC.png" height="150">';
    return this._div;
}

mapTitle.addTo(map);

// Hides tooltip based on zoom level for USGS stream gages 
map.on('zoomend', function(z) {
    var zoomLevel = map.getZoom();
    if (zoomLevel >= 13 ){
        [].forEach.call(document.querySelectorAll('.leaflet-tooltip.watershed-tooltip'), function (t) {
            t.style.visibility = 'visible';
        });
    } else {
        [].forEach.call(document.querySelectorAll('.leaflet-tooltip.watershed-tooltip'), function (t) {
            t.style.visibility = 'hidden';
        });
    }
});

// Draw control bar
var drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);

var drawControl = new L.Control.Draw({
    position: "bottomright",
    draw: {
        polyline: {
            allowIntersection: true,
            shapeOptions: {
                color: "orange"
            }
        },
        polygon: {
            allowIntersection: false,
            showArea: true,
            showLength: true,
            shapeOptions: {
                color: "purple",
                clickable: true
            }
        },
        circle: {
            shapeOptions: {
                shapeOptions: {
                    color: "blue",
                    clickable: true
                }
            }
        },
        circlemarker: false,
        rectangle: {
            showArea: true,
            showLength: true,
            shapeOptions: {
                color: "green",
                clickable: true
            }
        },
        marker: false
    },
    edit: {
        featureGroup: drawnFeatures,
        remove: true,
    }
});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function(event) {
    var layer = event.layer;
    drawnFeatures.addLayer(layer);
});

if (map.hasLayer(drawnFeatures)) {
    layerControl.addOverlay(drawnFeatures, "Drawings");
}

const mini_ewi = new L.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {minZoom: 8, maxZoom: 14, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' + devs });

var miniMap = new L.Control.MiniMap(mini_ewi, { position: 'bottomleft', toggleDisplay: true }).addTo(map);

var streamGages;

fetch('./src/data/STREAM_GAGES_USED.json')
  .then(response => response.json())
  .then(geojson => {
    const getInfo = (feature, layer) => {
        layer.bindTooltip('USGS Stream Gage', {permanent: true, direction: 'bottom', offset: [0,10], className: 'usgs-stream-gages-tooltip'})
        layer.bindPopup(`<span align="center"><b>${feature.properties.AGENCY}</b> <br>Stream Gage #: ${feature.properties.GAGE_NUMBE} <br><i><a href=${feature.properties.USGS_link} target="_blank" rel="noreferrer noopener">${feature.properties.NAME}</i></a></span>`);
    }
    
    streamGages = L.geoJSON(geojson, { 
        pointToLayer:  function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: '#ccff33',
                weight: 1,
                fillOpacity: 1.0,
                color: '#000',
                opacity: 1.0,
            })
        },
        onEachFeature: getInfo,
    }).addTo(map);

    layerControl.addOverlay(streamGages, "USGS Stream Gages");
  })

  var watersheds; 
  let watershedNames;
  const watershedColors = ['#40768C', '#4ED0C1', '#F4E3B8', '#FAD3B3', '#F3B5A5'] 

  fetch('./src/data/watersheds_lat_lon_wgs84.json')
    .then(response => response.json())
    .then(geojson => {
        const getPoly = (feature, layer) => {
            layer.bindTooltip(`${feature.properties.Name}`, 
            {
                permanent: true, direction: 'center', offset: [0,0], 
                className: 'watershed-tooltip'
            })
        }

        watersheds = L.geoJSON(geojson, { 
            interactive: false,
            style: {
                // assign random color: watershedColors[Math.floor(Math.random() * watershedColors.length)]
                color: '#FFEDA0',
                opacity: .30,
            },
            onEachFeature: getPoly, }).addTo(map);
        layerControl.addOverlay(watersheds, "Southern Guam Watersheds");
    })

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
            text: isEmpty(plotData.streamName, plotData.ARCID),
            font: {
                size: 20
            }
        },
        xaxis: {
            title: "Exceedance Probability (%)",
            // autorange: false,
            nticks: 50,
            range: [0, 100],
            // type: "log"
        },
        yaxis: {
            title: "Discharge (cfs)",
            type: "log"
        }
    }
    Plotly.newPlot('plot-div', [fdcTrace,], layout)
}

const downloadData = (id) => {
    const eps = [0, 10, 30, 50, 80, 95]
    const a = document.createElement('a')
    a.href = "data:text/csv;charset=utf-8,Exceedance Probability, Discharge (cfs),\n" + eps.map(ep => [ep, plotData[`Q${ep}`]].join(",")).join(",\n")
    a.download = id + "_flow_duration_curve.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

var riverGeoJSON;

function isEmpty(name, id) {
    var title;
    if (!name) {
        title = 'Reach ID: ' + id;
    } else {
        title = name + ' - Reach ID: ' + id;
    }
    return (title);
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: 'white',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    riverGeoJSON.resetStyle(e.target);
}

fetch(dataUrl)
  .then(response => response.json())
  .then(geojson => {
      const getFDCValues = (feature, layer) => {
          layer.bindPopup(
            document.getElementById('marker-card').innerHTML = `
            <div class="card text-center">
                <div class="card-header">
                    <h5>${isEmpty(feature.properties.streamName, feature.properties.ARCID)}</h5>
                </div>
                <div class="card-body">
                    <p>${[0, 10, 30, 50, 80, 95, 'AVG'].map(ep => `Q${ep}: ${feature.properties[`Q${ep}`]}<br>`).join('')}</p>
                </div>
                <div class="card-footer text-body-secondary">
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal" onclick="plotFDC()" data-bs-target="#exampleModal">Plot FDC</button>
                    <button type="button" class="btn btn-success" onclick="downloadData(${feature.properties.ARCID})">Download CSV</button>'
                </div>
            </div>
            `
          );
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: a => plotData = a.target.feature.properties,
          })
      }

      riverGeoJSON = L.geoJSON(geojson, { onEachFeature: getFDCValues }).addTo(map);

      layerControl.addOverlay(riverGeoJSON, "Rivers")
  })
