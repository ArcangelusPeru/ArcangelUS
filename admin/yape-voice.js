(() => {
  'use strict';
  const el=id=>document.getElementById(id),digits=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
  let ctx=null,enabled=false,timer=null,generation=0,busy=false,baseline=true,startAt=null,lastThrough=null,seen=new Map(),queue=[],utterance=null,speakingItem=null,speechTimer=null,speechGeneration=0;
  function paymentText(event){
    if(event.unreadable||!event.name||!Number.isSafeInteger(event.amount_cents)||event.amount_cents<1)return 'Llegó una notificación de Yape. No se pudieron leer todos sus datos. Revísala en el panel.';
    const whole=Math.floor(event.amount_cents/100),cents=event.amount_cents%100;
    const amount=`${whole} ${whole===1?'sol':'soles'}${cents?` con ${cents} ${cents===1?'céntimo':'céntimos'}`:''}`;
    const name=event.name.replace(/\*/g,'').trim();
    let text=`${name} te envió un pago por ${amount}.`;
    text+=/^\d{3}$/.test(event.code||'')?` El código de seguridad es: ${[...event.code].map(d=>digits[Number(d)]).join(', ')}.`:' Este pago no tiene código de seguridad.';
    if(event.state==='ambiguous')text+=' Posible duplicado. Revisa el aviso.';
    return text;
  }
  const supported=()=>!!window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==='function';
  function status(text){el('yapeVoiceStatus').textContent=text;}
  function paint(){const button=el('enableYapeVoice');button.textContent=enabled?'Altavoz activado · silenciar':'Activar altavoz';button.setAttribute('aria-pressed',String(enabled));el('yapeVoice').classList.toggle('voice-on',enabled);}
  function cancelSpeech(source=null){
    queue=source?queue.filter(item=>item.source!==source):[];
    if(source&&speakingItem?.source!==source)return;
    speechGeneration++;clearTimeout(speechTimer);speechTimer=null;utterance=null;speakingItem=null;
    if(supported())window.speechSynthesis.cancel();
    if(source)speakNext();
  }
  function silence(){enabled=false;generation++;busy=false;clearInterval(timer);timer=null;baseline=true;startAt=lastThrough=null;seen.clear();cancelSpeech('yape');paint();}
  function voiceFailure(){silence();status('No se pudo reproducir la voz. Comprueba el volumen y prueba de nuevo. Si continúa, abre el panel en Chrome o Edge con una voz en español instalada.');}
  function speakNext(){
    if(utterance||!queue.length||!ctx)return;
    const item=queue.shift(),speechId=speechGeneration;speakingItem=item;
    const fail=()=>{if(speechId!==speechGeneration)return;if(item.source==='yape')voiceFailure();else{cancelSpeech(item.source);item.onError?.();}};
    try{
      const synth=window.speechSynthesis;
      utterance=new window.SpeechSynthesisUtterance(item.text);
      const spanish=synth.getVoices().filter(voice=>/^es(?:-|_)/i.test(voice.lang));
      const voice=spanish.find(voice=>voice.localService&&/^es-PE$/i.test(voice.lang))||spanish.find(voice=>voice.localService)||spanish[0];
      if(voice)utterance.voice=voice;
      utterance.lang=voice?.lang||'es-PE';utterance.rate=.95;utterance.pitch=1;utterance.volume=1;
      utterance.onstart=()=>{if(speechId!==speechGeneration)return;if(item.source==='yape')el('yapeVoiceLast').textContent=item.label;item.onStart?.();};
      utterance.onend=()=>{if(speechId!==speechGeneration)return;clearTimeout(speechTimer);utterance=null;speakingItem=null;speakNext();};
      utterance.onerror=fail;
      // Some embedded browsers expose the API but never start a voice.
      speechTimer=setTimeout(fail,45000);
      synth.resume();synth.speak(utterance);
    }catch{fail();}
  }
  function enqueue(text,label=text,options={}){queue.push({text,label,source:'yape',...options});speakNext();}
  // One queue prevents Yape and manual recharge announcements from overlapping.
  function announce(text,options={}){if(!ctx||!supported())return false;enqueue(text,text,{...options,source:'sales'});return true;}
  async function poll(){
    if(!ctx||!enabled||busy)return;
    busy=true;const current=generation;
    try{
      const initial=baseline;
      if(startAt===null){const boot=await ctx.api('/api/admin/commerce/yape/announcements?bootstrap=1');if(current!==generation)return;startAt=lastThrough=boot.since;}
      // A one-minute overlap catches commits in the same server timestamp;
      // event IDs deduplicate arrivals across polls, filters and state changes.
      const since=Math.max(startAt,lastThrough-60);let after='',through=initial?startAt:null;
      do{
        const params=new URLSearchParams({since:String(since),...(through?{through:String(through)}:{}),...(after?{after}:{})});
        const batch=await ctx.api('/api/admin/commerce/yape/announcements?'+params);
        if(current!==generation)return;through=batch.through;
        for(const event of batch.events){
          if(!seen.has(event.event_id)&&!initial)enqueue(paymentText(event));
          if(current!==generation)return;seen.set(event.event_id,event.received_sec);
        }
        after=batch.next||'';
      }while(after);
      lastThrough=through;baseline=false;
      for(const [id,time] of seen)if(time<Math.max(startAt,lastThrough-60))seen.delete(id);
      status('Escuchando Yapeos nuevos cada 10 segundos en todas las secciones. Mantén el panel abierto y el equipo despierto.');
    }catch(error){
      if(current!==generation)return;
      if(error.status===401){stop();return;}
      if(error.status===503){silence();status('Yape no está configurado en este entorno.');return;}
      status('No se pudo consultar Yape. Reintentaremos la conexión automáticamente.');
    }finally{if(current===generation)busy=false;}
  }
  function toggle(){
    if(enabled){silence();status('Altavoz silenciado. Los pagos siguen guardados en Notificaciones Yape.');return;}
    if(!supported()){status('Este navegador no ofrece voz. Abre el panel en Chrome o Edge y vuelve a probar.');return;}
    cancelSpeech('yape');enabled=true;generation++;paint();status('Conectando el altavoz con las notificaciones nuevas…');
    enqueue('Altavoz activado. Avisaré cuando llegue un Yape nuevo.','Altavoz activado.');
    if(enabled){poll();timer=setInterval(poll,10000);}
  }
  function test(withCode){
    if(!supported()){status('Este navegador no ofrece voz. Abre el panel en Chrome o Edge y vuelve a probar.');return;}
    const text=paymentText({name:withCode?'Lucía Demo':'Ana Demo',amount_cents:withCode?800:1550,code:withCode?'038':null});
    enqueue('Prueba de altavoz. '+text,'Prueba de altavoz: '+text);
  }
  function stop(){ctx=null;silence();cancelSpeech();el('yapeVoice').hidden=true;el('yapeVoiceLast').textContent='';}
  function start(context){
    stop();ctx=context;el('yapeVoice').hidden=false;
    status('Actívalo para leer nombre, monto y código de los Yapeos nuevos. Funciona en todas las secciones; al recargar la página debes activarlo otra vez.');
    el('enableYapeVoice').onclick=toggle;el('testYapeVoiceCode').onclick=()=>test(true);el('testYapeVoiceNoCode').onclick=()=>test(false);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
  window.addEventListener('focus',poll);
  window.addEventListener('pagehide',()=>{silence();cancelSpeech();status('Activa el altavoz para escuchar nuevos Yapeos.');});
  window.arcangelYapeVoice={start,stop,poll,paymentText,announce,cancelAnnouncements:()=>cancelSpeech('sales')};
})();
