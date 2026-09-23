// Cache Busting: Sistema automático universal con Git Hooks
let WA = CATALOG.settings?.whatsapp || '51929688960';
let shopCategories = CATALOG.categories;


const palettes = {
  netflix:["#111111","#b50000"],prime:["#00a8e0","#005f8f"],
  disney:["#1a3fcc","#0d2080"],hbo:["#7c2be8","#3d0e80"],
  spotify_mes:["#1db954","#117a34"],spotify_3m:["#17a348","#0d6b2e"],
  spotify_año:["#128f3c","#075c22"],youtube:["#ff2020","#b00000"],
  office365:["#e04a10","#902000"],office2024:["#d83b01","#8b1a00"],
  office2021:["#c2410c","#7c2d00"],windows11:["#0084e8","#004490"],
  windows10:["#0078d4","#005a9e"],canva_mes:["#0ac4cc","#067880"],
  canva_año:["#0099a8","#045560"],crunchyroll:["#f47521","#904008"],
  paramount:["#1070ff","#003cb0"],adobe:["#ff2020","#900000"],
  tidal_ind:["#000000","#1a1a1a"],tidal_fam:["#1a1a2e","#0d0d1a"],
  deezer:["#a238ff","#6b0fc4"],appletv:["#1c1c1e","#3a3a3c"],
  perplexity_mes:["#1c6eff","#0044cc"],perplexity_año:["#0033cc","#001a8b"],
  nitropdf:["#e8340a","#a02000"],capcut:["#000000","#222222"],
  claudeai:["#cc785c","#8b4513"],linkedin:["#0077b5","#004f7c"],
  eset_nod:["#7acc44","#3d7020"],eset_is:["#4a9e20","#1e5800"],
  adobe_cc_mes:["#ff2020","#900000"],adobe_cc_6m:["#e00000","#700000"],
  adobe_cc_año:["#c00000","#500000"],iptv:["#6c3af5","#3a0db0"],
  universalplus:["#1a1a1a","#3a3a3c"],oleadatv:["#0a84ff","#0055cc"],
  gemini:["#4285f4","#1a56c4"],vix:["#e8001c","#9a0000"],
  directv:["#0070c0","#003d7a"],
};
const ICON_LIB = {
  play:    '<polygon points="5 3 19 12 5 21 5 3"/>',
  music:   '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  code:    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  palette: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 20c-4.5 0-8-3.13-8-7h16c0 3.87-3.5 7-8 7z"/>',
  layers:  '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  tv:      '<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  zap:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  star:    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart:   '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  globe:   '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  shield:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  cpu:     '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  book:    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  camera:  '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
};

