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
  const en = typeof getLang === "function" && getLang() === "en";
  const specs = [
    [en ? "Model year" : "Årsmodell", item.year],
    [en ? "Body type" : "Påbygg", (item.highlights || [])[0]],
    [en ? "Mileage" : "Km.stand", formatKm(item.km)],
    ...(item.category === "maskin" ? [[en ? "Operating hours" : "Driftstimer", formatHours(item.hours)]] : [])
  ].filter(([,value]) => value != null && value !== "").map(([label,value]) =>
    '<li style="display:flex;justify-content:space-between;gap:12px;width:100%"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong></li>'
  ).join("");

  return `
    <article class="ad-card">
      <a class="ad-card__link" href="annonse.html?id=${encodeURIComponent(item.id)}">
        <div class="ad-card__media">${listingImage(item)}</div>
        <div class="ad-card__body">
          <div class="ad-card__top">
            <h2 class="ad-card__title">${escapeHtml(item.title)}</h2>
            <ul class="ad-card__specs" style="display:flex;flex-direction:column;gap:6px;width:100%">${specs}</ul>
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
    const axleRows = [];
    for (const [group, rows] of groups) {
      if (!/^Aksel \d+$/.test(group)) continue;
      const n = Number(group.split(' ')[1]);
      const tyre = groups.get('Dekk '+n) || [];
      const val = (list,label) => list.find(r=>r.label===label)?.value || '–';
      axleRows.push([n,val(tyre,'Dekkdimensjon')==='–'?'Ikke oppgitt':val(tyre,'Dekkdimensjon'),val(rows,'Luftfjæring')==='–'?'Ukjent':val(rows,'Luftfjæring'),val(rows,'Avstand til neste aksel (mm)')==='–'?'–':val(rows,'Avstand til neste aksel (mm)')+' mm',val(rows,'Tillatt aksellast (kg)')==='–'?'–':Number(val(rows,'Tillatt aksellast (kg)')).toLocaleString('nb-NO')+' kg']);
    }
    const technical = Array.from(groups, ([group, rows]) =>
      /^Aksel \d+$|^Dekk \d+$/.test(group) ? '' :
      '<section style="margin:24px 0"><h2>'+escapeHtml(group==='Generelt'?'Objektopplysninger':group)+'</h2>'+
      rows.map(r=>'<p><strong>'+escapeHtml(r.label)+':</strong> '+escapeHtml(r.value)+'</p>').join('')+'</section>').join('');
    const axles = axleRows.length ? '<section><h2>Aksler og dekk</h2><div style="overflow-x:auto"><table style="width:100%;min-width:680px;border-collapse:collapse;text-align:left"><thead><tr>'+['Aksel','Dekkdimensjon','Luftfjæring','Akselavstand','Tillatt aksellast'].map(h=>'<th style="padding:10px 8px;border-bottom:2px solid #aaa">'+h+'</th>').join('')+'</tr></thead><tbody>'+axleRows.map(row=>'<tr>'+row.map(v=>'<td style="padding:8px;border-bottom:1px solid #8885">'+escapeHtml(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>':'';
    const images = Array.isArray(item.images)&&item.images.length ? item.images : item.image?[item.image]:[];
    const gallery = images.length ? '<img id="object-main-photo" src="'+escapeHtml(images[0])+'" alt="'+escapeHtml(item.title)+'" style="width:100%;height:auto;max-height:600px;object-fit:contain">'+(images.length>1?'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px"><button class="btn btn--ghost" id="photo-prev" type="button">‹</button><span id="photo-count">1 / '+images.length+'</span><button class="btn btn--ghost" id="photo-next" type="button">›</button></div><div style="display:flex;overflow-x:auto;gap:8px;margin-top:12px">'+images.map((url,i)=>'<button type="button" data-photo-index="'+i+'" style="flex:0 0 72px;padding:0;border:1px solid #aaa;background:transparent"><img src="'+escapeHtml(url)+'" alt="Bilde '+(i+1)+'" style="width:72px;height:54px;object-fit:cover"></button>').join('')+'</div>':''):listingImage(item);
    root.innerHTML = `
      <div class="ad-detail__layout">
        <div class="ad-detail__media">
          ${gallery}
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

          <div class="ad-detail__cta">
            <a class="btn btn--primary" href="tel:+4791338422">${tr("ad.call")}</a>
            <a class="btn btn--ghost" href="mailto:morten@bbtt.no?subject=${encodeURIComponent(
              item.title
            )}">${tr("ad.email")}</a>
            <a class="btn btn--ghost" href="salg.html">${tr("ad.all")}</a>
          </div>
        </div>
      </div>
      ${technical}${axles}<section class="ad-detail__block"><h2>${tr("ad.description")}</h2><p style="white-space:pre-wrap">${escapeHtml(item.description)}</p></section>
    `;
    let index=0;
    function showPhoto(n){index=(n+images.length)%images.length;root.querySelector('#object-main-photo').src=images[index];root.querySelector('#photo-count').textContent=(index+1)+' / '+images.length;}
    root.querySelector('#photo-prev')?.addEventListener('click',()=>showPhoto(index-1));
    root.querySelector('#photo-next')?.addEventListener('click',()=>showPhoto(index+1));
    root.querySelectorAll('[data-photo-index]').forEach(b=>b.addEventListener('click',()=>showPhoto(Number(b.dataset.photoIndex))));
  }

  document.addEventListener("bb:langchange", render);
  document.addEventListener("bb:listings-loaded", render);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  initSalesPage();
  initAdDetailPage();
});
