let publicMap = null;
let internalMap = null;
let drawnItems = null;
let pl2GeoData = null; // Menyimpan data GeoJSON hasil konversi

const osmUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const osmAttrib =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const esriSatUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const esriSatAttrib =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

let publicOsmLayer, publicSatLayer;
let internalOsmLayer, internalSatLayer;
let publicGeoJsonLayer = null;

// Konversi koordinat UTM 49S ke WGS84 (Lat, Lng)
function utm49sToLatLng(easting, northing) {
  if (window.proj4) {
    try {
      if (!proj4.defs["EPSG:32749"]) {
        proj4.defs(
          "EPSG:32749",
          "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs",
        );
      }
      const res = proj4("EPSG:32749", "EPSG:4326", [easting, northing]);
      return [res[0], res[1]]; // [lng, lat]
    } catch (e) {
      console.warn("Error Proj4, menggunakan fallback matematik.", e);
    }
  }

  // Fallback formula matematis UTM Zone 49S
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ePrime2 = e2 / (1 - e2);

  const x = easting - 500000.0;
  const y = northing - 10000000.0;

  const M = y / k0;
  const mu =
    M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * Math.pow(e2, 3)) / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = ePrime2 * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 =
    (a * (1 - e2)) /
    Math.pow(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * k0);

  const latRad =
    phi1Rad -
    ((N1 * Math.tan(phi1Rad)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4)) /
          24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 * T1 -
          252 * ePrime2 -
          3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lngRad =
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) *
        Math.pow(D, 5)) /
        120) /
    Math.cos(phi1Rad);

  const lat = latRad * (180 / Math.PI);
  const lng = 111.0 + lngRad * (180 / Math.PI);

  return [lng, lat];
}

