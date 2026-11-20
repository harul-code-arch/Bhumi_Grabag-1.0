const persilPenggunaanLahan = [
  {
    id: "PRS-GRB-001",
    desa: "Grabag",
    pl: "Perdagangan & Jasa",
    luas: 450,
    status: "Terbit",
  },
  {
    id: "PRS-GRB-002",
    desa: "Grabag",
    pl: "Permukiman",
    luas: 280,
    status: "Draf",
  },
  {
    id: "PRS-KLT-001",
    desa: "Kleteran",
    pl: "Sawah Irigasi",
    luas: 1250,
    status: "Terbit",
  },
  {
    id: "PRS-KLT-002",
    desa: "Kleteran",
    pl: "Permukiman",
    luas: 310,
    status: "Draf",
  },
];

document.addEventListener("DOMContentLoaded", function () {
  if (typeof initPublicMap === "function") {
    initPublicMap();
  }

  if (window.lucide) {
    lucide.createIcons();
  }

  filterPersilTable();
});

function switchTab(tabId) {
  const contents = document.querySelectorAll(".tab-content");
  contents.forEach((c) => c.classList.add("hidden"));

  const activeContent = document.getElementById(`tabContent-${tabId}`);
  if (activeContent) {
    activeContent.classList.remove("hidden");
  }

  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((b) => {
    b.classList.remove("bg-indigo-600", "text-white");
    b.classList.add("text-slate-600", "hover:bg-slate-100");
  });

  const activeBtn = document.getElementById(`tabBtn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-slate-600", "hover:bg-slate-100");
    activeBtn.classList.add("bg-indigo-600", "text-white");
  }

  if (tabId === "mapTab" && typeof internalMap !== "undefined" && internalMap) {
    setTimeout(() => {
      internalMap.invalidateSize();
    }, 200);
  }
}

function filterPersilTable() {
  const filterDesa = document.getElementById("searchDesa")?.value || "ALL";
  const filterPL = document.getElementById("searchPL")?.value || "ALL";
  const tbody = document.getElementById("tbodyPersil");

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = persilPenggunaanLahan.filter((item) => {
    const matchDesa = filterDesa === "ALL" || item.desa === filterDesa;
    const matchPL = filterPL === "ALL" || item.pl === filterPL;
    return matchDesa && matchPL;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Data persil tidak ditemukan</td></tr>`;
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";

    const statusBadge =
      item.status === "Terbit"
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Terbit</span>'
        : '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">Draf</span>';

    tr.innerHTML = `
            <td class="p-3 font-semibold text-slate-800">${escapeHTML(item.id)}</td>
            <td class="p-3">${escapeHTML(item.desa)}</td>
            <td class="p-3">${escapeHTML(item.pl)}</td>
            <td class="p-3 text-right font-mono">${item.luas ? item.luas.toLocaleString("id-ID") : 0}</td>
            <td class="p-3">${statusBadge}</td>
        `;
    tbody.appendChild(tr);
  });
}

function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}
