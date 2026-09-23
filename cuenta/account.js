(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+(Number(n)/100).toFixed(2),date=n=>new Date(n).toLocaleString('es-PE');
  const reportStates={open:'Pendiente',in_progress:'En revisión',resolved:'Resuelto'},reportDrafts=new Map();
  const statuses={yape_pending:'Esperando Yape',review:'Contactar soporte',expired:'Plazo terminado',mp_pending:'Esperando pago',attention:'Contactar soporte',pending:'En revisión',approved:'Aprobado',rejected:'Rechazado',pending_manual:'Pendiente de entrega',delivered:'Entregado',refunded:'Saldo devuelto'};
  let config,user,csrf='',busy=false,mode=new URLSearchParams(location.search).has('registro')?'register':'login',timer,selected=new URLSearchParams(location.search).get('comprar'),checkoutRequest=null,topupRequest=null,watching=[],checking=false;
  const root=$('#accountContent');
  let navigateSection=null;
  const viewState=new Map();
  window.addEventListener('hashchange',()=>navigateSection?.(location.hash.slice(1)));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('portal-menu-open')){closePortalMenu();$('#portalMenu')?.focus();}});
  window.matchMedia('(max-width:700px)').addEventListener('change',closePortalMenu);
  function toast(message,error=false){const box=$('#toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;clearTimeout(timer);timer=setTimeout(()=>box.hidden=true,error?12000:6000);}
  async function api(route,data){const response=await fetch('/api/shop/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Shop-Client':'1','X-Shop-Csrf':csrf},cache:'no-store',...(data?{body:JSON.stringify(data)}:{})});let result;try{result=await response.json();}catch{throw Error('No se pudo confirmar la operación. Recarga para consultar su estado.');}if(!response.ok)throw Object.assign(Error(result.error||'No se pudo completar la operación.'),{status:response.status});return result;}
  function field(name,label,type='text',extra=''){return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;}
  const asset=s=>/^https?:\/\//.test(s)?s:'/'+s.replace(/^\//,'');
  function locked(value){busy=value;root.querySelectorAll('button').forEach(b=>b.disabled=value||b.dataset.unavailable==='true');}
  const accountCopyText=(name,d)=>`✨OJO SE PUEDE USAR EN CUALQUIER DISPOSITIVO PERO NO ESTA PERMITIDO USAR AL MISMO TIEMPO DOS O MAS DISPOSITIVOS NO CAMBIAR CONTRASEÑA Y NI UN OTRO DATO🔱\n\n🔱 ${name}\nCorreo: ${d.username||''}\nContraseña: ${d.password||''}\n\nPERFIL: ${d.profile||''}\nPIN: ${d.pin||''}`;
  async function copyAccountValue(value,button,label){
    const box=$('#orderInfoContent');
    try{await navigator.clipboard.writeText(String(value));if(button.isConnected){const status=box.querySelector('.order-copy-status');if(status)status.textContent='Copiado: '+label+'.';toast('Copiado: '+label+'.');}return true;}
    catch{
      if(!button.isConnected)return false;
      let fallback=box.querySelector('.order-manual-copy');
      if(!fallback){fallback=document.createElement('div');fallback.className='order-manual-copy';fallback.innerHTML='<label class="field"><span>Texto listo para copiar</span><textarea rows="6" readonly spellcheck="false" aria-label="Texto listo para copiar"></textarea></label><p>Selecciona y copia el texto con Ctrl+C o con la opción Copiar de tu celular.</p>';box.append(fallback);}
      const field=fallback.querySelector('textarea');field.value=String(value);field.focus();field.select();field.setSelectionRange(0,field.value.length);
      return false;
    }
  }
  async function copyOrder(order,button){
    if(busy)return;const label=button.innerHTML;locked(true);button.textContent='Copiando…';
    try{
      // Delivery is fetched only for its authenticated buyer.
      const {delivery}=await api('order',{order_id:order.order_id});
      if(button.isConnected)await copyAccountValue(accountCopyText(order.product_name,delivery),button,'Datos de la cuenta');
    }catch(error){handle(error);}finally{if(button.isConnected)button.innerHTML=label;locked(false);}
  }
  function recovery(code){
    $('#recoveryCode').textContent=code;$('#savedRecovery').checked=false;$('#closeRecovery').disabled=true;$('#recoveryDialog').showModal();
    $('#downloadRecovery').onclick=()=>{const link=document.createElement('a'),url=URL.createObjectURL(new Blob([`Arcangel US — Código de recuperación\nCorreo: ${user.email}\nCódigo: ${code}\nGuarda este archivo de forma privada.\n`],{type:'text/plain'}));link.href=url;link.download='arcangel-codigo-recuperacion.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }
  $('#savedRecovery').onchange=e=>$('#closeRecovery').disabled=!e.target.checked;
  $('#closeRecovery').onclick=()=>{$('#recoveryDialog').close();$('#recoveryCode').textContent='';$('#downloadRecovery').onclick=null;};
  $('#recoveryDialog').addEventListener('cancel',e=>e.preventDefault());
  const recoverySupport='https://wa.me/51929688960?text='+encodeURIComponent('Hola, solicito mi código de recuperación porque olvidé mi contraseña y no encuentro el código. ¿Me pueden ayudar a recuperar el acceso a mi cuenta?');
  function auth(){
    document.body.classList.remove('portal-active','portal-menu-open');navigateSection=null;viewState.clear();document.title='Mi cuenta · Arcangel US';
    root.innerHTML=`<section class="settings-card auth-card"><div class="auth-tabs"><button class="button ${mode==='login'?'primary':'secondary'}" data-mode="login">Iniciar sesión</button><button class="button ${mode==='register'?'primary':'secondary'}" data-mode="register">Registrarse</button></div><h2>${mode==='recover'?'Recuperar acceso':mode==='register'?'Bienvenido a Arcangel US':'Entra a tu cuenta'}</h2>${selected?'<p class="section-note">Inicia sesión para continuar con tu compra.</p>':''}<form id="authForm">${mode==='login'?field('identifier','Usuario o correo electrónico','text','required maxlength="254" autocomplete="username" autocapitalize="none"'): `${mode==='register'?field('username','Usuario','text','required minlength="3" maxlength="40" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{1,38}[A-Za-z0-9]" autocomplete="username" autocapitalize="none"')+'<p class="form-help">De 3 a 40 caracteres. Letras, números, punto, guion o guion bajo.</p>':''}${field('email','Correo electrónico','email','required maxlength="254" autocomplete="email"')}`}${mode==='recover'?`<div class="recovery-support-row">${field('recovery_code','Código de recuperación','text','required maxlength="64" autocomplete="off" aria-describedby="recoverySupportNote"')}<aside class="recovery-support"><p id="recoverySupportNote">(En caso de olvidar tu código, comunícate con el área de soporte).</p><a class="button secondary small" href="${esc(recoverySupport)}" target="_blank" rel="noopener noreferrer">Contactar soporte por WhatsApp</a></aside></div>`:''}${field('password',mode==='recover'?'Nueva contraseña':'Contraseña','password',`required minlength="12" maxlength="128" autocomplete="${mode==='login'?'current-password':'new-password'}"`)}${mode==='register'?field('confirm_password','Repetir contraseña','password','required minlength="12" maxlength="128" autocomplete="new-password"'):''}${mode==='register'?'<p class="form-help">Usa al menos 12 caracteres. Al registrarte recibirás un código privado de recuperación. El saldo solo se usa para compras en esta tienda y las recargas se acreditan cuando se confirma el pago.</p>':''}<p id="authError" class="account-error" role="alert"></p><button class="button primary" type="submit">${mode==='register'?'Crear mi cuenta':mode==='recover'?'Restablecer contraseña':'Entrar'}</button></form>${mode==='login'?'<p class="registration-invite">¿Aún no tienes cuenta? <button type="button" data-mode="register">Regístrate aquí</button></p>':''}<button class="button ghost small recovery-link" data-mode="recover">Olvidé mi contraseña</button></section>`;
    root.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;auth();});
    $('#authForm').onsubmit=async e=>{e.preventDefault();if(busy)return;locked(true);$('#authError').textContent='';try{const input=Object.fromEntries(new FormData(e.target));if(mode==='register'&&input.password!==input.confirm_password)throw Error('Las contraseñas no coinciden.');delete input.confirm_password;const result=await api(mode,input);user=result.user;csrf=result.csrf;if(result.recovery_code)recovery(result.recovery_code);await dashboard();}catch(error){if($('#authError'))$('#authError').textContent=error.message;else toast(error.message,true);}finally{locked(false);}};
  }
  async function dashboard(){
    const me=await api('me');user=me.user;csrf=me.csrf;
    let product=null;
    if(selected){const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error('No se pudo consultar el catálogo.');const catalog=await response.json();product=catalog.products.find(p=>p.id===selected);}
    const available=product&&!product.out_of_stock&&product.stock_quantity!==0&&product.checkout_mode==='automatic';
    const amount=product?Math.round(Number(product.pen)*100):0;
    config=await api('config');
    const topupKey='arcangel-topup:'+user.id;try{const pendingRequest=JSON.parse(sessionStorage.getItem(topupKey));if(pendingRequest&&me.movements.some(m=>m.reference==='topup:qr:'+pendingRequest.request_id)){sessionStorage.removeItem(topupKey);topupRequest=null;}}catch{}
    const pending=me.movements.find(m=>m.kind==='topup'&&m.status==='pending');
    watching=[...me.movements.filter(m=>m.kind==='topup'&&m.status==='pending').map(m=>({id:m.entry_id,type:'topup'})),...me.orders.filter(o=>o.status==='pending_manual').map(o=>({id:o.order_id,type:'order'})),...(me.reports||[]).filter(r=>r.status!=='resolved').map(r=>({id:r.report_id,type:'report',revision:r.revision}))];
    const ready=me.orders.filter(o=>o.status==='delivered').length,waiting=me.orders.filter(o=>o.status==='pending_manual').length;
    document.body.classList.add('portal-active');
    root.innerHTML=`${portalSidebar()}<div class="portal-shell"><header class="portal-topbar"><button type="button" id="portalMenu" class="portal-menu-button" aria-label="Abrir menú de mi cuenta" aria-controls="portalSidebar" aria-expanded="false">${icon('menu')}</button><a href="/" class="portal-home" aria-label="Inicio">${icon('home')}<span>Inicio</span></a><a href="#billetera" data-section="billetera" class="portal-balance" aria-label="Mi saldo: ${money(user.balance_cents)}. Recargar">${icon('wallet')}<strong>${money(user.balance_cents)}</strong></a><div class="portal-topbar-end"><button id="refreshAccount" class="portal-icon-button" title="Actualizar mi cuenta" aria-label="Actualizar mi cuenta">${icon('refresh')}</button><button id="logoutAccount" class="portal-exit">${icon('logout')}<span>Salir</span></button></div></header><div class="portal-workspace"><header class="portal-page-heading"><div><p class="eyebrow">MI ESPACIO · ARCANGEL US</p><h1 id="portalTitle">Mis cuentas y compras</h1></div><span class="portal-customer-email">${esc(user.username||user.email)} · ${user.role==='reseller'?'Revendedor':'Cliente'}</span></header><div class="customer-grid"><div data-customer-section="compras">
    ${selected?`<section class="settings-card checkout-box"><p class="eyebrow">CONFIRMAR COMPRA</p><h2>${esc(product?.name||'Producto no disponible')}</h2>${available?`<p class="section-note">Entrega automática: recibirás una cuenta disponible en Mis compras.</p><p class="checkout-price">${money(amount)}</p><p class="form-help">Se descontará del saldo al confirmar. Una unidad por compra.</p><button id="confirmPurchase" class="button primary" ${user.balance_cents<amount?'disabled data-unavailable="true"':''}>Confirmar compra · ${money(amount)}</button>${user.balance_cents<amount?'<p class="account-error">Saldo insuficiente. Solicita una recarga para continuar.</p>':''}`:'<p class="section-note">Este producto ya no está disponible para comprar con saldo.</p>'}<p id="purchaseError" class="account-error" role="alert"></p><a class="button ghost small" href="/">Seguir viendo productos</a></section>`:''}
    <section class="settings-card orders-panel"><div class="section-heading"><p class="section-note">Tus accesos y fechas en un solo lugar. Últimas 200 compras.</p><a class="button secondary small" href="/">＋ Comprar productos</a></div><a class="verify-code-banner" href="https://www.verifica.arcaperus.com/" target="_blank" rel="noopener noreferrer">${icon('lock')}<span>CONSULTAR CÓDIGO</span></a><div class="purchase-status-filters" id="purchaseFilters" aria-label="Filtrar compras por estado"></div><div class="purchase-tools"><label class="field"><span>Buscar en mis compras</span><input id="searchOrders" type="search" placeholder="Producto, correo, perfil o número de pedido" maxlength="300"></label><span class="help">Consulta tus accesos o solicita ayuda desde cada tarjeta.</span></div><div id="purchasesList"></div></section></div>
    <div data-customer-section="billetera" class="wallet-columns"><section class="settings-card"><p class="eyebrow">AGREGAR SALDO</p><h2>Recarga con QR</h2><p class="section-note">Escanea el QR desde Yape o Plin, realiza el pago y solicita la revisión.</p>${config.payment_qr?`<div class="payment-qr"><img src="${esc(asset(config.payment_qr))}" alt="QR de pago de la tienda" id="paymentQr"><p id="qrLoadError" class="account-error" hidden>No se pudo cargar el QR. Actualiza la página antes de pagar.</p></div>${config.payment_name?`<p class="qr-owner">Titular: <strong>${esc(config.payment_name)}</strong></p>`:''}${pending?`<div class="pending-topup" role="status"><span class="order-status pending_manual">En revisión</span><h3>${money(pending.amount_cents)}</h3><p>Tu solicitud está pendiente. Te acreditaremos el saldo cuando confirmemos el pago.</p><small>${esc(date(pending.created_at))} · Solicitud #${esc(pending.entry_id.slice(0,8))}</small></div>`:`<form id="topupForm">${field('amount_soles','Monto que pagaste','number','required min="0.01" max="1000000" step="0.01" placeholder="S/ 0.00" inputmode="decimal"')}<button class="button primary" type="submit">Solicitar revisión</button><p class="form-help">El saldo se agrega cuando aprobemos tu pago.</p><p id="topupMessage" class="account-error" role="status"></p></form>`}`:'<div class="qr-empty">La tienda está preparando su QR de pago. Vuelve a consultar en unos momentos.</div>'}</section>
    </div></div>
    <section data-customer-section="acceso" class="portal-profile"><div class="settings-card profile-card"><div class="profile-avatar">${icon('user')}</div><h2>Mi perfil</h2><p class="profile-email">${esc(user.email)}</p><span class="order-status delivered">Cuenta activa</span><dl class="purchase-detail-list"><div><dt>Usuario</dt><dd>${esc(user.username||'Contacta a soporte para elegir tu usuario')}</dd></div><div><dt>Correo electrónico</dt><dd>${esc(user.email)}</dd></div><div><dt>Tipo de cuenta</dt><dd>${user.role==='reseller'?'Revendedor':'Cliente'}</dd></div><div><dt>Saldo disponible</dt><dd>${money(user.balance_cents)}</dd></div></dl><a class="button primary" href="#billetera" data-section="billetera">Agregar saldo</a></div><div><div class="account-summary"><div><span>Cuentas entregadas</span><strong>${ready}</strong></div><div><span>Pedidos en proceso</span><strong>${waiting}</strong></div><div><span>Recarga en revisión</span><strong>${pending?money(pending.amount_cents):'Sin pendientes'}</strong></div></div><section class="settings-card"><h2>Seguridad de tu acceso</h2><p class="section-note">Tu saldo, historial y datos de entrega son privados. Guarda tu código de recuperación en un lugar seguro.</p><p class="section-note">Para restablecer tu contraseña, cierra sesión y selecciona «Olvidé mi contraseña». Si no encuentras tu código de recuperación, comunícate con soporte.</p><a class="button secondary" href="${esc(recoverySupport)}" target="_blank" rel="noopener noreferrer">Contactar soporte por WhatsApp</a></section></div></section>
    ${recordsSection('recargas','Mis recargas','Consulta el estado de tus recargas y pagos.')}
    ${recordsSection('historial','Mi historial','Consulta tus compras, recargas y devoluciones.')}
    ${recordsSection('reportes','Mis reportes','Sigue la revisión de tus cuentas y las respuestas de soporte.')}
    <p class="customer-help">Tus datos solo son visibles dentro de tu cuenta.${config.whatsapp?` ¿Necesitas ayuda? <a href="https://wa.me/${esc(config.whatsapp)}" target="_blank" rel="noopener noreferrer">Contactar a la tienda</a>`:''}</p>
    <dialog id="orderInfoDialog" class="purchase-dialog" aria-labelledby="orderInfoTitle"><div class="section-heading"><h2 id="orderInfoTitle">Información de la cuenta</h2><button class="button secondary small" id="closeOrderInfo" type="button" aria-label="Cerrar"><span aria-hidden="true">×</span></button></div><div id="orderInfoContent"></div></dialog></div></div>`;
    setupPortal();
    $('#refreshAccount').onclick=async()=>{locked(true);try{await dashboard();}catch(error){handle(error);}finally{locked(false);}};
    $('#logoutAccount').onclick=async()=>{locked(true);try{await api('logout',{});user=null;csrf='';watching=[];topupRequest=null;checkoutRequest=null;auth();}catch(error){toast(error.message,true);}finally{locked(false);}};
    if($('#confirmPurchase'))$('#confirmPurchase').onclick=async()=>{
      if(busy)return;locked(true);const key=`arcangel-purchase:${user.id}:${product.id}`;
      try{if(!checkoutRequest){try{checkoutRequest=JSON.parse(sessionStorage.getItem(key));}catch{}if(!checkoutRequest||checkoutRequest.expected_cents!==amount)checkoutRequest={request_id:crypto.randomUUID(),product_id:product.id,expected_cents:amount};try{sessionStorage.setItem(key,JSON.stringify(checkoutRequest));}catch{}}
        const result=await api('purchase',checkoutRequest);try{sessionStorage.removeItem(key);}catch{}checkoutRequest=null;selected=null;history.replaceState({},'',location.pathname+'#compras');await dashboard();toast(result.order.status==='delivered'?'Compra realizada. Ya puedes ver los datos de entrega.':'Compra realizada. La tienda atenderá tu pedido.');
      }catch(error){if($('#purchaseError'))$('#purchaseError').textContent=error.message+' Consulta Mis compras antes de volver a intentarlo.';else handle(error);}finally{locked(false);}
    };
    if($('#paymentQr'))$('#paymentQr').onerror=()=>{$('#paymentQr').hidden=true;$('#qrLoadError').hidden=false;const submit=$('#topupForm button[type=submit]');if(submit){submit.disabled=true;submit.dataset.unavailable='true';}};
    const ordersUI=setupOrders(me.orders,me.reports||[]);
    setupRecords(me,ordersUI.openReport);
    if($('#topupForm')){
      $('#topupForm').onsubmit=async e=>{
        e.preventDefault();if(busy)return;const amount=Number(new FormData(e.target).get('amount_soles')).toFixed(2),key='arcangel-topup:'+user.id;locked(true);
        try{
          if(!topupRequest){try{topupRequest=JSON.parse(sessionStorage.getItem(key));}catch{}}
          if(topupRequest&&topupRequest.amount_soles!==amount)throw Error('Hay una solicitud pendiente de confirmar. Usa Actualizar para revisar su estado antes de cambiar el monto.');
          if(!topupRequest)topupRequest={request_id:crypto.randomUUID(),amount_soles:amount};
          try{sessionStorage.setItem(key,JSON.stringify(topupRequest));}catch{}
          await api('topups',topupRequest);topupRequest=null;try{sessionStorage.removeItem(key);}catch{}await dashboard();toast('Solicitud enviada a revisión. Te avisaremos aquí cuando se apruebe.');
        }catch(error){if(error.status&&error.status!==503){topupRequest=null;try{sessionStorage.removeItem(key);}catch{}}if($('#topupMessage'))$('#topupMessage').textContent=error.message;else handle(error);}finally{locked(false);}
      };
    }
    window.dispatchEvent(new CustomEvent('arcangel:account',{detail:{me,config,api,refresh:dashboard}}));
  }
  function icon(name){
    const paths={copy:'M9 5V2h6v3M8 4H5v18h14V4h-3M8 4h8v4H8z',plus:'M12 5v14M5 12h14',mail:'M3 5h18v14H3zM3 5l9 7 9-7',key:'M15 3a6 6 0 1 1-4 10l-7 7H2v-4l7-7a6 6 0 0 1 6-6Zm2 4h.01',calendar:'M4 5h16v17H4zM8 2v6m8-6v6M4 11h16',check:'m7 12 3 3 7-7M5 3h14v18H5z',clock:'M12 8v4l3 2M5 3 2 6m17-3 3 3M5 19l-1 2m15-2 1 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',device:'M6 2h12v20H6zM10 18h4',lock:'M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5z',coins:'M15 5c0 2-3 3-6 3S3 7 3 5s3-3 6-3 6 1 6 3ZM3 5v6c0 2 3 3 6 3m6-9v4M3 11v6c0 2 3 3 6 3m12-7c0 2-3 3-6 3s-6-1-6-3 3-3 6-3 6 1 6 3Zm-12 0v6c0 2 3 3 6 3s6-1 6-3v-6',menu:'M4 6h16M4 12h16M4 18h16',home:'m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',bag:'M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2',wallet:'M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M20 11h-6v6h6',history:'M3 12a9 9 0 1 0 3-6M3 3v6h6m3-3v6l4 2',support:'M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v7h4v-7H4Zm16 0h2v7h-4v-7h2ZM19 19c0 3-5 3-7 3',refresh:'M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6',alert:'M12 3 2 21h20L12 3Zm0 6v5m0 3h.01',repeat:'M17 1l4 4-4 4M3 5h18M7 23l-4-4 4-4M21 19H3',logout:'M9 3H4v18h5m5-15 6 6-6 6m-6-6h12',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',chevron:'m9 5 7 7-7 7'};
    return `<svg class="portal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.bag}"/></svg>`;
  }
  const portalGroups=[['account','Mi cuenta','user',[['acceso','Mi perfil']]],['orders','Gestionar pedidos','bag',[['compras','Mis cuentas y compras']]],['wallet','Gestionar recargas','wallet',[['billetera','Recargar'],['recargas','Mis recargas']]],['history','Historial','history',[['historial','Mi historial']]],['reports','Reportes','support',[['reportes','Mis reportes']]]];
  function portalSidebar(){
    return `<button class="portal-scrim" type="button" aria-label="Cerrar menú" tabindex="-1"></button><aside class="portal-sidebar" id="portalSidebar"><a class="portal-logo" href="/"><img src="/logo/arcangel-us.png" alt=""><span>Arcangel US<small>MI CUENTA</small></span></a><nav aria-label="Secciones de mi cuenta">${portalGroups.map(([id,label,symbol,links])=>`<div class="portal-nav-group" data-nav-group="${id}"><button class="portal-nav-toggle" type="button" aria-expanded="false" aria-controls="nav-${id}">${icon(symbol)}<span>${label}</span>${icon('chevron')}</button><div class="portal-subnav" id="nav-${id}" hidden>${links.map(([section,text])=>`<a href="#${section}" data-section="${section}">${text}</a>`).join('')}</div></div>`).join('')}</nav><div class="portal-sidebar-footer"><span class="portal-online-dot"></span> Tu espacio de cliente<small>Compras y saldo en un solo lugar</small></div></aside>`;
  }
  function closePortalMenu(){document.body.classList.remove('portal-menu-open');$('#portalMenu')?.setAttribute('aria-expanded','false');const side=$('#portalSidebar'),shell=$('.portal-shell');if(side)side.inert=window.matchMedia('(max-width:700px)').matches;if(shell)shell.inert=false;}
  function setupPortal(){
    const titles={acceso:'Mi cuenta',compras:'Mis cuentas y compras',billetera:'Agregar saldo',recargas:'Mis recargas',historial:'Mi historial',reportes:'Mis reportes'};
    const setOpen=(group,open)=>{group.querySelector('.portal-nav-toggle').setAttribute('aria-expanded',String(open));group.querySelector('.portal-subnav').hidden=!open;};
    navigateSection=section=>{
      if(!Object.hasOwn(titles,section))section='acceso';
      root.querySelectorAll('[data-customer-section]').forEach(el=>el.hidden=el.dataset.customerSection!==section);
      root.querySelectorAll('[data-section]').forEach(el=>{const active=el.dataset.section===section;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
      root.querySelectorAll('.portal-nav-group').forEach(group=>{const active=!!group.querySelector(`[data-section="${section}"]`);group.classList.toggle('active',active);setOpen(group,active);});
      $('#portalTitle').textContent=titles[section];document.title=titles[section]+' · Arcangel US';
      if(location.hash!=='#'+section)history.replaceState({},'',location.pathname+location.search+'#'+section);
      closePortalMenu();
    };
    root.querySelectorAll('[data-section]').forEach(link=>link.onclick=e=>{e.preventDefault();const section=link.dataset.section;if(location.hash!=='#'+section)history.pushState({},'',location.pathname+location.search+'#'+section);navigateSection(section);window.scrollTo(0,0);});
    root.querySelectorAll('.portal-nav-toggle').forEach(button=>button.onclick=()=>{const group=button.closest('.portal-nav-group'),open=button.getAttribute('aria-expanded')!=='true';setOpen(group,open);});
    $('#portalMenu').onclick=()=>{const open=document.body.classList.toggle('portal-menu-open');$('#portalMenu').setAttribute('aria-expanded',String(open));$('#portalSidebar').inert=!open;$('.portal-shell').inert=open;if(open)$('#portalSidebar .portal-nav-toggle').focus();};
    $('.portal-scrim').onclick=()=>{closePortalMenu();$('#portalMenu').focus();};
    navigateSection(selected?'compras':location.hash.slice(1)||'acceso');
  }
  function recordsSection(key,title,description){
    return `<section data-customer-section="${key}" class="portal-records" hidden><div class="records-heading"><div><p class="section-note">${description} Últimos 200 registros.</p></div>${key==='recargas'?'<a href="#billetera" data-section="billetera" class="button primary">＋ Recargar saldo</a>':key==='reportes'?'<a href="#compras" data-section="compras" class="button primary">Reportar una cuenta</a>':''}</div><label class="field records-search"><span>Buscar en ${title.toLocaleLowerCase('es')}</span><input type="search" data-record-search="${key}" maxlength="300" placeholder="Buscar por nombre, número o estado"></label><div class="purchase-status-filters" data-record-filters="${key}" aria-label="Filtrar ${title.toLocaleLowerCase('es')}"></div><div data-record-list="${key}"></div></section>`;
  }
  function setupRecords(me,openReport){
    const kinds={topup:'Recarga con QR',yape_topup:'Recarga Yape',mp_topup:'Recarga Mercado Pago',admin_topup:'Saldo agregado por la tienda',purchase:'Compra',renewal:'Renovación de cuenta',refund:'Devolución'};
    for(const key of ['recargas','historial','reportes']){
      const isReport=key==='reportes',records=isReport?(me.reports||[]):me.movements.filter(m=>key==='historial'||['topup','yape_topup','mp_topup','admin_topup'].includes(m.kind));
      const state=viewState.get(key)||{query:'',status:'all',page:1};viewState.set(key,state);
      const filters=isReport?[['all','Todos'],['open','Pendientes'],['in_progress','En revisión'],['resolved','Resueltos']]:key==='recargas'?[['all','Todas'],['approved','Aprobadas'],['waiting','Pendientes'],['rejected','Rechazadas'],['review','Requieren atención']]:[['all','Todos'],['topups','Recargas'],['purchase','Compras'],['refund','Devoluciones']];
      const matches=(m,status)=>status==='all'||(isReport?m.status===status:key==='historial'?(status==='topups'?['topup','yape_topup','mp_topup','admin_topup'].includes(m.kind):status==='purchase'?['purchase','renewal'].includes(m.kind):m.kind===status):status==='waiting'?['pending','yape_pending','mp_pending'].includes(m.status):status==='review'?['review','attention','expired'].includes(m.status):m.status===status);
      const search=root.querySelector(`[data-record-search="${key}"]`),filterRoot=root.querySelector(`[data-record-filters="${key}"]`),list=root.querySelector(`[data-record-list="${key}"]`);
      const draw=()=>{
        filterRoot.innerHTML=filters.map(([value,label])=>`<button class="purchase-chip ${state.status===value?'active':''}" type="button" aria-pressed="${state.status===value}" data-status="${value}">${label}<span>${records.filter(m=>matches(m,value)).length}</span></button>`).join('');
        filterRoot.querySelectorAll('button').forEach(button=>button.onclick=()=>{state.status=button.dataset.status;state.page=1;draw();});
        const filtered=records.filter(m=>matches(m,state.status)&&[m.product_name,m.report_id,m.order_id,m.message,m.owner_reply,m.entry_id,m.reference,m.note,kinds[m.kind],isReport?reportStates[m.status]:statuses[m.status]].join(' ').toLocaleLowerCase('es').includes(state.query));
        const pages=Math.max(1,Math.ceil(filtered.length/12));state.page=Math.min(Math.max(state.page,1),pages);const offset=(state.page-1)*12;
        list.innerHTML=`<div class="portal-record-grid">${filtered.slice(offset,offset+12).map(m=>{
          if(isReport)return `<article class="portal-report-card"><header><span class="record-symbol">${icon('support')}</span><span class="order-status ${m.status==='resolved'?'delivered':m.status==='in_progress'?'validity':'pending_manual'}">${reportStates[m.status]||esc(m.status)}</span></header><span class="record-reference">REPORTE · ${esc(m.report_id.slice(0,8).toUpperCase())}</span><h3>${esc(m.product_name)}</h3><p class="record-message">${esc(m.message)}</p>${m.owner_reply?`<div class="record-reply"><strong>Respuesta de soporte</strong><p>${esc(m.owner_reply)}</p></div>`:'<p class="section-note">Tu solicitud está pendiente de respuesta.</p>'}<footer><time>${esc(date(m.updated_at||m.created_at))}</time><button type="button" class="button secondary small" data-report-order="${esc(m.order_id)}">Ver reporte</button></footer></article>`;
          const approved=m.status==='approved',debit=m.amount_cents<0,symbol=m.kind==='purchase'?'bag':m.kind==='refund'?'history':'wallet';
          return `<article class="portal-movement-card"><header><span class="record-symbol">${icon(symbol)}</span><span class="order-status ${approved?'delivered':m.status==='rejected'?'expired':'pending_manual'}">${statuses[m.status]||esc(m.status)}</span></header><span class="record-reference">${esc(m.entry_id.slice(0,8).toUpperCase())}</span><h3>${kinds[m.kind]||esc(m.kind)}</h3><p class="record-amount ${approved?(debit?'debit':'credit'):''}">${approved?(debit?'− ':'+ '):''}${money(Math.abs(m.amount_cents))}</p><p class="record-message">${esc(m.note|| (approved?'Movimiento confirmado.':'Tu saldo se actualizará cuando se confirme el pago.'))}</p><footer><time>${esc(date(m.created_at))}</time><span>${approved?(debit?'Débito':'Crédito'):'Sin afectar tu saldo'}</span></footer></article>`;
        }).join('')||`<div class="empty-orders">${icon(isReport?'support':'history')}<h3>Sin resultados</h3><p>${records.length?'No hay registros que coincidan con los filtros.':isReport?'Todavía no tienes reportes. Si una cuenta falla, puedes reportarla desde Gestionar pedidos.':'Aquí aparecerán tus movimientos cuando realices una operación.'}</p></div>`}</div><div class="purchase-pagination"><span role="status">${filtered.length?offset+1:0}–${Math.min(offset+12,filtered.length)} de ${filtered.length} resultados · Página ${state.page} de ${pages}</span><div class="row-actions"><button class="button secondary small" type="button" data-page="-1" ${state.page===1?'disabled data-unavailable="true"':''}>Anterior</button><button class="button secondary small" type="button" data-page="1" ${state.page===pages?'disabled data-unavailable="true"':''}>Siguiente</button></div></div>`;
        list.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{state.page+=Number(button.dataset.page);draw();});
        list.querySelectorAll('[data-report-order]').forEach(button=>button.onclick=()=>{const id=button.dataset.reportOrder,r=records.find(r=>r.order_id===id);openReport(me.orders.find(o=>o.order_id===id)||{order_id:id,product_name:r.product_name,status:r.order_status});});
        if(busy)locked(true);
      };
      search.value=state.query;search.oninput=()=>{state.query=search.value.trim().toLocaleLowerCase('es');state.page=1;draw();};draw();
    }
  }
  function setupOrders(orders,reports){
    const state=viewState.get('compras')||{query:'',status:'all',page:1,size:12};
    let {query,status,page,size}=state;
    const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    const today=[dateParts.year,dateParts.month,dateParts.day].join('-');
    const expired=o=>o.status==='delivered'&&!!o.account?.expires_on&&o.account.expires_on<today;
    const day=value=>value?value.split('-').reverse().join('/'):'Sin definir';
    const daysLeft=o=>o.account?.expires_on?Math.round((Date.parse(o.account.expires_on+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000):null;
    const remaining=o=>{const days=daysLeft(o);return days===null?'Sin fecha de vencimiento':days<0?'Vencida':days===0?'Vence hoy':'Falta'+(days===1?'':'n')+' '+days+' día'+(days===1?'':'s');};
    const createdLabel=value=>{
      const created=new Date(value),parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(created).map(p=>[p.type,p.value]));
      const sameDay=[parts.year,parts.month,parts.day].join('-')===today;
      const time=created.toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:true});
      return 'Se creó '+(sameDay?'hoy':'el '+created.toLocaleDateString('es-PE',{timeZone:'America/Lima'}))+' a las '+time;
    };
    const matches=(o,key)=>key==='all'||(key==='expired'?expired(o):key==='expiring'?o.status==='delivered'&&daysLeft(o)!==null&&daysLeft(o)>=0&&daysLeft(o)<=3:o.status===key);
    const chips=[['all','Todas'],['delivered','Entregadas'],['pending_manual','En proceso'],['expiring','Por vencer'],['expired','Vencidas'],['refunded','Saldo devuelto']];
    const filterRoot=$('#purchaseFilters'),list=$('#purchasesList'),dialog=$('#orderInfoDialog');
    $('#closeOrderInfo').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{$('#orderInfoContent').textContent='';});
    function reportButton(order){
      const button=document.createElement('button');button.type='button';button.className='button secondary small report-account-button';
      const existing=reports.filter(r=>r.order_id===order.order_id),active=existing.find(r=>r.status!=='resolved');
      button.innerHTML=`${icon('alert')} <span>${active?'Ver reporte · '+reportStates[active.status]:existing.length?'Reportes de la cuenta':'Reportar cuenta'}</span>`;
      button.onclick=()=>openReport(order);return button;
    }
    function replacementButton(order){
      const button=document.createElement('button');button.type='button';button.className='button danger small replacement-account-button';button.innerHTML=`${icon('repeat')} <span>CUENTA CAÍDA · REEMPLAZAR</span>`;button.onclick=async()=>{
        if(busy||!order.replacement_available)return;
        if(!window.confirm('Solo tienes un intento para reemplazar esta cuenta. ¿Estás seguro de que deseas tomar esta acción?'))return;
        locked(true);try{await api('replace',{order_id:order.order_id,request_id:crypto.randomUUID()});await dashboard();toast('Cuenta reemplazada. Revisa los nuevos datos en Mis cuentas y compras.');}catch(error){handle(error);}finally{locked(false);}
      };return button;
    }
    function renewalButton(order){
      if(!order.account?.renewable)return null;
      const button=document.createElement('button');button.type='button';button.className='button secondary small renewal-account-button';button.innerHTML=`${icon('refresh')} <span>Renovar cuenta · ${money(order.renewal_price_cents||0)}</span>`;button.onclick=async()=>{
        if(busy)return;
        if(!window.confirm('La renovación cargará '+money(order.renewal_price_cents||0)+' de tu saldo y ampliará la fecha de término. ¿Deseas continuar?'))return;
        locked(true);try{await api('renew',{order_id:order.order_id,request_id:crypto.randomUUID(),expected_cents:order.renewal_price_cents});await dashboard();toast('Renovación realizada. La fecha de término fue actualizada.');}catch(error){handle(error);}finally{locked(false);}
      };return button;
    }
    function openReport(order){
      const items=reports.filter(r=>r.order_id===order.order_id),active=items.find(r=>r.status!=='resolved'),content=$('#orderInfoContent');
      dialog.classList.remove('order-detail-dialog');
      $('#orderInfoTitle').textContent='Soporte · '+order.product_name;
      content.innerHTML=`<p class="section-note">Pedido #${esc(order.order_id.slice(0,8))}${order.account?.username?' · '+esc(order.account.username):''}</p>${items.map(r=>`<article class="customer-report"><div class="section-heading"><strong>${reportStates[r.status]}</strong><small>${esc(date(r.created_at))}</small></div><h3>Tu reporte</h3><p>${esc(r.message)}</p>${r.owner_reply?`<h3>Respuesta de soporte</h3><p>${esc(r.owner_reply)}</p><small>Actualizado: ${esc(date(r.updated_at))}</small>`:'<p class="section-note">El equipo de soporte revisará tu solicitud.</p>'}</article>`).join('')}${active?'<p class="section-note">Ya tienes un reporte abierto para esta cuenta. Aquí verás la respuesta de soporte.</p>':order.status==='delivered'?'<form id="accountReportForm"><label class="field"><span>Describe la falla de la cuenta</span><textarea name="message" required maxlength="3000" rows="5" placeholder="Por ejemplo: aparece contraseña incorrecta al intentar entrar."></textarea></label><p class="form-help">Indica qué ocurre y desde cuándo para que podamos ayudarte.</p><p id="accountReportError" class="account-error" role="alert"></p><button class="button primary" type="submit">Enviar reporte</button></form>':''}`;
      const form=$('#accountReportForm');
      if(form){
        const draft=reportDrafts.get(order.order_id)||{request_id:crypto.randomUUID(),message:''};form.elements.message.value=draft.message;
        form.oninput=()=>{draft.message=form.elements.message.value;reportDrafts.set(order.order_id,draft);};
        form.onsubmit=async e=>{e.preventDefault();if(busy)return;draft.message=form.elements.message.value.trim();reportDrafts.set(order.order_id,draft);locked(true);$('#accountReportError').textContent='';try{await api('reports',{order_id:order.order_id,request_id:draft.request_id,message:draft.message});reportDrafts.delete(order.order_id);dialog.close();await dashboard();toast('Reporte enviado. Puedes consultar su estado y la respuesta en Reportes.');}catch(error){if(error.status===401)handle(error);else if($('#accountReportError'))$('#accountReportError').textContent=error.message;else handle(error);}finally{locked(false);}};
      }
      if(!dialog.open)dialog.showModal();
    }
    function openDetails(o){
      const a=o.account,box=$('#orderInfoContent'),reference=o.order_id.slice(0,8).toUpperCase();
      const longDay=value=>value?new Date(value+'T12:00:00Z').toLocaleDateString('es-PE',{timeZone:'America/Lima',weekday:'long',day:'numeric',month:'long',year:'numeric'}):'Sin definir';
      const fact=(label,value,symbol,kind='')=>`<div class="order-fact ${kind}"><dt>${esc(label)}</dt><dd>${icon(symbol)}<span>${esc(value)}</span></dd></div>`;
      const credential=(key,label,value,symbol,secret=false)=>`<div class="order-credential">${icon(symbol)}<div><span class="order-field-label">${esc(label)}</span><strong data-credential-value="${key}">${secret?'••••••••':esc(value||'No asignado')}</strong></div><div class="order-field-actions">${secret?`<button type="button" class="order-icon-button" data-reveal-password aria-label="Mostrar contraseña" title="Mostrar contraseña" aria-pressed="false">${icon('eye')}</button>`:''}${value||secret?`<button type="button" class="order-icon-button" data-copy-field="${key}" aria-label="Copiar ${esc(label.toLocaleLowerCase('es'))}" title="Copiar ${esc(label.toLocaleLowerCase('es'))}">${icon('copy')}</button>`:''}</div></div>`;
      const phone=String(config.whatsapp||'').replace(/\D/g,'');
      const supportHref=phone?'https://wa.me/'+phone+'?text='+encodeURIComponent('Hola, necesito ayuda con mi compra #'+reference+' de '+o.product_name+'.'):'';
      dialog.classList.add('order-detail-dialog');$('#orderInfoTitle').textContent='Detalles del Pedido: '+reference;
      box.innerHTML=`<div class="order-product"><div class="order-product-logo"><img src="${esc(asset(o.product_logo||'logo/arcangel-us.png'))}" alt="Logo de ${esc(o.product_name)}"></div><div><h3>${esc(o.product_name)}</h3><p>${esc(o.product_brand||o.product_type||'Cuenta de la tienda')}</p></div></div>
        <section class="order-detail-section"><h3>Contacto y soporte</h3><div class="order-contact-box">${supportHref?`<a class="order-contact-button" href="${esc(supportHref)}" target="_blank" rel="noopener noreferrer">${icon('support')} CONTACTAR POR WHATSAPP</a>`:`<button type="button" class="order-contact-button" data-detail-support>${icon('support')} CONTACTAR POR WHATSAPP</button>`}</div></section>
        <section class="order-detail-section"><h3>Detalles del Pedido</h3><dl class="order-facts-grid">
          ${fact('Fecha de creación',createdLabel(o.created_at),'calendar')}
          ${fact('Fecha de expiración',longDay(a?.expires_on),'calendar',expired(o)?'is-expired':'')}
          ${fact('Duración',o.product_duration||'Sin especificar','clock')}
          ${fact('Estado',o.status==='delivered'?'Completado':statuses[o.status]||o.status,'check',o.status==='delivered'?'is-complete':'')}
          ${fact('Tipo de servicio',o.product_type||a?.profile||'Sin especificar','device')}
          ${fact('Renovación',a?.renewable?'Habilitada':'No habilitada','refresh',a?.renewable?'is-complete':'')}
          ${fact('Importe pagado',money(o.amount_cents),'coins')}
          ${fact('Inicio del servicio',longDay(a?.starts_on),'calendar')}
        </dl></section>
        ${a?`<section class="order-detail-section"><h3>Credenciales de la cuenta asignada</h3>${credential('username','Correo / usuario',a.username,'mail')}${a.has_password?credential('password','Contraseña','','key',true):'<p class="order-detail-note">Esta cuenta no tiene una contraseña asignada.</p>'}</section>
        <section class="order-detail-section"><h3>Perfil asignado</h3>${credential('profile','Nombre del perfil',a.profile,'user')}${credential('pin','PIN del perfil',a.pin,'key')}</section>
        ${a.notes||a.url?`<section class="order-detail-section"><h3>Información adicional</h3>${a.notes?`<p class="order-detail-note">${esc(a.notes)}</p>`:''}${a.url?`<a class="order-platform-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${icon('device')} Abrir plataforma ↗</a>`:''}</section>`:''}
        <button type="button" class="order-copy-all" id="copyAllOrderData">${icon('copy')} Copiar toda la información</button>`:`<p class="order-detail-note">${o.status==='pending_manual'?'La tienda está preparando tu entrega. Los datos estarán disponibles aquí.':'El importe de esta compra fue devuelto a tu billetera.'}</p>`}
        <p class="order-copy-status" role="status" aria-live="polite"></p><div class="order-detail-actions"></div>`;
      box.querySelector('img').onerror=e=>{e.target.hidden=true;};
      const actions=box.querySelector('.order-detail-actions');
      if(a||reports.some(r=>r.order_id===o.order_id))actions.append(reportButton(o));
      box.querySelector('[data-detail-support]')?.addEventListener('click',()=>openReport(o));
      if(a){
        const renewal=renewalButton(o);if(renewal)actions.append(renewal);
        if(o.replacement_available)actions.append(replacementButton(o));
        $('#copyAllOrderData').onclick=()=>copyOrder(o,$('#copyAllOrderData'));
        box.querySelectorAll('[data-copy-field]').forEach(button=>button.onclick=async()=>{
          if(busy)return;const key=button.dataset.copyField;button.disabled=true;
          try{const value=key==='password'?(await api('order',{order_id:o.order_id})).delivery.password:a[key];if(button.isConnected)await copyAccountValue(value||'',button,{username:'Correo / usuario',password:'Contraseña',profile:'Perfil',pin:'PIN'}[key]);}
          catch(error){if(button.isConnected)box.querySelector('.order-copy-status').textContent=error.message;}
          finally{if(button.isConnected)button.disabled=false;}
        });
        const show=box.querySelector('[data-reveal-password]');
        if(show)show.onclick=async()=>{
          const value=box.querySelector('[data-credential-value="password"]');
          if(show.getAttribute('aria-pressed')==='true'){value.textContent='••••••••';show.setAttribute('aria-pressed','false');show.setAttribute('aria-label','Mostrar contraseña');show.title='Mostrar contraseña';return;}
          show.disabled=true;try{const result=await api('order',{order_id:o.order_id});if(!show.isConnected)return;value.textContent=result.delivery.password;show.setAttribute('aria-pressed','true');show.setAttribute('aria-label','Ocultar contraseña');show.title='Ocultar contraseña';}
          catch(error){if(show.isConnected)box.querySelector('.order-copy-status').textContent=error.message;}
          finally{if(show.isConnected)show.disabled=false;}
        };
      }
      if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
    }
    function draw(){
      filterRoot.innerHTML=chips.map(([key,label])=>`<button type="button" class="purchase-chip ${status===key?'active':''}" data-purchase-filter="${key}" aria-pressed="${status===key}">${label}<span>${orders.filter(o=>matches(o,key)).length}</span></button>`).join('');
      filterRoot.querySelectorAll('button').forEach(b=>b.onclick=()=>{status=b.dataset.purchaseFilter;page=1;draw();});
      const filtered=orders.filter(o=>matches(o,status)&&[o.product_name,o.order_id,o.account?.username,o.account?.profile].join(' ').toLocaleLowerCase('es').includes(query));
      const pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.max(1,Math.min(page,pages));const start=(page-1)*size;
      viewState.set('compras',{query,status,page,size});
      list.innerHTML=`<div class="purchase-card-grid">${filtered.slice(start,start+size).map(o=>{
        const a=o.account;
        const hasSupport=!!a||reports.some(r=>r.order_id===o.order_id),activeReport=reports.some(r=>r.order_id===o.order_id&&r.status!=='resolved');
        const badge=(name,label,kind)=>`<span class="order-status ${kind}"><span class="purchase-badge-icon">${icon(name)}</span>${esc(label)}</span>`;
        return `<article class="purchase-card" aria-label="${esc(o.product_name)} · ${esc(a?.username||'Compra '+o.order_id.slice(0,8))}">
          <div class="purchase-card-body">
            <div class="purchase-platform-logo"><img src="${esc(asset(o.product_logo||'logo/arcangel-us.png'))}" alt="Logo de ${esc(o.product_name)}" loading="lazy"></div>
            <div class="purchase-card-content">
              <h3>${esc(o.product_name)}</h3>
              <p class="purchase-email">${esc(a?.username||(o.status==='pending_manual'?'Preparando tu cuenta':'Saldo devuelto'))}</p>
              <time datetime="${esc(new Date(o.created_at).toISOString())}">${esc(createdLabel(o.created_at))}</time>
              <div class="purchase-badges">${badge(o.status==='delivered'?'check':'history',o.status==='delivered'?'Completado':statuses[o.status]||o.status,esc(o.status))}${a?badge('clock',remaining(o),expired(o)?'expired':'validity'):''}${a&&(o.product_type||a.profile)?badge('device',o.product_type||a.profile,'profile-badge'):''}</div>
              <div class="purchase-price-row">${badge('coins',money(o.amount_cents),'price-badge')}</div>
            </div>
          </div>
          <footer class="purchase-card-actions">
            ${hasSupport?`<button type="button" class="purchase-support" data-order-support="${esc(o.order_id)}" aria-label="Soporte de ${esc(o.product_name)}${activeReport?' · Reporte abierto':''}">${icon('support')}<span>Soporte</span>${activeReport?'<span class="support-report-dot" title="Reporte abierto"></span>':''}</button>`:''}
            <div class="purchase-primary-actions"><button type="button" class="button small purchase-details" data-order-info="${esc(o.order_id)}">${icon('eye')} VER DETALLES</button>${a&&a.renewable?`<button type="button" class="button small purchase-renew" data-renew-order="${esc(o.order_id)}" title="Renovar por ${money(o.renewal_price_cents||0)}">${icon('refresh')} RENOVAR</button>`:''}</div>
          </footer>
        </article>`;
      }).join('')||`<div class="empty-orders">${icon('bag')}<h3>${orders.length?'Sin resultados':'Aún no tienes compras'}</h3><p>${orders.length?'Prueba con otro filtro o una búsqueda diferente.':'Elige un producto de la tienda y tus cuentas aparecerán aquí.'}</p>${orders.length?'':'<a class="button primary" href="/">Explorar productos</a>'}</div>`}</div><div class="purchase-pagination"><span role="status">${filtered.length?start+1:0}–${Math.min(start+size,filtered.length)} de ${filtered.length} compras · Página ${page} de ${pages}</span><label>Mostrar <select id="purchasePageSize" aria-label="Compras por página">${[12,24,48].map(n=>`<option value="${n}" ${size===n?'selected':''}>${n}</option>`).join('')}</select> por página</label><div class="row-actions"><button type="button" class="button secondary small" id="purchasePrevious" data-unavailable="${page===1}" ${page===1?'disabled':''}>Anterior</button><button type="button" class="button secondary small" id="purchaseNext" data-unavailable="${page===pages}" ${page===pages?'disabled':''}>Siguiente</button></div></div>`;
      list.querySelectorAll('img').forEach(img=>img.onerror=()=>{img.hidden=true;});
      list.querySelectorAll('[data-order-support]').forEach(button=>button.onclick=()=>openReport(orders.find(o=>o.order_id===button.dataset.orderSupport)));
      list.querySelectorAll('[data-renew-order]').forEach(button=>{const action=renewalButton(orders.find(o=>o.order_id===button.dataset.renewOrder));if(action)button.onclick=()=>action.click();});
      $('#purchasePrevious').onclick=()=>{page--;draw();};$('#purchaseNext').onclick=()=>{page++;draw();};$('#purchasePageSize').onchange=e=>{size=Number(e.target.value);page=1;draw();};
      list.querySelectorAll('[data-order-info]').forEach(button=>button.onclick=()=>openDetails(orders.find(o=>o.order_id===button.dataset.orderInfo)));
      if(busy)locked(true);
    }
    $('#searchOrders').value=query;$('#searchOrders').oninput=e=>{query=e.target.value.trim().toLocaleLowerCase('es');page=1;draw();};draw();
    return {openReport};
  }
  function handle(error){if(error.status===401){user=null;csrf='';auth();}toast(error.message,true);}
  async function checkUpdates(){
    if(!user||busy||checking||document.hidden||!watching.length||$('#topupForm [name=amount_soles]')?.value||$('#searchOrders')?.value||root.querySelector('[data-order-password][aria-pressed=true],#orderInfoDialog[open]')||document.activeElement?.matches('input,select,textarea'))return;
    checking=true;const current=user.id;
    try{const me=await api('me');if(user?.id!==current||busy)return;const updates=watching.map(item=>item.type==='report'?(me.reports||[]).find(r=>r.report_id===item.id&&r.revision!==item.revision):item.type==='topup'?me.movements.find(m=>m.entry_id===item.id&&m.status!=='pending'):me.orders.find(o=>o.order_id===item.id&&o.status!=='pending_manual')).filter(Boolean);if(updates.length){locked(true);try{await dashboard();toast(updates.some(x=>x.report_id)?'Soporte respondió a tu reporte. Revisa Reportes.':updates.some(x=>x.kind==='topup'&&x.status==='approved')?'Recarga aprobada. Tu saldo ya está disponible.':updates.some(x=>x.kind==='topup'&&x.status==='rejected')?'Tu solicitud fue revisada. Consulta el detalle en Mis recargas.':'Tu pedido tiene una actualización. Revisa Mis cuentas y compras.');}finally{locked(false);}}}catch(error){if(error.status===401)handle(error);}finally{checking=false;}
  }
  setInterval(checkUpdates,15000);document.addEventListener('visibilitychange',checkUpdates);
  async function start(){config=await api('config');if(!config.enabled){root.innerHTML='<section class="settings-card"><h2>Las cuentas de clientes aún no están disponibles</h2><a class="button primary" href="/">Volver a la tienda</a></section>';return;}try{await dashboard();}catch(error){if(error.status===401)auth();else throw error;}}
  window.addEventListener('beforeunload',e=>{if(busy||[...reportDrafts.values()].some(d=>d.message.trim())){e.preventDefault();e.returnValue='';}});
  start().catch(error=>{root.textContent=error.message;});
})();