function renderIconSvg(key, size = 13) {
  const paths = ICON_LIB[key];
  if (!paths) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${paths}</svg>`;
}

function getColors(palette) {
  return palettes[palette] || ['#7c5af3','#2dd4bf'];
}

function normalizeStorageImageUrl(url) { return String(url || '').trim(); }

function getBannerUrl(p) {
  if (p.banner_url) return normalizeStorageImageUrl(p.banner_url);
  if (p.palette) return `banners/${p.palette}_banner.png`;
  return '';
}

function getPriorityCardImageLimit() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  if (width <= 480) return 6;
  if (width <= 900) return 8;
  return 10;
}

function getCardImageAttrs(index) {
  const isPriority = index < getPriorityCardImageLimit();
  const fetchPriority = index < Math.min(4, getPriorityCardImageLimit()) ? 'high' : 'auto';
  return `loading="${isPriority ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${fetchPriority}"`;
}

function preloadImage(url, fetchPriority = 'auto') {
  if (!url) return null;
  const img = new Image();
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = fetchPriority;
  img.src = url;
  return img;
}

function getBannerStyle(p) {
  const url = getBannerUrl(p);
  if (url) {
    return `background:url('${url}') center/cover no-repeat`;
  }
  const [c1, c2] = getColors(p.palette);
  return `background:linear-gradient(135deg,${c1},${c2})`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}

const gridEl  = document.getElementById('grid');
const countEl = document.getElementById('countNum');
let allProducts  = [];
let activeFilter = 'all';
let searchQuery  = '';
const DEFAULT_MAINTENANCE_MESSAGE = 'Estamos realizando mejoras en la tienda. Regresa en unos minutos.';

function showMaintenance(message) {
  const screen = document.getElementById('maintenanceScreen');
  const messageEl = document.getElementById('maintenanceMessage');
  if (messageEl) messageEl.textContent = message || DEFAULT_MAINTENANCE_MESSAGE;
  if (screen) screen.classList.add('show');
  gridEl.innerHTML = '';
  countEl.textContent = '0';
}

function hideMaintenance() {
  const screen = document.getElementById('maintenanceScreen');
  if (screen) screen.classList.remove('show');
}

function showSkeletons(n) {
  gridEl.innerHTML = Array(n).fill(`
    <div class="skeleton">
      <div class="skeleton-banner"></div>
      <div class="skeleton-body">
        <div class="skeleton-line med"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line short" style="margin-top:8px"></div>
      </div>
    </div>
  `).join('');
}

function renderAll() {
  const q = searchQuery.toLowerCase().trim();
  const list = allProducts.filter(p => {
    const mf = activeFilter === 'all' || (activeFilter === 'ofertas' ? p.is_oferta : p.filter === activeFilter);
    const ms = !q ||
      (p.name   || '').toLowerCase().includes(q) ||
      (p.brand  || '').toLowerCase().includes(q) ||
      (p.sub    || '').toLowerCase().includes(q);
    return p.active !== false && mf && ms;
  });

  if (activeFilter !== 'all') {
    list.sort((a,b) => {
      const aCat = a.cat_sort_order ?? 0;
      const bCat = b.cat_sort_order ?? 0;
      if (aCat !== bCat) return aCat - bCat;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }

  gridEl.innerHTML = '';
  countEl.textContent = list.length;

  if (!list.length) {
    gridEl.innerHTML = `<div class="empty show">
      <div class="empty-icon">🔍</div>
      <h3>Sin resultados</h3>
      <p>Intenta con otra palabra.</p>
    </div>`;
    return;
  }

  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.style.transition = `opacity .45s cubic-bezier(.16,1,.3,1) ${i * 55}ms, transform .45s cubic-bezier(.16,1,.3,1) ${i * 55}ms`;
    card.style.transform = 'translateY(20px) scale(.97)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'none';
    }));

    const bannerUrl = getBannerUrl(p);
    const bannerStyle = bannerUrl ? '' : getBannerStyle(p);
    const bannerImg = bannerUrl
      ? `<img class="card-banner-img" src="${escHtml(bannerUrl)}" alt="" ${getCardImageAttrs(i)}>`
      : '';
    const safeName = escHtml(p.name);
    const safeType = escHtml(p.type);
    const safeDur  = escHtml(p.duration);

    const discountBadge = p.original_pen && p.pen < p.original_pen
  ? `<div class="card-discount-badge">−${Math.round((1 - p.pen / p.original_pen) * 100)}%</div>`
  : '';

    const outOfStockOverlay = p.out_of_stock
  ? `<div class="card-outofstock-overlay">
      <div class="card-outofstock-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>Agotado</span>
      </div>
    </div>`
  : '';

card.innerHTML = `
  <div class="card-banner" style="${bannerStyle}">${bannerImg}${discountBadge}${outOfStockOverlay}</div>
      <div class="card-body ${p.out_of_stock ? 'disabled' : ''}">
        <div class="card-name">${safeName}</div>
        <div class="card-desc">
          <span>${safeType}</span>
          <span class="card-desc-sep">·</span>
          <span>${safeDur}</span>
        </div>
        <div class="card-footer">
          <div class="card-price-block">
            <div class="card-price-label">Precio</div>
            ${p.original_pen ? `<div class="card-strikethrough" style="font-size:.72rem;text-decoration:line-through;line-height:1;">S/ ${Number(p.original_pen).toFixed(2)}</div>` : ''}
            ${p.pen==null?'<a class="price-signin" href="/cuenta">Inicia sesión para ver tu precio</a>':`<div class="card-price"><span class="card-price-cur">S/ </span>${Number(p.pen).toFixed(2)}</div>`}
          </div>
          <button class="card-btn" ${p.out_of_stock ? 'disabled' : ''}>Ver más</button>
        </div>
      </div>
    `;
    const purchases=document.createElement('div');purchases.className='card-purchase-options';purchases.setAttribute('data-commerce','');
    const canBuy=['manual','automatic'].includes(p.checkout_mode)&&!p.out_of_stock;
    purchases.innerHTML=`<a class="buy-with-balance" href="/cuenta?comprar=${encodeURIComponent(p.id)}" ${canBuy?'':'aria-disabled="true" tabindex="-1"'}>COMPRAR ACÁ</a><a class="buy-whatsapp-small" target="_blank" rel="noopener noreferrer" href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero comprar '+p.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.2-1.36A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.13l-.3-.18-3.07.8.82-2.99-.2-.31A8 8 0 1 1 12 20zm4.38-5.99c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.61.77-.75.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.57.24 1.02.39 1.37.5.58.18 1.1.15 1.52.09.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z"/></svg>COMPRAR POR WHATSAPP</a>`;
    purchases.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[aria-disabled=true]'))e.preventDefault();});card.querySelector('.card-body').appendChild(purchases);
    card.addEventListener('click', () => {
      if (p.out_of_stock) {
        showOutOfStockModal();
      } else {
        openModal(p);
      }
    });
    // Precargar banner en hover (desktop) o al primer toque (movil)
    let preloadUrl = null;
    if (bannerUrl) preloadUrl = bannerUrl;
    if (preloadUrl) {
      const preload = function() { preloadImage(preloadUrl, 'high'); };
      card.addEventListener('mouseenter', preload, { once: true });
      card.addEventListener('touchstart', preload, { once: true, passive: true });
    }
    card.addEventListener('keydown', e => {
      if(e.target!==card)return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (p.out_of_stock) {
          showOutOfStockModal();
        } else {
          openModal(p);
        }
      }
    });
    gridEl.appendChild(card);
  });
}

