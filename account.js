(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+(Number(n)/100).toFixed(2),date=n=>new Date(n).toLocaleString('es-PE');
  const reportStates={open:'Pendiente',in_progress:'En revisión',resolved:'Resuelto'},reportDrafts=new Map();
  const statuses={yape_pending:'Esperando Yape',review:'Contactar soporte',expired:'Plazo terminado',mp_pending:'Esperando pago',attention:'Contactar soporte',pending:'En revisión',approved:'Aprobado',rejected:'Rechazado',pending_manual:'Pendiente de entrega',delivered:'Entregado',refunded:'Saldo devuelto'};
  let config,user,csrf='',busy=false,mode=new URLSearchParams(location.search).has('registro')?'register':'login',timer,selected=new URLSearchParams(location.search).get('comprar'),checkoutRequest=null,topupRequest=null,watching=[],checking=false;
  const root=$('#accountContent');
  function toast(message,error=false){const box=$('#toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;clearTimeout(timer);timer=setTimeout(()=>box.hidden=true,error?12000:6000);}
  async function api(route,data){const response=await fetch('/api/shop/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Shop-Client':'1','X-Shop-Csrf':csrf},cache:'no-store',...(data?{body:JSON.stringify(data)}:{})});let result;try{result=await response.json();}catch{throw Error('No se pudo confirmar la operación. Recarga para consultar su estado.');}if(!response.ok)throw Object.assign(Error(result.error||'No se pudo completar la operación.'),{status:response.status});return result;}
  function field(name,label,type='text',extra=''){return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;}
  const asset=s=>/^https?:\/\//.test(s)?s:'/'+s.replace(/^\//,'');
  function locked(value){busy=value;root.querySelectorAll('button').forEach(b=>b.disabled=value||b.dataset.unavailable==='true');}
  const accountCopyText=(name,d)=>`✨OJO SE PUEDE USAR EN CUALQUIER DISPOSITIVO PERO NO ESTA PERMITIDO USAR AL MISMO TIEMPO DOS O MAS DISPOSITIVOS NO CAMBIAR CONTRASEÑA Y NI UN OTRO DATO🔱\n\n🔱 ${name}\nCorreo: ${d.username||''}\nContraseña: ${d.password||''}\n\nPERFIL: ${d.profile||''}\nPIN: ${d.pin||''}`;
  async function copyOrder(order,button){
    if(busy)return;const label=button.textContent;locked(true);button.textContent='Copiando…';
    try{
      // Fetch the delivery on demand; the server checks buyer ownership and status.
      const {delivery}=await api('order',{order_id:order.order_id});
      if(!button.isConnected)return;
      const content=accountCopyText(order.product_name,delivery);
      let copied=false;
      try{await navigator.clipboard.writeText(content);copied=true;}catch{}
      if(!copied){
        const dialog=$('#orderInfoDialog'),box=$('#orderInfoContent');
        $('#orderInfoTitle').textContent='Copiar datos · '+order.product_name;
        box.innerHTML='<p class="section-note">Selecciona el texto y cópialo con Ctrl+C o con la opción Copiar de tu celular.</p><label class="field"><span>Datos para copiar</span><textarea id="accountCopyFallback" rows="12" readonly spellcheck="false" autocomplete="off"></textarea></label><button type="button" class="button secondary" id="selectAccountCopy">Seleccionar todo</button>';
        const field=$('#accountCopyFallback');field.value=content;
        const select=()=>{field.focus();field.select();field.setSelectionRange(0,field.value.length);};
        $('#selectAccountCopy').onclick=select;if(!dialog.open)dialog.showModal();select();
        toast('El navegador no permitió copiar automáticamente. El texto está listo para copiar.');
        return;
      }
      button.textContent='✓ Copiado';toast('Datos copiados: plataforma, correo, contraseña, perfil y PIN.');
      setTimeout(()=>{if(button.isConnected)button.textContent=label;},2500);
    }catch(error){handle(error);}finally{if(button.textContent==='Copiando…')button.textContent=label;locked(false);}
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
    root.innerHTML=`<section class="settings-card auth-card"><div class="auth-tabs"><button class="button ${mode==='login'?'primary':'secondary'}" data-mode="login">Iniciar sesión</button><button class="button ${mode==='register'?'primary':'secondary'}" data-mode="register">Registrarse</button></div><h2>${mode==='recover'?'Recuperar acceso':mode==='register'?'Bienvenido a Arcangel US':'Entra a tu cuenta'}</h2>${selected?'<p class="section-note">Inicia sesión para continuar con tu compra.</p>':''}<form id="authForm">${field('email','Correo electrónico','email','required maxlength="254" autocomplete="username"')}${mode==='recover'?`<div class="recovery-support-row">${field('recovery_code','Código de recuperación','text','required maxlength="64" autocomplete="off" aria-describedby="recoverySupportNote"')}<aside class="recovery-support"><p id="recoverySupportNote">(En caso de olvidar tu código, comunícate con el área de soporte).</p><a class="button secondary small" href="${esc(recoverySupport)}" target="_blank" rel="noopener noreferrer">Contactar soporte por WhatsApp</a></aside></div>`:''}${field('password',mode==='recover'?'Nueva contraseña':'Contraseña','password',`required minlength="12" maxlength="128" autocomplete="${mode==='login'?'current-password':'new-password'}"`)}${mode==='register'?field('confirm_password','Repetir contraseña','password','required minlength="12" maxlength="128" autocomplete="new-password"'):''}${mode==='register'?'<p class="form-help">Usa al menos 12 caracteres. Al registrarte recibirás un código privado de recuperación. El saldo solo se usa para compras en esta tienda y las recargas se acreditan cuando se confirma el pago.</p>':''}<p id="authError" class="account-error" role="alert"></p><button class="button primary" type="submit">${mode==='register'?'Crear mi cuenta':mode==='recover'?'Restablecer contraseña':'Entrar'}</button></form>${mode==='login'?'<p class="registration-invite">¿Aún no tienes cuenta? <button type="button" data-mode="register">Regístrate aquí</button></p>':''}<button class="button ghost small recovery-link" data-mode="recover">Olvidé mi contraseña</button></section>`;
    root.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;auth();});
    $('#authForm').onsubmit=async e=>{e.preventDefault();if(busy)return;locked(true);$('#authError').textContent='';try{const input=Object.fromEntries(new FormData(e.target));if(mode==='register'&&input.password!==input.confirm_password)throw Error('Las contraseñas no coinciden.');delete input.confirm_password;const result=await api(mode,input);user=result.user;csrf=result.csrf;if(result.recovery_code)recovery(result.recovery_code);await dashboard();}catch(error){if($('#authError'))$('#authError').textContent=error.message;else toast(error.message,true);}finally{locked(false);}};
  }
  async function dashboard(){
    const me=await api('me');user=me.user;csrf=me.csrf;
    let product=null;
    if(selected){const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error('No se pudo consultar el catálogo.');const catalog=await response.json();product=catalog.products.find(p=>p.id===selected);}
    const available=product&&!product.out_of_stock&&product.stock_quantity!==0&&['automatic','manual'].includes(product.checkout_mode);
    const amount=product?Math.round(Number(product.pen)*100):0;
    config=await api('config');
    const topupKey='arcangel-topup:'+user.id;try{const pendingRequest=JSON.parse(sessionStorage.getItem(topupKey));if(pendingRequest&&me.movements.some(m=>m.reference==='topup:qr:'+pendingRequest.request_id)){sessionStorage.removeItem(topupKey);topupRequest=null;}}catch{}
    const pending=me.movements.find(m=>m.kind==='topup'&&m.status==='pending');
    watching=[...me.movements.filter(m=>m.kind==='topup'&&m.status==='pending').map(m=>({id:m.entry_id,type:'topup'})),...me.orders.filter(o=>o.status==='pending_manual').map(o=>({id:o.order_id,type:'order'})),...(me.reports||[]).filter(r=>r.status!=='resolved').map(r=>({id:r.report_id,type:'report',revision:r.revision}))];
    const ready=me.orders.filter(o=>o.status==='delivered').length,waiting=me.orders.filter(o=>o.status==='pending_manual').length;
    root.innerHTML=`<section class="account-top"><div><p class="balance-label">MI BILLETERA · SOLES</p><p class="balance">${money(user.balance_cents)}</p><p class="customer-email">${esc(user.email)}</p></div><div class="row-actions"><button id="refreshAccount" class="button secondary">Actualizar</button><button id="logoutAccount" class="button ghost">Salir</button></div></section><div class="account-summary"><div><span>Cuentas entregadas</span><strong>${ready}</strong></div><div><span>Pedidos en proceso</span><strong>${waiting}</strong></div><div><span>Recarga en revisión</span><strong>${pending?money(pending.amount_cents):'Sin pendientes'}</strong></div></div><nav class="account-nav" aria-label="Secciones de mi cuenta"><button class="button secondary" data-section="billetera">Mi billetera</button><button class="button secondary" data-section="compras">Mis cuentas y compras</button><button class="button secondary" data-section="acceso">Mi acceso</button></nav><div class="customer-grid"><div data-customer-section="compras">
    ${selected?`<section class="settings-card checkout-box"><p class="eyebrow">CONFIRMAR COMPRA</p><h2>${esc(product?.name||'Producto no disponible')}</h2>${available?`<p class="section-note">${product.checkout_mode==='automatic'?'Entrega automática: recibirás una cuenta disponible en Mis compras.':'Entrega manual: tu pedido quedará pendiente hasta que la tienda publique los datos en Mis compras.'}</p><p class="checkout-price">${money(amount)}</p><p class="form-help">Se descontará del saldo al confirmar. Una unidad por compra.</p><button id="confirmPurchase" class="button primary" ${user.balance_cents<amount?'disabled data-unavailable="true"':''}>Confirmar compra · ${money(amount)}</button>${user.balance_cents<amount?'<p class="account-error">Saldo insuficiente. Solicita una recarga para continuar.</p>':''}`:'<p class="section-note">Este producto ya no está disponible para comprar con saldo.</p>'}<p id="purchaseError" class="account-error" role="alert"></p><a class="button ghost small" href="/">Seguir viendo productos</a></section>`:''}
    <section class="settings-card orders-panel"><div class="section-heading"><div><p class="eyebrow">TUS PRODUCTOS DIGITALES</p><h2>Mis cuentas y compras</h2></div><a class="button secondary small" href="/">＋ Comprar productos</a></div><p class="section-note">Tus cuentas, datos de acceso y fechas en un solo lugar. Se muestran tus últimas 200 compras.</p><div class="purchase-status-filters" id="purchaseFilters" aria-label="Filtrar compras por estado"></div><div class="purchase-tools"><label class="field"><span>Buscar en mis compras</span><input id="searchOrders" type="search" placeholder="Producto, correo, perfil o número de pedido" maxlength="300"></label><span class="help">Desliza la tabla para ver todas las columnas.</span></div><div id="purchasesList"></div><dialog id="orderInfoDialog" class="purchase-dialog" aria-labelledby="orderInfoTitle"><div class="section-heading"><h2 id="orderInfoTitle">Información de la cuenta</h2><button class="button secondary small" id="closeOrderInfo" type="button">Cerrar</button></div><div id="orderInfoContent"></div></dialog></section></div>
    <div data-customer-section="billetera" class="wallet-columns"><section class="settings-card"><p class="eyebrow">AGREGAR SALDO</p><h2>Recarga con QR</h2><p class="section-note">Escanea el QR desde Yape o Plin, realiza el pago y solicita la revisión.</p>${config.payment_qr?`<div class="payment-qr"><img src="${esc(asset(config.payment_qr))}" alt="QR de pago de la tienda" id="paymentQr"><p id="qrLoadError" class="account-error" hidden>No se pudo cargar el QR. Actualiza la página antes de pagar.</p></div>${config.payment_name?`<p class="qr-owner">Titular: <strong>${esc(config.payment_name)}</strong></p>`:''}${pending?`<div class="pending-topup" role="status"><span class="order-status pending_manual">En revisión</span><h3>${money(pending.amount_cents)}</h3><p>Tu solicitud está pendiente. Te acreditaremos el saldo cuando confirmemos el pago.</p><small>${esc(date(pending.created_at))} · Solicitud #${esc(pending.entry_id.slice(0,8))}</small></div>`:`<form id="topupForm">${field('amount_soles','Monto que pagaste','number','required min="0.01" max="1000000" step="0.01" placeholder="S/ 0.00" inputmode="decimal"')}<button class="button primary" type="submit">Solicitar revisión</button><p class="form-help">El saldo se agrega cuando aprobemos tu pago.</p><p id="topupMessage" class="account-error" role="status"></p></form>`}`:'<div class="qr-empty">La tienda está preparando su QR de pago. Vuelve a consultar en unos momentos.</div>'}</section>
    <section class="settings-card"><h2>Movimientos</h2><p class="section-note">Últimos 200 movimientos.</p>${me.movements.length?me.movements.map(m=>`<div class="movement"><span>${{topup:'Recarga',yape_topup:'Recarga Yape',mp_topup:'Recarga Mercado Pago',purchase:'Compra',refund:'Devolución'}[m.kind]||esc(m.kind)}</span><strong>${money(m.amount_cents)}</strong><small>${statuses[m.status]||esc(m.status)} · ${esc(date(m.created_at))}<br>${esc(m.kind==='topup'?'Solicitud #'+m.entry_id.slice(0,8):m.note)}${m.kind==='topup'&&m.note?'<br>'+esc(m.note):''}</small></div>`).join(''):'<p class="section-note">Aún no hay movimientos.</p>'}</section></div></div>
    <section data-customer-section="acceso" class="settings-card"><h2>Mi acceso</h2><p class="section-note">Correo de tu cuenta: <strong>${esc(user.email)}</strong></p><p class="section-note">Tu saldo, historial y datos de entrega son privados. Para restablecer tu contraseña, cierra sesión y selecciona «Olvidé mi contraseña». Necesitarás tu código de recuperación. Si no lo encuentras, usa el botón de soporte por WhatsApp en esa pantalla.</p><a class="button secondary" href="/">Volver al catálogo</a></section><p class="customer-help">Guarda tu código de recuperación en un lugar privado.${config.whatsapp?` ¿Necesitas ayuda? <a href="https://wa.me/${esc(config.whatsapp)}" target="_blank" rel="noopener noreferrer">Contactar a la tienda</a>`:''}</p>`;
    const switchSection=section=>{if(!['billetera','compras','acceso'].includes(section))section='billetera';root.querySelectorAll('[data-customer-section]').forEach(el=>el.hidden=el.dataset.customerSection!==section);root.querySelectorAll('[data-section]').forEach(el=>{el.classList.toggle('primary',el.dataset.section===section);el.classList.toggle('secondary',el.dataset.section!==section);el.setAttribute('aria-current',el.dataset.section===section?'page':'false');});history.replaceState({},'',location.pathname+location.search+'#'+section);};
    root.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>switchSection(button.dataset.section));switchSection(location.hash.slice(1)||(selected?'compras':'billetera'));
    $('#refreshAccount').onclick=async()=>{locked(true);try{await dashboard();}catch(error){handle(error);}finally{locked(false);}};
    $('#logoutAccount').onclick=async()=>{locked(true);try{await api('logout',{});user=null;csrf='';watching=[];topupRequest=null;checkoutRequest=null;auth();}catch(error){toast(error.message,true);}finally{locked(false);}};
    if($('#confirmPurchase'))$('#confirmPurchase').onclick=async()=>{
      if(busy)return;locked(true);const key=`arcangel-purchase:${user.id}:${product.id}`;
      try{if(!checkoutRequest){try{checkoutRequest=JSON.parse(sessionStorage.getItem(key));}catch{}if(!checkoutRequest||checkoutRequest.expected_cents!==amount)checkoutRequest={request_id:crypto.randomUUID(),product_id:product.id,expected_cents:amount};try{sessionStorage.setItem(key,JSON.stringify(checkoutRequest));}catch{}}
        const result=await api('purchase',checkoutRequest);try{sessionStorage.removeItem(key);}catch{}checkoutRequest=null;selected=null;history.replaceState({},'',location.pathname+'#compras');await dashboard();toast(result.order.status==='delivered'?'Compra realizada. Ya puedes ver los datos de entrega.':'Compra realizada. La tienda atenderá tu pedido.');
      }catch(error){if($('#purchaseError'))$('#purchaseError').textContent=error.message+' Consulta Mis compras antes de volver a intentarlo.';else handle(error);}finally{locked(false);}
    };
    if($('#paymentQr'))$('#paymentQr').onerror=()=>{$('#paymentQr').hidden=true;$('#qrLoadError').hidden=false;const submit=$('#topupForm button[type=submit]');if(submit){submit.disabled=true;submit.dataset.unavailable='true';}};
    setupOrders(me.orders,me.reports||[]);
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
  function setupOrders(orders,reports){
    let query='',status='all',page=1,size=10;
    const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    const today=[dateParts.year,dateParts.month,dateParts.day].join('-');
    const expired=o=>o.status==='delivered'&&!!o.account?.expires_on&&o.account.expires_on<today;
    const day=value=>value?value.split('-').reverse().join('/'):'Sin definir';
    const remaining=o=>{if(!o.account?.expires_on)return '—';const days=Math.round((Date.parse(o.account.expires_on+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);return days<0?'Vencida':days===0?'Vence hoy':days+' días';};
    const matches=(o,key)=>key==='all'||(key==='expired'?expired(o):o.status===key);
    const chips=[['all','Todas'],['delivered','Entregadas'],['pending_manual','En proceso'],['expired','Vencidas'],['refunded','Saldo devuelto']];
    const filterRoot=$('#purchaseFilters'),list=$('#purchasesList'),dialog=$('#orderInfoDialog');
    $('#closeOrderInfo').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{$('#orderInfoContent').textContent='';});
    function reportButton(order){
      const button=document.createElement('button');button.type='button';button.className='button secondary small report-account-button';
      const existing=reports.filter(r=>r.order_id===order.order_id),active=existing.find(r=>r.status!=='resolved');
      button.textContent=active?'Ver reporte · '+reportStates[active.status]:existing.length?'Reportes de la cuenta':'Reportar cuenta';
      button.onclick=()=>openReport(order);return button;
    }
    function openReport(order){
      const items=reports.filter(r=>r.order_id===order.order_id),active=items.find(r=>r.status!=='resolved'),content=$('#orderInfoContent');
      $('#orderInfoTitle').textContent='Soporte · '+order.product_name;
      content.innerHTML=`<p class="section-note">Pedido #${esc(order.order_id.slice(0,8))}${order.account?.username?' · '+esc(order.account.username):''}</p>${items.map(r=>`<article class="customer-report"><div class="section-heading"><strong>${reportStates[r.status]}</strong><small>${esc(date(r.created_at))}</small></div><h3>Tu reporte</h3><p>${esc(r.message)}</p>${r.owner_reply?`<h3>Respuesta de soporte</h3><p>${esc(r.owner_reply)}</p><small>Actualizado: ${esc(date(r.updated_at))}</small>`:'<p class="section-note">El equipo de soporte revisará tu solicitud.</p>'}</article>`).join('')}${active?'<p class="section-note">Ya tienes un reporte abierto para esta cuenta. Aquí verás la respuesta de soporte.</p>':order.status==='delivered'?'<form id="accountReportForm"><label class="field"><span>Describe la falla de la cuenta</span><textarea name="message" required maxlength="3000" rows="5" placeholder="Por ejemplo: aparece contraseña incorrecta al intentar entrar."></textarea></label><p class="form-help">Indica qué ocurre y desde cuándo para que podamos ayudarte.</p><p id="accountReportError" class="account-error" role="alert"></p><button class="button primary" type="submit">Enviar reporte</button></form>':''}`;
      const form=$('#accountReportForm');
      if(form){
        const draft=reportDrafts.get(order.order_id)||{request_id:crypto.randomUUID(),message:''};form.elements.message.value=draft.message;
        form.oninput=()=>{draft.message=form.elements.message.value;reportDrafts.set(order.order_id,draft);};
        form.onsubmit=async e=>{e.preventDefault();if(busy)return;draft.message=form.elements.message.value.trim();reportDrafts.set(order.order_id,draft);locked(true);$('#accountReportError').textContent='';try{await api('reports',{order_id:order.order_id,request_id:draft.request_id,message:draft.message});reportDrafts.delete(order.order_id);dialog.close();await dashboard();toast('Reporte enviado. Puedes consultar su estado y la respuesta desde Mis cuentas y compras.');}catch(error){if(error.status===401)handle(error);else if($('#accountReportError'))$('#accountReportError').textContent=error.message;else handle(error);}finally{locked(false);}};
      }
      if(!dialog.open)dialog.showModal();
    }
    function draw(){
      filterRoot.innerHTML=chips.map(([key,label])=>`<button type="button" class="purchase-chip ${status===key?'active':''}" data-purchase-filter="${key}" aria-pressed="${status===key}">${label}<span>${orders.filter(o=>matches(o,key)).length}</span></button>`).join('');
      filterRoot.querySelectorAll('button').forEach(b=>b.onclick=()=>{status=b.dataset.purchaseFilter;page=1;draw();});
      const filtered=orders.filter(o=>matches(o,status)&&[o.product_name,o.order_id,o.account?.username,o.account?.profile].join(' ').toLocaleLowerCase('es').includes(query));
      const pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.max(1,Math.min(page,pages));const start=(page-1)*size;
      list.innerHTML=`<div class="purchases-table-wrap" role="region" aria-label="Tabla de mis cuentas y compras" tabindex="0"><table class="purchases-table"><thead><tr>${['Pedido / compra','Producto','Correo / usuario','Clave','Perfil','PIN','Información','Inicio','Término','Días restantes','Importe','Estado'].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${filtered.slice(start,start+size).map(o=>{
        const a=o.account,label=a?.username||o.product_name;
        return `<tr><td><span class="purchase-id" title="${esc(o.order_id)}">#${esc(o.order_id.slice(0,8))}</span><time datetime="${esc(new Date(o.created_at).toISOString())}">${esc(date(o.created_at))}</time></td><td><div class="purchase-platform"><img src="${esc(asset(o.product_logo||'logo/arcangel-us.png'))}" alt="Logo de ${esc(o.product_name)}" loading="lazy"><div><strong>${esc(o.product_name)}</strong><small>${o.delivery_mode==='automatic'?'Entrega automática':'Entrega de la tienda'}</small></div></div></td><td class="purchase-email">${a?esc(a.username||'Ver información'):'<span class="purchase-muted">'+(o.status==='pending_manual'?'Pendiente de entrega':'—')+'</span>'}</td><td><div class="purchase-password"><span data-key-value>${a?.has_password?'••••••••':'—'}</span>${a?.has_password?`<button type="button" class="button ghost small" data-order-password="${esc(o.order_id)}" aria-label="Mostrar clave de ${esc(label)}" aria-pressed="false">Ver</button>`:''}</div></td><td>${esc(a?.profile||'—')}</td><td class="purchase-pin">${esc(a?.pin||'—')}</td><td><div class="purchase-actions"><button type="button" class="button secondary small" data-order-info="${esc(o.order_id)}">Ver detalles</button>${a?.url?`<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Abrir plataforma ↗</a>`:''}</div></td><td class="purchase-date">${a?day(a.starts_on):'—'}</td><td class="purchase-date">${a?day(a.expires_on):'—'}</td><td><span class="purchase-days ${expired(o)?'expired':''}">${remaining(o)}</span></td><td class="purchase-amount">${money(o.amount_cents)}</td><td><span class="order-status ${expired(o)?'expired':esc(o.status)}">${expired(o)?'Vencida':statuses[o.status]||esc(o.status)}</span></td></tr>`;
      }).join('')||`<tr><td colspan="12" class="empty-purchases">${orders.length?'No hay compras que coincidan con estos filtros.':'Todavía no tienes compras. Elige un producto de la tienda para empezar.'}</td></tr>`}</tbody></table></div><div class="purchase-pagination"><span role="status">${filtered.length?start+1:0}–${Math.min(start+size,filtered.length)} de ${filtered.length} compras · Página ${page} de ${pages}</span><label>Mostrar <select id="purchasePageSize" aria-label="Compras por página">${[10,25,50].map(n=>`<option value="${n}" ${size===n?'selected':''}>${n}</option>`).join('')}</select> por página</label><div class="row-actions"><button type="button" class="button secondary small" id="purchasePrevious" data-unavailable="${page===1}" ${page===1?'disabled':''}>Anterior</button><button type="button" class="button secondary small" id="purchaseNext" data-unavailable="${page===pages}" ${page===pages?'disabled':''}>Siguiente</button></div></div>`;
      list.querySelectorAll('.purchase-platform img').forEach(img=>img.onerror=()=>{img.hidden=true;});
      list.querySelectorAll('[data-order-info]').forEach(details=>{
        const order=orders.find(o=>o.order_id===details.dataset.orderInfo);if(order.account||reports.some(r=>r.order_id===order.order_id))details.parentElement.append(reportButton(order));if(!order.account)return;
        const copy=document.createElement('button');copy.type='button';copy.className='button secondary small';copy.textContent='Copiar datos';copy.setAttribute('aria-label','Copiar datos de '+(order.account.username||order.product_name));copy.onclick=()=>copyOrder(order,copy);details.after(copy);
      });
      $('#purchasePrevious').onclick=()=>{page--;draw();};$('#purchaseNext').onclick=()=>{page++;draw();};$('#purchasePageSize').onchange=e=>{size=Number(e.target.value);page=1;draw();};
      list.querySelectorAll('[data-order-password]').forEach(button=>button.onclick=async()=>{
        const value=button.previousElementSibling;
        if(button.getAttribute('aria-pressed')==='true'){value.textContent='••••••••';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',button.getAttribute('aria-label').replace('Ocultar','Mostrar'));button.textContent='Ver';return;}
        button.disabled=true;try{const result=await api('order',{order_id:button.dataset.orderPassword});if(!button.isConnected)return;value.textContent=result.delivery.password;button.setAttribute('aria-pressed','true');button.setAttribute('aria-label',button.getAttribute('aria-label').replace('Mostrar','Ocultar'));button.textContent='Ocultar';}catch(error){handle(error);}finally{button.disabled=false;}
      });
      list.querySelectorAll('[data-order-info]').forEach(button=>button.onclick=()=>{
        const o=orders.find(o=>o.order_id===button.dataset.orderInfo),a=o.account;
        $('#orderInfoTitle').textContent=o.product_name;
        const fields=[['Pedido',o.order_id],['Fecha de compra',date(o.created_at)],['Estado',statuses[o.status]],['Importe',money(o.amount_cents)],...(a?[['Correo / usuario',a.username],['Perfil',a.profile],['PIN',a.pin],['Inicio',day(a.starts_on)],['Término',day(a.expires_on)],['Instrucciones',a.notes||'La tienda no añadió instrucciones adicionales.']]:[['Información',o.status==='pending_manual'?'Estamos preparando tu entrega. Los datos aparecerán aquí cuando esté lista.':'El importe de este pedido fue devuelto a tu billetera.']])];
        $('#orderInfoContent').innerHTML='<dl class="purchase-detail-list">'+fields.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')+'</dl>';dialog.showModal();
        if(a||reports.some(r=>r.order_id===o.order_id))$('#orderInfoContent').prepend(reportButton(o));
        if(a){const copy=document.createElement('button');copy.type='button';copy.className='button primary';copy.textContent='Copiar datos';copy.onclick=()=>copyOrder(o,copy);$('#orderInfoContent').prepend(copy);}
      });
      if(busy)locked(true);
    }
    $('#searchOrders').oninput=e=>{query=e.target.value.trim().toLocaleLowerCase('es');page=1;draw();};draw();
  }
  function handle(error){if(error.status===401){user=null;csrf='';auth();}toast(error.message,true);}
  async function checkUpdates(){
    if(!user||busy||checking||document.hidden||!watching.length||$('#topupForm [name=amount_soles]')?.value||$('#searchOrders')?.value||root.querySelector('[data-order-password][aria-pressed=true],#orderInfoDialog[open]')||document.activeElement?.matches('input,select,textarea'))return;
    checking=true;const current=user.id;
    try{const me=await api('me');if(user?.id!==current||busy)return;const updates=watching.map(item=>item.type==='report'?(me.reports||[]).find(r=>r.report_id===item.id&&r.revision!==item.revision):item.type==='topup'?me.movements.find(m=>m.entry_id===item.id&&m.status!=='pending'):me.orders.find(o=>o.order_id===item.id&&o.status!=='pending_manual')).filter(Boolean);if(updates.length){locked(true);try{await dashboard();toast(updates.some(x=>x.report_id)?'Soporte respondió a tu reporte. Revisa Mis cuentas y compras.':updates.some(x=>x.kind==='topup'&&x.status==='approved')?'Recarga aprobada. Tu saldo ya está disponible.':updates.some(x=>x.kind==='topup'&&x.status==='rejected')?'Tu solicitud fue revisada. Consulta el detalle en Movimientos.':'Tu pedido tiene una actualización. Revisa Mis cuentas y compras.');}finally{locked(false);}}}catch(error){if(error.status===401)handle(error);}finally{checking=false;}
  }
  setInterval(checkUpdates,15000);document.addEventListener('visibilitychange',checkUpdates);
  async function start(){config=await api('config');if(!config.enabled){root.innerHTML='<section class="settings-card"><h2>Las cuentas de clientes aún no están disponibles</h2><a class="button primary" href="/">Volver a la tienda</a></section>';return;}try{await dashboard();}catch(error){if(error.status===401)auth();else throw error;}}
  window.addEventListener('beforeunload',e=>{if(busy||[...reportDrafts.values()].some(d=>d.message.trim())){e.preventDefault();e.returnValue='';}});
  start().catch(error=>{root.textContent=error.message;});
})();
