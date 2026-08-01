function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  initDropdowns();
  initNavbarPill();
  initNavbarAutoHide();
  initMobileMenu();
  initContactForm();
  initFormMasks();
  initCustomSelects();
  initHowTimeline();
  initHeroSequence();
  initFaq();
  initAutoReveal();
  initTextReveal();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal]');
  const countEls = document.querySelectorAll('[data-count-to]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    countEls.forEach((el) => setCount(el, Number(el.dataset.countTo)));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  if (countEls.length) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    countEls.forEach((el) => countObserver.observe(el));
  }

  function animateCount(el) {
    const target = Number(el.dataset.countTo);
    const duration = 1500;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(el, Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function setCount(el, value) {
    el.textContent = value + (el.dataset.suffix || '');
  }
});

function initDropdowns() {
  document.querySelectorAll('.navbar__item').forEach((item) => {
    const trigger = item.querySelector('.navbar__dropdown-trigger');
    const navbar = item.closest('.navbar');
    const dropdown = navbar ? navbar.querySelector('.navbar__dropdown') : null;
    if (!trigger) return;

    let pinned = false;
    let closeTimer = null;

    function positionDropdown() {
      if (!dropdown || !navbar) return;
      const triggerRect = trigger.getBoundingClientRect();
      const navbarRect = navbar.getBoundingClientRect();
      const dropdownWidth = dropdown.getBoundingClientRect().width;
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      dropdown.style.left = triggerCenter - navbarRect.left - dropdownWidth / 2 + 'px';
    }

    function show() {
      clearTimeout(closeTimer);
      positionDropdown();
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function hide() {
      clearTimeout(closeTimer);
      pinned = false;
      item.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function scheduleHide() {
      if (pinned) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(hide, 150);
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (pinned) {
        hide();
      } else {
        pinned = true;
        show();
      }
    });

    item.addEventListener('mouseenter', show);
    item.addEventListener('mouseleave', scheduleHide);

    if (dropdown) {
      dropdown.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      dropdown.addEventListener('mouseleave', scheduleHide);
    }

    trigger.addEventListener('focus', show);

    window.addEventListener('resize', () => {
      if (item.classList.contains('is-open')) positionDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!item.contains(e.target) && !(dropdown && dropdown.contains(e.target))) hide();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });

    window.addEventListener('scroll', hide, { passive: true });
  });
}

function initNavbarPill() {
  document.querySelectorAll('.navbar__links').forEach((nav) => {
    const links = Array.from(nav.querySelectorAll('.navbar__link'));
    if (!links.length) return;

    const pill = document.createElement('span');
    pill.className = 'navbar__pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.prepend(pill);

    const paddingX = 18;

    function movePillTo(el) {
      if (!el) {
        pill.style.opacity = '0';
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      pill.style.width = `${elRect.width + paddingX * 2}px`;
      pill.style.transform = `translate(${elRect.left - navRect.left - paddingX}px, -50%)`;
      pill.style.opacity = '1';
    }

    const activeLink = nav.querySelector('.navbar__link--active');

    // Posiciona sem animação no carregamento da página, depois reativa a transição.
    pill.style.transition = 'none';
    movePillTo(activeLink);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pill.style.transition = '';
      });
    });

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => movePillTo(link));
    });

    nav.addEventListener('mouseleave', () => movePillTo(activeLink));
    window.addEventListener('resize', () => movePillTo(nav.matches(':hover') ? nav.querySelector('.navbar__link:hover') : activeLink));
  });
}

