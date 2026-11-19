function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".kmz")) {
    JSZip.loadAsync(file)
      .then(function (zip) {
        const kmlFile = Object.keys(zip.files).find((name) =>
          name.toLowerCase().endsWith(".kml"),
        );
        if (!kmlFile) {
          alert("File .kml tidak ditemukan di dalam berkas KMZ!");
          return;
        }
        zip.files[kmlFile].async("string").then(function (kmlText) {
          parseKMLAndRender(kmlText, file.name);
        });
      })
      .catch(function (err) {
        alert("Gagal mengekstrak berkas KMZ!");
        console.error(err);
      });
  } else if (fileName.endsWith(".kml")) {
    const reader = new FileReader();
    reader.onload = (e) => parseKMLAndRender(e.target.result, file.name);
    reader.readAsText(file);
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const geojsonData = JSON.parse(e.target.result);
        renderGeoJSONToMap(geojsonData, file.name);
      } catch (err) {
        alert("Format GeoJSON/JSON tidak valid!");
      }
    };
    reader.readAsText(file);
  }
}

function parseKMLAndRender(kmlText, fileName) {
  try {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, "text/xml");
    const geojsonData = toGeoJSON.kml(kmlDoc);
    renderGeoJSONToMap(geojsonData, fileName);
  } catch (err) {
    alert("Gagal membaca struktur XML KML!");
  }
}

function renderGeoJSONToMap(geojsonData, fileName) {
  const targetMap = internalMap || publicMap;
  if (!targetMap) return;

  const vectorLayer = L.geoJSON(geojsonData, {
    style: {
      color: "#e11d48",
      weight: 2,
      fillColor: "#fb7185",
      fillOpacity: 0.35,
    },
    onEachFeature: function (feature, layer) {
      let popupContent =
        '<div class="space-y-1 text-xs"><div class="font-bold text-rose-700 uppercase border-b pb-1">Draf Impor</div>';
      if (feature.properties) {
        for (let key in feature.properties) {
          popupContent += `<div><b>${key}:</b> ${feature.properties[key]}</div>`;
        }
      }
      if (
        feature.geometry &&
        (feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiPolygon")
      ) {
        const areaM2 = turf.area(feature);
        popupContent += `<div class="mt-1 pt-1 border-t text-emerald-700 font-semibold">Luas: ${areaM2.toFixed(1)} m²</div>`;
      }
      popupContent += "</div>";
      layer.bindPopup(popupContent);
    },
  }).addTo(targetMap);

  targetMap.fitBounds(vectorLayer.getBounds());

  const statusEl = document.getElementById("importStatus");
  const statusText = document.getElementById("importStatusText");
  if (statusEl && statusText) {
    statusEl.classList.remove("hidden");
    statusText.innerText = `Berhasil memuat berkas "${fileName}" ke peta draf.`;
  }
}
