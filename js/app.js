window.onload = function () {
  lucide.createIcons();
  initPublicMap();
  filterPersilTable();
};

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.className =
      "tab-btn px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition";
  });
  document.getElementById(`tabBtn-${tabId}`).className =
    "tab-btn px-3 py-2 rounded-lg bg-indigo-600 text-white flex items-center gap-1.5 transition";

  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document.getElementById(`tabContent-${tabId}`).classList.remove("hidden");

  if (tabId === "mapTab") {
    initInternalMap();
    setTimeout(() => {
      if (internalMap) internalMap.invalidateSize();
    }, 150);
  }
}

function filterPersilTable() {
  const desa = document.getElementById("searchDesa")?.value || "ALL";
  const pl = document.getElementById("searchPL")?.value || "ALL";
  const tbody = document.getElementById("tbodyPersil");
  if (!tbody) return;

  const filtered = persilPenggunaanLahan.filter((item) => {
    const matchDesa = desa === "ALL" || item.desa === desa;
    const matchPL = pl === "ALL" || item.pl === pl;
    return matchDesa && matchPL;
  });

  tbody.innerHTML = filtered
    .map(
      (p) => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-bold text-indigo-700">${p.id}</td>
            <td class="p-3">${p.desa}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 font-semibold">${p.pl}</span></td>
            <td class="p-3 text-right font-mono">${p.luas.toLocaleString()} m²</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status.includes("Draf") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}">${p.status}</span></td>
        </tr>
    `,
    )
    .join("");
}
