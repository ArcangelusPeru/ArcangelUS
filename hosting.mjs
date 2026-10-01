import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { databaseConfig } from './mysql-store.mjs';
import { mercadoConfig } from './mercado-pago.mjs';

export function launchConfig(env=process.env) {
  const hosted=env.SHOP_HOSTED==='1'||Boolean(env.PORT)||env.NODE_ENV==='production';
  const port=Number(env.PORT||(hosted?3000:4173));
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT debe ser un puerto válido.');
  const commerceEnabled=env.COMMERCE_ENABLED==='true'||env.COMMERCE_ENABLED==='1';
  if(commerceEnabled&&!env.COMMERCE_KEY)throw Error('COMMERCE_KEY es obligatorio cuando COMMERCE_ENABLED está activo. Genera una clave aleatoria y guárdala como secreto.');
  if(commerceEnabled&&!/^[A-Za-z0-9+/]{43}=$/.test(env.COMMERCE_KEY))throw Error('COMMERCE_KEY debe ser una clave base64 de 32 bytes.');
  return {port,host:hosted?'0.0.0.0':'127.0.0.1',hosted,adminPassword:env.ADMIN_PASSWORD||'',publicOrigin:env.APP_URL||'',dataDir:hosted?(env.DATA_DIR||'public/assets/arcangel-us'):undefined,database:hosted?databaseConfig(env):null,catalogId:env.SHOP_CATALOG_ID||'',commerceEnabled,commerceKey:env.COMMERCE_KEY||'',mercado:mercadoConfig(env)};
}

