/* =====================================================================
   Pielini Coffee — Landing page scrollytelling
   JavaScript vanilla, sem dependências além do Lucide (ícones).
===================================================================== */
(() => {
  'use strict';

  const WHATSAPP_NUMBER = '5551995168104';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderIcons = () => window.lucide && window.lucide.createIcons();
  const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Estado compartilhado entre widgets (copo → mensagem do WhatsApp). */
  const state = {
    event: null,
    station: null,
    leadName: '',
    cup: { name: '', subMode: 'date', date: '', sub: '' },
  };

  renderIcons();
  $('#year').textContent = new Date().getFullYear();

  /* ===================================================================
     0. ABERTURA — logo em destaque
  =================================================================== */
  const rayGroup = $('#hero-ray-lines');
  if (rayGroup) {
    const rays = [];
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      const c = Math.cos(a), s2 = Math.sin(a);
      rays.push(`<line x1="${(c * 74).toFixed(2)}" y1="${(s2 * 74).toFixed(2)}" x2="${(c * 97).toFixed(2)}" y2="${(s2 * 97).toFixed(2)}"/>`);
    }
    rayGroup.innerHTML = rays.join('');
  }
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('hero-in')));

  /* ===================================================================
     0b. MOTION — grão de café se partindo conforme a rolagem
  =================================================================== */
  const bean = (() => {
    const section = $('#do-grao');
    const canvas = $('#bean-canvas');
    const ctx = canvas.getContext('2d');
    const steps = $$('.bean-step', section);
    const indexes = $$('.bean-index', section);
    const bar = $('#bean-progress');
    const FRAMES = 76;
    const src = (i) => `assets/seq/grao-${String(i).padStart(3, '0')}.webp`;
    const images = new Array(FRAMES);
    let current = -1;
    let loadingStarted = false;

    const load = (i) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { images[i] = img; resolve(); };
      img.onerror = resolve;
      img.src = src(i);
    });

    const loadAll = async () => {
      if (loadingStarted) return;
      loadingStarted = true;
      // primeiro quadros espaçados (prévia rápida), depois os intermediários
      const order = [];
      for (let stepSize of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += stepSize) if (!order.includes(i)) order.push(i);
      for (let k = 0; k < order.length; k += 6) {
        await Promise.all(order.slice(k, k + 6).map(load));
        current = -1; draw(lastProgress);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      current = -1;
      draw(lastProgress);
    };

    const nearestLoaded = (i) => {
      for (let d = 0; d < FRAMES; d++) {
        if (images[i - d]) return images[i - d];
        if (images[i + d]) return images[i + d];
      }
      return null;
    };

    let lastProgress = 0;
    const draw = (p) => {
      lastProgress = p;
      // o grão fica parado no início e termina em pó antes do fim da seção
      const t = clamp((p - 0.06) / 0.82, 0, 1);
      const i = Math.round(t * (FRAMES - 1));
      if (i === current) return;
      const img = nearestLoaded(i);
      if (!img) return;
      if (images[i]) current = i;
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const update = (vh) => {
      const r = section.getBoundingClientRect();
      const total = r.height - vh;
      const p = clamp(-r.top / (total || 1), 0, 1);
      draw(p);
      bar.style.transform = `scaleX(${p})`;
      bar.parentElement.style.opacity = p > 0.97 ? '0' : '1';
      const stage = p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
      steps.forEach((el, k) => el.classList.toggle('is-on', k === stage));
      indexes.forEach((el, k) => el.classList.toggle('is-on', k === stage));
    };

    load(0).then(() => { current = -1; draw(lastProgress); });
    new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadAll(); }, { rootMargin: '150% 0px' }).observe(section);
    window.addEventListener('resize', resize);
    resize();
    return { update };
  })();

  /* ===================================================================
     0c. MOTION — a torra só avança com a imagem centralizada na tela
  =================================================================== */
  const roast = (() => {
    const track = $('#roast-track');
    const figure = $('#roast-figure');
    const canvas = $('#roast-canvas');
    const ctx = canvas.getContext('2d');
    const stageEl = $('#roast-stage');
    const tempEl = $('#roast-temp');
    const bar = $('#roast-bar');
    const stepEls = $$('#roast-steps [data-rs]');
    const FRAMES = 64;
    const images = new Array(FRAMES);
    // ponto da sequência (0–1) e nome de cada estágio da torra
    const STAGES = [[0, 'Grão verde'], [0.2, 'Secagem'], [0.4, 'Amarelo'], [0.58, 'Canela'], [0.78, 'Torra média'], [1, 'Ponto Pielini']];
    const ease = (x) => x * x * (3 - 2 * x);
    let started = false;
    let last = -1;
    let lastV = 0;
    let stickyTop = 0;

    const load = (i) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images[i] = img; resolve(); };
      img.onerror = resolve;
      img.src = `assets/seq-torra/torra-${String(i).padStart(3, '0')}.webp`;
    });
    const loadAll = async () => {
      if (started) return;
      started = true;
      const order = [];
      for (const gap of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += gap) if (!order.includes(i)) order.push(i);
      for (let k = 0; k < order.length; k += 8) { await Promise.all(order.slice(k, k + 8).map(load)); draw(lastV); }
    };
    const nearest = (i) => { for (let d = 0; d < FRAMES; d++) { if (images[i - d]) return images[i - d]; if (images[i + d]) return images[i + d]; } return null; };

    const resize = () => {
      const vh = window.innerHeight;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      // a imagem fica fixa exatamente no centro vertical da tela
      stickyTop = Math.max(84, (vh - figure.offsetHeight) / 2 + 20);
      figure.style.top = `${stickyTop}px`;
      draw(lastV);
    };

    // mistura dois quadros vizinhos: a torra muda de cor sem "saltos"
    const draw = (v) => {
      lastV = v;
      const f = v * (FRAMES - 1);
      const i0 = Math.floor(f);
      const a = f - i0;
      const imgA = nearest(i0);
      const imgB = a > 0.01 ? nearest(Math.min(FRAMES - 1, i0 + 1)) : null;
      if (!imgA) return;
      const cw = canvas.width, ch = canvas.height;
      const paint = (img, alpha) => {
        const s2 = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * s2, h = img.naturalHeight * s2;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      };
      paint(imgA, 1);
      if (imgB && imgB !== imgA) paint(imgB, a);
      ctx.globalAlpha = 1;
    };

    let target = 0;
    let current = 0;
    let running = false;
    let shownStage = -1;
    const render = () => {
      draw(current);
      bar.style.transform = `scaleX(${current})`;
      tempEl.textContent = Math.round(25 + current * 185);
      let stage = 0;
      STAGES.forEach(([at], n) => { if (current >= at - 0.03) stage = n; });
      if (stage !== shownStage) {
        shownStage = stage;
        stageEl.textContent = STAGES[stage][1];
        stageEl.classList.remove('swap-enter'); void stageEl.offsetWidth; stageEl.classList.add('swap-enter');
        stepEls.forEach((el, n) => { el.style.color = n === stage ? '#DDA971' : n < stage ? 'rgba(245,242,235,.75)' : ''; });
      }
    };
    // o valor exibido "persegue" o da rolagem com suavidade (inércia leve)
    const loop = () => {
      current += (target - current) * 0.09;
      if (Math.abs(target - current) < 0.0008) current = target;
      render();
      if (current !== target) requestAnimationFrame(loop); else running = false;
    };

    let progress = 0;
    const update = () => {
      const r = track.getBoundingClientRect();
      // 0 quando a imagem chega ao centro; 1 quando o trilho termina
      progress = clamp((stickyTop - r.top) / Math.max(1, r.height - figure.offsetHeight), 0, 1);
      // pausa curta em cada ponto de torra e transição contínua até o próximo
      const k = Math.min(progress * (STAGES.length - 0.6), STAGES.length - 0.0001);
      const idx = Math.floor(k);
      const u = k - idx;
      target = idx < STAGES.length - 1
        ? STAGES[idx][0] + (STAGES[idx + 1][0] - STAGES[idx][0]) * ease(clamp((u - 0.2) / 0.8, 0, 1))
        : 1;
      if (prefersReducedMotion) { current = target; render(); return; }
      if (!running) { running = true; requestAnimationFrame(loop); }
    };

    load(0).then(() => draw(lastV));
    new IntersectionObserver((e) => { if (e[0].isIntersecting) loadAll(); }, { rootMargin: '120% 0px' }).observe(track);
    window.addEventListener('resize', resize);
    resize();
    return { update, get progress() { return progress; } };
  })();


  /* ===================================================================
     1. HEADER — progresso, tema da navbar, menu mobile, link ativo
  =================================================================== */
  const nav = $('#site-nav');
  const progressBar = $('#scroll-progress');
  const themedSections = $$('[data-nav-theme]');
  const navLinks = $$('#site-nav a.nav-link[href^="#"]');
  const waFloat = $('#wa-float');

  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');
  const setMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    mobileMenu.hidden = !open;
    const [a, b] = $$('.menu-bar', menuToggle);
    a.style.transform = open ? 'translateY(5px) rotate(45deg)' : '';
    b.style.transform = open ? 'translateY(-5px) rotate(-45deg)' : '';
  };
  menuToggle.addEventListener('click', () => setMenu(mobileMenu.hidden));
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  const aboutDialog = $('#about-dialog');
  const openAbout = () => {
    setMenu(false);
    if (typeof aboutDialog.showModal === 'function') aboutDialog.showModal(); else aboutDialog.setAttribute('open', '');
  };
  const closeAbout = () => { if (aboutDialog.open) aboutDialog.close(); };
  $$('[data-open-about]').forEach((b) => b.addEventListener('click', openAbout));
  $$('[data-close-about]', aboutDialog).forEach((b) => b.addEventListener('click', closeAbout));
  aboutDialog.addEventListener('click', (e) => { if (e.target === aboutDialog) closeAbout(); });

  /* ===================================================================
     2. SCROLLYTELLING — parallax, revelações, texto que "acende"
  =================================================================== */
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, speed: parseFloat(el.dataset.parallax), host: el.closest('section') || el.parentElement }));
  const parallaxInner = $$('[data-parallax-inner]').map((el) => ({ el, speed: parseFloat(el.dataset.parallaxInner), host: el.parentElement }));
  parallaxInner.forEach(({ el }) => { el.style.transform = 'scale(1.15)'; });

  const scrub = $('#scrub-text');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const highlight = new Set(['detalhes.', 'café', 'presença', 'constante.']);
  const scrubWords = (() => {
    const words = scrub.textContent.trim().split(/\s+/);
    scrub.innerHTML = words.map((w) => `<span class="w${highlight.has(w) ? ' hl' : ''}">${escapeHTML(w)}</span>`).join(' ');
    return $$('.w', scrub);
  })();

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach((el) => revealObserver.observe(el));

  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { $('.chapter-slide', entry.target).classList.add('is-in'); chapterObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.3 });
  // observa o contêiner (o rótulo em si começa fora da tela, à esquerda)
  $$('.chapter-slide').forEach((el) => chapterObserver.observe(el.parentElement));

  // Estações: cada card "vira a página" conforme a rolagem, uma depois da outra
  const stationRow = $('#station-grid');
  const flipCards = $$('.station-card', stationRow);
  const flipStations = (vh) => {
    if (prefersReducedMotion) return;
    const r = stationRow.getBoundingClientRect();
    if (r.top > vh * 1.2 || r.bottom < -vh * 0.2) return;
    const p = clamp((vh * 0.98 - r.top) / (vh * 0.6), 0, 1);
    flipCards.forEach((card, i) => {
      const t = clamp((p - i * 0.16) / 0.42, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      card.classList.toggle('is-flipping', t < 1);
      card.style.setProperty('--flip', `${(-110 * (1 - e)).toFixed(1)}deg`);
      card.style.opacity = (0.15 + 0.85 * e).toFixed(2);
    });
  };

  let ticking = false;
  const onScroll = () => {
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

    // Tema da navbar conforme a seção sob ela
    const probe = 40;
    const current = themedSections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    if (current) nav.dataset.theme = current.dataset.navTheme;

    // Link ativo
    let activeId = null;
    navLinks.forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (sec) { const r = sec.getBoundingClientRect(); if (r.top <= vh * 0.4 && r.bottom > vh * 0.4) activeId = a.getAttribute('href'); }
    });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === activeId));

    bean.update(vh);
    flipStations(vh);
    roast.update(vh);

    // O emblema da navbar só aparece quando o logo do Hero sai de cena
    const heroLogoRect = $('#hero-logo').getBoundingClientRect();
    document.body.classList.toggle('logo-docked-off', heroLogoRect.bottom > 90);
    if (!prefersReducedMotion) {
      const k = clamp(scrollY / (vh * 0.8), 0, 1);
      $('#hero-logo').style.translate = `0 ${(k * vh * 0.18).toFixed(1)}px`;
      $('#hero-logo').style.scale = String(1 - k * 0.25);
    }

    // Botão flutuante surge depois do Hero
    waFloat.dataset.show = String($('#do-grao').getBoundingClientRect().bottom < vh * 0.9);

    if (!prefersReducedMotion) {
      parallaxEls.forEach(({ el, speed, host }) => {
        const r = host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const y = (vh / 2 - (r.top + r.height / 2)) * speed;
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
      parallaxInner.forEach(({ el, speed, host }) => {
        const r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const y = (vh / 2 - (r.top + r.height / 2)) * speed;
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(1.15)`;
      });
    }

    // Texto que acende palavra por palavra conforme a rolagem
    const r = scrub.getBoundingClientRect();
    const p = desktop.matches
      ? clamp(roast.progress * 1.6, 0, 1)
      : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
    const lit = prefersReducedMotion ? scrubWords.length : Math.round(p * scrubWords.length);
    scrubWords.forEach((w, i) => w.classList.toggle('on', i < lit));

    ticking = false;
  };
  const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);
  onScroll();

  /* ===================================================================
     3. WIDGET 1 — MOMENTOS DA FESTA
  =================================================================== */
  const moments = [
    { title: 'Boas-vindas', text: 'O aroma do café moído na hora recebe os convidados e a ilha vira o primeiro ponto de encontro.', rec: { station: 'Estação Filtrados', text: 'Hario V60 e Chemex' } },
    { title: 'Mesa de Doces', text: 'O café equilibra o açúcar e valoriza cada doce da confeitaria.', rec: { station: 'Estação Espressos', text: 'Cappuccino e Caramel Macchiato' } },
    { title: 'Pós-Jantar', text: 'Um espresso bem extraído fecha a refeição com elegância.', rec: { station: 'Estação Espressos', text: 'Espresso e Mocaccino' } },
    { title: 'Pista de Dança', text: 'Bebidas geladas e cafés com energia mantêm a festa no ritmo.', rec: { station: 'Estação Premium Plus', text: 'Sodas Italianas e Mocaccino' } },
  ];

  // degradê da linha do tempo: do marrom mais claro ao mais escuro
  const MOMENT_COLORS = ['#9C6B42', '#7A4A28', '#4E2C16', '#1E1610'];
  const momentTabs = $$('.moment-tab');
  momentTabs.forEach((t, i) => t.style.setProperty('--mc', MOMENT_COLORS[i]));
  const momentPanel = $('#moment-panel');
  const momentLine = $('#moment-line');
  const setMoment = (index, focus = false) => {
    const m = moments[index];
    momentTabs.forEach((t, i) => {
      t.setAttribute('aria-selected', String(i === index));
      t.tabIndex = i === index ? 0 : -1;
    });
    if (focus) momentTabs[index].focus();
    momentPanel.setAttribute('aria-labelledby', momentTabs[index].id);
    momentLine.style.width = `${(index / 3) * 75}%`;
    momentPanel.style.backgroundColor = MOMENT_COLORS[index];
    $('#moment-line-fill').style.width = `${momentLine.parentElement.offsetWidth * 0.75}px`;

    const q = (k) => $(`[data-m="${k}"]`, momentPanel);
    q('title').textContent = m.title;
    q('text').textContent = m.text;
    q('rec-station').textContent = m.rec.station;
    q('rec-text').textContent = m.rec.text;
    q('rec-btn').dataset.station = m.rec.station;
    renderIcons();

    ['moment-content'].forEach((id) => {
      const node = document.getElementById(id);
      node.classList.remove('swap-enter');
      void node.offsetWidth;
      node.classList.add('swap-enter');
    });
  };
  // leva ao "Nível de Experiência Sensorial" já com a estação recomendada marcada
  $('[data-m="rec-btn"]', momentPanel).addEventListener('click', (e) => {
    const station = e.currentTarget.dataset.station;
    const idx = ['Estação Básica', 'Estação Filtrados', 'Estação Espressos', 'Estação Premium Plus'].indexOf(station);
    selectPill('station', station);
    lockedStation = idx;
    $('#level-bar').closest('.rounded-3xl').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => showLevel(idx), prefersReducedMotion ? 0 : 450);
  });
  momentTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => setMoment(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') setMoment((i + 1) % 4, true);
      if (e.key === 'ArrowLeft') setMoment((i + 3) % 4, true);
    });
  });
  setMoment(0);

  /* ===================================================================
     4. MENU DE EXPERIÊNCIAS — barra de nível sensorial
  =================================================================== */
  const stationCards = $$('.station-card');
  const levelFill = $('#level-fill');
  const levelValue = $('#level-value');
  const levelBar = $('#level-bar');
  const levelTicks = $$('.level-tick');
  let lockedStation = -1;
  let shownLevel = 0;
  let levelAnim = null;

  const showLevel = (index) => {
    const target = index < 0 ? 0 : (index + 1) * 25;
    levelFill.style.width = `${target}%`;
    levelBar.setAttribute('aria-valuenow', String(target));
    levelTicks.forEach((t, i) => t.classList.toggle('is-on', i <= index));
    stationCards.forEach((c, i) => c.classList.toggle('is-active', i === index));

    cancelAnimationFrame(levelAnim);
    const start = shownLevel;
    const t0 = performance.now();
    const step = (now) => {
      const k = clamp((now - t0) / 600, 0, 1);
      shownLevel = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      levelValue.textContent = shownLevel;
      if (k < 1) levelAnim = requestAnimationFrame(step);
    };
    levelAnim = requestAnimationFrame(step);
  };

  stationCards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => showLevel(i));
    card.addEventListener('focusin', () => showLevel(i));
    card.addEventListener('mouseleave', () => showLevel(lockedStation));
    card.addEventListener('click', () => { lockedStation = i; showLevel(i); });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); lockedStation = i; showLevel(i); }
    });
  });

  levelTicks.forEach((tick, i) => tick.addEventListener('click', () => { lockedStation = i; showLevel(i); }));

  $$('[data-choose]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.station-card');
      lockedStation = stationCards.indexOf(card);
      showLevel(lockedStation);
      selectPill('station', btn.dataset.choose);
      const booking = $('#degustacao');
      booking.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      const group = $('#station-pills');
      group.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 600, delay: 700, easing: 'ease-out' });
    });
  });

  // Ao entrar na seção, a barra "acorda" de 0 até a estação em destaque
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && lockedStation < 0) { showLevel(2); setTimeout(() => { if (lockedStation < 0) showLevel(-1); }, 1600); obs.disconnect(); }
  }, { threshold: 0.35 }).observe($('#station-grid'));

  /* ===================================================================
     5a. WIDGET 2 — GUIA SENSORIAL DOS MÉTODOS
  =================================================================== */
  const C = { torra: '#1E1610', caramelo: '#C88A4B', creme: '#F5F2EB', pielini: '#2C5E4F', off: '#EAE3D5' };
  const art = {
    v60: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 40 L170 40 L118 118 L82 118 Z" fill="${C.creme}"/>
      <path d="M52 52 L92 112 M76 52 L98 112 M100 52 L100 112 M124 52 L102 112 M148 52 L108 112" stroke-opacity=".25" stroke-width="1.6"/>
      <ellipse cx="100" cy="40" rx="70" ry="7" fill="${C.creme}"/>
      <ellipse cx="100" cy="43" rx="52" ry="4.5" fill="#5A3418" stroke="none"/>
      <rect x="74" y="118" width="52" height="8" rx="2" fill="${C.off}"/>
      <circle class="anim-drop" cx="100" cy="134" r="3" fill="#8A5428" stroke="none"/>
      <path d="M48 140 L152 140 L144 214 C143 222 137 226 130 226 L70 226 C63 226 57 222 56 214 Z" fill="${C.off}"/>
      <path d="M152 156 C176 156 178 196 148 198" />
      <path d="M53 166 L147 166 L143 212 C142 218 137 220 131 220 L69 220 C63 220 58 218 57 212 Z" fill="#5A3418" stroke="none" opacity=".9"/>
    </svg>`,
    prensa: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="96" y="6" width="8" height="22" rx="3" fill="${C.torra}"/>
      <path d="M58 28 L142 28 C146 28 148 30 148 34 L148 44 L52 44 L52 34 C52 30 54 28 58 28 Z" fill="${C.torra}"/>
      <path d="M100 44 L100 92" />
      <rect x="56" y="44" width="88" height="176" rx="8" fill="${C.creme}" fill-opacity=".55"/>
      <path d="M58 92 L142 92" stroke-width="4" stroke="${C.caramelo}"/>
      <rect x="58" y="96" width="84" height="122" rx="6" fill="#4A2A14" stroke="none"/>
      <rect x="58" y="96" width="84" height="10" fill="#B07A45" stroke="none" opacity=".85"/>
      <circle class="anim-bubble" cx="76" cy="200" r="3" fill="#B07A45" stroke="none"/>
      <circle class="anim-bubble" style="animation-delay:.8s" cx="112" cy="190" r="2.5" fill="#B07A45" stroke="none"/>
      <circle class="anim-bubble" style="animation-delay:1.5s" cx="128" cy="204" r="2" fill="#B07A45" stroke="none"/>
      <path d="M50 52 L50 214 M150 52 L150 214" stroke="${C.caramelo}" stroke-width="3"/>
      <path d="M150 70 C182 70 184 168 150 168" stroke-width="6" stroke="${C.torra}"/>
      <rect x="46" y="214" width="108" height="12" rx="4" fill="${C.caramelo}"/>
    </svg>`,
    koar: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M36 30 L164 30 L130 100 L70 100 Z" fill="${C.pielini}"/>
      <path d="M36 30 L70 100 M68 30 L85 100 M100 30 L100 100 M132 30 L115 100 M164 30 L130 100" stroke="${C.creme}" stroke-opacity=".35" stroke-width="1.6"/>
      <ellipse cx="100" cy="30" rx="64" ry="7" fill="${C.pielini}"/>
      <ellipse cx="100" cy="32" rx="50" ry="4" fill="#5A3418" stroke="none"/>
      <path d="M58 100 L142 100 L142 110 L58 110 Z" fill="${C.torra}"/>
      <circle class="anim-drop" cx="100" cy="118" r="3" fill="#8A5428" stroke="none"/>
      <path d="M58 126 L142 126 L142 210 C142 220 134 226 124 226 L76 226 C66 226 58 220 58 210 Z" fill="${C.creme}" fill-opacity=".6"/>
      <path d="M60 168 L140 168 L140 210 C140 218 133 223 124 223 L76 223 C67 223 60 218 60 210 Z" fill="#5A3418" stroke="none"/>
      <path d="M68 136 L68 160" stroke="${C.creme}" stroke-width="4"/>
    </svg>`,
    chemex: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M44 14 L156 14 L112 104 L112 120 L164 212 C168 220 162 228 154 228 L46 228 C38 228 32 220 36 212 L88 120 L88 104 Z" fill="${C.creme}" fill-opacity=".55"/>
      <path d="M50 18 L150 18 L108 100 L92 100 Z" fill="#FBF9F4" stroke-opacity=".5"/>
      <path d="M44 14 L60 14 L100 70" stroke-opacity=".35"/>
      <path d="M58 176 L142 176 L160 210 C162 216 158 222 152 222 L48 222 C42 222 38 216 40 210 Z" fill="#5A3418" stroke="none"/>
      <path d="M84 96 L116 96 L120 128 L80 128 Z" fill="#9B6A3C"/>
      <path d="M100 128 L94 150 M100 128 L106 150" stroke="#3A2C21" stroke-width="2"/>
      <circle cx="100" cy="128" r="4" fill="#3A2C21" stroke="none"/>
      <circle class="anim-drop" cx="100" cy="112" r="2.5" fill="#8A5428" stroke="none"/>
    </svg>`,
    espresso: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <g opacity=".5" stroke="${C.caramelo}">
        <path class="anim-bubble" d="M80 70 C70 56 90 46 80 30"/>
        <path class="anim-bubble" style="animation-delay:.9s" d="M104 66 C94 52 114 42 104 26"/>
        <path class="anim-bubble" style="animation-delay:1.6s" d="M126 70 C116 56 136 46 126 30"/>
      </g>
      <ellipse cx="100" cy="200" rx="86" ry="16" fill="${C.off}"/>
      <ellipse cx="100" cy="196" rx="58" ry="8" fill="${C.creme}"/>
      <path d="M42 104 L158 104 L150 170 C148 186 132 196 116 196 L84 196 C68 196 52 186 50 170 Z" fill="${C.creme}"/>
      <path d="M156 118 C186 116 186 160 152 160" stroke-width="7"/>
      <ellipse cx="100" cy="104" rx="58" ry="12" fill="#B07A45"/>
      <path d="M100 98 C92 90 80 98 90 106 L100 113 L110 106 C120 98 108 90 100 98 Z" fill="${C.creme}" stroke="none"/>
      <path d="M100 113 L100 100" stroke="${C.creme}" stroke-width="2"/>
    </svg>`,
    soda: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <defs><linearGradient id="soda-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7E7C8" stop-opacity=".6"/><stop offset=".45" stop-color="#F2A0A0"/><stop offset="1" stop-color="#B8283E"/></linearGradient></defs>
      <path d="M122 4 L108 70" stroke="${C.pielini}" stroke-width="7"/>
      <path d="M54 46 L146 46 L134 220 C133 226 128 230 122 230 L78 230 C72 230 67 226 66 220 Z" fill="${C.creme}" fill-opacity=".35"/>
      <path d="M58 76 L142 76 L134 218 C133 224 128 226 122 226 L78 226 C72 226 67 224 66 218 Z" fill="url(#soda-g)" stroke="none"/>
      <rect x="72" y="84" width="26" height="24" rx="5" fill="#fff" fill-opacity=".5" transform="rotate(-12 85 96)"/>
      <rect x="102" y="96" width="24" height="22" rx="5" fill="#fff" fill-opacity=".45" transform="rotate(14 114 107)"/>
      <circle class="anim-bubble" cx="84" cy="200" r="2.5" fill="#fff" stroke="none"/>
      <circle class="anim-bubble" style="animation-delay:.6s" cx="112" cy="190" r="2" fill="#fff" stroke="none"/>
      <circle class="anim-bubble" style="animation-delay:1.2s" cx="98" cy="210" r="3" fill="#fff" stroke="none"/>
      <circle class="anim-bubble" style="animation-delay:1.8s" cx="120" cy="206" r="2" fill="#fff" stroke="none"/>
      <circle cx="146" cy="50" r="22" fill="#F4D35E"/>
      <circle cx="146" cy="50" r="16" fill="#FBEA9A" stroke-width="1.5"/>
      <path d="M146 34 L146 66 M130 50 L162 50 M135 39 L157 61 M157 39 L135 61" stroke-width="1.2" stroke-opacity=".5"/>
    </svg>`,
  };

  const methods = {
    v60: {
      name: 'Hario V60', kicker: 'Filtrado · Cone japonês', station: 'Estações Básica, Filtrados, Espressos e Plus',
      profile: 'Limpo, aromático e de acidez brilhante — revela a origem do grão com clareza.',
      visual: 'O fio d’água em espiral sobre o cone é o gesto mais fotogênico da ilha: convidados param para assistir e filmar.',
      notes: ['Floral', 'Frutas amarelas', 'Mel'], meters: { Corpo: 2, Acidez: 4, Doçura: 3 }, time: '3 min',
    },
    prensa: {
      name: 'Prensa Francesa', kicker: 'Imersão · Clássico europeu', station: 'Estações Básica, Filtrados, Espressos e Plus',
      profile: 'Encorpado, untuoso e reconfortante, com textura marcante na boca.',
      visual: 'O êmbolo descendo lentamente pela jarra de vidro cria um momento de expectativa — ritual simples e elegante.',
      notes: ['Chocolate', 'Castanhas', 'Caramelo'], meters: { Corpo: 5, Acidez: 2, Doçura: 3 }, time: '4 min',
    },
    koar: {
      name: 'Koar', kicker: 'Filtrado · Design autoral', station: 'Estações Filtrados, Espressos e Plus',
      profile: 'Equilibrado e doce, com extração uniforme e finalização limpa.',
      visual: 'Desenho geométrico que vira peça de decoração na bancada — conversa com a estética do evento.',
      notes: ['Rapadura', 'Frutas vermelhas', 'Cacau'], meters: { Corpo: 3, Acidez: 3, Doçura: 4 }, time: '3 min',
    },
    chemex: {
      name: 'Chemex', kicker: 'Filtrado · Ícone do design', station: 'Estações Filtrados, Espressos e Plus',
      profile: 'Ultra-limpo, delicado e translúcido, quase como um chá.',
      visual: 'A jarra de vidro com colar de madeira é um ícone de design — sofisticação instantânea para a ilha.',
      notes: ['Chá preto', 'Cítricos', 'Flor de laranjeira'], meters: { Corpo: 1, Acidez: 4, Doçura: 3 }, time: '4 min',
    },
    espresso: {
      name: 'Clássicos de Espresso', kicker: 'Espresso, Cappuccino, Caramel Macchiato e Mocaccino', station: 'Estações Espressos e Plus',
      profile: 'Intenso, cremoso e versátil — do espresso puro às bebidas com leite vaporizado.',
      visual: 'Máquina profissional, vapor, crema dourada e latte art ao vivo: o coração movimentado da ilha.',
      notes: ['Cacau', 'Caramelo', 'Avelã'], meters: { Corpo: 5, Acidez: 2, Doçura: 4 }, time: '1 min',
    },
    soda: {
      name: 'Sodas Italianas', kicker: 'Refrescantes · Sem café', station: 'Exclusivo Estação Premium Plus',
      profile: 'Refrescante, efervescente e colorida — perfeita para dias quentes e pista de dança.',
      visual: 'Camadas de xarope, gelo e gás em copos transparentes: cor e brilho que iluminam a ilha.',
      notes: ['Frutas vermelhas', 'Maçã verde', 'Limão siciliano'], meters: { Corpo: 1, Acidez: 4, Doçura: 5 }, time: '1 min',
    },
  };

  const methodTabs = $$('.method-btn');
  const methodInfo = $('#method-info');
  const methodArt = $('#method-art');
  const methodStation = $('#method-station');
  const setMethod = (key, focus = false) => {
    const m = methods[key];
    methodTabs.forEach((b) => {
      const on = b.dataset.method === key;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
      if (on) $('#method-panel').setAttribute('aria-label', m.name);
    });
    const q = (k) => $(`[data-k="${k}"]`, methodInfo);
    q('kicker').textContent = m.kicker;
    q('name').textContent = m.name;
    q('profile').textContent = m.profile;
    q('visual').textContent = m.visual;
    q('meters').innerHTML = Object.entries(m.meters).map(([label, v]) => `
      <div class="grid grid-cols-[72px_1fr] items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-torra/60">
        <span>${label}</span>
        <span class="h-1.5 overflow-hidden rounded-full bg-torra/10"><span class="meter-fill block h-full rounded-full bg-pielini" style="width:0" data-w="${v * 20}"></span></span>
      </div>`).join('') + `<p class="mt-1 flex items-center gap-2 text-xs text-torra/50"><i data-lucide="clock" class="h-3.5 w-3.5"></i> Preparo médio: ${m.time}</p>`;
    methodStation.textContent = m.station;
    methodArt.innerHTML = art[key];
    renderIcons();
    requestAnimationFrame(() => $$('.meter-fill', methodInfo).forEach((f) => { f.style.width = `${f.dataset.w}%`; }));
    [methodArt, methodInfo].forEach((n) => { n.classList.remove('swap-enter'); void n.offsetWidth; n.classList.add('swap-enter'); });
  };
  methodTabs.forEach((b, i) => {
    b.addEventListener('click', () => {
      setMethod(b.dataset.method);
      // no celular o painel fica abaixo da lista: leva o leitor até ele
      if (!desktop.matches) $('#method-panel').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    b.addEventListener('keydown', (e) => {
      const n = methodTabs.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setMethod(methodTabs[(i + 1) % n].dataset.method, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setMethod(methodTabs[(i + n - 1) % n].dataset.method, true); }
    });
  });
  setMethod('v60');

  /* ===================================================================
     5b. WIDGET 3 — SIMULADOR DE COPO EM TEMPO REAL
  =================================================================== */
  const cupName = $('#cup-name');
  const cupDate = $('#cup-date');
  const cupSub = $('#cup-sub');
  const cupNameText = $('#cup-name-text');
  const cupSubText = $('#cup-sub-text');
  const segBtns = $$('.seg-btn');
  const SAMPLE_NAME = 'Ana & Lucas';
  const SAMPLE_SUB = '12 · 03 · 2027';

  const formatDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const fitText = (node, base, maxWidth) => {
    node.setAttribute('font-size', base);
    node.removeAttribute('textLength');
    node.removeAttribute('lengthAdjust');
    try {
      const w = node.getComputedTextLength();
      if (w > maxWidth) node.setAttribute('font-size', Math.max(14, Math.floor(base * maxWidth / w)));
    } catch (_) { /* SVG ainda não renderizado */ }
  };

  const cupSubtitle = () => (state.cup.subMode === 'date' ? formatDate(state.cup.date) : state.cup.sub.trim());

  const renderCup = () => {
    const name = state.cup.name.trim();
    // letras maiúsculas e espaçadas, como na referência de copo minimalista
    cupNameText.textContent = (name || SAMPLE_NAME).toLocaleUpperCase('pt-BR');
    cupNameText.setAttribute('fill-opacity', name ? '1' : '.55');
    fitText(cupNameText, 34, 236);
    const sub = cupSubtitle();
    cupSubText.textContent = sub ? (state.cup.subMode === 'date' ? sub.replace(/\//g, ' · ') : sub.toUpperCase()) : SAMPLE_SUB;
    fitText(cupSubText, 13, 240);
    renderMessage();
  };

  cupName.addEventListener('input', () => { state.cup.name = cupName.value; renderCup(); });
  cupDate.addEventListener('input', () => { state.cup.date = cupDate.value; renderCup(); });
  cupSub.addEventListener('input', () => { state.cup.sub = cupSub.value; renderCup(); });

  segBtns.forEach((btn) => btn.addEventListener('click', () => {
    state.cup.subMode = btn.dataset.subMode;
    segBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    cupDate.hidden = state.cup.subMode !== 'date';
    cupSub.hidden = state.cup.subMode !== 'text';
    (state.cup.subMode === 'date' ? cupDate : cupSub).focus();
    renderCup();
  }));

  /* ===================================================================
     6. WIDGET 4 — GERADOR DE MENSAGEM WHATSAPP
  =================================================================== */
  const preview = $('#wa-preview');
  const cta = $('#wa-cta');
  const groups = { event: $('#event-pills'), station: $('#station-pills') };

  function selectPill(group, value) {
    state[group] = value;
    $$('.pill', groups[group]).forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.value === value)));
    if (group === 'station') {
      const idx = $$('.pill', groups.station).findIndex((p) => p.dataset.value === value);
      stationCards.forEach((c, i) => c.classList.toggle('is-chosen', i === idx));
    }
    renderMessage();
  }

  Object.entries(groups).forEach(([group, root]) => {
    $$('.pill', root).forEach((pill) => pill.addEventListener('click', () => {
      const same = state[group] === pill.dataset.value;
      selectPill(group, same ? null : pill.dataset.value);
    }));
  });

  $('#lead-name').addEventListener('input', (e) => { state.leadName = e.target.value; renderMessage(); });

  const buildMessage = () => {
    const lines = [];
    const lead = state.leadName.trim();
    lines.push('Olá, Pielini Coffee! ☕');
    lines.push(`${lead ? `Meu nome é ${lead} e gostaria` : 'Gostaria'} de agendar uma *Degustação Exclusiva* na cafeteria.`);
    lines.push('');
    lines.push(`• Evento: ${state.event || 'ainda vou definir'}`);
    lines.push(`• Estação de interesse: ${state.station || 'quero ajuda para escolher'}`);
    const cupNameValue = state.cup.name.trim();
    const sub = cupSubtitle();
    if (cupNameValue || sub) {
      const parts = [cupNameValue ? `"${cupNameValue}"` : null, sub || null].filter(Boolean).join(' — ');
      lines.push(`• Copo personalizado: ${parts}`);
    }
    lines.push('');
    lines.push('Podemos combinar um horário?');
    return lines.join('\n');
  };

  function renderMessage() {
    const msg = buildMessage();
    preview.innerHTML = escapeHTML(msg).replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    cta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  const now = new Date();
  $('#wa-time').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Botão flutuante e links genéricos também levam a mensagem montada
  waFloat.addEventListener('click', () => { waFloat.href = cta.href; });

  renderCup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderCup);
})();
