let publicMap = null;
let internalMap = null;
let drawnItems = null;

const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const osmAttrib = "&copy; OpenStreetMap contributors";

const esriSatUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const esriSatAttrib =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

let publicOsmLayer, publicSatLayer;
let internalOsmLayer, internalSatLayer;

function initPublicMap() {
  if (publicMap) return;

  publicOsmLayer = L.tileLayer(osmUrl, { maxZoom: 19, attribution: osmAttrib });
  publicSatLayer = L.tileLayer(esriSatUrl, {
    maxZoom: 18,
    attribution: esriSatAttrib,
  });

  publicMap = L.map("publicMap", {
    center: [-7.375, 110.332],
    zoom: 14,
    layers: [publicOsmLayer],
  });

  L.control.scale({ imperial: false }).addTo(publicMap);
}

function initInternalMap() {
  if (internalMap) return;

  internalOsmLayer = L.tileLayer(osmUrl, {
    maxZoom: 19,
    attribution: osmAttrib,
  });
  internalSatLayer = L.tileLayer(esriSatUrl, {
    maxZoom: 18,
    attribution: esriSatAttrib,
  });

  internalMap = L.map("internalMap", {
    center: [-7.375, 110.332],
    zoom: 14,
    layers: [internalOsmLayer],
  });

  L.control.scale({ imperial: false }).addTo(internalMap);

  drawnItems = new L.FeatureGroup();
  internalMap.addLayer(drawnItems);

  internalMap.pm.addControls({
    position: "topleft",
    drawMarker: true,
    drawPolyline: true,
    drawPolygon: true,
    drawRectangle: true,
    drawCircle: false,
    editMode: true,
    dragMode: true,
    removalMode: true,
  });

  internalMap.on("pm:create", function (e) {
    const layer = e.layer;
    drawnItems.addLayer(layer);

    if (e.shape === "Polygon" || e.shape === "Rectangle") {
      const geojson = layer.toGeoJSON();
      const areaM2 = turf.area(geojson);
      const areaHa = (areaM2 / 10000).toFixed(2);

      const resultEl = document.getElementById("spatialMeasureResult");
      if (resultEl) {
        resultEl.innerHTML = `
                    <div class="font-bold text-slate-800">Polygon Draf Baru Terbuat:</div>
                    <div class="text-indigo-700 font-semibold mt-1">Luas: ${areaM2.toFixed(1)} m² (${areaHa} Ha)</div>
                    <div class="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                        <span>✓ Terdaftar di draf digitasi lokal</span>
                    </div>
                `;
      }
    }
  });
}

function switchBasemap(type) {
  if (!publicMap) return;
  const btnOsm = document.getElementById("btnOsm");
  const btnSat = document.getElementById("btnSat");

  if (type === "osm") {
    publicMap.removeLayer(publicSatLayer);
    publicMap.addLayer(publicOsmLayer);
    if (btnOsm && btnSat) {
      btnOsm.className =
        "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
      btnSat.className =
        "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
    }
  } else if (type === "sat") {
    publicMap.removeLayer(publicOsmLayer);
    publicMap.addLayer(publicSatLayer);
    if (btnOsm && btnSat) {
      btnSat.className =
        "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
      btnOsm.className =
        "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
    }
  }
}

function switchInternalBasemap(type) {
  if (!internalMap) return;
  const btnOsm = document.getElementById("btnInternalOsm");
  const btnSat = document.getElementById("btnInternalSat");

  if (type === "osm") {
    internalMap.removeLayer(internalSatLayer);
    internalMap.addLayer(internalOsmLayer);
    if (btnOsm && btnSat) {
      btnOsm.className =
        "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
      btnSat.className =
        "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
    }
  } else if (type === "sat") {
    internalMap.removeLayer(internalOsmLayer);
    internalMap.addLayer(internalSatLayer);
    if (btnOsm && btnSat) {
      btnSat.className =
        "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
      btnOsm.className =
        "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
    }
  }
}

function exportDrawnPolygons() {
  if (!drawnItems || drawnItems.getLayers().length === 0) {
    alert("Belum ada bidang/poligon hasil digitasi di peta!");
    return;
  }

  const data = drawnItems.toGeoJSON();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `digitasi_bhumi_grabag_${Date.now()}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