function initNavbarAutoHide() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Aplica o efeito exclusivamente na página Home (.hero)
  const isHome = !!document.querySelector('.hero') || window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
  if (!isHome) {
    navbar.classList.remove('navbar--hidden');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let lastScrollY = Math.max(0, window.scrollY);

  function closeOpenDropdown() {
    const openItem = navbar.querySelector('.navbar__item.is-open');
    if (!openItem) return;
    openItem.classList.remove('is-open');
    const trigger = openItem.querySelector('.navbar__dropdown-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function onScroll() {
    const currentScrollY = Math.max(0, window.scrollY);

    if (currentScrollY > 20 && currentScrollY > lastScrollY) {
      // Rolou para baixo: oculta a navbar na Home
      navbar.classList.add('navbar--hidden');
      closeOpenDropdown();
    } else if (currentScrollY < lastScrollY || currentScrollY <= 20) {
      // Rolou para cima ou está no topo: reexibe a navbar na Home
      navbar.classList.remove('navbar--hidden');
    }

    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const whatsappNumber = '5511913766579';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const lines = [
      'Solicitação de atendimento — site MRI Service',
      `Nome: ${data.get('nome') || '-'}`,
      `Cargo/Função: ${data.get('cargo') || '-'}`,
      `E-mail: ${data.get('email') || '-'}`,
      `WhatsApp/Telefone: ${data.get('telefone') || '-'}`,
      `Empresa: ${data.get('empresa') || '-'}`,
      `CNPJ: ${data.get('cnpj') || '-'}`,
      `Cidade/Estado: ${data.get('cidade') || '-'}/${data.get('estado') || '-'}`,
      `Equipamento: ${data.get('equipamento') || '-'}`,
      `Nível de urgência: ${data.get('urgencia') || '-'}`,
      `Descrição: ${data.get('mensagem') || '-'}`,
    ];

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener');

    if (typeof supabaseClient !== 'undefined') {
      supabaseClient.from('contact_submissions').insert({
        nome: data.get('nome') || null,
        cargo: data.get('cargo') || null,
        email: data.get('email') || null,
        telefone: data.get('telefone') || null,
        empresa: data.get('empresa') || null,
        cnpj: data.get('cnpj') || null,
        cidade: data.get('cidade') || null,
        estado: data.get('estado') || null,
        equipamento: data.get('equipamento') || null,
        urgencia: data.get('urgencia') || null,
        mensagem: data.get('mensagem') || null,
      }).then(({ error }) => {
        if (error) console.error('Falha ao salvar contato no Supabase:', error);
      });
    }
  });
}

function filterInputChars(el, filterFn) {
  el.addEventListener('input', () => {
    const cursor = el.selectionStart;
    const before = el.value;
    const after = filterFn(before);
    if (after !== before) {
      const removed = before.length - after.length;
      el.value = after;
      const pos = Math.max(0, cursor - removed);
      el.setSelectionRange(pos, pos);
    }
  });
}

function maskPhoneBR(value) {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  const hasCC = digits.length > 11;
  const cc = hasCC ? digits.slice(0, 2) : '';
  const rest = hasCC ? digits.slice(2) : digits;
  const ddd = rest.slice(0, 2);
  const local = rest.slice(2);
  const splitAt = local.length > 8 ? 5 : 4;
  const localFormatted = local.length > splitAt
    ? `${local.slice(0, splitAt)}-${local.slice(splitAt, splitAt + 4)}`
    : local;

  let out = '';
  if (cc) out += `+${cc} `;
  if (ddd) out += ddd;
  if (localFormatted) out += (ddd ? ' ' : '') + localFormatted;
  return out;
}

function maskCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '.' + digits.slice(2, 5);
  if (digits.length > 5) out += '.' + digits.slice(5, 8);
  if (digits.length > 8) out += '/' + digits.slice(8, 12);
  if (digits.length > 12) out += '-' + digits.slice(12, 14);
  return out;
}

