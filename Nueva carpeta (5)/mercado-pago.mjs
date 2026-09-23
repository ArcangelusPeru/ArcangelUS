import { createHmac } from 'node:crypto';
import { fail, equalSecret, soles } from './commerce-security.mjs';

export function mercadoConfig(env=process.env) {
  if(!['true','1'].includes(env.MP_ENABLED))return null;
  const config={environment:env.MP_ENVIRONMENT||'test',accessToken:env.MP_ACCESS_TOKEN||'',webhookSecret:env.MP_WEBHOOK_SECRET||'',receiverId:env.MP_ACCOUNT_ID||'',applicationId:env.MP_APPLICATION_ID||'',testBuyerEmail:env.MP_TEST_BUYER_EMAIL||''};
  if(!['test','production'].includes(config.environment)||!config.accessToken||config.webhookSecret.length<16||!/^\d+$/.test(config.receiverId)||!/^\d+$/.test(config.applicationId))throw Error('Completa los secretos MP_ENVIRONMENT, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, MP_ACCOUNT_ID y MP_APPLICATION_ID antes de activar MP_ENABLED.');
  if(config.environment==='test'&&!/^[^\s@]+@testuser\.com$/.test(config.testBuyerEmail))throw Error('MP_TEST_BUYER_EMAIL debe ser el correo de un comprador de prueba de Mercado Pago.');
  if(config.environment==='production'&&config.testBuyerEmail)throw Error('Elimina MP_TEST_BUYER_EMAIL antes de activar Mercado Pago en producción.');
  return config;
}
export function verifyMercadoSignature(headers,url,body,secret) {
  const id=url.searchParams.get('data.id'),request=headers['x-request-id'];
  if(url.searchParams.getAll('data.id').length!==1||!/^ORD[A-Z0-9]{10,60}$/i.test(id||'')||String(body?.data?.id||'').toLowerCase()!==id.toLowerCase()||!/^[-\w]{1,200}$/.test(request||''))throw fail(401,'Notificación no válida.');
  const parts=String(headers['x-signature']||'').split(',').map(p=>p.trim().split('='));
  const times=parts.filter(([k])=>k==='ts'),signatures=parts.filter(([k])=>k==='v1').map(([,v])=>v);
  if(times.length!==1||!/^\d{10,13}$/.test(times[0][1]||''))throw fail(401,'Firma no válida.');
  // Authenticate only the resource ID. Amounts/states are always fetched from MP.
  // Replayed authentic messages are harmless because credits are transactional.
  const expected=createHmac('sha256',secret).update(`id:${id.toLowerCase()};request-id:${request};ts:${times[0][1]};`).digest('hex');
  if(!signatures.some(sig=>/^[a-f0-9]{64}$/.test(sig||'')&&equalSecret(sig,expected)))throw fail(401,'Firma no válida.');
  return id.toUpperCase();
}
const orderId=value=>{if(!/^ORD[A-Z0-9]{10,60}$/.test(value||''))throw fail(502,'Referencia de Mercado Pago no válida.');return value;};
export function createMercadoPago({config,persistence,publicOrigin,fetcher=fetch}) {
  if(!config)return null;
  if(!persistence)throw Error('Mercado Pago necesita COMMERCE_ENABLED y MySQL.');
  let origin;try{origin=new URL(publicOrigin);}catch{throw Error('Configura APP_URL para conectar Mercado Pago.');}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('APP_URL debe ser el origen HTTPS público de la tienda para Mercado Pago.');
  async function request(method,route,payload,key) {
    let response,result;
    try{response=await fetcher('https://api.mercadopago.com'+route,{method,redirect:'error',signal:AbortSignal.timeout(9000),headers:{Authorization:'Bearer '+config.accessToken,'Content-Type':'application/json',...(key?{'X-Idempotency-Key':key}:{})},...(payload?{body:JSON.stringify(payload)}:{})});result=await response.json();}catch{throw fail(503,'Mercado Pago no respondió. Puedes volver a consultar sin duplicar la recarga.');}
    if(!response.ok)throw fail(503,'Mercado Pago no pudo confirmar la operación. Conserva tu solicitud y vuelve a intentarlo.');
    return result;
  }
  function validate(order,row) {
    orderId(order.id);
    if(order.external_reference!==row.id||order.type!=='online'||order.currency!=='PEN'||!['PE','PER'].includes(order.country_code)||String(order.user_id)!==row.receiver_id||String(order.integration_data?.application_id)!==row.application_id||row.environment!==config.environment||row.receiver_id!==config.receiverId||row.application_id!==config.applicationId||order.id.startsWith('ORDTST')!==(config.environment==='test'))throw fail(409,'El pago no coincide con la recarga de esta tienda.');
    if(soles(order.total_amount)!==Number(row.amount_cents)||row.provider_id&&row.provider_id!==order.id)throw fail(409,'El importe o referencia del pago no coincide.');
  }
  async function apply(order,row) {
    validate(order,row);
    let status='mp_pending';
    if(order.status==='processed'&&order.status_detail==='accredited'){
      if(soles(order.total_paid_amount)!==Number(row.amount_cents))throw fail(409,'El importe pagado no coincide.');
      status='approved';
    }else if(['refunded','charged_back','chargeback'].includes(order.status)||['refunded','partially_refunded','charged_back','chargeback'].includes(order.status_detail))status='attention';
    else if(['failed','canceled','expired'].includes(order.status))status='rejected';
    return persistence.apply(row.id,order,status);
  }
  async function sync(row) {
    if(!row.provider_id)return persistence.view(row);
    return apply(await request('GET','/v1/orders/'+orderId(row.provider_id)),row);
  }
  return {
    publicConfig:{enabled:true,environment:config.environment,min_cents:100,max_cents:100000},
    async create(user,input) {
      const row=await persistence.reserve(user,input,config);
      if(row.checkout_url||row.status!=='mp_pending')return persistence.view(row);
      const amount=(Number(row.amount_cents)/100).toFixed(2),back=origin.origin+'/cuenta?recarga='+row.id+'#billetera';
      const order=await request('POST','/v1/orders',{type:'online',processing_mode:'manual',capture_mode:'automatic',total_amount:amount,external_reference:row.id,expiration_time:'P1D',description:'Saldo para compras en Arcangel US',payer:{email:row.payer_email},items:[{title:'Saldo para compras en Arcangel US',unit_price:amount,quantity:1}],config:{online:{success_url:back,pending_url:back,failure_url:back,auto_return:'approved'}}},row.id);
      validate(order,row);
      let target;try{target=new URL(order.checkout_url);}catch{throw fail(502,'Mercado Pago no devolvió un enlace de pago válido.');}
      if(target.protocol!=='https:'||!['www.mercadopago.com.pe','mercadopago.com.pe'].includes(target.hostname)||target.port||target.username||target.password||!target.pathname.startsWith('/checkout/'))throw fail(502,'El enlace de pago no pertenece a Mercado Pago Perú.');
      await persistence.bind(row.id,order.id,target.href);
      return persistence.view(await persistence.get(row.id,user.id));
    },
    async status(user,id){return sync(await persistence.get(id,user.id));},
    async webhook(headers,url,body) {
      const id=verifyMercadoSignature(headers,url,body,config.webhookSecret);
      if(!['order','orders_v2'].includes(body.type))return {ok:true};
      const order=await request('GET','/v1/orders/'+id);
      if(order.id!==id)throw fail(409,'La referencia recibida no coincide.');
      let row;try{row=await persistence.get(order.external_reference);}catch(error){if([400,404].includes(error.status))return {ok:true};throw error;}
      validate(order,row);
      // Webhooks may arrive before the creation response is saved.
      await persistence.bind(row.id,order.id,row.checkout_url);
      await apply(order,{...row,provider_id:id});return {ok:true};
    }
  };
}