document.getElementById('filters').addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.f;
  renderAll();
});

function updateFiltersScrollHint() {
  const filtersEl = document.getElementById('filters');
  const section = filtersEl?.closest('.filters-section');
  if (!filtersEl || !section) return;

  const maxScroll = filtersEl.scrollWidth - filtersEl.clientWidth;
  const canScrollRight = maxScroll > 4 && filtersEl.scrollLeft < maxScroll - 4;
  section.classList.toggle('can-scroll-right', canScrollRight);
}

const filtersEl = document.getElementById('filters');
filtersEl?.addEventListener('scroll', updateFiltersScrollHint, { passive: true });
window.addEventListener('resize', updateFiltersScrollHint);
requestAnimationFrame(updateFiltersScrollHint);

const backdrop = document.getElementById('backdrop');

function slugify(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function openModal(p, updateURL = true) {
  // Actualizar URL
  const slug = slugify(p.name);
  if (updateURL) history.pushState({}, '', `?p=${slug}`);
  const mBanner = document.getElementById('mBanner');
  const modalEl = backdrop.querySelector('.modal');
  if (p.banner_url) {
    let bannerUrl = getBannerUrl(p);
    preloadImage(bannerUrl, 'high');
    const safeBannerUrl = String(bannerUrl).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const bannerOverlay = 'linear-gradient(90deg, rgba(8,8,20,.38) 0%, rgba(8,8,20,.2) 42%, rgba(8,8,20,0) 72%), linear-gradient(180deg, rgba(5,5,14,0) 42%, rgba(5,5,14,.62) 100%)';
    modalEl?.style.setProperty('--modal-bg-image', `url("${safeBannerUrl}")`);
    mBanner.style.backgroundImage = `${bannerOverlay}, url("${safeBannerUrl}")`;
    mBanner.style.backgroundSize = 'cover, cover, cover';
    mBanner.style.backgroundPosition = 'center, center, center';
  } else {
    modalEl?.style.removeProperty('--modal-bg-image');
    if (p.palette) {
      preloadImage(getBannerUrl(p), 'high');
      modalEl?.style.setProperty('--modal-bg-image', `url("banners/${p.palette}_banner.png")`);
    }
    mBanner.style.cssText = getBannerStyle(p) + ';';
    mBanner.style.backgroundSize = 'cover';
    mBanner.style.backgroundPosition = 'center';
  }

  document.getElementById('mBrand').textContent = p.brand || '';
  document.getElementById('mTitle').textContent = p.name  || '';
  document.getElementById('mSub').textContent   = p.sub   || '';
  const descriptionEl = document.getElementById('mDescription');
  if (descriptionEl) { descriptionEl.textContent = p.description || ''; descriptionEl.hidden = !p.description; }

  document.getElementById('mPriceHero').innerHTML = `
  <div style="flex:1">
    ${p.original_pen ? `<div class="modal-price-was">S/ ${Number(p.original_pen).toFixed(2)}</div>` : ''}
    ${p.pen==null?'<a class="price-signin" href="/cuenta">Inicia sesión para ver tu precio</a>':`<div class="modal-price-big"><sup style="font-size:1rem;vertical-align:super;font-weight:700;">S/</sup>${Number(p.pen).toFixed(2)}</div>`}
    <div class="modal-price-period">Soles peruanos · ${escHtml(p.duration)}</div>
  </div>
  <div class="modal-type-badge" style="
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.18);
    border-radius:10px;
    padding:10px 14px;
    display:flex;
    align-items:center;
    justify-content:center;
    min-width:100px;
    text-align:center;
    font-size:.72rem;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:rgba(255,255,255,.9);
    line-height:1.4;
    align-self:center;
  ">${escHtml(p.type)}</div>
`;

  const filterLabel = shopCategories.find(c => c.slug === p.filter)?.name || p.filter || '';
  document.getElementById('mInfoGrid').innerHTML = `
    <div class="info-cell">
      <div class="info-cell-label">Duración</div>
      <div class="info-cell-val">${escHtml(p.duration)}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Modalidad</div>
      <div class="info-cell-val">${escHtml(filterLabel)}</div>
    </div>
  `;

  const features = Array.isArray(p.features) ? p.features : [];
  document.getElementById('mFeatures').innerHTML = features.map(f => `
    <div class="feature-item">
      <div class="feature-check">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5,6 4.5,9 10.5,3"/>
        </svg>
      </div>
      ${escHtml(f)}
    </div>
  `).join('');

  const noteEl = document.getElementById('mNote');
if (p.note && p.note.trim()) {
  noteEl.innerHTML = `<strong>📌 Nota:</strong> ${escHtml(p.note)}`;
  noteEl.style.display = 'block';
} else {
  noteEl.style.display = 'none';
}

  const msg = encodeURIComponent(
    `Hola! Quiero comprar:\n\n🎯 *${p.name}*\n📦 ${p.type} · ${p.duration}\n${p.pen==null?'Quisiera consultar el precio.':'💰 S/ '+Number(p.pen).toFixed(2)+' soles'}\n\n¿Está disponible? ¿Cómo es el proceso de pago?`
  );
  document.getElementById('mWA').href = `https://wa.me/${WA}?text=${msg}`;
  const directBuy=document.getElementById('mBuyHere');
  if(directBuy){const enabled=['manual','automatic'].includes(p.checkout_mode)&&!p.out_of_stock;directBuy.href='/cuenta?comprar='+encodeURIComponent(p.id);directBuy.setAttribute('aria-disabled',String(!enabled));directBuy.title=enabled?(p.checkout_mode==='automatic'?'Compra con saldo y entrega automática':'Compra con saldo y atención manual'):'Compra con saldo no disponible para este producto';directBuy.onclick=e=>{if(!enabled)e.preventDefault();};}

  backdrop.classList.add('open');
  document.querySelector('.wa-float').style.display = 'none';
  document.getElementById('scrollTop').style.display = 'none';
  document.documentElement.style.overflow = 'hidden';
  document.getElementById('mClose').focus();
}

function closeModal() {
  history.pushState({}, '', window.location.pathname);
  backdrop.classList.remove('open');
  document.querySelector('.wa-float').style.display = 'grid';
  document.getElementById('scrollTop').style.display = '';
  document.documentElement.style.overflow = '';
}

document.getElementById('mClose').addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Manejar el botón atrás del navegador
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('p') && backdrop.classList.contains('open')) {
    // Si no hay parámetro 'p' pero el modal está abierto, cerrarlo sin pushState
    backdrop.classList.remove('open');
    document.querySelector('.wa-float').style.display = 'grid';
    document.getElementById('scrollTop').style.display = '';
    document.documentElement.style.overflow = '';
  }
});

