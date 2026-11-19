// Map State & Instances
let publicMap = null;
let internalMap = null;
let publicLayers = {};
let mapLayers = {};

// Sample Data Persil Penggunaan Lahan Grabag
const persilPenggunaanLahan = [
  {
    id: "PRS-GRB-001",
    desa: "Grabag",
    pl: "Perdagangan & Jasa",
    luas: 450,
    coords: [
      [-7.371, 110.33],
      [-7.371, 110.333],
      [-7.373, 110.333],
      [-7.373, 110.33],
    ],
    status: "Terbit",
  },
  {
    id: "PRS-GRB-002",
    desa: "Grabag",
    pl: "Permukiman",
    luas: 1200,
    coords: [
      [-7.368, 110.332],
      [-7.368, 110.336],
      [-7.37, 110.336],
      [-7.37, 110.332],
    ],
    status: "Terbit",
  },
  {
    id: "PRS-KLT-003",
    desa: "Kleteran",
    pl: "Sawah Irigasi",
    luas: 3400,
    coords: [
      [-7.36, 110.345],
      [-7.36, 110.35],
      [-7.365, 110.35],
      [-7.365, 110.345],
    ],
    status: "Draf SuperUser",
  },
  {
    id: "PRS-BNR-004",
    desa: "Banaran",
    pl: "Sawah Irigasi",
    luas: 2100,
    coords: [
      [-7.382, 110.325],
      [-7.382, 110.33],
      [-7.385, 110.33],
      [-7.385, 110.325],
    ],
    status: "Terbit",
  },
];

// Inisialisasi Peta Publik (Guest)
function initPublicMap() {
  if (publicMap) return;
  publicMap = L.map("publicMap", { zoomControl: true }).setView(
    [-7.3711, 110.3306],
    13,
  );

  publicLayers.osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenStreetMap" },
  ).addTo(publicMap);
  publicLayers.sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "&copy; Esri" },
  );

  publicLayers.plGroup = L.layerGroup().addTo(publicMap);

  persilPenggunaanLahan.forEach((p) => {
    const color =
      p.pl === "Sawah Irigasi"
        ? "#10b981"
        : p.pl === "Permukiman"
          ? "#f59e0b"
          : "#3b82f6";
    L.polygon(p.coords, { color: color, weight: 1.5, fillOpacity: 0.4 })
      .bindPopup(
        `<b>Desa ${p.desa}</b><br>Penggunaan Lahan: <b>${p.pl}</b><br><small>*Visual Non-Kadastral</small>`,
      )
      .addTo(publicLayers.plGroup);
  });
}

// Inisialisasi Peta Internal & Leaflet-Geoman (Super User)
function initInternalMap() {
  if (internalMap) return;
  setTimeout(() => {
    internalMap = L.map("internalMap", { zoomControl: true }).setView(
      [-7.3711, 110.3306],
      13,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(internalMap);

    // Kontrol Digitasi Geoman
    internalMap.pm.addControls({
      position: "topleft",
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      removalMode: true,
    });

    // Pengukuran Spasial dengan Turf.js
    internalMap.on("pm:create", (e) => {
      const geojson = e.layer.toGeoJSON();
      const areaSquareMeters = turf.area(geojson);
      const areaHectares = (areaSquareMeters / 10000).toFixed(2);

      document.getElementById("spatialMeasureResult").innerHTML = `
                <b>Polygon Draf Baru Terbuat:</b><br>
                Luas: <b>${areaSquareMeters.toFixed(1)} m²</b> (${areaHectares} Ha)<br>
                <span class="text-[10px] text-emerald-700 font-semibold">*Tersimpan sebagai draf lokal</span>
            `;
    });

    persilPenggunaanLahan.forEach((p) => {
      const poly = L.polygon(p.coords, {
        color: "#6366f1",
        weight: 2,
        fillOpacity: 0.3,
      }).addTo(internalMap);
      poly.on("click", () => {
        document.getElementById("inspectorDetail").innerHTML = `
                    <div class="space-y-1">
                        <div class="font-bold text-indigo-700">${p.id}</div>
                        <div>Desa: <b>${p.desa}</b></div>
                        <div>Penggunaan Lahan: <b>${p.pl}</b></div>
                        <div>Luas Draf: <b>${p.luas} m²</b></div>
                        <div>Status: <span class="bg-indigo-100 text-indigo-800 px-1 rounded font-bold">${p.status}</span></div>
                    </div>
                `;
      });
    });
  }, 100);
}

function switchBasemap(type) {
  if (type === "osm") {
    publicMap.removeLayer(publicLayers.sat);
    publicMap.addLayer(publicLayers.osm);
    document.getElementById("btnOsm").className =
      "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
    document.getElementById("btnSat").className =
      "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
  } else {
    publicMap.removeLayer(publicLayers.osm);
    publicMap.addLayer(publicLayers.sat);
    document.getElementById("btnSat").className =
      "py-1 px-3 rounded-md font-semibold text-slate-800 bg-white shadow-sm transition text-center text-xs";
    document.getElementById("btnOsm").className =
      "py-1 px-3 rounded-md font-medium text-slate-600 transition text-center text-xs";
  }
}
