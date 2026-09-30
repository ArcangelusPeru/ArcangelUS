(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let generation=0;
  window.addEventListener('arcangel:account',async event=>{
    const current=++generation,{me,config,api,refresh}=event.detail;
    if(!config.yape?.enabled||!config.payment_qr)return;
    const wallet=document.querySelector('[data-customer-section="billetera"]');if(!wallet)return;
    const box=document.createElement('section');box.className='settings-card yape-auto-card';wallet.prepend(box);
    const asset=/^https?:\/\//.test(config.payment_qr)?config.payment_qr:'/'+config.payment_qr.replace(/^\//,'');
    let claim=null,working=false,online=config.yape.online;
    const draftKey='arcangel-yape:'+me.user.id;let draft;try{draft=JSON.parse(sessionStorage.getItem(draftKey));}catch{}
    const messages={approved:'Pago validado. El saldo ya está en tu billetera.',review:'La validación necesita ayuda de soporte. No vuelvas a pagar.',expired:'El plazo de validación terminó. Si pagaste, contacta soporte; no vuelvas a pagar.',rejected:'Solicitud rechazada por soporte. Consulta el detalle en Movimientos.'};
    function draw(message=''){
      if(current!==generation)return;
      box.classList.toggle('yape-offline',!online);
      wallet.classList.toggle('wallet-offline',!online);
      let walletNotice=wallet.querySelector('[data-wallet-offline]');
      if(!online&&!walletNotice){
        walletNotice=document.createElement('div');
        walletNotice.className='wallet-offline-notice';walletNotice.dataset.walletOffline='';walletNotice.setAttribute('role','alert');
        walletNotice.innerHTML='<span class="wallet-offline-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M27 10a6 6 0 0 1 10 0l24 42a6 6 0 0 1-5 9H8a6 6 0 0 1-5-9Z" fill="#a71735" stroke="#ff6881" stroke-width="3"/><path d="M32 24v15" stroke="white" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="49" r="3" fill="white"/></svg></span><div class="wallet-offline-copy"><span class="wallet-offline-label">SIN CONEXIÓN RECIENTE</span><strong>El servidor está <em>sin señal</em></strong><p>El sector de recargas está temporalmente bloqueado.<br>Inténtalo más tarde.</p></div><svg class="wallet-offline-wifi" viewBox="0 0 100 90" fill="none" aria-hidden="true"><path d="M10 25Q50-7 90 25M23 43Q50 20 77 43M37 60Q50 49 63 60" stroke="#bdb0c6" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="77" r="7" fill="#ff355a"/><circle cx="79" cy="65" r="19" fill="#ef244e"/><path d="m72 58 14 14m0-14L72 72" stroke="white" stroke-width="5"/></svg><button type="button" class="button secondary" data-wallet-check><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Comprobar conexión</button>';
        wallet.prepend(walletNotice);
      } else if(online) walletNotice?.remove();
      const pending=claim?.status==='yape_pending';
      box.innerHTML=`<p class="eyebrow">PAGOS EN AUTOMÁTICO SOLO PARA YAPE</p><h2>Recarga con Yape</h2><p class="section-note">El saldo se añade cuando recibimos y validamos la notificación del pago. Plin se atiende por revisión manual.</p>${!online?'<div class="yape-offline-notice" role="alert">⚠ El servidor está sin señal, inténtalo más tarde.</div><button class="button secondary" data-check>Comprobar conexión</button>':''}${pending?`<div class="payment-qr"><img src="${esc(asset)}" alt="QR de Yape de la tienda"></div><p class="qr-owner">${config.payment_name?'Titular: <strong>'+esc(config.payment_name)+'</strong> · ':''}Paga exactamente <strong>S/ ${(claim.amount_cents/100).toFixed(2)}</strong></p><p class="form-help">Válido hasta las ${esc(new Date(claim.expires_at).toLocaleTimeString('es-PE'))}. Realiza el pago después de iniciar esta solicitud.</p><form data-verify><label class="field"><span>Primer nombre que aparece en Yape</span><input name="first_name" required maxlength="40" autocomplete="given-name" placeholder="Ejemplo: Willy"></label><label class="field"><span>Código de seguridad del comprobante</span><input name="code" required inputmode="numeric" pattern="[0-9]{3}" minlength="3" maxlength="3" autocomplete="off" placeholder="3 dígitos"></label><p class="form-help">Es el código de 3 dígitos que aparece después de pagar. Nunca escribas tu clave de acceso a Yape. Espera unos segundos antes de validar. Quedan ${claim.attempts_remaining} intentos.</p><button type="submit" class="button primary" ${online?'':'disabled'}>Ya pagué · Validar pago</button></form>`:!claim||claim.status!=='approved'?`<form data-start><label class="field"><span>Monto a recargar</span><input name="amount_soles" type="number" min="1" max="100" step="0.01" inputmode="decimal" required placeholder="S/ 0.00"></label><button type="submit" class="button primary" ${online?'':'disabled'}>Mostrar QR e iniciar recarga</button><p class="form-help">Entre S/ 1.00 y S/ 100.00. Prepara tu solicitud antes de pagar. Tendrás 15 minutos para validarla.</p></form>`:''}<p class="account-error" role="status">${esc(message||messages[claim?.status]||'')}</p><a class="button secondary small" href="https://wa.me/${esc(config.whatsapp||'51929688960')}?text=${encodeURIComponent('Necesito ayuda con una recarga de Yape'+(claim?' · Solicitud '+claim.id:''))}" target="_blank" rel="noopener noreferrer">Ayuda con mi pago</a>`;
      box.querySelectorAll('form input,form button').forEach(control=>control.disabled=!online);
      const qr=box.querySelector('img');if(qr)qr.onerror=()=>{box.querySelector('[role=status]').textContent='No se pudo cargar el QR. No pagues hasta que se vea correctamente.';box.querySelector('[data-verify] button').disabled=true;};
      box.querySelector('[data-check]')?.addEventListener('click',load);
      const check=wallet.querySelector('[data-wallet-check]');if(check)check.onclick=load;
      Array.from(wallet.children).forEach(child=>{if(!child.hasAttribute('data-wallet-offline'))child.inert=!online;});
      const start=box.querySelector('[data-start]');if(start){if(draft)start.elements.amount_soles.value=draft.amount_soles;start.onsubmit=async e=>{e.preventDefault();await run(async()=>{
        const amount=Number(start.elements.amount_soles.value).toFixed(2);
        if(draft&&draft.amount_soles!==amount)throw Error('Reintenta con el monto anterior para confirmar esa solicitud.');
        draft=draft||{request_id:crypto.randomUUID(),amount_soles:amount};try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{}
        claim=await api('yape/start',draft);draft=null;try{sessionStorage.removeItem(draftKey);}catch{}draw();
      });};}
      box.querySelector('[data-verify]')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);await run(async()=>{claim=await api('yape/verify',{id:claim.id,first_name:f.get('first_name').trim(),code:f.get('code').trim()});if(claim.status==='approved'){await refresh();return;}draw(claim.message);});});
    }
    async function run(action){if(working||!online)return;working=true;box.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();}catch(error){if(error.status===400||error.status===409){draft=null;try{sessionStorage.removeItem(draftKey);}catch{}}box.querySelector('[role=status]').textContent=error.message;}finally{working=false;box.querySelectorAll('button').forEach(b=>b.disabled=!online&&!b.hasAttribute('data-check'));}}
    async function load(){try{const result=await api('yape/current');if(current!==generation)return;claim=result.claim;online=result.online&&result.enabled;draw();}catch(error){box.textContent=error.message;}}
    await load();
  });
})();


