(() => {
  function initMobileMenu() {
    if (document.querySelector('.catalog-mobile-toggle')) return;
    const sidebar = document.querySelector('.catalog-sidebar');
    if (!sidebar) return;

    const media = window.matchMedia('(max-width: 700px)');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-mobile-toggle';
    button.setAttribute('aria-controls', 'catalog-sidebar');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span class="catalog-mobile-icon" aria-hidden="true">☰</span><span>Menú</span>';

    sidebar.id = 'catalog-sidebar';
    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'catalog-mobile-overlay';
    overlay.setAttribute('aria-label', 'Cerrar menú');
    overlay.hidden = true;

    document.body.prepend(overlay);
    document.body.prepend(button);

    function setOpen(open, restoreFocus = false) {
      document.body.classList.toggle('catalog-menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      overlay.hidden = !open;
      sidebar.inert = media.matches && !open;
      if (restoreFocus) button.focus();
    }

    button.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('catalog-menu-open'));
    });
    overlay.addEventListener('click', () => setOpen(false, true));
    sidebar.addEventListener('click', event => {
      if (media.matches && event.target.closest('.filter-chip')) setOpen(false, true);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('catalog-menu-open')) setOpen(false, true);
    });
    media.addEventListener('change', () => setOpen(false));
    setOpen(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu, { once: true });
  } else {
    initMobileMenu();
  }
})();
