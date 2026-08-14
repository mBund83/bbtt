document.getElementById("year").textContent = String(new Date().getFullYear());

const header = document.getElementById("site-header");
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");

function setHeaderScrolled() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

function closeNav() {
  if (!toggle || !header) return;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Åpne meny");
  header.classList.remove("is-open");
  document.body.classList.remove("is-nav-open");
}

function openNav() {
  if (!toggle || !header) return;
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Lukk meny");
  header.classList.add("is-open");
  document.body.classList.add("is-nav-open");
}

if (toggle && nav && header) {
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closeNav();
    else openNav();
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.matchMedia("(min-width: 721px)").matches) closeNav();
    },
    { passive: true }
  );
}

setHeaderScrolled();
window.addEventListener("scroll", setHeaderScrolled, { passive: true });

const reveals = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
  );

  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-visible"));
}
