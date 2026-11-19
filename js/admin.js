(() => {
  // Endre dette passordet til noe bare dere kjenner.
  const ADMIN_PASSWORD = "bbtt2024";
  const SESSION_KEY = "bb_admin_unlocked";

  const lockEl = document.getElementById("admin-lock");
  const appEl = document.getElementById("admin-app");
  const loginForm = document.getElementById("admin-login");
  const loginError = document.getElementById("admin-login-error");
  const passwordInput = document.getElementById("admin-password");
  const logoutBtn = document.getElementById("admin-logout");

  const listEl = document.getElementById("admin-list");
  const form = document.getElementById("admin-form");
  const formTitle = document.getElementById("form-title");
  const statusEl = document.getElementById("admin-status");
  const imagePreview = document.getElementById("image-preview");

  const fields = {
    id: document.getElementById("field-id"),
    title: document.getElementById("field-title"),
    category: document.getElementById("field-category"),
    price: document.getElementById("field-price"),
    year: document.getElementById("field-year"),
    km: document.getElementById("field-km"),
    hours: document.getElementById("field-hours"),
    fuel: document.getElementById("field-fuel"),
    transmission: document.getElementById("field-transmission"),
    image: document.getElementById("field-image"),
    imageFile: document.getElementById("field-image-file"),
    highlights: document.getElementById("field-highlights"),
    description: document.getElementById("field-description"),
  };

  const wrapKm = document.getElementById("wrap-km");
  const wrapHours = document.getElementById("wrap-hours");

  let pendingImageDataUrl = "";

  function setStatus(message, isError = false) {
    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
    lockEl.hidden = true;
    appEl.hidden = false;
    renderList();
    resetForm();
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    lockEl.hidden = false;
    appEl.hidden = true;
    passwordInput.value = "";
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(price || 0);
  }

  function updateCategoryFields() {
    const isMachine = fields.category.value === "maskin";
    wrapKm.hidden = isMachine;
    wrapHours.hidden = !isMachine;
  }

  function updatePreview(src) {
    if (!src) {
      imagePreview.hidden = true;
      imagePreview.innerHTML = "";
      return;
    }
    imagePreview.hidden = false;
    imagePreview.innerHTML = `<img src="${src}" alt="Forhåndsvisning" />`;
  }

  function resetForm() {
    form.reset();
    fields.id.value = "";
    pendingImageDataUrl = "";
    formTitle.textContent = "Ny annonse";
    document.getElementById("btn-save").textContent = "Lagre annonse";
    updateCategoryFields();
    updatePreview("");
    setStatus("");
  }

  function fillForm(item) {
    fields.id.value = item.id || "";
    fields.title.value = item.title || "";
    fields.category.value = item.category || "lastebil";
    fields.price.value = item.price ?? "";
    fields.year.value = item.year ?? "";
    fields.km.value = item.km ?? "";
    fields.hours.value = item.hours ?? "";
    fields.fuel.value = item.fuel || "";
    fields.transmission.value = item.transmission === "—" ? "" : item.transmission || "";
    fields.image.value = item.image && !String(item.image).startsWith("data:") ? item.image : "";
    fields.highlights.value = (item.highlights || []).join(", ");
    fields.description.value = item.description || "";
    pendingImageDataUrl = item.image && String(item.image).startsWith("data:") ? item.image : "";
    fields.imageFile.value = "";
    formTitle.textContent = "Rediger annonse";
    document.getElementById("btn-save").textContent = "Oppdater annonse";
    updateCategoryFields();
    updatePreview(pendingImageDataUrl || fields.image.value || "");
  }

  function readForm() {
    const list = getListings();
    const editingId = fields.id.value;
    const title = fields.title.value.trim();
    const category = fields.category.value;
    const price = Number(fields.price.value);
    const year = fields.year.value ? Number(fields.year.value) : null;
    const km = fields.km.value ? Number(fields.km.value) : null;
    const hours = fields.hours.value ? Number(fields.hours.value) : null;
    const fuel = fields.fuel.value.trim();
    const transmission = fields.transmission.value.trim() || (category === "maskin" ? "—" : "");
    const pathImage = fields.image.value.trim();
    const highlights = fields.highlights.value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const description = fields.description.value.trim();

    const image = pendingImageDataUrl || pathImage || "";

    return {
      id: editingId || uniqueId(title, list),
      title,
      category,
      price,
      year,
      km: category === "lastebil" ? km : null,
      hours: category === "maskin" ? hours : null,
      fuel,
      transmission,
      image,
      highlights,
      description,
    };
  }

  function renderList() {
    const list = getListings();
    if (!list.length) {
      listEl.innerHTML = `<p class="admin-empty">Ingen annonser ennå. Opprett den første til høyre.</p>`;
      return;
    }

    listEl.innerHTML = list
      .map((item) => {
        const thumb = item.image
          ? `<img src="${item.image}" alt="" />`
          : `<div class="admin-thumb-ph">${item.category === "maskin" ? "Maskin" : "Lastebil"}</div>`;
        return `
          <article class="admin-item" data-id="${item.id}">
            <div class="admin-item__media">${thumb}</div>
            <div class="admin-item__body">
              <h3>${item.title}</h3>
              <p>${formatPrice(item.price)} · ${item.year || "—"}</p>
            </div>
            <div class="admin-item__actions">
              <button type="button" data-action="edit">Rediger</button>
              <button type="button" data-action="delete">Slett</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (passwordInput.value === ADMIN_PASSWORD) {
      loginError.hidden = true;
      unlock();
    } else {
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener("click", lock);

  fields.category.addEventListener("change", updateCategoryFields);

  fields.image.addEventListener("input", () => {
    pendingImageDataUrl = "";
    updatePreview(fields.image.value.trim());
  });

  fields.imageFile.addEventListener("change", () => {
    const file = fields.imageFile.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setStatus("Bildet er for stort (maks ca. 2,5 MB). Komprimer det, eller bruk bildebane.", true);
      fields.imageFile.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingImageDataUrl = String(reader.result || "");
      fields.image.value = "";
      updatePreview(pendingImageDataUrl);
      setStatus("Bilde lastet inn. Husk: for publisering anbefales fil i assets/ + bildebane.");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btn-new").addEventListener("click", () => {
    resetForm();
    fields.title.focus();
  });

  document.getElementById("btn-cancel").addEventListener("click", resetForm);

  document.getElementById("btn-export").addEventListener("click", () => {
    exportListingsFile(getListings());
    setStatus("listings-data.js er lastet ned. Last den opp til js/-mappen på nettsiden.");
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    const ok = window.confirm(
      "Tilbakestille alle annonser til standardlisten i listings-data.js? Ulagrede endringer i nettleseren forsvinner."
    );
    if (!ok) return;
    resetListingsToDefault();
    renderList();
    resetForm();
    setStatus("Tilbakestilt til standardannonser.");
  });

  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const itemEl = event.target.closest(".admin-item");
    if (!button || !itemEl) return;
    const id = itemEl.getAttribute("data-id");
    const list = getListings();
    const item = list.find((entry) => entry.id === id);
    if (!item) return;

    if (button.dataset.action === "edit") {
      fillForm(item);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.action === "delete") {
      const ok = window.confirm(`Slette «${item.title}»?`);
      if (!ok) return;
      saveListings(list.filter((entry) => entry.id !== id));
      renderList();
      if (fields.id.value === id) resetForm();
      setStatus("Annonse slettet. Last ned listings-data.js for å publisere endringen.");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = readForm();
    if (!item.title || !Number.isFinite(item.price)) {
      setStatus("Tittel og pris er påkrevd.", true);
      return;
    }

    const list = getListings();
    const index = list.findIndex((entry) => entry.id === item.id);
    if (index >= 0) list[index] = item;
    else list.unshift(item);

    saveListings(list);
    renderList();
    resetForm();
    setStatus("Annonse lagret i nettleseren. Last ned listings-data.js og last opp for publisering.");
  });

  if (isUnlocked()) unlock();
  else {
    lockEl.hidden = false;
    appEl.hidden = true;
  }
})();
