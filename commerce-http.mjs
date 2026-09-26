import { fail, email, username, text, equalSecret } from './commerce-security.mjs';

export const customerToken=(req,cat)=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('arcangel_user_'+cat+'='))?.slice(('arcangel_user_'+cat+'=').length)||'';

export function commerceRouter({store,access,sealer,readState,body,hosted,publicOrigin,payments}){
  const commerce=store?.commerce,cat=store?.catalogId||'local',cookieName='arcangel_user_'+cat;
  const cookie=req=>customerToken(req,cat);
  const csrf=raw=>sealer.mac(`${cat}:csrf:${raw}`);
  const setCookie=(req,res,raw,age=7*86400)=>{const secure=hosted&&(publicOrigin?publicOrigin.startsWith('https:'):req.socket.encrypted||String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https'),flags=`HttpOnly; SameSite=Strict${secure?'; Secure':''}`;res.setHeader('Set-Cookie',[`${cookieName}=${raw}; Path=/; ${flags}; Max-Age=${age}`,`${cookieName}=; Path=/api/shop; ${flags}; Max-Age=0`]);};
  async function input(req,limit=128*1024){if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Envía los datos como JSON.');let result;try{result=JSON.parse((await body(req,limit)).toString());}catch(error){if(error.status)throw error;throw fail(400,'Datos no válidos.');}if(!result||typeof result!=='object'||Array.isArray(result))throw fail(400,'Datos no válidos.');return result;}
  const requireUser=async req=>{const user=await commerce.userFromToken(cookie(req));if(!user)throw fail(401,'Inicia sesión para continuar.');return user;};
  return async(req,res,url,send)=>{
    if(url.pathname==='/api/yape/device'){
      if(!commerce)throw fail(503,'Las ventas no están configuradas.');
      if(req.method!=='POST')throw fail(405,'Método no permitido.');
      if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Envía JSON.');
      const result=await commerce.yape.receive(req.headers,await body(req,8192));send(200,result);return true;
    }
    if(url.pathname==='/api/mercadopago/webhook'){
      if(!payments)throw fail(503,'Mercado Pago aún no está configurado.');
      if(req.method!=='POST')throw fail(405,'Método no permitido.');
      await payments.webhook(req.headers,url,await input(req,32768));send(200,{ok:true});return true;
    }
    const customer=url.pathname.startsWith('/api/shop/'),admin=url.pathname==='/api/admin/commerce'||url.pathname.startsWith('/api/admin/commerce/');
    if(!customer&&!admin)return false;
    res.setHeader('Referrer-Policy','no-referrer');
    const done=(status,data)=>{send(status,data);return true;};
    if(customer&&req.method==='GET'&&url.pathname==='/api/shop/config'){
      const state=await readState(),yape=commerce?await commerce.yape.status():null;return done(200,{enabled:!!commerce,yape:{enabled:!!yape?.enabled,online:!!yape?.online,max_soles:100},mercadopago:payments?.publicConfig||{enabled:false},...(commerce?{payment_qr:state?.settings.payment_qr||'',payment_name:state?.settings.payment_name||'',whatsapp:state?.settings.whatsapp||''}:{})});
    }
    if(admin){
      if(req.method==='GET')access.require(req);else access.checkWrite(req);
      if(!commerce){if(req.method==='GET'&&['/api/admin/commerce','/api/admin/commerce/alerts'].includes(url.pathname))return done(200,{enabled:false});throw fail(503,'Activa COMMERCE_ENABLED y COMMERCE_KEY para usar Ventas.');}
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce')return done(200,{enabled:true,...await commerce.adminData()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/alerts')return done(200,{enabled:true,...await commerce.alerts()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/yape')return done(200,{...await commerce.yape.status(),...await commerce.yape.history(url.searchParams.get('before')),claims:await commerce.yape.reviews()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/yape/activity')return done(200,{...await commerce.yape.activity(Object.fromEntries(url.searchParams),url.searchParams.get('export')==='1'),device:await commerce.yape.status()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/yape/announcements')return done(200,await commerce.yape.announcements(Object.fromEntries(url.searchParams)));
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/reports')return done(200,{reports:await commerce.reports()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/replacements')return done(200,{replacements:await commerce.replacements()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/expired-accounts')return done(200,{items:await commerce.expiredAccounts()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/account-export')return done(200,{status:url.searchParams.get('status')||'active',generated_at:new Date().toISOString(),items:await commerce.accountExport(url.searchParams.get('status')||'active')});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/coupons')return done(200,{items:await commerce.coupons.list()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/orders')return done(200,{items:await commerce.fazer.orders.list()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/products')return done(200,{items:await commerce.fazer.products.list()});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/config')return done(200,await commerce.fazer.config());
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/status')return done(200,await commerce.fazer.status());
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/catalog')return done(200,await commerce.fazer.categories(url.searchParams.get('kind'),url.searchParams.get('cursor')));
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/fazer/offers')return done(200,await commerce.fazer.offers(url.searchParams.get('kind'),url.searchParams.get('id')));
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/inventory')return done(200,{items:await commerce.inventory(text(url.searchParams.get('product_id')||'','el producto',100,false))});
      if(req.method==='GET'&&url.pathname==='/api/admin/commerce/customers')return done(200,{customers:await commerce.customers(url.searchParams.get('search')||'',url.searchParams.get('status')||'all'),counts:await commerce.customerCounts()});
      if(req.method!=='POST')throw fail(405,'Método no permitido.');
      const data=await input(req,1024*1024);
      switch(url.pathname){
        case '/api/admin/commerce/fazer/products':return done(200,await commerce.fazer.products.save(data));
        case '/api/admin/commerce/fazer/visibility':return done(200,await commerce.fazer.products.visibility(data));
        case '/api/admin/commerce/fazer/config':return done(200,await commerce.fazer.save(data));
        case '/api/admin/commerce/yape/pair':{
          let origin;try{origin=new URL(publicOrigin);}catch{throw fail(409,'Configura APP_URL con https://arcangelpro.com antes de vincular.');}
          if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw fail(409,'APP_URL debe ser el dominio HTTPS de la tienda.');
          const credentials=await commerce.yape.pair(data.phone);
          return done(201,{device_id:credentials.device_id,pairing_code:Buffer.from(JSON.stringify({url:origin.origin,phone:data.phone,...credentials})).toString('base64url')});
        }
        case '/api/admin/commerce/yape/enable':{
          if(data.enabled){const state=await readState();if(!state?.settings.payment_qr)throw fail(409,'Configura primero el QR de Yape en Configurar web.');}
          return done(200,await commerce.yape.enable(data.enabled));
        }
        case '/api/admin/commerce/yape/release':return done(200,await commerce.yape.release(data));
        case '/api/admin/commerce/yape/review':return done(200,await commerce.yape.review(data));
        case '/api/admin/commerce/topup':return done(200,await commerce.approveTopup(data.entry_id,data.approved,data.note));
        case '/api/admin/commerce/coupons/create':return done(201,await commerce.coupons.create(data));
        case '/api/admin/commerce/coupons/disable':return done(200,await commerce.coupons.disable(data.code));
        case '/api/admin/commerce/inventory':return done(201,await commerce.addInventory(text(data.product_id,'el producto',100),data.items,data.request_id));
        case '/api/admin/commerce/inventory/read':return done(200,await commerce.inventoryDetails(data.inventory_id));
        case '/api/admin/commerce/inventory/update':return done(200,await commerce.updateInventory(data.inventory_id,data.delivery,data.revision));
        case '/api/admin/commerce/inventory/retire':return done(200,await commerce.retireInventory(data.inventory_id,data.state));
        case '/api/admin/commerce/inventory/delete':return done(200,await commerce.deleteInventoryAccounts(data.items));
        case '/api/admin/commerce/expired-accounts/delete':return done(200,await commerce.deleteExpiredAccounts(data.items));
        case '/api/admin/commerce/deliver':return done(200,await commerce.deliverOrder(data.order_id,data.delivery));
        case '/api/admin/commerce/order/read':return done(200,await commerce.orderDetails(data.order_id));
      case '/api/admin/commerce/order/update':return done(200,await commerce.updateOrder(data.order_id,data.delivery,data.revision));
        case '/api/admin/commerce/replacements':return done(200,{replacements:await commerce.replacements()});
        case '/api/admin/commerce/report/update':return done(200,await commerce.updateReport(data.report_id,data.status,data.reply,data.revision));
        case '/api/admin/commerce/refund/quote':return done(200,await commerce.refundQuote(data.order_id));
        case '/api/admin/commerce/refund':return done(200,await commerce.refundOrder(data.order_id,data.revision));
        case '/api/admin/commerce/customer':return done(200,await commerce.blockUser(data.user_id,data.blocked));
        case '/api/admin/commerce/customer/create':return done(201,await commerce.createCustomer(data.username,data.email,data.password,data.role));
        case '/api/admin/commerce/customer/password':return done(200,await commerce.changeCustomerPassword(data.user_id,data.password));
        case '/api/admin/commerce/customer/balance':return done(200,await commerce.addCustomerBalance(data.user_id,data));
        case '/api/admin/commerce/customer/role':return done(200,await commerce.setCustomerRole(data.user_id,data.role,data.username));
        case '/api/admin/commerce/customer/recovery':return done(200,await commerce.customerRecovery(data.user_id));
        case '/api/admin/commerce/customer/recovery/generate':return done(200,await commerce.customerRecovery(data.user_id,true));
        case '/api/admin/commerce/customer/delete':return done(200,await commerce.deleteCustomer(data.user_id,data.confirm_email));
        case '/api/admin/commerce/customer/restore':return done(200,await commerce.restoreCustomer(data.user_id));
        default:throw fail(404,'Ruta no encontrada.');
      }
    }
    if(!commerce)throw fail(503,'Las compras con saldo aún no están activadas.');
    if(req.method==='GET'){
      const user=await requireUser(req);
      if(['/api/shop/session','/api/shop/me'].includes(url.pathname))setCookie(req,res,cookie(req));
      if(url.pathname==='/api/shop/digital/orders')return done(200,{items:await commerce.fazer.orders.list(user.id)});
      if(url.pathname==='/api/shop/digital/quote')return done(200,await commerce.fazer.orders.quote(url.searchParams.get('product_id'),user));
      if(url.pathname==='/api/shop/session')return done(200,{user,csrf:csrf(cookie(req))});
      if(url.pathname==='/api/shop/yape/current')return done(200,{claim:await commerce.yape.current(user.id),...await commerce.yape.publicStatus()});
      if(url.pathname==='/api/shop/me')return done(200,{user,csrf:csrf(cookie(req)),orders:await commerce.orders(user.id),movements:await commerce.movements(user.id),reports:await commerce.reports(user.id)});
      throw fail(404,'Ruta no encontrada.');
    }
    if(req.method!=='POST')throw fail(405,'Método no permitido.');
    if(!access.sameOrigin(req)||req.headers['x-shop-client']!=='1')throw fail(403,'Recarga la página para continuar.');
    const data=await input(req);
    const action=url.pathname.split('/').pop();
    if(['/api/shop/register','/api/shop/login','/api/shop/recover'].includes(url.pathname)){
      const identifier=action==='login'?text(data.identifier??data.email,'el usuario o correo',254):data.email;
      const address=action==='login'&&!identifier.includes('@')?username(identifier):email(identifier);
      // Per-account and bounded per-connection limits persist across restarts.
      await commerce.limit(`auth:${address}`,15);
      await commerce.limit(`connection:${req.socket.remoteAddress}`,150);
      if(action==='register')await commerce.limit('registrations',30,3600);
      if(!await readState())throw fail(503,'La tienda todavía no está configurada.');
      const result=action==='register'?await commerce.register(data.username,address,data.password):action==='recover'?await commerce.recover(address,data.recovery_code,data.password):await commerce.login(data.identifier||data.email,data.password);
      setCookie(req,res,result.token);return done(action==='register'?201:200,{user:result.user,csrf:csrf(result.token),...(result.recovery_code?{recovery_code:result.recovery_code}:{})});
    }
    const user=await requireUser(req);if(!equalSecret(req.headers['x-shop-csrf'],csrf(cookie(req))))throw fail(403,'Recarga tu cuenta para continuar.');
    await commerce.limit('user:'+user.id,120,60);
    switch(url.pathname){
      case '/api/shop/yape/start':{
        const state=await readState();if(!state?.settings.payment_qr)throw fail(409,'El QR todavía no está configurado.');
        await commerce.limit('yape-start:'+user.id,6,3600);return done(201,await commerce.yape.start(user.id,data));
      }
      case '/api/shop/yape/verify':
        await commerce.limit('yape-check:'+user.id,9,3600);
        return done(200,await commerce.yape.verify(user.id,data));
      case '/api/shop/logout':await commerce.logout(cookie(req));setCookie(req,res,'',0);return done(200,{ok:true});
      case '/api/shop/topups':return done(201,await commerce.topup(user.id,data));
      case '/api/shop/mercadopago/create':
        if(!payments)throw fail(503,'Mercado Pago aún no está disponible.');
        await commerce.limit('mp-create:'+user.id,15,3600);
        return done(201,await payments.create(user,data));
      case '/api/shop/mercadopago/status':
        if(!payments)throw fail(503,'Mercado Pago aún no está disponible.');
        await commerce.limit('mp-status:'+user.id,20,60);
        return done(200,await payments.status(user,data.id));
      case '/api/shop/coupons/quote':await commerce.limit('coupon:'+user.id,20,60);return done(200,await commerce.couponQuote(user.id,data));
      case '/api/shop/coupons/redeem':await commerce.limit('coupon:'+user.id,20,60);return done(200,await commerce.coupons.redeem(user.id,data.code));
      case '/api/shop/digital/validate-id':await commerce.limit('player-validation:'+user.id,15,60);return done(200,await commerce.fazer.orders.validatePlayer(user,data));
      case '/api/shop/digital/purchase':return done(200,await commerce.fazer.orders.purchase(user,data));
      case '/api/shop/purchase':return done(200,await commerce.purchase(user.id,data));
      case '/api/shop/order':return done(200,{delivery:await commerce.orderSecret(user.id,data.order_id)});
      case '/api/shop/replace':return done(200,await commerce.replaceAccount(user.id,data));
      case '/api/shop/renew':return done(200,await commerce.renewOrder(user.id,data));
      case '/api/shop/reports':await commerce.limit('reports:'+user.id,20,3600);return done(201,await commerce.reportAccount(user.id,data));
      default:throw fail(404,'Ruta no encontrada.');
    }
  };
}