(function(){
  const btn  = document.querySelector('[data-theme-btn]');
  const icon = document.getElementById('themeIcon');
  const root = document.documentElement;
  let theme = 'dark';
  root.setAttribute('data-theme', theme);
  const sun  = `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`;
  const moon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  const upd  = () => { icon.innerHTML = theme === 'dark' ? sun : moon; };
  upd();
  btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    upd();
  });
})();
window.addEventListener('scroll', () => {
  document.getElementById('scrollTop').classList.toggle('show', window.scrollY > 400);
});
function applyCategories(data) {
  const CATEGORY_IMAGES = {
    all: 'logo/todos.png',
    todos: 'logo/todos.png',
    ofertas: 'logo/ofertas.png',
    streaming: 'logo/streaming.png',
    musica: 'logo/musica.png',
    music: 'logo/musica.png',
    licenciasysoftware: 'logo/licenciasysoftware.png',
    'licencias-y-software': 'logo/licenciasysoftware.png',
    software: 'logo/licenciasysoftware.png',
    disenoyeducacion: 'logo/diseñoyeducacion.png',
    'diseno-y-educacion': 'logo/diseñoyeducacion.png',
    diseñoyeducacion: 'logo/diseñoyeducacion.png',
    'diseño-y-educacion': 'logo/diseñoyeducacion.png',
    anime: 'logo/anime.png'
  };
  const normalizeCategoryKey = value => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'y')
    .replace(/[^a-z0-9]+/g, '');
  const getCategoryImage = cat => {
    let url = normalizeStorageImageUrl(cat.image_url);
    return url || CATEGORY_IMAGES[cat.slug] ||
      CATEGORY_IMAGES[normalizeCategoryKey(cat.slug)] ||
      CATEGORY_IMAGES[normalizeCategoryKey(cat.name)] ||
      'logo/todos.png';
  };
  const filtersEl = document.getElementById('filters');
  filtersEl.querySelectorAll('.filter-chip:not([data-f="all"]):not([data-f="ofertas"])').forEach(el => el.remove());
  const ofertasChip = filtersEl.querySelector('.filter-chip[data-f="ofertas"]');
  if (!ofertasChip) {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.dataset.f = 'ofertas';
    chip.innerHTML = `
      <span class="filter-chip-media">
        <img class="filter-chip-img" src="logo/ofertas.png" alt="" loading="eager">
      </span>
      <span class="filter-chip-label">Promos y Ofertas</span>
    `;
    const todosChip = filtersEl.querySelector('.filter-chip[data-f="all"]');
    todosChip.insertAdjacentElement('afterend', chip);
  }
  (data || []).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.dataset.f = cat.slug;
    btn.innerHTML = `
      <span class="filter-chip-media">
        <img class="filter-chip-img" src="${escHtml(getCategoryImage(cat))}" alt="" loading="lazy">
      </span>
      <span class="filter-chip-label">${escHtml(cat.name)}</span>
    `;
    filtersEl.appendChild(btn);
  });
  requestAnimationFrame(updateFiltersScrollHint);
}
let loadedRevision = null;
let loadedPrices = null;
let refreshing = false;
function applyCatalog(data) {
  shopCategories = data.categories;
  if (activeFilter !== 'all' && activeFilter !== 'ofertas' && !data.categories.some(c => c.slug === activeFilter)) activeFilter = 'all';
  applyCategories(data.categories);
  document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.f === activeFilter));
  allProducts = data.products.filter(p => p.active !== false);
  if (data.settings) { WA = data.settings.whatsapp; window.applyShopSettings(data.settings); }
  renderAll();
  loadedRevision = data.revision || 0;
  loadedPrices = JSON.stringify(data.products.map(p=>[p.id,p.pen,p.original_pen]));
  const slug = new URLSearchParams(location.search).get('p');
  const product = allProducts.find(p => slugify(p.name) === slug);
  if (product && !product.out_of_stock) openModal(product, false);
  else if (slug && backdrop.classList.contains('open')) closeModal();
}
async function refreshCatalog() {
  if (refreshing || location.protocol === 'file:') return;
  refreshing = true;
  try {
    const response = await fetch('/api/catalog', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.products) && Array.isArray(data.categories) && (data.revision !== loadedRevision || JSON.stringify(data.products.map(p=>[p.id,p.pen,p.original_pen])) !== loadedPrices)) applyCatalog(data);
  } catch (_) { /* La copia estática conserva el último catálogo guardado. */ }
  finally { refreshing = false; }
}
function loadAll() {
  applyCatalog(CATALOG);
  refreshCatalog();
}
window.addEventListener('focus', refreshCatalog);
setInterval(() => { if (document.visibilityState === 'visible') refreshCatalog(); }, 5000);
(function () {
  const heroLogo = document.querySelector('.hero-logo-text');
  const headerLogo = document.querySelector('.logo-mark');
  if (!heroLogo || !headerLogo) return;

  const headerH = document.querySelector('.header')?.offsetHeight || 110;

  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        headerLogo.classList.remove('logo-visible');
      } else {
        headerLogo.classList.add('logo-visible');
      }
    },
    {
      threshold: 0,
      rootMargin: `-${headerH}px 0px 0px 0px`
    }
  );

  obs.observe(heroLogo);
})();
const clearBtn = document.getElementById('clearSearch');
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value;
  clearBtn.style.display = searchQuery ? 'flex' : 'none';
  renderAll();
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearBtn.style.display = 'none';
  searchInput.focus();
  renderAll();
});

// Out of stock modal
function showOutOfStockModal() {
  document.getElementById('outOfStockBackdrop').classList.add('open');
  document.documentElement.style.overflow = 'hidden';
}

function closeOutOfStockModal() {
  document.getElementById('outOfStockBackdrop').classList.remove('open');
  document.documentElement.style.overflow = '';
}

document.getElementById('outOfStockClose').addEventListener('click', closeOutOfStockModal);
document.getElementById('outOfStockBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('outOfStockBackdrop')) closeOutOfStockModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('outOfStockBackdrop').classList.contains('open')) {
    closeOutOfStockModal();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAll, { once: true });
} else {
  loadAll();
}
