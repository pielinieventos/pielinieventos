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
    const FRAMES = 29;
    const callout = $('#bean-callout');
    const ui = $('.bean-ui', section);
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
        draw(lastProgress);
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
    // mistura dois quadros vizinhos: a explosão fica fluida mesmo com poucos quadros
    const draw = (p) => {
      lastProgress = p;
      const t = clamp((p - 0.04) / 0.74, 0, 1);
      const f = t * (FRAMES - 1);
      const i0 = Math.floor(f);
      // mistura só no fim de cada intervalo: evita o "fantasma" duplo do grão
      const a = clamp((f - i0 - 0.6) / 0.4, 0, 1);
      const imgA = nearestLoaded(i0);
      if (!imgA) return;
      const imgB = a > 0.02 ? nearestLoaded(Math.min(FRAMES - 1, i0 + 1)) : null;
      const cw = canvas.width, ch = canvas.height;
      // o grão ocupa a altura útil da tela; no celular fica acima do texto
      const mobile = cw < ch;
      const boxH = ch * (mobile ? 0.62 : 0.96);
      const boxW = mobile ? cw : cw * 0.5;
      const scale = Math.min(boxW / imgA.naturalWidth, boxH / imgA.naturalHeight) * (mobile ? 1.35 : 1);
      const w = imgA.naturalWidth * scale, h = imgA.naturalHeight * scale;
      const x = mobile ? (cw - w) / 2 : cw * 0.54 - w / 2, y = mobile ? ch * 0.06 : (ch - h) / 2;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(imgA, x, y, w, h);
      if (imgB && imgB !== imgA) { ctx.globalAlpha = a; ctx.drawImage(imgB, x, y, w, h); ctx.globalAlpha = 1; }
    };

    const update = (vh) => {
      const r = section.getBoundingClientRect();
      const total = r.height - vh;
      const p = clamp(-r.top / (total || 1), 0, 1);
      draw(p);
      bar.style.transform = `scaleX(${p})`;
      bar.parentElement.style.opacity = p > 0.97 ? '0' : '1';
      const stage = p < 0.3 ? 0 : p < 0.56 ? 1 : 2;
      // no fim, a poeira assenta e entra a frase da casa
      const end = clamp((p - 0.72) / 0.14, 0, 1);
      callout.style.opacity = end.toFixed(2);
      callout.style.transform = `translateY(${((1 - end) * 18).toFixed(1)}px)`;
      ui.style.opacity = (1 - end).toFixed(2);
      steps.forEach((el, k) => el.classList.toggle('is-on', k === stage));
      indexes.forEach((el, k) => el.classList.toggle('is-on', k === stage));
    };

    load(0).then(() => draw(lastProgress));
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

  // logotipo gigante do rodapé sobe de dentro da "máscara" ao aparecer
  const bigLogo = $('#biglogo');
  if (bigLogo) new IntersectionObserver((e, obs) => { if (e[0].isIntersecting) { bigLogo.classList.add('is-in'); obs.disconnect(); } }, { threshold: 0.25 }).observe(bigLogo);

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
    // o logotipo da barra aparece quando o grande do início sai de cena
    document.body.classList.toggle('logo-docked-off', $('#hero-logo').getBoundingClientRect().top > 60);

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
  // Rolagem suave e um pouco mais lenta que a padrão (ease-in-out)
  const slowScrollTo = (el, duration = 1500) => {
    const navH = 84;
    const startY = window.scrollY;
    const endY = el.getBoundingClientRect().top + startY - navH;
    if (prefersReducedMotion) { window.scrollTo(0, endY); return; }
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, startY + (endY - startY) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else root.style.scrollBehavior = prevBehavior;
    };
    requestAnimationFrame(step);
  };

  // leva a "Explore os métodos"; a estação recomendada já fica marcada no simulador
  $('[data-m="rec-btn"]', momentPanel).addEventListener('click', (e) => {
    const station = e.currentTarget.dataset.station;
    const idx = ['Estação Básica', 'Estação Filtrados', 'Estação Espressos', 'Estação Premium Plus'].indexOf(station);
    setPlan(idx);
    lockedStation = idx;
    showLevel(idx);
    slowScrollTo($('#metodos'));
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
     5a. MÉTODOS — cena com a mesa, a sombra da janela e a lista ao lado
  =================================================================== */
  const ic = (p) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const METODOS = [
    { key: 'hario', nome: 'Hario V60', tempo: '2 min 30 s a 3 min 30 s', plano: 'Estação Básica', desc: 'Filtrado em cone, gota a gota: xícara limpa, aromática e delicada.', icon: ic('<path d="M6 8h20l-7 12h-6z" fill="currentColor" stroke="none"/><path d="M26 10c3 0 3 5 0 5"/><path d="M9 24h14M12 20v4M20 20v4"/>') },
    { key: 'french', nome: 'Prensa francesa', tempo: 'cerca de 4 min', plano: 'Estação Básica', desc: 'Café em imersão: mais corpo e uma textura aveludada.', icon: ic('<rect x="9" y="9" width="12" height="16" rx="1.5"/><path d="M21 12h3v9h-3M15 5v4M12 5h6M9 13h12"/>') },
    { key: 'koar', nome: 'Koar', tempo: 'cerca de 3 min', plano: 'Estação Filtrados', desc: 'Filtro de pétalas que valoriza a doçura e a acidez do grão.', icon: ic('<path d="M5 9h22l-7 12h-8z"/><path d="M9 9l4 12M13 9l2 12M19 9l-2 12M23 9l-4 12M11 25h10"/>') },
    { key: 'chemex', nome: 'Chemex', tempo: '3 a 4 min', plano: 'Estação Filtrados', desc: 'Filtro de papel grosso, bebida limpa e brilhante, servida em jarra.', icon: ic('<path d="M10 5h12l-5 10 5 12H10l5-12z"/><path d="M13 14h6"/><path d="M11 22h10l1 5H10z" fill="currentColor" stroke="none" opacity=".35"/>') },
    { key: 'espresso', nome: 'Espresso', tempo: '25 a 30 s (extração)', plano: 'Estação Espressos', desc: 'A base dos clássicos: espresso, cappuccino, caramel macchiato e mocaccino.', icon: ic('<path d="M7 12h16v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" fill="currentColor" stroke="none" opacity=".35"/><path d="M7 12h16v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M23 14h2a2.5 2.5 0 0 1 0 5h-2.5M5 27h22"/>') },
    { key: 'gelado', nome: 'Gelado', tempo: 'cerca de 2 min', plano: 'Estação Premium Plus', desc: 'Café gelado e cremoso, para dias quentes e para a pista de dança.', icon: ic('<path d="M16 5l10 5v12l-10 5-10-5V10z"/><path d="M6 10l10 5 10-5M16 15v12"/>') },
    { key: 'soda', nome: 'Soda italiana', tempo: 'cerca de 1 min', plano: 'Estação Premium Plus', desc: 'Xarope, água com gás e gelo: colorida, refrescante e sem álcool.', icon: ic('<path d="M9 8h14l-2 19H11z"/><path d="M10 13h12"/><circle cx="15" cy="18" r="1"/><circle cx="18" cy="22" r="1"/><circle cx="14" cy="24" r=".8"/><circle cx="17" cy="5" r=".8"/>') },
  ];
  // posição vertical (em %) de cada botão, alinhada à lista desenhada na foto
  const ROWS = [14.12, 21.40, 28.68, 35.96, 43.24, 50.52, 57.80];
  const scList = $('#scList');
  const scProds = $('#scProds');
  const prodImgs = METODOS.map((m, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'prod';
    wrap.style.opacity = i === 0 ? '1' : '0';
    wrap.innerHTML = `<img src="assets/img/metodos/${m.key}.webp" alt="${m.nome} sobre a mesa" decoding="async" ${i ? 'loading="lazy"' : ''}>`;
    scProds.appendChild(wrap);
    return wrap;
  });
  const mBtns = METODOS.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `m-btn${i === 0 ? ' on' : ''}${m.nome.length > 12 ? ' long' : ''}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === 0));
    b.style.top = `${ROWS[i]}%`;
    b.innerHTML = `<span class="ic" aria-hidden="true">${m.icon}</span><span class="nm">${m.nome}<small>Ativo</small></span><span class="dots" aria-hidden="true">•••</span>`;
    b.addEventListener('click', () => pickMethod(i));
    scList.appendChild(b);
    return b;
  });
  const mInfo = [$('#mName'), $('#mDesc'), $('.m-facts')];
  let mCur = 0;
  const fillMethod = (i) => {
    const m = METODOS[i];
    $('#mName').textContent = m.nome;
    $('#mDesc').textContent = m.desc;
    $('#mTime').textContent = m.tempo;
    $('#mPlan').textContent = m.plano;
  };
  fillMethod(0);
  function pickMethod(i) {
    if (i === mCur) return;
    const old = prodImgs[mCur];
    mCur = i;
    mBtns.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', String(k === i)); });
    prodImgs.forEach((im) => { if (im !== old && im !== prodImgs[i]) im.style.opacity = '0'; });
    old.style.zIndex = '1';
    prodImgs[i].style.zIndex = '2';
    prodImgs[i].style.opacity = '1';
    setTimeout(() => { if (mCur === i) old.style.opacity = '0'; }, prefersReducedMotion ? 0 : 600);
    mInfo.forEach((el) => el.classList.add('is-swapping'));
    setTimeout(() => { fillMethod(i); mInfo.forEach((el) => el.classList.remove('is-swapping')); }, prefersReducedMotion ? 0 : 200);
  }

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

  const greeting = () => {
    const lead = state.leadName.trim();
    return lead ? `Olá, Juan! ☕ Meu nome é ${lead}.` : 'Olá, Juan! ☕';
  };
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

    $('#sim-custom-cta').href = waLink([greeting(), copy.intro, '', ...summaryLines(false), '', 'Podem me enviar uma proposta?'].join('\n'));
    const menuMsg = [greeting(), 'Gostaria de receber o *cardápio* com os planos e valores.', '', ...summaryLines(true)].join('\n');
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
    [() => state.leadName.trim().length >= 2, $('#sim-name-field'), 'Informe seu nome para podermos falar com você.'],
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
      ['Nome', state.leadName.trim() || 'A informar'],
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

  $('#lead-name').addEventListener('input', (e) => {
    state.leadName = e.target.value;
    if (state.leadName.trim().length >= 2) clearError($('#sim-name-field'));
    renderSim();
  });

  const buildMessage = () => {
    const lines = [greeting(), `Gostaria de agendar uma *Degustação Exclusiva* na cafeteria.`, '', ...summaryLines(true)];
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
  waFloat.href = waLink('Olá, Juan! ☕ Vim pelo site da Pielini Coffee e tenho uma dúvida.');

  renderSim();
  renderCup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderCup);
})();