function initFormMasks() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const lettersOnly = (value) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '');

  [form.querySelector('#cf-nome'), form.querySelector('#cf-cidade')].forEach((el) => {
    if (el) filterInputChars(el, lettersOnly);
  });

  const email = form.querySelector('#cf-email');
  if (email) filterInputChars(email, (value) => value.replace(/\s/g, ''));

  const telefone = form.querySelector('#cf-telefone');
  if (telefone) {
    telefone.setAttribute('inputmode', 'tel');
    telefone.setAttribute('maxlength', '19');
    telefone.addEventListener('input', () => {
      telefone.value = maskPhoneBR(telefone.value);
    });
  }

  const cnpj = form.querySelector('#cf-cnpj');
  if (cnpj) {
    cnpj.setAttribute('inputmode', 'numeric');
    cnpj.setAttribute('maxlength', '18');
    cnpj.addEventListener('input', () => {
      cnpj.value = maskCNPJ(cnpj.value);
    });
  }
}

function initCustomSelects() {
  document.querySelectorAll('[data-custom-select]').forEach((wrap) => {
    const trigger = wrap.querySelector('.contact-form__select-trigger');
    const valueEl = wrap.querySelector('.contact-form__select-value');
    const hiddenInput = wrap.querySelector('input[type="hidden"]');
    const options = wrap.querySelectorAll('.contact-form__select-option');

    function close() {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function open() {
      document.querySelectorAll('[data-custom-select].is-open').forEach((other) => {
        if (other !== wrap) other.classList.remove('is-open');
      });
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      wrap.classList.contains('is-open') ? close() : open();
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        options.forEach((o) => o.removeAttribute('aria-selected'));
        option.setAttribute('aria-selected', 'true');
        valueEl.textContent = option.textContent;
        if (hiddenInput) hiddenInput.value = option.dataset.value;
        close();
        trigger.focus();
      });
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  });
}

function initHowTimeline() {
  const scrollEls = document.querySelectorAll('.how__scroll');
  scrollEls.forEach((scrollEl) => initSingleHowTimeline(scrollEl));
}

