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
    corporate: false,
    plan: 2,
    guests: 80,
    city: 'Novo Hamburgo',
    attractions: null,     // 'sim' | 'nao'
    km: 0,
    eventDate: '',         // AAAA-MM-DD
    noDate: false,         // "Ainda não tenho data definida"
    answers: { 'q-budget': null, 'q-phase': null },
    qualified: false,
    leadName: '',
    cup: { name: '', subMode: 'date', date: '', sub: '' },
  };

  /* Tabela de preços (até 100 convidados) — edite aqui quando reajustar */
  const PRICING = {
    plans: [
      { name: 'Estação Básica', price: 990 },
      { name: 'Estação Filtrados', price: 1290 },
      { name: 'Estação Espressos', price: 2190 },
      { name: 'Estação Premium Plus', price: 2390 },
    ],
    maxGuests: 100,          // acima disso: proposta sob medida pelo WhatsApp
    // Equipe extra (o cliente vê só "atendimento ampliado", nunca a quantidade de baristas):
    // +1 barista nas estações com espresso acima de 80 convidados
    // +1 barista quando o café for a atração principal (sem outras atrações no evento)
    espressoGuestsLimit: 80,
    extraStaffFee: 200,      // valor cobrado por barista extra — ajuste aqui
    giftPlan: 3,             // Premium Plus ganha a personalização dos copos de brinde
    upsellFrom: 2,           // quem escolhe Espressos vê a oferta de upgrade para a Plus
    freeKm: 10,              // deslocamento incluso até 10 km da cafeteria
    perKm: 1,                // R$ por km acima do limite
  };
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

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
    { title: 'Empresarial', text: 'Coffee break, convenções e recepção de clientes: café especial servido ao vivo valoriza a marca e mantém a equipe energizada.', rec: { station: 'Estação Espressos', text: 'Espresso, Cappuccino e filtrados' } },
  ];
  // foto de fundo de cada momento (object-position = foco do recorte)
  const MOMENT_PHOTOS = [
    ['momento-boas-vindas', '30% 40%'],
    ['momento-mesa-doces', '62% 58%'],
    ['momento-pos-jantar', '40% 45%'],
    ['momento-pista', '50% 30%'],
    ['momento-empresarial', '45% 45%'],
  ];
  MOMENT_PHOTOS.forEach(([f]) => { const im = new Image(); im.src = `assets/img/${f}.jpg`; });

  // degradê da linha do tempo: do marrom mais claro ao mais escuro
  const MOMENT_COLORS = ['#A0714A', '#86552F', '#6A401F', '#4A2B15', '#1E1610'];
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
    momentLine.style.width = `${(index / 4) * 80}%`;
    momentPanel.style.backgroundColor = MOMENT_COLORS[index];
    $('#moment-line-fill').style.width = `${momentLine.parentElement.offsetWidth * 0.8}px`;
    momentPanel.style.setProperty('--mc', MOMENT_COLORS[index]);
    const photo = $('#moment-photo');
    const [file, pos] = MOMENT_PHOTOS[index];
    photo.classList.remove('is-in'); void photo.offsetWidth;
    photo.src = `assets/img/${file}.jpg`;
    photo.style.objectPosition = pos;
    photo.classList.add('is-in');

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
    setPlan(idx);
    lockedStation = idx;
    $('#level-bar').closest('.rounded-3xl').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => showLevel(idx), prefersReducedMotion ? 0 : 450);
  });
  momentTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => setMoment(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') setMoment((i + 1) % moments.length, true);
      if (e.key === 'ArrowLeft') setMoment((i + moments.length - 1) % moments.length, true);
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
      setPlan(lockedStation);
      $('#investimento').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      $('#sim-plans').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 600, delay: 700, easing: 'ease-out' });
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
    espresso: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <defs><radialGradient id="crema-g" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#C98A4D"/><stop offset=".7" stop-color="#9A5E2C"/><stop offset="1" stop-color="#6E3F1C"/></radialGradient></defs>
      <g stroke="${C.caramelo}" stroke-opacity=".55" stroke-width="2">
        <path class="anim-bubble" d="M84 82 C76 70 92 62 84 48"/>
        <path class="anim-bubble" style="animation-delay:.8s" d="M102 80 C94 66 110 58 102 42"/>
        <path class="anim-bubble" style="animation-delay:1.5s" d="M120 82 C112 70 128 62 120 48"/>
      </g>
      <ellipse cx="100" cy="200" rx="84" ry="15" fill="${C.off}"/>
      <ellipse cx="100" cy="197" rx="56" ry="8" fill="#E2D6C2" stroke="none"/>
      <path d="M150 196 L184 186" stroke-width="3.5"/><ellipse cx="188" cy="185" rx="6" ry="3.5" fill="${C.off}"/>
      <path d="M150 126 C178 124 182 164 146 168" stroke-width="7"/>
      <path d="M48 112 C48 160 66 194 100 194 C134 194 152 160 152 112" fill="${C.creme}"/>
      <path d="M58 132 C60 160 72 182 92 188" stroke="#fff" stroke-width="3" stroke-opacity=".8"/>
      <ellipse cx="100" cy="112" rx="52" ry="14" fill="${C.creme}"/>
      <ellipse cx="100" cy="113" rx="46" ry="11" fill="url(#crema-g)" stroke="none"/>
      <ellipse cx="101" cy="113" rx="27" ry="7.5" fill="#EFDFC9" stroke="none" opacity=".9"/>
      <g stroke-linecap="round"><path d="M78 104.0 Q90.0 112 78 120.0" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M85 104.9 Q96.2 112 85 119.1" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M92 105.8 Q102.4 112 92 118.2" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M99 106.7 Q108.6 112 99 117.3" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M106 107.6 Q114.8 112 106 116.4" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M113 108.5 Q121.0 112 113 115.5" stroke="#F7EEE2" stroke-width="2.6" fill="none"/><path d="M74 112.5 L124 112.5" stroke="#F7EEE2" stroke-width="1.6"/></g>
      <g fill="#5A3418" stroke="none"><ellipse cx="34" cy="214" rx="7" ry="4.5" transform="rotate(-20 34 214)"/><ellipse cx="48" cy="220" rx="7" ry="4.5" transform="rotate(15 48 220)"/></g>
      <path d="M29 216 Q34 213 39 212 M43 221 Q48 219 53 219" stroke="#C88A4B" stroke-width="1.2"/>
    </svg>`,
    soda: `<svg viewBox="0 0 200 240" fill="none" stroke="${C.torra}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <defs>
        <linearGradient id="soda-liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE3D9" stop-opacity=".7"/><stop offset=".38" stop-color="#F29A9A"/><stop offset=".72" stop-color="#D9475A"/><stop offset="1" stop-color="#A31F35"/></linearGradient>
        <linearGradient id="soda-glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
        <clipPath id="soda-clip"><path d="M62 70 L138 70 L130 212 C129.5 219 125 222 118 222 L82 222 C75 222 70.5 219 70 212 Z"/></clipPath>
      </defs>
      <ellipse cx="100" cy="226" rx="52" ry="7" fill="${C.torra}" opacity=".08" stroke="none"/>
      <path d="M112 8 L96 132" stroke="${C.pielini}" stroke-width="8"/>
      <path d="M112 8 L96 132" stroke="#fff" stroke-width="8" stroke-dasharray="6 9" opacity=".85"/>
      <g clip-path="url(#soda-clip)" stroke="none">
        <rect x="56" y="86" width="90" height="140" fill="url(#soda-liq)"/>
        <rect x="70" y="90" width="26" height="24" rx="5" fill="#fff" fill-opacity=".55" transform="rotate(-14 83 102)"/>
        <rect x="100" y="98" width="24" height="22" rx="5" fill="#fff" fill-opacity=".5" transform="rotate(12 112 109)"/>
        <rect x="80" y="122" width="22" height="20" rx="5" fill="#fff" fill-opacity=".35" transform="rotate(8 91 132)"/>
        <circle cx="96" cy="160" r="6" fill="#7A1528" opacity=".55"/><circle cx="110" cy="176" r="5" fill="#7A1528" opacity=".5"/>
        <circle class="anim-bubble" cx="84" cy="206" r="2.4" fill="#fff"/>
        <circle class="anim-bubble" style="animation-delay:.6s" cx="114" cy="196" r="2" fill="#fff"/>
        <circle class="anim-bubble" style="animation-delay:1.2s" cx="98" cy="214" r="2.8" fill="#fff"/>
        <circle class="anim-bubble" style="animation-delay:1.8s" cx="122" cy="210" r="1.8" fill="#fff"/>
      </g>
      <path d="M62 70 L138 70 L130 212 C129.5 219 125 222 118 222 L82 222 C75 222 70.5 219 70 212 Z" fill="url(#soda-glass)"/>
      <path d="M70 86 L76 200" stroke="#fff" stroke-width="3" stroke-opacity=".75"/>
      <ellipse cx="100" cy="70" rx="38" ry="6" fill="${C.creme}" fill-opacity=".35"/>
      <g transform="rotate(18 140 70)">
        <circle cx="140" cy="70" r="20" fill="#F2D35B"/>
        <circle cx="140" cy="70" r="15" fill="#FBEA9A" stroke-width="1.4"/>
        <path d="M140 55 L140 85 M125 70 L155 70 M129 59 L151 81 M151 59 L129 81" stroke-width="1" stroke-opacity=".45"/>
      </g>
      <path d="M58 66 C50 52 58 42 70 46 C70 58 66 62 58 66 Z" fill="#4F8A5B" stroke-width="1.6"/>
      <path d="M70 46 C62 54 60 60 58 66" stroke-width="1.2"/>
      <circle cx="132" cy="150" r="2" fill="#fff" stroke="none" opacity=".8"/><circle cx="66" cy="176" r="1.6" fill="#fff" stroke="none" opacity=".7"/>
    </svg>`,

  };

  // Foto da mesa de cada estação (verso do card). object-position = foco do recorte
  const STATION_TABLES = [
    { img: 'mesa-basica', pos: '62% 55%', alt: 'Barista servindo café no Hario V60, ao lado da prensa francesa e da balança', tools: 'Hario V60 · Prensa Francesa · moedor e balança' },
    { img: 'mesa-filtrados', pos: '45% 30%', alt: 'Mesa vista de cima com V60, Koar, Chemex, prensa francesa e chaleira', tools: 'V60 · Prensa · Koar · Chemex · moedor e balança' },
    { img: 'mesa-espressos', pos: '45% 88%', alt: 'Espresso, cappuccino com latte art e macchiato em frente à máquina de espresso', tools: 'Máquina de espresso · bebidas com leite vaporizado · filtrados' },
    { img: 'mesa-premium-plus', pos: '50% 28%', alt: 'Noivos brindando com café na ilha da Pielini, com sodas italianas e copos personalizados', tools: 'Espressos · filtrados · sodas italianas · copos personalizados de brinde' },
  ];
  $$('.station-card').forEach((card, i) => {
    const front = document.createElement('div');
    front.className = 'card-front';
    // fundo, borda e espaçamento ficam na face da frente: se ficassem no card,
    // cortariam a foto ao meio durante a virada 3D
    [...card.classList].filter((cl) => /^(bg-|from-|to-|border|p-\d)/.test(cl)).forEach((cl) => {
      card.classList.remove(cl);
      front.classList.add(cl);
    });
    while (card.firstChild) front.appendChild(card.firstChild);
    card.appendChild(front);
    // o selo "A Queridinha" continua visível dos dois lados
    const badge = $('span.absolute', front);
    if (badge && badge.textContent.includes('Queridinha')) card.appendChild(badge);
    const t = STATION_TABLES[i];
    const name = $('h3', front).textContent.trim();
    const back = document.createElement('div');
    back.className = 'card-back';
    back.innerHTML = `<img src="assets/img/${t.img}.jpg" alt="${t.alt}" class="card-back-img" style="object-position:${t.pos}" loading="lazy" decoding="async">
      <div class="card-back-shade" aria-hidden="true"></div>
      <div class="card-back-content">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-caramelo-light">A mesa da</p>
        <p class="mt-1 whitespace-nowrap font-display text-[1.45rem] leading-tight">${name}</p>
        <p class="mt-2 text-sm leading-relaxed text-creme/75">${t.tools}</p>
        <button type="button" class="card-back-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-caramelo px-5 py-3 text-sm font-semibold text-torra transition hover:bg-caramelo-light">Simular investimento →</button>
      </div>`;
    card.appendChild(back);
    $('.card-back-btn', back).addEventListener('click', (e) => { e.stopPropagation(); $('[data-choose]', front).click(); });
    // celular: a foto da mesa aparece no topo da frente do card (sem virar)
    front.insertAdjacentHTML('afterbegin', `<img src="assets/img/${t.img}.jpg" alt="" class="card-photo" style="object-position:${t.pos}" loading="lazy" decoding="async">`);
    // o selo "A Queridinha" fica por cima de tudo, inclusive da foto no verso
    if (badge && badge.textContent.includes('Queridinha')) { card.appendChild(badge); badge.classList.add('card-badge'); }
  });

  // Celular: o carrossel começa centralizado na Estação Espressos
  (() => {
    const row = $('#station-grid');
    const target = $$('.station-card', row)[2];
    const center = () => {
      if (row.scrollWidth > row.clientWidth + 4) row.scrollLeft = target.offsetLeft - (row.clientWidth - target.offsetWidth) / 2;
    };
    center();
    window.addEventListener('load', center, { once: true });
  })();

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
     6. FUNIL — simulador de investimento, filtro e mensagem do WhatsApp
  =================================================================== */
  const waLink = (msg) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  const preview = $('#wa-preview');
  const cta = $('#wa-cta');
  const simEvent = $('#sim-event');
  const simPlans = $$('.sim-plan');
  const guestsInput = $('#sim-guests');
  const citySelect = $('#sim-city');
  const kmWrap = $('#sim-km-wrap');
  const kmInput = $('#sim-km');
  const filterBox = $('#sim-filter');
  const passBox = $('#sim-pass');
  const failBox = $('#sim-fail');
  const checkBtn = $('#sim-check');
  const bookingLock = $('#booking-lock');
  const bookingCard = $('#booking-card');

  const quote = () => {
    const base = PRICING.plans[state.plan].price;
    const extraKm = Math.max(0, Math.round(state.km) - PRICING.freeKm);
    const travel = extraKm * PRICING.perKm;
    const extraStaff = (state.plan >= 2 && state.guests > PRICING.espressoGuestsLimit ? 1 : 0) + (state.attractions === 'nao' ? 1 : 0);
    const staff = extraStaff * PRICING.extraStaffFee;
    return { base, extraKm, travel, extraStaff, staff, total: base + travel + staff };
  };
  const isCustom = () => state.guests > PRICING.maxGuests;
  // Corporativo e mais de 100 convidados: orçamento à parte, sem mostrar valores
  const isQuoteOnly = () => isCustom() || state.corporate;
  const dateLabel = () => (state.noDate ? 'ainda não definida' : state.eventDate ? formatDate(state.eventDate) : 'a informar');
  const guestsLabel = () => (state.guests >= 250 ? '250 ou mais' : String(state.guests));
  const attractionsLabel = () => ({ sim: 'Sim', nao: 'Não, o café será a atração principal' }[state.attractions] || 'a informar');
  const cityLabel = () => (state.km > PRICING.freeKm ? `${state.city} (~${Math.round(state.km)} km)` : state.city);

  const summaryLines = (withPrice) => {
    const lines = [
      `• Evento: ${state.event || 'ainda vou definir'}`,
      `• Data do evento: ${dateLabel()}`,
      `• Estação: ${PRICING.plans[state.plan].name}`,
      `• Convidados: ${guestsLabel()}`,
      `• Cidade: ${cityLabel()}`,
      `• Outras atrações no evento: ${attractionsLabel()}`,
    ];
    if (!isQuoteOnly() && quote().extraStaff) lines.push('• Atendimento ampliado: sim');
    if (state.plan === PRICING.giftPlan) lines.push('• 🎁 Brinde Premium Plus: personalização dos copos grátis');
    if (withPrice && !isQuoteOnly()) lines.push(`• Investimento estimado: ${brl(quote().total)}`);
    return lines;
  };

  const lineRow = (label, value, strong = false) => `<li class="flex items-baseline justify-between gap-4"><span class="text-creme/65">${label}</span><span class="${strong ? 'font-semibold text-creme' : 'text-creme/90'}">${value}</span></li>`;

  const CUSTOM_COPY = {
    corporate: {
      eyebrow: 'Evento corporativo',
      title: 'Orçamento corporativo',
      text: 'Eventos corporativos têm um orçamento próprio, montado de acordo com o formato, o público e a duração do seu evento. Envie os dados e respondemos pelo WhatsApp com a proposta.',
      label: 'Solicitar orçamento corporativo',
      intro: 'Gostaria de um *orçamento corporativo* para o meu evento.',
    },
    large: {
      eyebrow: 'Mais de 100 convidados',
      title: 'Proposta sob medida',
      text: 'Para eventos maiores, dimensionamos a ilha e montamos o orçamento de acordo com o seu evento. Envie os dados e respondemos pelo WhatsApp.',
      label: 'Solicitar proposta personalizada',
      intro: 'Gostaria de uma *proposta personalizada* para um evento com mais de 100 convidados.',
    },
  };
  // guarda o texto de preço de cada estação no simulador (some no corporativo)
  simPlans.forEach((b) => { const pr = b.lastElementChild; pr.dataset.price = pr.textContent; });

  function renderSim() {
    const custom = isQuoteOnly();
    const copy = CUSTOM_COPY[state.corporate ? 'corporate' : 'large'];
    $('#sim-custom-eyebrow').textContent = copy.eyebrow;
    $('#sim-custom-title').textContent = copy.title;
    $('#sim-custom-text').textContent = copy.text;
    $('#sim-custom-label').textContent = copy.label;
    simPlans.forEach((b) => { const pr = b.lastElementChild; pr.textContent = state.corporate ? 'valor sob consulta' : pr.dataset.price; });
    $('#sim-guests-out').textContent = guestsLabel();
    $('#sim-standard').hidden = custom;
    $('#sim-custom').hidden = !custom;
    if (custom) { filterBox.hidden = true; passBox.hidden = true; failBox.hidden = true; }

    const q = quote();
    $('#sim-total').textContent = brl(q.total);
    $('#sim-hint').hidden = !!state.attractions;
    renderOffer();
    $('#sim-lines').innerHTML = [
      lineRow(PRICING.plans[state.plan].name, brl(q.base)),
      lineRow('Deslocamento', q.travel ? `+ ${brl(q.travel)} <span class="text-creme/50">(${q.extraKm} km além de 10 km)</span>` : 'incluso'),
      q.staff ? lineRow('Atendimento ampliado', `+ ${brl(q.staff)}`) : '',
      lineRow('Atendimento de barista', 'incluso'),
      lineRow('Insumos, bancada e equipamentos', 'inclusos'),
    ].join('');
    $('#sim-custom-lines').innerHTML = [
      lineRow('Evento', state.event || 'a definir'),
      lineRow('Data', dateLabel()),
      lineRow('Estação', PRICING.plans[state.plan].name),
      lineRow('Convidados', guestsLabel()),
      lineRow('Cidade', cityLabel()),
      lineRow('Outras atrações', attractionsLabel()),
    ].join('');

    $('#sim-custom-cta').href = waLink(['Olá, Pielini Coffee! ☕', copy.intro, '', ...summaryLines(false), '', 'Podem me enviar uma proposta?'].join('\n'));
    const menuMsg = ['Olá, Pielini Coffee! ☕', 'Gostaria de receber o *cardápio* com os planos e valores.', '', ...summaryLines(true)].join('\n');
    $('#sim-menu-link').href = waLink(menuMsg);
    $('#sim-menu-cta').href = waLink(menuMsg);

    simPlans.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.plan)));
    stationCards.forEach((c, i) => c.classList.toggle('is-chosen', i === state.plan));
    renderSummary();
    renderMessage();
    updateGates();
  }

  // Botões que levam ao WhatsApp ficam travados até o simulador estar completo
  function updateGates() {
    const ready = SIM_CHECKS().every(([ok]) => ok());
    ['#sim-custom-cta', '#sim-menu-link', '#sim-continue'].forEach((sel) => {
      const el = $(sel);
      el.classList.toggle('is-locked', !ready);
      el.setAttribute('aria-disabled', String(!ready));
    });
    $$('.sim-gate-hint').forEach((h) => { h.hidden = ready; });
  }

  // Upgrade: quem está na Espressos vê quanto falta para a Plus (com brinde);
  // quem já escolheu a Plus vê o brinde confirmado
  function renderOffer() {
    const box = $('#sim-offer');
    if (state.plan === PRICING.giftPlan) {
      box.innerHTML = `<div class="offer-gift mt-6 rounded-2xl border border-caramelo/40 bg-caramelo/10 p-5">
        <p class="flex items-center gap-2 font-display text-2xl text-caramelo-light"><span aria-hidden="true">🎁</span> Presente Pielini</p>
        <p class="mt-1 text-sm text-creme/80">Por escolher a <strong>Premium Plus</strong>, a <strong>personalização dos copos</strong> com a identidade do seu evento é por nossa conta.</p>
        <p class="mt-2 flex items-baseline justify-between text-sm"><span class="text-creme/65">Personalização dos copos</span><span class="font-semibold text-caramelo-light">Grátis</span></p>
      </div>`;
    } else if (state.plan === PRICING.upsellFrom) {
      const cur = quote();
      const prev = state.plan;
      state.plan = PRICING.giftPlan;
      const up = quote();
      state.plan = prev;
      box.innerHTML = `<div class="offer-upsell mt-6 rounded-2xl bg-pielini p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-caramelo-light">Upgrade especial</p>
        <p class="mt-1 font-display text-2xl leading-snug">Por apenas <span class="text-caramelo-light">+ ${brl(up.total - cur.total)}</span>, leve a Premium Plus</p>
        <ul class="mt-3 space-y-1.5 text-sm text-creme/85">
          <li class="flex items-center gap-2"><span class="text-caramelo-light">✓</span> Sodas Italianas ou cafés gelados</li>
          <li class="flex items-center gap-2"><span class="text-caramelo-light">✓</span> <strong>Personalização dos copos grátis</strong> 🎁</li>
        </ul>
        <button type="button" id="sim-upgrade" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-creme px-5 py-3 text-sm font-bold text-torra transition hover:bg-white">Quero o upgrade para a Premium Plus</button>
      </div>`;
      $('#sim-upgrade').addEventListener('click', () => {
        setPlan(PRICING.giftPlan);
        lockedStation = PRICING.giftPlan;
        showLevel(PRICING.giftPlan);
        const gift = $('.offer-gift');
        if (gift && !prefersReducedMotion) gift.animate([{ transform: 'scale(.96)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    } else {
      box.innerHTML = '';
    }
    const badge = $('#cup-badge');
    if (badge) badge.innerHTML = state.plan === PRICING.giftPlan ? '<span class="font-semibold text-caramelo-dark">🎁 Grátis na Premium Plus</span>' : 'Opcional · disponível em qualquer estação';
  }

  function setPlan(idx) {
    if (idx < 0) return;
    state.plan = idx;
    renderSim();
  }

  // 1. tipo de evento (corporativo aplica o acréscimo)
  $$('.pill', simEvent).forEach((pill) => pill.addEventListener('click', () => {
    const same = state.event === pill.dataset.value;
    state.event = same ? null : pill.dataset.value;
    state.corporate = !same && pill.dataset.corp === '1';
    if (!same) clearError($('#sim-event-field'));
    $$('.pill', simEvent).forEach((p) => p.setAttribute('aria-pressed', String(p === pill && !same)));
    renderSim();
  }));
  // 2. estação
  simPlans.forEach((b, i) => b.addEventListener('click', () => { setPlan(i); lockedStation = i; showLevel(i); }));
  // 3. convidados
  guestsInput.addEventListener('input', () => { state.guests = Number(guestsInput.value); renderSim(); });
  // 4. cidade / km
  citySelect.addEventListener('change', () => {
    const other = citySelect.value === 'other';
    kmWrap.hidden = !other;
    state.city = other ? 'Outra cidade' : citySelect.options[citySelect.selectedIndex].text;
    state.km = other ? Number(kmInput.value) || 0 : Number(citySelect.value);
    if (other) kmInput.focus();
    renderSim();
  });
  kmInput.addEventListener('input', () => {
    if (Number(kmInput.value) > 0) clearError(citySelect.closest('div.mt-8'));
    state.km = clamp(Number(kmInput.value) || 0, 0, 500);
    renderSim();
  });

  /* Validação: campo não respondido fica vermelho e a página volta até ele */
  const markError = (field, msg) => {
    field.classList.add('field-error');
    if (!$('.field-error-msg', field)) field.insertAdjacentHTML('beforeend', `<p class="field-error-msg" role="alert">${msg}</p>`);
  };
  function clearError(field) {
    if (!field) return;
    field.classList.remove('field-error');
    const m = $('.field-error-msg', field);
    if (m) m.remove();
  }
  const requireFields = (checks) => {
    const missing = checks.filter(([ok]) => !ok());
    missing.forEach(([, field, msg]) => markError(field, msg));
    if (!missing.length) return true;
    const first = missing[0][1];
    first.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    first.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 450, delay: prefersReducedMotion ? 0 : 400 });
    const focusable = $('button, input, select', first);
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 700);
    return false;
  };
  const SIM_CHECKS = () => [
    [() => !!state.event, $('#sim-event-field'), 'Escolha o tipo de evento.'],
    [() => state.noDate || !!state.eventDate, $('#sim-date-field'), 'Informe a data do evento ou marque “Ainda não tenho data definida”.'],
    [() => citySelect.value !== 'other' || Number(kmInput.value) > 0, citySelect.closest('div.mt-8'), 'Informe a distância aproximada até a cafeteria.'],
    [() => !!state.attractions, $('#sim-attractions-field'), 'Responda se o evento terá outras atrações.'],
  ];
  const FILTER_CHECKS = () => Object.keys(state.answers).map((id) => [() => !!state.answers[id], $(`#${id}`).closest('fieldset'), 'Escolha uma opção.']);
  // Links do funil para o WhatsApp só abrem com tudo respondido
  ['#sim-menu-link', '#sim-menu-cta', '#sim-custom-cta'].forEach((sel) => $(sel).addEventListener('click', (e) => {
    if (!requireFields(SIM_CHECKS())) e.preventDefault();
  }));
  cta.addEventListener('click', (e) => {
    if (!state.qualified || !requireFields([...SIM_CHECKS(), ...FILTER_CHECKS()])) {
      e.preventDefault();
      if (!state.qualified) $('#investimento').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  });

  // 2. data do evento (ou "ainda não tenho data")
  const dateInput = $('#sim-date');
  const noDateInput = $('#sim-nodate');
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  dateInput.addEventListener('input', () => {
    state.eventDate = dateInput.value;
    if (dateInput.value) {
      state.noDate = false;
      noDateInput.checked = false;
      clearError($('#sim-date-field'));
      // aproveita a data no copo personalizado, se ainda estiver vazio
      if (!state.cup.date) { state.cup.date = dateInput.value; cupDate.value = dateInput.value; renderCup(); }
    }
    renderSim();
  });
  noDateInput.addEventListener('change', () => {
    state.noDate = noDateInput.checked;
    dateInput.disabled = noDateInput.checked;
    if (noDateInput.checked) { state.eventDate = ''; dateInput.value = ''; clearError($('#sim-date-field')); }
    renderSim();
  });

  // 6. outras atrações (define se a ilha precisa de atendimento ampliado)
  $$('.pill', $('#sim-attractions')).forEach((pill) => pill.addEventListener('click', () => {
    state.attractions = pill.dataset.value;
    clearError($('#sim-attractions-field'));
    $$('.pill', $('#sim-attractions')).forEach((p) => p.setAttribute('aria-pressed', String(p === pill)));
    renderSim();
  }));

  // Filtro de qualificação (exige a resposta do passo 5, que altera o valor)
  $('#sim-continue').addEventListener('click', () => {
    if (!requireFields(SIM_CHECKS())) return;
    filterBox.hidden = false;
    filterBox.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });
  Object.keys(state.answers).forEach((id) => {
    $$('.qpill', $(`#${id}`)).forEach((b) => b.addEventListener('click', () => {
      state.answers[id] = { value: b.dataset.value, ok: b.dataset.ok === '1' };
      $$('.qpill', $(`#${id}`)).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      clearError($(`#${id}`).closest('fieldset'));
    }));
  });
  checkBtn.addEventListener('click', () => {
    if (!requireFields(FILTER_CHECKS())) return;
    state.qualified = !state.noDate && Object.values(state.answers).every((a) => a && a.ok);
    passBox.hidden = !state.qualified;
    failBox.hidden = state.qualified;
    bookingLock.hidden = state.qualified;
    bookingCard.inert = !state.qualified;
    (state.qualified ? passBox : failBox).scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    renderSummary();
    renderMessage();
  });

  // Resumo da simulação no bloco de agendamento
  function renderSummary() {
    const items = [
      ['Evento', state.event || 'A definir'],
      ['Estação', PRICING.plans[state.plan].name],
      ['Convidados', guestsLabel()],
      ['Cidade', cityLabel()],
      ['Outras atrações', state.attractions ? { sim: 'Sim', nao: 'Não' }[state.attractions] : 'A informar'],
      ['Investimento estimado', isQuoteOnly() ? 'Sob consulta' : brl(quote().total)],
      ...(state.plan === PRICING.giftPlan ? [['Brinde', '🎁 Personalização dos copos grátis']] : []),
      ['Data do evento', dateLabel()],
    ];
    $('#sim-summary').innerHTML = items.map(([k, v]) => `<div class="rounded-2xl bg-creme/70 px-4 py-3"><dt class="text-[10px] font-semibold uppercase tracking-[0.18em] text-torra/45">${k}</dt><dd class="mt-0.5 font-medium">${escapeHTML(v)}</dd></div>`).join('');
  }

  $('#lead-name').addEventListener('input', (e) => { state.leadName = e.target.value; renderMessage(); });

  const buildMessage = () => {
    const lead = state.leadName.trim();
    const lines = ['Olá, Pielini Coffee! ☕', `${lead ? `Meu nome é ${lead} e gostaria` : 'Gostaria'} de agendar uma *Degustação Exclusiva* na cafeteria.`, '', ...summaryLines(true)];
    const phase = state.answers['q-phase'];
    if (phase) lines.push(`• Planejamento: ${phase.value}`);
    const cupNameValue = state.cup.name.trim();
    const sub = cupSubtitle();
    if (cupNameValue) {
      const parts = [cupNameValue ? `"${cupNameValue}"` : null, sub || null].filter(Boolean).join(' — ');
      lines.push(`• Copo personalizado: ${parts}`);
    }
    lines.push('', 'Podemos combinar um horário?');
    return lines.join('\n');
  };

  function renderMessage() {
    const msg = buildMessage();
    preview.innerHTML = escapeHTML(msg).replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    cta.href = waLink(msg);
  }

  const now = new Date();
  $('#wa-time').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Botão flutuante: contato geral, sem pular o funil
  waFloat.href = waLink('Olá, Pielini Coffee! ☕ Vim pelo site e tenho uma dúvida.');

  renderSim();
  renderCup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderCup);
})();
