/* ============ FORGE — interactions ============ */
(() => {
  // NAV scrolled state
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        // counters
        e.target.querySelectorAll('.count').forEach(animateCount);
        // bars
        e.target.querySelectorAll('.area-mock-chart .bar').forEach((b, i) => {
          const h = b.dataset.h || (20 + Math.random() * 70);
          setTimeout(() => { b.style.height = h + '%'; }, 100 + i * 80);
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal, .reveal-text, .reveal-stagger, .title-line').forEach((el) => io.observe(el));

  function animateCount(el) {
    const target = parseFloat(el.dataset.to || el.textContent);
    const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals)) || 0;
    const dur = parseInt(el.dataset.dur || '1600');
    const start = performance.now();
    const startVal = 0;
    function frame(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = startVal + (target - startVal) * eased;
      el.textContent = v.toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(frame);
  }

  // FAQ
  document.querySelectorAll('.faq-item').forEach((item) => {
    item.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((i) => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Cases — Ver mais toggle
  const casesToggle = document.querySelector('[data-cases-toggle]');
  const casesGrid = document.querySelector('.cases-grid');
  if (casesToggle && casesGrid) {
    casesToggle.addEventListener('click', () => {
      const isOpen = casesGrid.classList.toggle('is-expanded');
      casesToggle.classList.toggle('is-open', isOpen);
      casesToggle.querySelector('.cases-more-label').textContent = isOpen ? 'VER MENOS' : 'VER MAIS CASES';
    });
  }

  // Cursor dot
  if (matchMedia('(pointer: fine)').matches) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);
    let tx = 0, ty = 0, x = 0, y = 0;
    document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    function loop() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    document.querySelectorAll('a, button, .pillar, .case, .faq-item, .hero-play').forEach((el) => {
      el.addEventListener('mouseenter', () => { dot.style.width = '36px'; dot.style.height = '36px'; });
      el.addEventListener('mouseleave', () => { dot.style.width = '8px'; dot.style.height = '8px'; });
    });
  }

  // Hero parallax (subtle)
  const heroFig = document.querySelector('.hero-figure');
  if (heroFig) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      heroFig.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // Mobile nav drawer
  const navToggle = document.querySelector('.nav-toggle');
  const navDrawer = document.getElementById('nav-drawer');
  if (navToggle && navDrawer) {
    const open = () => {
      document.body.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
      navDrawer.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navDrawer.setAttribute('aria-hidden', 'true');
    };
    navToggle.addEventListener('click', () => {
      document.body.classList.contains('nav-open') ? close() : open();
    });
    navDrawer.querySelectorAll('[data-nav-close]').forEach((el) => {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) close();
    });
  }
})();
