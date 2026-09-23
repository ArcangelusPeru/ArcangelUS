(() => {
  'use strict';
  let timer=null,ctx=null,audio=null,sound=false,seen=null,polling=false,generation=0;
  const el=id=>document.getElementById(id);
  function setSound(value){sound=value;el('enableSalesSound').textContent=value?'Altavoz de recargas activado · silenciar':'Activar altavoz de recargas';el('enableSalesSound').setAttribute('aria-pressed',String(value));}
  function manualText(requests){
    if(requests.length!==1)return `Has recibido ${requests.length} solicitudes nuevas de recarga manual. Revisa los pagos en tu panel.`;
    const amount=requests[0].amount_cents;
    if(!Number.isSafeInteger(amount)||amount<1)return 'Has recibido una solicitud de recarga manual. Revisa el pago en tu panel.';
    const whole=Math.floor(amount/100),cents=amount%100;
    return `Has recibido una solicitud de recarga manual por ${whole} ${whole===1?'sol':'soles'}${cents?` con ${cents} ${cents===1?'céntimo':'céntimos'}`:''}. Revisa el pago en tu panel.`;
  }
  function prepareChime(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio&&!audio)audio=new Audio();audio?.resume().catch(()=>{});}catch{}}
  function announce(text){
    const current=generation;
    const fallback=()=>{if(current!==generation||!ctx)return;el('salesVoiceLast').textContent='No se pudo reproducir la voz. Revisa el volumen o prueba en Chrome o Edge con una voz en español. Los avisos seguirán visibles.';chime();};
    const queued=window.arcangelYapeVoice?.announce(text,{onStart:()=>{if(current===generation)el('salesVoiceLast').textContent=text;},onError:fallback});
    if(!queued)fallback();
  }
  async function chime(){
    if(!audio||!sound)return;
    try{
      await audio.resume();if(audio.state!=='running')throw Error('Audio suspendido');
      const start=audio.currentTime;
      for(const [delay,frequency] of [[0,659.25],[0.2,880],[0.4,987.77]]){
        const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(0,start+delay);gain.gain.linearRampToValueAtTime(0.12,start+delay+0.025);gain.gain.exponentialRampToValueAtTime(0.001,start+delay+0.24);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start+delay);oscillator.stop(start+delay+0.25);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }catch{setSound(false);el('salesAlertStatus').textContent='Vuelve a activar el sonido para escuchar nuevas solicitudes.';}
  }
  async function refresh(){
    if(!ctx||polling)return;polling=true;const current=generation;
    try{
      const data=await ctx.api('/api/admin/commerce/alerts');if(current!==generation)return;
      if(!data.enabled){stop();return;}
      const incoming=new Set([...data.requests.map(r=>'topup:'+r.entry_id),...(data.yape||[]).map(r=>'yape:'+r.claim_id),...(data.reports||[]).map(r=>'report:'+r.report_id)]),fresh=seen!==null&&[...incoming].some(id=>!seen.has(id));
      const manual=seen===null?[]:data.requests.filter(r=>!seen.has('topup:'+r.entry_id));
      if(seen===null)seen=incoming;else for(const id of incoming)seen.add(id);
      el('salesAlert').hidden=false;el('salesAlert').classList.toggle('has-pending',data.pending>0||data.pending_reports>0||data.pending_yape>0);
      el('salesAlertTitle').textContent=[data.pending?`${data.pending} recarga(s) en revisión`:'',data.pending_yape?`${data.pending_yape} pago(s) en Yape automático por revisar`:'',data.pending_reports?`${data.pending_reports} reporte(s) de cuentas por atender`:''].filter(Boolean).join(' · ')||'Sin recargas ni reportes pendientes';
      el('salesAlertStatus').textContent=fresh?'Llegó una nueva recarga o reporte de cuenta. Revisa los avisos pendientes.':'Avisos automáticos cada 10 segundos mientras el panel esté abierto.';
      el('reviewSalesRequests').hidden=!data.pending&&!data.pending_yape;el('reviewSalesRequests').onclick=()=>ctx?.onReview(data.pending?'salesTopups':'salesYape');el('reviewAccountReports').hidden=!data.pending_reports;
      if(sound&&manual.length)announce(manualText(manual));else if(fresh)await chime();
    }catch(error){if(current!==generation)return;if(error.status===401){stop();return;}el('salesAlertStatus').textContent='No se pudieron actualizar los avisos. Volveremos a intentarlo.';}
    finally{if(current===generation)polling=false;}
  }
  function stop(){generation++;ctx=null;seen=null;polling=false;clearInterval(timer);timer=null;setSound(false);window.arcangelYapeVoice?.cancelAnnouncements();el('salesAlert').hidden=true;el('salesVoiceLast').textContent='';if(audio){audio.close().catch(()=>{});audio=null;}}
  function start(context){
    ctx=context;if(timer)return;generation++;
    setSound(context.autoStart!==false);if(sound)prepareChime();
    el('enableSalesSound').onclick=()=>{
      if(sound){setSound(false);window.arcangelYapeVoice?.cancelAnnouncements();el('salesVoiceLast').textContent='Altavoz de recargas silenciado.';return;}
      prepareChime();setSound(true);announce('Altavoz activado. Te avisaré cuando llegue una solicitud de recarga manual.');
    };
    el('testSalesVoice').onclick=()=>{prepareChime();announce('Prueba de altavoz. '+manualText([{amount_cents:2500}]));};
    el('reviewSalesRequests').onclick=()=>ctx?.onReview('salesTopups');el('reviewAccountReports').onclick=()=>ctx?.onReview('salesReports');
    refresh();timer=setInterval(refresh,10000);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('focus',refresh);
  document.addEventListener('pointerdown',event=>{if(event.isTrusted&&sound&&audio?.state!=='running')prepareChime();});
  document.addEventListener('keydown',event=>{if(event.isTrusted&&sound&&audio?.state!=='running')prepareChime();});
  window.addEventListener('pagehide',()=>{generation++;polling=false;clearInterval(timer);timer=null;window.arcangelYapeVoice?.cancelAnnouncements();if(audio)audio.suspend().catch(()=>{});});
  window.addEventListener('pageshow',()=>{if(ctx&&!timer){refresh();timer=setInterval(refresh,10000);}});
  window.arcangelAlerts={start,stop,refresh,manualText,unlock:prepareChime};
})();