// Konversi Esri JSON ke GeoJSON FeatureCollection
function esriJsonToGeoJSON(esriData) {
  if (!esriData || !esriData.features) return null;

  const features = esriData.features
    .map((f) => {
      if (!f.geometry || !f.geometry.rings) return null;
      const geoRings = f.geometry.rings.map((ring) => {
        return ring.map((pt) => utm49sToLatLng(pt[0], pt[1]));
      });

      return {
        type: "Feature",
        properties: f.attributes || {},
        geometry: {
          type: "Polygon",
          coordinates: geoRings,
        },
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features: features,
  };
}

// Pewarnaan tematik berdasarkan Penggunaan Lahan / Tema
function getFeatureStyle(feature) {
  const props = feature.properties || {};
  const pl = props.TEMA || props.PGT || props.JENIS || "";
  let color = "#3b82f6";
  let fillColor = "#60a5fa";

  if (pl.includes("Permukiman") || pl.includes("Pekarangan")) {
    color = "#d97706";
    fillColor = "#f59e0b";
  } else if (pl.includes("Sawah")) {
    color = "#059669";
    fillColor = "#10b981";
  } else if (pl.includes("Kebun")) {
    color = "#65a30d";
    fillColor = "#84cc16";
  } else if (pl.includes("Tegalan") || pl.includes("Ladang")) {
    color = "#ca8a04";
    fillColor = "#eab308";
  } else if (pl.includes("Danau") || pl.includes("Air")) {
    color = "#2563eb";
    fillColor = "#3b82f6";
  } else if (pl.includes("Makam") || pl.includes("Hijau")) {
    color = "#7c3aed";
    fillColor = "#a855f7";
  }

  return {
    color: color,
    weight: 1.5,
    fillColor: fillColor,
    fillOpacity: 0.5,
  };
}

function bindFeaturePopup(feature, layer) {
  const props = feature.properties || {};
  const container = document.createElement("div");
  container.className = "space-y-1 text-xs p-1";

  const title = document.createElement("div");
  title.className =
    "font-bold text-slate-800 border-b pb-1 mb-1 flex justify-between items-center";
  const fidText = props.FID !== undefined ? ` (FID: ${props.FID})` : "";
  title.innerHTML = `<span>Detail Persil${fidText}</span>`;
  container.appendChild(title);

  const rows = [
    { label: "Penggunaan Lahan", val: props.PGT },
    { label: "Tema", val: props.TEMA },
    { label: "Jenis", val: props.JENIS },
    { label: "Toponim", val: props.TOPONIM },
    {
      label: "Luas (m²)",
      val: props.Shape_Area
        ? Number(props.Shape_Area).toLocaleString("id-ID", {
            maximumFractionDigits: 2,
          }) + " m²"
        : null,
    },
    {
      label: "Luas (Ha)",
      val: props.luas ? Number(props.luas).toFixed(4) + " Ha" : null,
    },
  ];

  rows.forEach((r) => {
    if (r.val && String(r.val).trim() !== "" && String(r.val).trim() !== " ") {
      const div = document.createElement("div");
      div.className = "flex justify-between gap-3 text-[11px]";
      div.innerHTML = `<span class="text-slate-500 font-medium">${r.label}:</span><span class="font-semibold text-slate-800">${r.val}</span>`;
      container.appendChild(div);
    }
  });

  layer.bindPopup(container);
}

// Inisialisasi Peta Publik (Read-Only)
function initPublicMap() {
  if (publicMap) return;

  publicOsmLayer = L.tileLayer(osmUrl, { maxZoom: 19, attribution: osmAttrib });
  publicSatLayer = L.tileLayer(esriSatUrl, {
    maxZoom: 19,
    maxNativeZoom: 18,
    attribution: esriSatAttrib,
  });

  publicMap = L.map("publicMap", {
    center: [-7.375, 110.332],
    zoom: 15,
    layers: [publicOsmLayer],
  });

  L.control.scale({ imperial: false }).addTo(publicMap);

  loadJsonPl2ToPublicMap();
}

function loadJsonPl2ToPublicMap() {
  if (!publicMap) return;

  fetch("json.pl_2.json")
    .then((res) => res.json())
    .then((esriData) => {
      pl2GeoData = esriJsonToGeoJSON(esriData);
      if (pl2GeoData && pl2GeoData.features.length > 0) {
        if (publicGeoJsonLayer) {
          publicMap.removeLayer(publicGeoJsonLayer);
        }
        publicGeoJsonLayer = L.geoJSON(pl2GeoData, {
          style: getFeatureStyle,
          onEachFeature: bindFeaturePopup,
        }).addTo(publicMap);

        try {
          publicMap.fitBounds(publicGeoJsonLayer.getBounds());
        } catch (e) {
          console.warn("Gagal fitBounds publicMap", e);
        }

        if (typeof updatePersilTableFromGeoJSON === "function") {
          updatePersilTableFromGeoJSON(pl2GeoData);
        }
      }
    })
    .catch((err) => {
      console.error("Gagal memuat json.pl_2.json:", err);
    });
}

// Inisialisasi Peta Internal Admin (Full Digitasi & Export)
function initInternalMap() {
  if (internalMap) return;

  internalOsmLayer = L.tileLayer(osmUrl, {
    maxZoom: 19,
    attribution: osmAttrib,
  });
  internalSatLayer = L.tileLayer(esriSatUrl, {
    maxZoom: 19,
    maxNativeZoom: 18,
    attribution: esriSatAttrib,
  });

  internalMap = L.map("internalMap", {
    center: [-7.375, 110.332],
    zoom: 15,
    layers: [internalOsmLayer],
  });

  L.control.scale({ imperial: false }).addTo(internalMap);

  drawnItems = new L.FeatureGroup();
  internalMap.addLayer(drawnItems);

  // Aktifkan Toolbar Digitasi Geoman HANYA untuk Admin
  internalMap.pm.addControls({
    position: "topleft",
    drawMarker: true,
    drawPolyline: true,
    drawPolygon: true,
    drawRectangle: true,
    drawCircle: false,
    editMode: true,
    dragMode: true,
    cutPolygon: true,
    removalMode: true,
  });

  internalMap.on("pm:create", function (e) {
    const layer = e.layer;
    drawnItems.addLayer(layer);
    updateAreaCalculation(layer);

    layer.on("pm:edit", function () {
      updateAreaCalculation(layer);
    });
    layer.on("pm:dragend", function () {
      updateAreaCalculation(layer);
    });
  });

  internalMap.on("pm:remove", function () {
    const resultEl = document.getElementById("spatialMeasureResult");
    if (resultEl && drawnItems.getLayers().length === 0) {
      resultEl.innerHTML = `Pilih ikon <b>Polygon (Segi Lima)</b> di toolbar peta sebelah kiri untuk mulai digitasi persil.`;
    }
  });

  loadJsonPl2ToInternalMap();
}

function loadJsonPl2ToInternalMap() {
  if (!internalMap || !drawnItems) return;

  const renderData = (geoData) => {
    // Kosongkan dahulu jika ada layer sebelumnya
    drawnItems.clearLayers();

    const internalGeoLayer = L.geoJSON(geoData, {
      style: getFeatureStyle,
      onEachFeature: function (feature, layer) {
        bindFeaturePopup(feature, layer);
        drawnItems.addLayer(layer); // Masukkan ke drawnItems agar Geoman bisa mengeditnya

        layer.on("pm:edit", function () {
          updateAreaCalculation(layer);
        });
        layer.on("pm:dragend", function () {
          updateAreaCalculation(layer);
        });
      },
    });

    try {
      internalMap.fitBounds(internalGeoLayer.getBounds());
    } catch (e) {
      console.warn("Gagal fitBounds internalMap", e);
    }
  };

  if (pl2GeoData) {
    renderData(pl2GeoData);
  } else {
    fetch("json.pl_2.json")
      .then((res) => res.json())
      .then((esriData) => {
        pl2GeoData = esriJsonToGeoJSON(esriData);
        if (pl2GeoData) {
          renderData(pl2GeoData);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat json.pl_2.json ke internal map:", err);
      });
  }
}

function updateAreaCalculation(layer) {
  if (!layer || !layer.toGeoJSON) return;
  const geojson = layer.toGeoJSON();
  if (
    geojson.geometry &&
    (geojson.geometry.type === "Polygon" ||
      geojson.geometry.type === "Rectangle")
  ) {
    const areaM2 = turf.area(geojson);
    const areaHa = (areaM2 / 10000).toFixed(2);

    const resultEl = document.getElementById("spatialMeasureResult");
    if (resultEl) {
      resultEl.innerHTML = `
                <div class="font-bold text-slate-800">Polygon Draf Hasil Digitasi:</div>
                <div class="text-indigo-700 font-semibold mt-1">Estimasi Luas: ${areaM2.toFixed(1)} m² (${areaHa} Ha)</div>
                <div class="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                    <span>✓ Draf aktif di canvas</span>
                </div>
            `;
    }
  }
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

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
