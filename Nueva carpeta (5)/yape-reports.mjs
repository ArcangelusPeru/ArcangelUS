import {fail,soles} from './commerce-security.mjs';

// Reporting is read-only. Parsing a display amount never creates a matching key,
// changes an event's stored state, or authorizes wallet credit.
export function reportPayment(message){
  if(typeof message!=='string'||message.length>600)return null;
  const text=message.normalize('NFC').replace(/[\s\p{Z}]+/gu,' ').trim();
  const match=text.match(/^(?:Yape!\s*)?([\p{L}* .'-]{2,100}) te envi[oó] un pago por S\/\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\.\s*El c[oó]d\. de seguridad es:\s*(\d{3}))?\.?$/u);
  if(!match||!/[\p{L}]/u.test(match[1]))return null;
  try{return {name:match[1].trim(),amount_cents:soles(match[2].replace(',','.')),code:match[3]||null};}catch{return null;}
}
export const dayKey=ms=>new Date(Number(ms)-5*3600000).toISOString().slice(0,10);
const dayMs=day=>Date.parse(day+'T00:00:00-05:00');
const shift=(day,n)=>dayKey(dayMs(day)+n*86400000);
const blank=()=>({count:0,total_cents:0,known_count:0,without_code:0,excluded:0,min_cents:null,max_cents:null});
function add(summary,event){
  summary.count++;
  if(event.state==='without_code')summary.without_code++;
  if(event.amount_cents!=null&&event.state!=='ambiguous'){
    summary.known_count++;summary.total_cents+=event.amount_cents;
    summary.min_cents=summary.min_cents==null?event.amount_cents:Math.min(summary.min_cents,event.amount_cents);
    summary.max_cents=Math.max(summary.max_cents||0,event.amount_cents);
  }else summary.excluded++;
}
const finish=s=>({...s,average_cents:s.known_count?Math.round(s.total_cents/s.known_count):null});
export function reportFilters(input={}){
  const q=String(input.q||'').trim();if(q.length>100)throw fail(400,'La búsqueda admite hasta 100 caracteres.');
  const state=String(input.state||'all');if(!['all','received','credited','ambiguous','without_code','unrecognized'].includes(state))throw fail(400,'Estado de notificación no válido.');
  const date=(value)=>{if(!value)return '';const text=String(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(dayMs(text))||dayKey(dayMs(text))!==text)throw fail(400,'Indica una fecha válida.');return text;};
  const from=date(input.from),to=date(input.to);if(from&&to&&from>to)throw fail(400,'La fecha Desde debe ser anterior o igual a Hasta.');
  let amount=null;if(input.amount!==undefined&&input.amount!=='')amount=soles(String(input.amount));
  const size=Number(input.size||50),page=Number(input.page||1);
  if(![20,50,100,200].includes(size)||!Number.isSafeInteger(page)||page<1||page>100000)throw fail(400,'Paginación no válida.');
  return {q,state,from,to,amount,size,page};
}
const fold=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
export function createYapeReports({pool,catalogId:cat,sealer}){
  const display=row=>{
    let message='',unreadable=false;try{message=sealer.open(row.details,`${cat}:yape:${row.event_id}`);}catch{unreadable=true;}
    const parsed=reportPayment(message);
    let state=row.state;if(state==='unrecognized'&&parsed&&!parsed.code)state='without_code';
    return {event_id:row.event_id,name:parsed?.name||row.first_name||'',amount_cents:parsed?.amount_cents??(row.amount_cents==null?null:Number(row.amount_cents)),code:parsed?.code||null,message,unreadable,posted_at:Number(row.posted_at),state,claim_id:row.claim_id||null};
  };
  async function* scan(filters,now){
    let cursor=null;
    while(true){
      const params=[cat,now];let where='catalog_id=? AND posted_at<=?';
      if(filters.from){where+=' AND posted_at>=?';params.push(dayMs(filters.from));}
      if(filters.to){where+=' AND posted_at<?';params.push(dayMs(filters.to)+86400000);}
      if(cursor){where+=' AND (posted_at<? OR (posted_at=? AND event_id<?))';params.push(cursor.posted_at,cursor.posted_at,cursor.event_id);}
      const [rows]=await pool.execute('SELECT event_id,first_name,amount_cents,posted_at,state,claim_id,details FROM arcangel_yape_events WHERE '+where+' ORDER BY posted_at DESC,event_id DESC LIMIT 250',params);
      for(const row of rows)yield display(row);
      if(rows.length<250)break;cursor=rows[rows.length-1];
    }
  }
  async function activity(input={},exporting=false){
    const filters=reportFilters(input),now=Date.now(),today=dayKey(now),month=today.slice(0,7),year=today.slice(0,4);
    const weekday=new Date(today+'T12:00:00Z').getUTCDay(),monday=shift(today,-((weekday+6)%7));
    const windows=Object.fromEntries(['all','today','week','month','year'].map(k=>[k,blank()]));
    const summary=blank(),states={},days=new Map(),months=new Map(),events=[];
    for(let n=29;n>=0;n--)days.set(shift(today,-n),{date:shift(today,-n),count:0,total_cents:0});
    for(let n=11;n>=0;n--){const d=new Date(today.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-n);const key=d.toISOString().slice(0,7);months.set(key,{date:key,count:0,total_cents:0});}
    const offset=(filters.page-1)*filters.size,query=fold(filters.q);let unreadable=0;
    for await(const event of scan(filters,now)){
      if(filters.state!=='all'&&event.state!==filters.state)continue;
      if(filters.amount!==null&&event.amount_cents!==filters.amount)continue;
      if(query&&!fold([event.event_id,event.name,event.code,event.message].join(' ')).includes(query))continue;
      const position=summary.count;add(summary,event);if(event.unreadable)unreadable++;
      if(exporting){if(events.length>=10000)throw fail(422,'La exportación supera 10 000 filas. Filtra por fechas para dividirla.');events.push(event);}
      else if(position>=offset&&position<offset+filters.size)events.push(event);
      const day=dayKey(event.posted_at);add(windows.all,event);
      if(day===today)add(windows.today,event);if(day>=monday)add(windows.week,event);
      if(day.slice(0,7)===month)add(windows.month,event);if(day.slice(0,4)===year)add(windows.year,event);
      states[event.state]=(states[event.state]||0)+1;
      for(const bin of [days.get(day),months.get(day.slice(0,7))])if(bin){bin.count++;if(event.amount_cents!=null&&event.state!=='ambiguous')bin.total_cents+=event.amount_cents;}
    }
    return {events,summary:finish(summary),windows:Object.fromEntries(Object.entries(windows).map(([k,s])=>[k,finish(s)])),states,days:[...days.values()],months:[...months.values()],page:filters.page,size:filters.size,pages:Math.max(1,Math.ceil(summary.count/filters.size)),generated_at:now,timezone:'America/Lima',unreadable};
  }
  // Read arrivals by the server receipt time, including notifications uploaded
  // late by Android. Paging avoids dropping a burst larger than one UI page.
  async function announcements(input={}){
    const [[clock]]=await pool.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP) AS now');
    const now=Number(clock.now);
    if(input.bootstrap==='1')return {since:now,catalog_id:cat};
    const integer=(value)=>{const n=Number(value);if(!/^\d{1,12}$/.test(String(value))||!Number.isSafeInteger(n)||n<1)throw fail(400,'Intervalo de avisos no válido.');return n;};
    const since=integer(input.since),through=input.through?integer(input.through):now;
    if(since>through||through>now)throw fail(400,'Intervalo de avisos no válido.');
    const params=[cat,since,through+1];let extra='';
    if(input.after){
      const match=String(input.after).match(/^(\d{1,12})\.([a-f0-9-]{36})$/i);
      if(!match||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(match[2]))throw fail(400,'Página de avisos no válida.');
      const at=integer(match[1]);if(at<since||at>through)throw fail(400,'Página de avisos no válida.');
      extra=' AND (received_at>FROM_UNIXTIME(?) OR (received_at=FROM_UNIXTIME(?) AND event_id>?))';params.push(at,at,match[2]);
    }
    const [rows]=await pool.execute('SELECT event_id,first_name,amount_cents,posted_at,state,claim_id,details,UNIX_TIMESTAMP(received_at) AS received_sec FROM arcangel_yape_events WHERE catalog_id=? AND received_at>=FROM_UNIXTIME(?) AND received_at<FROM_UNIXTIME(?)'+extra+' ORDER BY received_at,event_id LIMIT 101',params);
    const page=rows.slice(0,100),last=page[page.length-1];
    return {catalog_id:cat,through,events:page.map(row=>{
      const event=display(row);
      return {event_id:event.event_id,name:event.name,amount_cents:event.amount_cents,code:event.code,state:event.state,unreadable:event.unreadable,received_sec:Number(row.received_sec)};
    }),next:rows.length>100?`${last.received_sec}.${last.event_id}`:null};
  }
  return {activity,announcements};
}
