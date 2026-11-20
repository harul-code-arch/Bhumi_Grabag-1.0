function handleFileUpload(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  const statusEl = document.getElementById("importStatus");
  if (statusEl) statusEl.classList.add("hidden");

  if (fileName.endsWith(".kmz")) {
    if (typeof JSZip === "undefined") {
      alert("Library JSZip belum dimuat di HTML!");
      fileInput.value = "";
      return;
    }
    JSZip.loadAsync(file)
      .then(function (zip) {
        const kmlFile = Object.keys(zip.files).find((name) =>
          name.toLowerCase().endsWith(".kml"),
        );
        if (!kmlFile) {
          alert("File .kml tidak ditemukan di dalam arsip KMZ!");
          fileInput.value = "";
          return;
        }
        zip.files[kmlFile]
          .async("string")
          .then(function (kmlText) {
            parseKMLAndRender(kmlText, file.name);
            fileInput.value = "";
          })
          .catch((err) => {
            alert("Gagal membaca isi KML dari KMZ!");
            fileInput.value = "";
          });
      })
      .catch(function (err) {
        alert("Gagal mengekstrak berkas .KMZ!");
        fileInput.value = "";
      });
  } else if (fileName.endsWith(".kml")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      parseKMLAndRender(e.target.result, file.name);
      fileInput.value = "";
    };
    reader.readAsText(file);
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const geojsonData = JSON.parse(e.target.result);
        renderGeoJSONToMap(geojsonData, file.name);
      } catch (err) {
        alert("Format file GeoJSON/JSON tidak valid!");
      }
      fileInput.value = "";
    };
    reader.readAsText(file);
  }
}

function parseKMLAndRender(kmlText, fileName) {
  try {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, "text/xml");
    if (kmlDoc.getElementsByTagName("parsererror").length > 0) {
      alert("Struktur XML file KML rusak/tidak valid!");
      return;
    }
    const geojsonData = toGeoJSON.kml(kmlDoc);
    renderGeoJSONToMap(geojsonData, fileName);
  } catch (err) {
    alert("Gagal mengonversi data KML!");
  }
}

function renderGeoJSONToMap(geojsonData, fileName) {
  const targetMap = internalMap || publicMap;
  if (!targetMap) {
    alert("Peta belum siap!");
    return;
  }

  if (
    !geojsonData ||
    !geojsonData.features ||
    geojsonData.features.length === 0
  ) {
    alert("File geospasial kosong atau tidak memiliki bidang/fitur valid.");
    return;
  }

  const vectorLayer = L.geoJSON(geojsonData, {
    style: {
      color: "#e11d48",
      weight: 2,
      fillColor: "#fb7185",
      fillOpacity: 0.35,
    },
    onEachFeature: function (feature, layer) {
      const container = document.createElement("div");
      container.className = "space-y-1 text-xs";

      const title = document.createElement("div");
      title.className = "font-bold text-rose-700 uppercase border-b pb-1";
      title.textContent = "Draf Berkas Impor";
      container.appendChild(title);

      if (feature.properties) {
        for (let key in feature.properties) {
          const row = document.createElement("div");
          const keyBold = document.createElement("b");
          keyBold.textContent = key + ": ";
          row.appendChild(keyBold);

          const valSpan = document.createElement("span");
          valSpan.textContent = String(feature.properties[key]);
          row.appendChild(valSpan);

          container.appendChild(row);
        }
      }

      if (
        feature.geometry &&
        (feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiPolygon")
      ) {
        const areaM2 = turf.area(feature);
        const areaHa = (areaM2 / 10000).toFixed(2);

        const areaDiv = document.createElement("div");
        areaDiv.className = "mt-1 pt-1 border-t text-emerald-700 font-semibold";
        areaDiv.textContent = `Luas Estimasi: ${areaM2.toFixed(1)} m² (${areaHa} Ha)`;
        container.appendChild(areaDiv);
      }

      layer.bindPopup(container);
    },
  });

  if (drawnItems) {
    drawnItems.addLayer(vectorLayer);
  } else {
    vectorLayer.addTo(targetMap);
  }

  try {
    targetMap.fitBounds(vectorLayer.getBounds());
  } catch (e) {
    console.warn("Gagal menyesuaikan batas peta (fitBounds).");
  }

  const statusEl = document.getElementById("importStatus");
  const statusText = document.getElementById("importStatusText");
  if (statusEl && statusText) {
    statusEl.classList.remove("hidden");
    statusText.textContent = `Berhasil memuat berkas "${fileName}" ke peta draf.`;
  }
}