function initSingleHowTimeline(scrollEl) {
  if (!scrollEl) return;

  const cards = [...scrollEl.querySelectorAll('.how__card')];
  const fill = scrollEl.querySelector('.how__progress-fill');
  const nodes = [...scrollEl.querySelectorAll('.how__node')];
  const stepCount = cards.length;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyState(activeIndex, lineProgress) {
    cards.forEach((card, i) => card.classList.toggle('how__card--active', i === activeIndex));
    nodes.forEach((node, idx) => {
      const nodeCenterPercent = 12.5 + idx * 25;
      const isCurrent = idx === activeIndex;
      const isPassed = lineProgress >= nodeCenterPercent - 1;
      node.classList.toggle('how__node--current', isCurrent);
      node.classList.toggle('how__node--passed', isPassed && !isCurrent);
    });
    if (fill) fill.style.width = Math.max(0, Math.min(75, lineProgress - 12.5)) + '%';
  }

  function scrollToIndex(index) {
    const totalScrollableDistance = scrollEl.offsetHeight - window.innerHeight;
    if (totalScrollableDistance <= 0) return;
    const stepFraction = (index + 0.1) / stepCount;
    const targetY = scrollEl.getBoundingClientRect().top + window.scrollY + stepFraction * totalScrollableDistance;
    window.scrollTo({ top: targetY, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  cards.forEach((card, i) => card.addEventListener('click', () => scrollToIndex(i)));
  nodes.forEach((node, i) => node.addEventListener('click', () => scrollToIndex(i)));

  if (reduceMotion) {
    applyState(0, 12.5);
    return;
  }

  let activeIndex = -1;

  function update() {
    const rect = scrollEl.getBoundingClientRect();
    const totalScrollableDistance = scrollEl.offsetHeight - window.innerHeight;
    if (totalScrollableDistance <= 0) return;

    const scrolled = -rect.top;
    const progressFraction = Math.max(0, Math.min(1, scrolled / totalScrollableDistance));
    const lineProgress = 12.5 + progressFraction * 75;
    const newIndex = Math.min(stepCount - 1, Math.floor(progressFraction * stepCount));

    if (newIndex !== activeIndex) activeIndex = newIndex;
    applyState(activeIndex, lineProgress);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

const HERO_SEQUENCE_TOTAL = 300;
const HERO_SEQUENCE_FIRST = 1;
let heroSequenceFrames = null;

function getHeroSequenceFrames() {
  if (heroSequenceFrames) return heroSequenceFrames;
  heroSequenceFrames = new Array(HERO_SEQUENCE_TOTAL).fill(null);
  for (let i = HERO_SEQUENCE_FIRST; i <= HERO_SEQUENCE_TOTAL; i++) {
    const img = new Image();
    img.src = 'assets/hero-sequence/ezgif-frame-' + String(i).padStart(3, '0') + '.jpg';
    heroSequenceFrames[i - 1] = img;
  }
  return heroSequenceFrames;
}

function nearestLoadedFrame(frames, index) {
  let i = index;
  while (i > HERO_SEQUENCE_FIRST && (!frames[i - 1] || !frames[i - 1].complete)) i--;
  return i;
}

function frameForProgress(progress) {
  return HERO_SEQUENCE_FIRST + Math.round(progress * (HERO_SEQUENCE_TOTAL - HERO_SEQUENCE_FIRST));
}

function wrapWordsForReveal(root, variant) {
  const words = [];
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) return;
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (part.trim() === '') {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'word-reveal word-reveal--' + variant;
          span.textContent = part;
          words.push(span);
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') return;
      Array.from(node.childNodes).forEach(processNode);
    }
  }
  Array.from(root.childNodes).forEach(processNode);
  words.forEach((span, i) => span.style.setProperty('--word-i', i));
  return words;
}

function initFaq() {
  document.querySelectorAll('.faq__item').forEach((item) => {
    const question = item.querySelector('.faq__question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      question.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

const CARD_SELECTOR = [
  '.hero__card',
  '.stakes__topic',
  '.solutions__card',
  '.solution-card',
  '.how__card',
  '.protection__topic',
  '.plans__card',
  '.numbers__stat',
  '.audience__card',
  '.audience__media',
  '.page-hero__card',
  '.page-hero__topic-card',
  '.page-services__card',
  '.faq__item',
  '.contact-info__item',
  '.parts-card',
  '.banner-hero__card',
  '.banner-hero__stat',
  '.value-card',
  '.team-card',
  '.legal-box',
  '.detail-specs__card',
  '.contact-form__card',
  '.hero__card-info',
  '.part-detail-cta__content',
  '.legal-content > h2',
  '.legal-content > p',
  '.legal-content > ul > li',
].join(', ');

const AUTO_REVEAL_SELECTOR = CARD_SELECTOR + ', .btn, button:not(.navbar__dropdown-trigger):not(.navbar__toggle), .hero__stars, .page-hero__stars, .stakes__eyebrow, .solutions__eyebrow, .how__eyebrow, .part-detail-section__eyebrow';

function initAutoReveal() {
  const els = document.querySelectorAll(AUTO_REVEAL_SELECTOR);

  els.forEach((el) => {
    if (el.closest('.navbar')) return;

    if (!el.hasAttribute('data-reveal')) {
      el.setAttribute('data-reveal', '');
    }

    if (!el.style.getPropertyValue('--reveal-index')) {
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.matches(AUTO_REVEAL_SELECTOR));
        const idx = siblings.indexOf(el);
        if (idx > 0) el.style.setProperty('--reveal-index', String(Math.min(idx, 6)));
      }
    }
  });
}

function initTextReveal() {
  const textSelectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
    '.hero__title', '.hero__description', '.page-hero__title', '.page-hero__description',
    '.stakes__eyebrow', '.stakes__title', '.stakes__description',
    '.solutions__eyebrow', '.solutions__title', '.solutions__description',
    '.how__eyebrow', '.how__title', '.how__description',
    '.protection__eyebrow', '.protection__title', '.protection__description',
    '.part-detail-section__eyebrow', '.part-detail-section__title', '.part-detail-section__description',
    '.part-detail-cta__title', '.part-detail-cta__description',
    '.site-footer__title', '.site-footer__brand-text', '.site-footer__contact-text'
  ].join(', ');

  const targets = document.querySelectorAll(textSelectors);

  targets.forEach((el) => {
    if (el.closest('.navbar')) return;
    if (!el.textContent.trim()) return;
    if (!el.hasAttribute('data-reveal')) {
      el.setAttribute('data-reveal', '');
    }
  });
}

function initHeroSequence() {
  const trackEl = document.getElementById('hero-track');
  const imgEl = document.getElementById('heroSequenceImg');
  const stageIntro = document.getElementById('heroStageIntro');
  const stageStakes = document.getElementById('heroStageStakes');
  const footerEl = document.querySelector('.hero__footer');
  if (!trackEl || !imgEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileLayout = () => window.matchMedia('(max-width: 1024px)').matches;
  const frames = getHeroSequenceFrames();
  let current = HERO_SEQUENCE_FIRST;
  let targetFrame = HERO_SEQUENCE_FIRST;
  let currentFrame = HERO_SEQUENCE_FIRST;
  const FRAME_SMOOTHING = 0.12;
  let ticking = false;

  const ACT1_FADE_END = 0.19;
  const ACT2_FADE_START = 0.35;
  const ACT2_CONTAINER_END = 0.39;
  const ACT2_OUT_START = 0.88;

  function render() {
    ticking = false;

    if (isMobileLayout()) {
      if (footerEl) footerEl.style.opacity = '';
      if (stageIntro) {
        stageIntro.style.opacity = '';
        stageIntro.style.pointerEvents = '';
      }
      if (stageStakes) {
        stageStakes.style.opacity = '';
        stageStakes.style.pointerEvents = '';
      }
      return;
    }

    const rect = trackEl.getBoundingClientRect();
    const totalScrollableDistance = trackEl.offsetHeight - window.innerHeight;
    const progress = totalScrollableDistance > 0
      ? Math.max(0, Math.min(1, -rect.top / totalScrollableDistance))
      : 0;

    if (!reduceMotion) {
      targetFrame = frameForProgress(progress);
    }

    const act1Opacity = Math.max(0, 1 - progress / ACT1_FADE_END);
    let act2Opacity;
    if (progress < ACT2_FADE_START) {
      act2Opacity = 0;
    } else if (progress < ACT2_CONTAINER_END) {
      act2Opacity = (progress - ACT2_FADE_START) / (ACT2_CONTAINER_END - ACT2_FADE_START);
    } else if (progress < ACT2_OUT_START) {
      act2Opacity = 1;
    } else {
      act2Opacity = Math.max(0, 1 - (progress - ACT2_OUT_START) / (1 - ACT2_OUT_START));
    }

    if (stageIntro) {
      stageIntro.style.opacity = String(act1Opacity);
      stageIntro.style.pointerEvents = act1Opacity < 0.05 ? 'none' : 'auto';
    }
    if (stageStakes) {
      stageStakes.style.opacity = String(act2Opacity);
      stageStakes.style.pointerEvents = act2Opacity < 0.05 ? 'none' : 'auto';
    }
    if (footerEl) {
      footerEl.style.opacity = String(Math.max(0, 1 - progress / 0.12));
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  function animateFrame() {
    if (!reduceMotion && !isMobileLayout()) {
      currentFrame += (targetFrame - currentFrame) * FRAME_SMOOTHING;
      const displayFrame = nearestLoadedFrame(frames, Math.round(currentFrame));
      if (displayFrame !== current) {
        current = displayFrame;
        imgEl.src = frames[displayFrame - 1].src;
      }
    }
    requestAnimationFrame(animateFrame);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', render);
  render();
  requestAnimationFrame(animateFrame);
}

function initMobileMenu() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  if (navbar.querySelector('.navbar__hamburger')) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'navbar__hamburger';
  toggleBtn.setAttribute('aria-label', 'Abrir menu de navegação');
  toggleBtn.innerHTML = `
    <span class="hamburger__bar"></span>
    <span class="hamburger__bar"></span>
    <span class="hamburger__bar"></span>
  `;
  navbar.appendChild(toggleBtn);

  const drawer = document.createElement('div');
  drawer.className = 'mobile-drawer';
  drawer.id = 'mobileDrawer';
  drawer.innerHTML = `
    <div class="mobile-drawer__overlay" id="mobileDrawerOverlay"></div>
    <div class="mobile-drawer__content">
      <div class="mobile-drawer__header">
        <a href="index.html" class="mobile-drawer__logo">
          <img src="assets/logo.png" alt="MRIservice">
        </a>
        <button type="button" class="mobile-drawer__close" id="mobileDrawerClose" aria-label="Fechar menu">&times;</button>
      </div>

      <nav class="mobile-drawer__nav">
        <a href="index.html" class="mobile-drawer__link">Home</a>
        <a href="sobre.html" class="mobile-drawer__link">Sobre</a>

        <div class="mobile-drawer__accordion">
          <button type="button" class="mobile-drawer__accordion-trigger">
            Soluções
            <svg class="mobile-drawer__chevron" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1.5 1.5L6 6l4.5-4.5"></path>
            </svg>
          </button>
          <div class="mobile-drawer__accordion-panel">
            <a href="de-icing.html" class="mobile-drawer__sublink">De-Icing</a>
            <a href="ramp-up.html" class="mobile-drawer__sublink">Ramp Up</a>
            <a href="cooling-down.html" class="mobile-drawer__sublink">Cooling Down</a>
            <a href="safemonitor.html" class="mobile-drawer__sublink">SafeMonitor</a>
            <a href="reparo-de-modulos.html" class="mobile-drawer__sublink">Reparo de Módulos</a>
            <a href="reparo-de-bobina.html" class="mobile-drawer__sublink">Reparo de Bobina</a>
            <a href="manutencao-preventiva-e-corretiva.html" class="mobile-drawer__sublink">Manutenção Preventiva</a>
            <a href="criogenia-e-monitoramento.html" class="mobile-drawer__sublink">Criogenia e Monitoramento</a>
            <a href="pecas-e-componentes.html" class="mobile-drawer__sublink">Peças e Componentes</a>
          </div>
        </div>

        <a href="safemonitor.html" class="mobile-drawer__link">WebMonitor</a>
        <a href="contato.html" class="mobile-drawer__link">Contato</a>
      </nav>

      <div class="mobile-drawer__footer">
        <a href="https://wa.me/5511913766579" target="_blank" rel="noopener" class="btn btn--primary mobile-drawer__cta">
          Fale no WhatsApp
          <img src="assets/icone-whatsapp-solid.svg" alt="" class="btn__icon--whatsapp">
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  const overlay = drawer.querySelector('#mobileDrawerOverlay');
  const closeBtn = drawer.querySelector('#mobileDrawerClose');
  const accordionTrigger = drawer.querySelector('.mobile-drawer__accordion-trigger');
  const accordionPanel = drawer.querySelector('.mobile-drawer__accordion-panel');

  function openMenu() {
    drawer.classList.add('is-open');
    toggleBtn.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    drawer.classList.remove('is-open');
    toggleBtn.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', () => {
    if (drawer.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  if (accordionTrigger && accordionPanel) {
    accordionTrigger.addEventListener('click', () => {
      const isOpen = accordionTrigger.classList.toggle('is-open');
      accordionPanel.style.maxHeight = isOpen ? accordionPanel.scrollHeight + 'px' : '0px';
    });
  }

  drawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

