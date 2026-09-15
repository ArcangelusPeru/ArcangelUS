import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

export function launchConfig(env=process.env) {
  const hosted=env.SHOP_HOSTED==='1'||Boolean(env.PORT)||env.NODE_ENV==='production';
  const port=Number(env.PORT||4173);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT debe ser un puerto válido.');
  return {port,host:hosted?'0.0.0.0':'127.0.0.1',hosted,adminPassword:env.ADMIN_PASSWORD||'',publicOrigin:env.APP_URL||'',dataDir:hosted?path.resolve(env.DATA_DIR||'/public/assets/arcangel-us'):undefined};
}

export function createAdminAccess({hosted=false,adminPassword='',publicOrigin=''}={}) {
  const configured=!hosted||(adminPassword.length>=12&&adminPassword.length<=1024);
  let origin;
  if(publicOrigin){origin=new URL(publicOrigin);if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw Error('APP_URL debe ser la URL pública de la tienda.');}
  const passwordHash=createHash('sha256').update(adminPassword).digest();
  const localToken=randomBytes(32).toString('hex'),sessions=new Map(),attempts=new Map();
  const lifetime=12*60*60*1000;
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const tokenEquals=(a,b)=>{const one=Buffer.from(a||''),two=Buffer.from(b||'');return one.length===two.length&&timingSafeEqual(one,two);};
  const cookieValue=req=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('arcangel_admin='))?.slice(15)||'';
  const session=req=>{
    if(!hosted)return {token:localToken};
    const key=digest(cookieValue(req)),value=sessions.get(key);
    if(value&&value.expires>Date.now())return value;
    sessions.delete(key);return null;
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
      for(const [key,value] of sessions)if(value.expires<=now)sessions.delete(key);
      // Use the connection address: untrusted forwarded headers cannot reset the limit.
      const client=req.socket.remoteAddress||'unknown';
      const count=attempts.get(client)||{count:0,until:now+15*60*1000};
      if(count.count>=10){res.setHeader('Retry-After',Math.ceil((count.until-now)/1000));throw Object.assign(Error('Demasiados intentos. Vuelve a intentarlo en 15 minutos.'),{status:429});}
      const supplied=createHash('sha256').update(typeof password==='string'?password:'').digest();
      if(!timingSafeEqual(supplied,passwordHash)){count.count++;attempts.set(client,count);throw Object.assign(Error('La contraseña no es correcta.'),{status:401});}
      attempts.delete(client);
      const previous=cookieValue(req);if(previous)sessions.delete(digest(previous));
      if(sessions.size>=100)sessions.delete(sessions.keys().next().value);
      const id=randomBytes(32).toString('hex'),value={token:randomBytes(32).toString('hex'),expires:now+lifetime};
      sessions.set(digest(id),value);setCookie(req,res,id,lifetime/1000);
      return {authenticated:true};
    },
    logout(req,res){this.checkWrite(req);sessions.delete(digest(cookieValue(req)));setCookie(req,res,'',0);return {authenticated:false};}
  };
}
