import {fail} from './commerce-security.mjs';
export function fazerClient(key,{fetcher=fetch}={}){
 const base='https://api.fzr.cards/api/v2';
 async function get(route,params={},post=null,idempotency=null){
  if(!key)throw fail(409,'Configura la clave API de FazerCards en el panel.');
  const url=new URL(base+route);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,String(v));
  let response;const attempts=post?1:3;for(let attempt=0;attempt<attempts;attempt++){try{response=await fetcher(url,{method:post?'POST':'GET',headers:{'X-API-Key':key,Accept:'application/json',...(post?{'Content-Type':'application/json',...(idempotency?{'Idempotency-Key':idempotency}:{})}:{})},...(post?{body:JSON.stringify(post)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});if(response.ok||![502,503,504].includes(response.status)||attempt===attempts-1)break;}catch{if(attempt===attempts-1)throw fail(502,'FazerCards no respondió después de varios intentos.');}await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}if(!response)throw fail(502,'FazerCards no respondió después de varios intentos.');
  if(!response.ok)throw Object.assign(fail(response.status===401||response.status===403?409:502,response.status===401?'La clave API no es válida.':response.status===403?'Tu plan no permite acceder a este servicio.':'No se pudo consultar FazerCards.'),{rejected:!!post&&[400,401,403,404].includes(response.status)});
  let data;try{data=await response.json();}catch{throw fail(502,'Respuesta de FazerCards no válida.');}
  if(data.ok===false)throw fail(502,'FazerCards no pudo completar la consulta.');return data;
 }
 const groups={topups:['/topups','/topups/offers','category_id'],giftcards:['/giftcards','/giftcards/cards','category_id'],gamekeys:['/gamekeys','/gamekeys/keys','game_id']};
 const group=kind=>{if(!Object.hasOwn(groups,kind))throw fail(400,'Catálogo no válido.');return groups[kind];};
 return {validationGames:()=>get('/topups/validate-id'),validatePlayer:(category_id,fields)=>get('/topups/validate-id',{}, {category_id,fields},undefined),order:id=>{if(!/^ord-\d+$/.test(id))throw fail(400,'Pedido no válido.');return get('/orders/'+id);},place:(kind,payload,id)=>get(group(kind)[0]+'/order',{},payload,id),status:async()=>{const [me,balance]=await Promise.all([get('/me'),get('/balance')]);return {plan:me.plan,active:me.subscriptionActive,expires:me.planExpiresAt,balance:balance.balance,currency:'USD'};},categories:(kind,cursor)=>get(group(kind)[0],{limit:50,cursor,include_ui:1}),offers:(kind,id)=>{const g=group(kind);return get(g[1],{[g[2]]:id,include_ui:1});}};
}


