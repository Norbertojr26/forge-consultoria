/* ============ FORGE · landing — interações ============ */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav vira cápsula de vidro ao rolar
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Entrada ao rolar + contadores
  const countUp = (el) => {
    const to = parseFloat(el.dataset.to || el.textContent);
    if (reduce) { el.textContent = to; return; }
    const start = performance.now();
    const dur = 1500;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll(".count").forEach(countUp);
      io.unobserve(e.target);
    }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );
  document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => io.observe(el));

  // Cases: ver mais / ver menos
  const toggle = document.querySelector("[data-cases-toggle]");
  const grid = document.querySelector(".cases-grid");
  if (toggle && grid) {
    toggle.addEventListener("click", () => {
      const open = grid.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".cases-more-label").textContent = open ? "Ver menos" : "Ver mais cases";
      toggle.querySelector(".chev").textContent = open ? "↑" : "↓";
    });
  }

  // FAQ: uma pergunta aberta por vez
  const faqs = document.querySelectorAll(".faq-item");
  faqs.forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) faqs.forEach((o) => o !== d && (o.open = false));
  }));

  // Vídeo do topo: pausa fora da tela e respeita "reduzir movimento"
  const video = document.querySelector(".hero-video");
  if (video) {
    if (reduce) video.pause();
    else new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause())).observe(video);
  }

  // Menu mobile
  const btn = document.querySelector(".nav-toggle");
  const drawer = document.getElementById("nav-drawer");
  if (btn && drawer) {
    const set = (open) => {
      document.body.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", String(open));
      drawer.setAttribute("aria-hidden", String(!open));
    };
    btn.addEventListener("click", () => set(!document.body.classList.contains("nav-open")));
    drawer.querySelectorAll("[data-nav-close]").forEach((el) => el.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  }
})();
