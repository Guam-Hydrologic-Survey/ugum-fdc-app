// path to 
const dataUrl = './src/data/river2_lat_lon_wgs84.json';
const streamGageData = './src/data/STREAM_GAGES_USED.json';
const watershedData = './src/data/watersheds_lat_lon_wgs84.json';

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
	attribution: 'Tiles &copy; Esri' + devs,
}).addTo(map); 

// ESRI World Gray Canvas 
let ewgc = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri' + devs,
	maxZoom: maxZoom,
});

// Carto DB Dark Matter tiles
let cdbd = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' + devs,
	subdomains: 'abcd',
	maxZoom: maxZoom,
});

const baseLayers = {
    // 'ESRI World Imagery': ewi,
    // 'Open Street Map': osm,
    // 'Gray Canvas': ewgc,
    // 'Dark Canvas': cdbd,
}

const bases = {
    "Base Maps": {
        "ESRI World Imagery": ewi,
        "Open Street Map": osm,
        "Gray Canvas": ewgc,
        "Dark Canvas": cdbd
    }
}

let groupedLayersOptions = {
    exclusiveGroups: ["Base Maps"],
    groupCheckboxes: true, 
    position: 'bottomright'
};

const layerControl = L.control.groupedLayers(baseLayers, bases, groupedLayersOptions).addTo(map);

// Mini map shows view of current region 
let mini_ewi = new L.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { minZoom: 8, maxZoom: 14, attribution: 'Tiles &copy; Esri' + devs });

let miniMap = new L.Control.MiniMap(mini_ewi, { position: 'bottomleft', toggleDisplay: true }).addTo(map);

let streamGages;

fetch(streamGageData)
  .then(response => response.json())
  .then(geojson => {
    const getInfo = (feature, layer) => {
        layer.bindTooltip('USGS Stream Gage', {permanent: true, direction: 'bottom', offset: [0,10], className: 'usgs-stream-gages-tooltip'})
        layer.bindPopup(`<span align="center"><b>${feature.properties.AGENCY}</b> <br>Stream Gage #: ${feature.properties.GAGE_NUMBER} <br><i><a href=${feature.properties.USGS_link} target="_blank" rel="noreferrer noopener">${feature.properties.NAME}</i></a></span>`);
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
  });

const watersheds = [
    {
        "name": "Pago",
        "color": '#4CC9F0',
    },
    {
        "name": "Ylig",
        "color": "#F72585",
    },
    {
        "name": "Talofofo",
        "color": "#FF9500",
    },
    {
        "name": "Ugum",
        "color": "#FFEB0A",
    },
    {
        "name": "Dandan",
        "color": "#4895EF",
    },
    {
        "name": "Inarajan",
        "color": "#70E000",
    },
    {
        "name": "Manell",
        "color": "#F962A6",
    },
    {
        "name": "Geus",
        "color": "#FAA307",
    },
    {
        "name": "Toguan",
        "color": "#4CC9F0",
    },
    {
        "name": "Umatac",
        "color": "#7209B7",
    },
    {
        "name": "Cetti",
        "color": "#38B000",
    },
    {
        "name": "Taelayag",
        "color": "#B5179E",
    },
    {
        "name": "Agat",
        "color": "#4895EF",
    },
    {
        "name": "Apra",
        "color": "#9EF01A",
    },
];

fetch(watershedData)
    .then(response => response.json())
    .then(geojson => {
        const getPoly = (feature, layer) => {
            layer.bindTooltip(`${feature.properties.Name}`, 
            {
                permanent: true, direction: 'center', offset: [0,0], 
                className: 'watershed-tooltip'
            });
        };

        for (let i = 0; i < watersheds.length; i++) {
            const watershedLayer = L.geoJSON(geojson, {
                filter: function(feature, layer) {
                    return (feature.properties.Name) == `${watersheds[i].name} Watershed`.toUpperCase();
                },
                interactive: false, 
                style: {
                    color: watersheds[i].color,
                    opacity: .30,
                },
                onEachFeature: getPoly,
            }).addTo(map);
            layerControl.addOverlay(watershedLayer, watersheds[i].name, "Watersheds");
        }
    });

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

let riverGeoJSON;

function isEmpty(name, id) {
    let title;
    if (!name) {
        title = 'Reach ID: ' + id;
    } else {
        title = name + ' - Reach ID: ' + id;
    }
    return (title);
}

function highlightFeature(e) {
    let layer = e.target;

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
            document.getElementById('marker-card').innerHTML = /*html*/
            `
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
          });
      };

      riverGeoJSON = L.geoJSON(geojson, { onEachFeature: getFDCValues }).addTo(map);
      layerControl.addOverlay(riverGeoJSON, "Rivers")
  })

L.control.zoom({
    position: 'bottomright',
}).addTo(map);

// Control: Reset map view (goes to initial map zoom on page load)
let resetZoomBtn = L.easyButton('<i class="fa-regular fa-map"></i>', function() {
    map.setView(center, 12);
}, "Reset map view");

const controlBar = L.easyBar([
    resetZoomBtn,
], { position: 'bottomright'})

controlBar.addTo(map);

const mapTitle = L.control({ position: 'topleft' });

mapTitle.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'mapTitle'); 
    this._div.innerHTML = '<img src="./src/assets/WERI MAppFx_Title Card_Southern Guam Watersheds FDC.png" height="150">';
    return this._div;
}

mapTitle.addTo(map);

// Hides tooltip based on zoom level for USGS stream gages 
map.on('zoomend', function(z) {
    let zoomLevel = map.getZoom();
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
let drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);

let drawControl = new L.Control.Draw({
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
    let layer = event.layer;
    drawnFeatures.addLayer(layer);
});

if (map.hasLayer(drawnFeatures)) {
    layerControl.addOverlay(drawnFeatures, "Drawings");
}
