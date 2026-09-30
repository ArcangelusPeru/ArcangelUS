(function(){
  function init(){
    if (document.querySelector('.catalog-mobile-toggle')) return;
    var sidebar=document.querySelector('.catalog-sidebar');
    if(!sidebar) return;
    var button=document.createElement('button');
    button.type='button';
    button.className='catalog-mobile-toggle';
    button.setAttribute('aria-controls','catalog-sidebar');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span class="catalog-mobile-icon" aria-hidden="true">☰</span><span>Menú</span>';
    sidebar.id='catalog-sidebar';
    var overlay=document.createElement('button');
    overlay.type='button';
    overlay.className='catalog-mobile-overlay';
    overlay.setAttribute('aria-label','Cerrar menú');
    document.body.prepend(overlay);
    document.body.prepend(button);
    function close(){document.body.classList.remove('catalog-menu-open');button.setAttribute('aria-expanded','false');}
    function toggle(){var open=!document.body.classList.contains('catalog-menu-open');document.body.classList.toggle('catalog-menu-open',open);button.setAttribute('aria-expanded',String(open));}
    button.addEventListener('click',toggle);
    overlay.addEventListener('click',close);
    document.addEventListener('keydown',function(e){if(e.key==='Escape') close();});
    window.addEventListener('resize',function(){if(window.innerWidth>700) close();});
    // Solo muestra los enlaces de acceso en la demo local, sin habilitar pagos.
    if(location.hostname==='127.0.0.1'||location.hostname==='localhost') document.documentElement.classList.add('local-menu-preview');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