export function createAdminAccess({hosted=false,adminPassword='',publicOrigin=''}={}) {
  const configured=!hosted||(adminPassword.length>=12&&adminPassword.length<=1024);
  let origin;
  if(publicOrigin){try{origin=new URL(publicOrigin);}catch{throw Error('APP_URL no es válida. Usa la URL pública completa o elimina esa variable.');}if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw Error('APP_URL debe ser la URL pública de la tienda.');}
  const passwordHash=createHash('sha256').update(adminPassword).digest();
  const localToken=randomBytes(32).toString('hex'),revoked=new Map(),active=new Map(),attempts=new Map();
  const lifetime=12*60*60*1000;
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const sign=value=>createHmac('sha256',passwordHash).update(value).digest('hex');
  const tokenEquals=(a,b)=>{const one=Buffer.from(a||''),two=Buffer.from(b||'');return one.length===two.length&&timingSafeEqual(one,two);};
  const cookieValue=req=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('arcangel_admin='))?.slice(15)||'';
  const requestMeta=req=>{
    const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
    const rawIp=forwarded||String(req.headers['x-real-ip']||req.socket.remoteAddress||'').trim();
    const ip=rawIp.replace(/^::ffff:/,'').slice(0,64)||'No disponible';
    const ua=String(req.headers['user-agent']||'').slice(0,220);
    const device=/iPad/i.test(ua)?'iPad':/iPhone/i.test(ua)?'iPhone':/Android/i.test(ua)&&/Mobile/i.test(ua)?'Android · móvil':/Android/i.test(ua)?'Android · tablet':/Windows/i.test(ua)?'Windows · navegador':/Macintosh/i.test(ua)?'macOS · navegador':/Linux/i.test(ua)?'Linux · navegador':'Navegador web';
    const country=String(req.headers['cf-ipcountry']||req.headers['x-country']||req.headers['x-vercel-ip-country']||'').trim().toUpperCase();
    const region=String(req.headers['x-region']||req.headers['x-vercel-ip-country-region']||'').trim();
    return {device,ip,location:country?(region?`${country} · ${region}`:country):'Ubicación no disponible'};
  };
  const decode=value=>{
    const match=/^([a-z0-9]+)\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(value||'');if(!match)return null;
    const expires=parseInt(match[1],36),payload=match[1]+'.'+match[2];
    if(!Number.isSafeInteger(expires)||expires<=Date.now()||!tokenEquals(match[3],sign(payload))||revoked.has(digest(value)))return null;
    return {token:sign('csrf:'+value),expires};
  };
  const session=req=>{
    if(!hosted)return {token:localToken};
    const now=Date.now();for(const [key,expires] of revoked)if(expires<=now)revoked.delete(key);for(const [key,value] of active)if(value.expires<=now)active.delete(key);
    const raw=cookieValue(req),value=decode(raw);if(!value)return null;
    const id=digest(raw),meta=requestMeta(req),existing=active.get(id);if(existing){existing.last_seen_at=existing.last_seen_at<now-5*60*1000?now:existing.last_seen_at;existing.device=meta.device;existing.ip=meta.ip;existing.location=meta.location;}
    else active.set(id,{...value,...meta,created_at:now,last_seen_at:now});
    return {...value,session_id:id};
  };
  const sameOrigin=req=>{
    if(!req.headers.origin||req.headers['sec-fetch-site']==='cross-site')return false;
    try{
      const requestOrigin=new URL(req.headers.origin);
      if(!['http:','https:'].includes(requestOrigin.protocol)||requestOrigin.origin!==req.headers.origin)return false;
      if(origin)return requestOrigin.origin===origin.origin;
      const forwarded=hosted?String(req.headers['x-forwarded-host']||'').split(',')[0].trim():'';
      return requestOrigin.host===(forwarded||req.headers.host);
    }catch{return false;}
  };
  const secure=req=>hosted&&(origin?origin.protocol==='https:':String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https'||Boolean(req.socket.encrypted));
  const setCookie=(req,res,value,maxAge)=>res.setHeader('Set-Cookie',`arcangel_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(req)?'; Secure':''}`);
  return {
    hosted,configured,sameOrigin,session,
    status(req){return {hosted,configured,authenticated:!!session(req)};},
    require(req){
      if(!configured)throw Object.assign(Error('Configura ADMIN_PASSWORD con al menos 12 caracteres en los secretos de GoDaddy y reinicia la aplicación.'),{status:503});
      const value=session(req);
      if(!value)throw Object.assign(Error('Inicia sesión en el panel para continuar.'),{status:401});
      return value;
    },
    checkWrite(req){
      const value=this.require(req);
      if(!sameOrigin(req)||!tokenEquals(req.headers['x-admin-token'],value.token))throw Object.assign(Error('Vuelve a abrir el panel para guardar.'),{status:403});
      return value;
    },
    login(req,res,password){
      if(!configured)this.require(req);
      if(!sameOrigin(req))throw Object.assign(Error('Origen no permitido.'),{status:403});
      const now=Date.now();
      for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
      // Use the connection address: untrusted forwarded headers cannot reset the limit.
      const client=req.socket.remoteAddress||'unknown';
      const count=attempts.get(client)||{count:0,until:now+15*60*1000};
      if(count.count>=10){res.setHeader('Retry-After',Math.ceil((count.until-now)/1000));throw Object.assign(Error('Demasiados intentos. Vuelve a intentarlo en 15 minutos.'),{status:429});}
      const supplied=createHash('sha256').update(typeof password==='string'?password:'').digest();
      if(!timingSafeEqual(supplied,passwordHash)){count.count++;attempts.set(client,count);throw Object.assign(Error('La contraseña no es correcta.'),{status:401});}
      attempts.delete(client);
      const expires=now+lifetime,payload=expires.toString(36)+'.'+randomBytes(32).toString('hex'),id=payload+'.'+sign(payload);
      active.set(digest(id),{token:sign('csrf:'+id),expires,session_id:digest(id),...requestMeta(req),created_at:now,last_seen_at:now});
      setCookie(req,res,id,lifetime/1000);
      return {authenticated:true};
    },
    logout(req,res){const value=this.checkWrite(req),raw=cookieValue(req);active.delete(digest(raw));revoked.set(digest(raw),value.expires);setCookie(req,res,'',0);return {authenticated:false};},
    devices(req){
      if(!hosted){const meta=requestMeta(req),now=new Date().toISOString();return {items:[{session_id:'local',device:meta.device,ip:meta.ip,location:meta.location,created_at:now,last_seen_at:now,expires_at:null,current:true}]};}
      const current=this.require(req),now=Date.now();
      return {items:[...active.entries()].filter(([,value])=>value.expires>now).sort((a,b)=>b[1].last_seen_at-a[1].last_seen_at).map(([id,value])=>({session_id:id,device:value.device,ip:value.ip,location:value.location,created_at:new Date(value.created_at).toISOString(),last_seen_at:new Date(value.last_seen_at).toISOString(),expires_at:new Date(value.expires).toISOString(),current:id===current.session_id}))};
    },
    revokeDevice(req,id){
      const current=this.checkWrite(req),key=String(id||'');if(!/^[a-f0-9]{64}$/.test(key))throw Object.assign(Error('Dispositivo no válido.'),{status:400});if(key===current.session_id)throw Object.assign(Error('No puedes expulsar el dispositivo que estás usando.'),{status:409});const value=active.get(key);if(!value)throw Object.assign(Error('La sesión ya no está conectada.'),{status:404});active.delete(key);revoked.set(key,value.expires);return {revoked:true};
    }
  };
}
