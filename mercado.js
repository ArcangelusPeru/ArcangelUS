(() => {
  'use strict';
  let timer=null,working=false,generation=0;
  const money=n=>'S/ '+(Number(n)/100).toFixed(2);
  window.addEventListener('arcangel:account',event=>{
    clearInterval(timer);const current=++generation,{me,config,api,refresh}=event.detail;
    if(!config.mercadopago?.enabled)return;
    const wallet=document.querySelector('[data-customer-section="billetera"]');if(!wallet)return;
    const box=document.createElement('section');box.className='settings-card mercado-card';
    box.innerHTML='<p class="eyebrow">RECARGA AUTOMÁTICA</p><h2>Mercado Pago</h2><p class="section-note">Elige cuánto saldo necesitas. Se añadirá a tu billetera cuando Mercado Pago confirme el pago.</p>'+(config.mercadopago.environment==='test'?'<p class="account-error">Modo de prueba: usa únicamente la cuenta y tarjetas de prueba de Mercado Pago.</p>':'')+'<form><label class="field"><span>Monto a recargar</span><input name="amount_soles" type="number" min="1" max="1000" step="0.01" inputmode="decimal" required placeholder="S/ 0.00"></label><button class="button primary" type="submit">Pagar con Mercado Pago</button><p class="form-help">Entre S/ 1.00 y S/ 1,000.00. El saldo se usa en esta tienda.</p></form><p class="account-error" role="status"></p><div class="mp-pending-list"></div>';
    wallet.prepend(box);
    const form=box.querySelector('form'),message=box.querySelector('[role=status]'),key='arcangel-mp:'+me.user.id,pending=me.movements.filter(m=>m.kind==='mp_topup'&&m.status==='mp_pending');
    let saved;try{saved=JSON.parse(sessionStorage.getItem(key));}catch{}
    if(saved)form.elements.amount_soles.value=saved.amount_soles;
    function payLink(url){
      const u=new URL(url);if(u.protocol!=='https:'||!['mercadopago.com.pe','www.mercadopago.com.pe'].includes(u.hostname)||u.username||u.password||u.port||!u.pathname.startsWith('/checkout/'))throw Error('No se pudo verificar el enlace de pago.');
      const link=document.createElement('a');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';link.className='button primary';link.textContent='Continuar al pago ↗';return link;
    }
    form.onsubmit=async e=>{
      e.preventDefault();if(working)return;working=true;const button=form.querySelector('button');button.disabled=true;message.textContent='Preparando tu pago…';
      try{
        const amount=Number(form.elements.amount_soles.value).toFixed(2);
        if(saved&&saved.amount_soles!==amount)throw Error('Reintenta con el monto anterior para confirmar esa solicitud antes de cambiarlo.');
        saved=saved||{request_id:crypto.randomUUID(),amount_soles:amount};try{sessionStorage.setItem(key,JSON.stringify(saved));}catch{}
        const result=await api('mercadopago/create',saved);
        if(current!==generation)return;
        const link=result.checkout_url?payLink(result.checkout_url):null;
        try{sessionStorage.removeItem(key);}catch{}saved=null;
        form.hidden=true;message.textContent=link?'Tu pago está listo. Ábrelo y completa la operación.':'Consulta el resultado en Movimientos.';
        if(link)message.after(link);
        pending.push({entry_id:result.id,status:result.status});
      }catch(error){message.textContent=error.message;}finally{working=false;button.disabled=false;}
    };
    const list=box.querySelector('.mp-pending-list');
    pending.forEach(m=>{const row=document.createElement('p');row.textContent=money(m.amount_cents)+' · Esperando confirmación ';const button=document.createElement('button');button.className='button secondary small';button.textContent='Verificar pago';button.type='button';button.onclick=()=>check(m.entry_id,true,row);row.append(button);list.append(row);});
    async function check(id,show=false,row=null){
      if(working)return;working=true;
      try{const result=await api('mercadopago/status',{id});if(current!==generation)return;if(result.status!=='mp_pending'){await refresh();return;}if(show){message.textContent='Mercado Pago todavía no confirma el pago. El saldo se acreditará automáticamente al aprobarse.';if(row&&result.checkout_url&&!row.querySelector('a'))row.append(payLink(result.checkout_url));}}
      catch(error){if(show)message.textContent=error.message;}
      finally{working=false;}
    }
    const returning=new URLSearchParams(location.search).get('recarga');
    if(returning){const u=new URL(location.href);u.searchParams.delete('recarga');history.replaceState({},'',u.pathname+u.search+u.hash);check(returning,true);}
    let index=0;
    timer=setInterval(()=>{if(document.hidden||!box.isConnected||!pending.length||document.activeElement?.matches('input,textarea,select'))return;check(pending[index++%pending.length].entry_id);},15000);
  });
})();
