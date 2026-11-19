const BB_STORAGE_KEY = "bb_listings_v2";

function cloneListings(list) {
  return JSON.parse(JSON.stringify(list || []));
}

function getDefaultListings() {
  return cloneListings(window.BB_LISTINGS_DEFAULT || window.BB_LISTINGS || []);
}

function readStoredListings() {
  try {
    const raw = localStorage.getItem(BB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getListings() {
  const stored = readStoredListings();
  if (stored) return stored;
  return getDefaultListings();
}

function saveListings(list) {
  const next = cloneListings(list);
  localStorage.setItem(BB_STORAGE_KEY, JSON.stringify(next));
  window.BB_LISTINGS = next;
  return next;
}

function resetListingsToDefault() {
  localStorage.removeItem(BB_STORAGE_KEY);
  window.BB_LISTINGS = getDefaultListings();
  return window.BB_LISTINGS;
}

function slugifyId(title) {
  return String(title || "annonse")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function uniqueId(title, existing) {
  const base = slugifyId(title) || "annonse";
  let id = base;
  let i = 2;
  const ids = new Set((existing || []).map((item) => item.id));
  while (ids.has(id)) {
    id = `${base}-${i}`;
    i += 1;
  }
  return id;
}

function exportListingsFile(list) {
  const data = cloneListings(list);
  const body = JSON.stringify(data, null, 2);
  const content = `window.BB_LISTINGS_DEFAULT = ${body};\n\nwindow.BB_LISTINGS = window.BB_LISTINGS_DEFAULT;\n`;
  const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listings-data.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Keep runtime list in sync on load
window.BB_LISTINGS = getListings();
