window.applyShopSettings = function(settings) {
  if (!settings) return;
  const text=(selector,value)=>document.querySelectorAll(selector).forEach(el=>el.textContent=value||'');
  const image=(selector,src)=>document.querySelectorAll(selector).forEach(el=>{el.src=src||settings.logo;el.alt='Logo '+settings.name;});
  document.title=settings.name;
  text('.brand-name,.header-brand-name,.footer-brand-name',settings.name);
  document.querySelectorAll('.logo,.logo-mark').forEach(el=>el.setAttribute('aria-label',settings.name));
  document.querySelector('.logo-tap')?.setAttribute('title',settings.name);
  image('.hero-logo-text,.maintenance-capi',settings.logo);
  image('.logo-mark img',settings.header_logo);
  image('.footer-logo img',settings.footer_logo);
  document.querySelectorAll('link[rel=icon],link[rel=apple-touch-icon]').forEach(el=>el.href=settings.logo);
  text('.hero-sub',settings.tagline);
  document.querySelectorAll('.trust-item span').forEach((el,i)=>el.textContent=settings.trust[i]||'');
  const proof=document.querySelector('.proof-claim');
  if(proof){const strong=document.createElement('strong');strong.textContent=settings.proof_count;proof.replaceChildren(document.createTextNode(settings.proof_before+' '),strong,document.createTextNode(' '+settings.proof_after));}
  text('.proof-copy',settings.proof_bottom);
  text('.footer .footer-text:first-of-type',settings.footer);
  const contact=document.getElementById('footerContact');
  if(contact){contact.hidden=!settings.show_footer_contact;const a=document.createElement('a');a.textContent=settings.footer_contact_label;a.href='https://wa.me/'+settings.footer_contact_phone+'?text='+encodeURIComponent(settings.footer_contact_message);a.target='_blank';a.rel='noopener noreferrer';a.style.cssText='color:var(--accent-2);text-decoration:underline;font-weight:600';contact.replaceChildren(document.createTextNode(settings.footer_contact_text+' '),a);}
  const floating=document.querySelector('.wa-float');if(floating)floating.href='https://wa.me/'+settings.whatsapp+'?text='+encodeURIComponent(settings.whatsapp_message);
  const buy=document.getElementById('mWA');if(buy){[...buy.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());buy.append(document.createTextNode(settings.buy_label));}
  const search=document.getElementById('searchInput');if(search){search.placeholder=settings.search_placeholder;search.setAttribute('aria-label',settings.search_placeholder||'Buscar');}
  for(const [filter,key] of [['all','all'],['ofertas','offers']]){const chip=document.querySelector(`[data-f="${filter}"]`);if(chip){chip.querySelector('img').src=settings[key+'_image'];chip.querySelector('.filter-chip-label').textContent=settings[key+'_label'];}}
  document.querySelectorAll('meta[name=description],meta[property="og:description"],meta[name="twitter:description"]').forEach(el=>el.content=settings.description);
  document.querySelectorAll('meta[property="og:title"],meta[property="og:site_name"],meta[name="twitter:title"],meta[name="apple-mobile-web-app-title"]').forEach(el=>el.content=settings.name);
  document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(el=>el.content=new URL(settings.logo,location.href).href);
  const admin=document.getElementById('adminLink');if(admin)admin.hidden=!['127.0.0.1','localhost'].includes(location.hostname);
  window.dispatchEvent(new CustomEvent('shop-settings',{detail:settings}));
};
