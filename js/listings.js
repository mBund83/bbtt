function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function tr(key, vars) {
  if (typeof t === "function") return t(key, vars);
  return key;
}

function formatKm(km) {
  if (km == null) return null;
  const locale = typeof getLang === "function" && getLang() === "en" ? "en-GB" : "nb-NO";
  return `${new Intl.NumberFormat(locale).format(km)} km`;
}

function formatHours(hours) {
  if (hours == null) return null;
  const locale = typeof getLang === "function" && getLang() === "en" ? "en-GB" : "nb-NO";
  const unit = typeof getLang === "function" && getLang() === "en" ? "hours" : "timer";
  return `${new Intl.NumberFormat(locale).format(hours)} ${unit}`;
}

function categoryLabel(category) {
  return category === "maskin" ? tr("cat.machine") : tr("cat.truck");
}

function getListingById(id) {
  return getListings().find((item) => item.id === id) || null;
}

function listingSpecs(item) {
  const specs = [];
  if (item.year) specs.push(String(item.year));
  if (item.km != null) specs.push(formatKm(item.km));
  if (item.hours != null) specs.push(formatHours(item.hours));
  if (item.fuel) specs.push(item.fuel);
  if (item.transmission && item.transmission !== "—") specs.push(item.transmission);
  return specs;
}

function listingImage(item) {
  if (item.image) {
    return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" width="640" height="400" />`;
  }
  return `<div class="ad-card__placeholder" aria-hidden="true">${categoryLabel(item.category)}</div>`;
}

function renderAdCard(item) {
  const specs = listingSpecs(item)
    .map((spec) => `<li>${escapeHtml(spec)}</li>`)
    .join("");

  return `
    <article class="ad-card">
      <a class="ad-card__link" href="annonse.html?id=${encodeURIComponent(item.id)}">
        <div class="ad-card__media">${listingImage(item)}</div>
        <div class="ad-card__body">
          <div class="ad-card__top">
            <p class="ad-card__category">${categoryLabel(item.category)}</p>
            <h2 class="ad-card__title">${escapeHtml(item.title)}</h2>
            <ul class="ad-card__specs">${specs}</ul>
          </div>
        </div>
      </a>
    </article>
  `;
}

function filterListings(listings, { category, query, sort }) {
  let result = listings.slice();

  if (category && category !== "alle") {
    result = result.filter((item) => item.category === category);
  }

  if (query) {
    const q = query.trim().toLowerCase();
    result = result.filter((item) => {
      const hay = [item.title, item.description, ...(item.highlights || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

    if (sort === "aar-desc") result.sort((a, b) => (b.year || 0) - (a.year || 0));

  return result;
}

function initSalesPage() {
  const listEl = document.getElementById("ad-list");
  const countEl = document.getElementById("ad-count");
  const emptyEl = document.getElementById("ad-empty");
  const filtersEl = document.getElementById("sales-filters");
  const categoryEl = document.getElementById("filter-category");
  const sortEl = document.getElementById("filter-sort");
  const searchEl = document.getElementById("filter-search");

  if (!listEl) return;

  function refresh() {
    const all = getListings();
    const hasListings = all.length > 0;

    if (filtersEl) filtersEl.hidden = !hasListings;

    const filtered = filterListings(all, {
      category: categoryEl?.value || "alle",
      query: searchEl?.value || "",
      sort: sortEl?.value || "nyest",
    });

    listEl.innerHTML = filtered.map(renderAdCard).join("");

    if (countEl) {
      countEl.textContent =
        filtered.length === 1 ? tr("sales.countOne") : tr("sales.count", { n: filtered.length });
    }

    if (emptyEl) {
      emptyEl.hidden = filtered.length > 0;
      emptyEl.textContent = window.BB_LISTINGS_ERROR || (hasListings ? tr("sales.emptyFilter") : tr("sales.empty"));
    }
  }

  [categoryEl, sortEl].forEach((el) => el?.addEventListener("change", refresh));
  searchEl?.addEventListener("input", refresh);
  document.addEventListener("bb:langchange", refresh);
  document.addEventListener("bb:listings-loaded", refresh);
  refresh();
}

function initAdDetailPage() {
  const root = document.getElementById("ad-detail");
  if (!root) return;

  function render() {
    const params = new URLSearchParams(window.location.search);
    const item = getListingById(params.get("id"));

    if (!item) {
      root.innerHTML = `
        <div class="ad-detail__missing">
          <h1>${tr("ad.missingTitle")}</h1>
          <p>${tr("ad.missingBody")}</p>
          <a class="btn btn--primary" href="salg.html">${tr("ad.backSales")}</a>
        </div>
      `;
      return;
    }

    document.title = `${item.title} | BB Transport & Trading AS`;

    const specs = listingSpecs(item)
      .map((spec) => `<li>${escapeHtml(spec)}</li>`)
      .join("");
    const highlights = (item.highlights || [])
      .map((h) => `<li>${escapeHtml(h)}</li>`)
      .join("");

    const groups = new Map();
    for (const spec of item.specifications || []) {
      if (!groups.has(spec.group)) groups.set(spec.group, []);
      groups.get(spec.group).push(spec);
    }
    const technical = Array.from(groups, ([group, rows]) =>
      '<section style="margin:24px 0"><h3>'+escapeHtml(group)+'</h3><table style="width:100%;border-collapse:collapse"><tbody>'+
      rows.map(r=>'<tr><th scope="row" style="text-align:left;padding:9px 8px;border-bottom:1px solid #8885;font-weight:500;overflow-wrap:anywhere">'+escapeHtml(r.label)+'</th><td style="padding:9px 8px;border-bottom:1px solid #8885;overflow-wrap:anywhere">'+escapeHtml(r.value)+'</td></tr>').join('')+
      '</tbody></table></section>').join('');
    root.innerHTML = `
      <div class="ad-detail__layout">
        <div class="ad-detail__media">
          ${listingImage(item)}
        </div>
        <div class="ad-detail__info">
          <p class="ad-detail__category">${categoryLabel(item.category)}</p>
          <h1 class="ad-detail__title">${escapeHtml(item.title)}</h1>
          <ul class="ad-detail__specs">${specs}</ul>
          ${
            highlights
              ? `<div class="ad-detail__block"><h2>${tr("ad.highlights")}</h2><ul class="ad-detail__list">${highlights}</ul></div>`
              : ""
          }
          <div class="ad-detail__block">
            <h2>${tr("ad.description")}</h2>
            <p style="white-space:pre-wrap">${escapeHtml(item.description)}</p>
          </div>
          <div class="ad-detail__cta">
            <a class="btn btn--primary" href="tel:+4791338422">${tr("ad.call")}</a>
            <a class="btn btn--ghost" href="mailto:morten@bbtt.no?subject=${encodeURIComponent(
              item.title
            )}">${tr("ad.email")}</a>
            <a class="btn btn--ghost" href="salg.html">${tr("ad.all")}</a>
          </div>
        </div>
      </div>
      ${technical ? `<div class="ad-detail__block"><h2>${typeof getLang === "function" && getLang() === "en" ? "Technical specifications" : "Tekniske opplysninger"}</h2>${technical}</div>` : ""}
    `;
  }

  document.addEventListener("bb:langchange", render);
  document.addEventListener("bb:listings-loaded", render);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  initSalesPage();
  initAdDetailPage();
});
