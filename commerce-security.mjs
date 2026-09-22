import { createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,scrypt,timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export const fail=(status,message)=>Object.assign(new Error(message),{status});
export const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export const secretToken=()=>randomBytes(32).toString('hex');
export function text(value,label,max=200,required=true){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw fail(400,`Revisa ${label}.`);
  return value.trim();
}
export function email(value){const result=text(value,'el correo',254).toLowerCase();if(!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(result))throw fail(400,'Escribe un correo válido.');return result;}
export function cents(value){if(!Number.isSafeInteger(value)||value<1||value>100000000)throw fail(400,'El importe debe estar entre S/ 0.01 y S/ 1,000,000.');return value;}
export function requestId(value){if(typeof value!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))throw fail(400,'Identificador de operación no válido. Recarga la página.');return value.toLowerCase();}
export function soles(value){const valueText=String(value);if(!/^\d{1,7}(\.\d{1,2})?$/.test(valueText))throw fail(400,'Usa un importe con un máximo de dos decimales.');return cents(Math.round(Number(valueText)*100));}
export function validatePassword(value){if(typeof value!=='string'||value.length<12||value.length>128)throw fail(400,'La contraseña debe tener entre 12 y 128 caracteres.');return value;}
export function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
const derive=promisify(scrypt);let hashing=0;
async function passwordKey(password,salt){
  if(hashing>=2)throw fail(429,'Hay varios accesos en curso. Inténtalo en unos segundos.');
  hashing++;try{return await derive(password,salt,64,{N:16384,r:8,p:5,maxmem:32*1024*1024});}finally{hashing--;}
}
export async function hashPassword(password){validatePassword(password);const salt=randomBytes(16).toString('hex');return `scrypt-16384-8-5$${salt}$${(await passwordKey(password,salt)).toString('hex')}`;}
export async function verifyPassword(password,encoded){
  const [,salt,hash]=String(encoded||'').split('$');
  if(typeof password!=='string'||password.length>128)return false;
  // Unknown accounts still incur the password work, without exposing their existence.
  const actual=(await passwordKey(password,salt||'00000000000000000000000000000000')).toString('hex');
  return !!hash&&equalSecret(actual,hash);
}
export function vault(encoded){
  if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(encoded)||Buffer.from(encoded,'base64').length!==32)throw Error('COMMERCE_KEY debe ser una clave aleatoria de 32 bytes en base64. Genera una con node generate-commerce-key.cjs.');
  const key=Buffer.from(encoded,'base64');
  return {
    mac(value){return createHmac('sha256',key).update(value).digest('hex');},
    seal(value,context){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(context));const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),bytes.toString('base64')].join('.');},
    open(value,context){const [iv,tag,data]=String(value).split('.');const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]).toString('utf8'));},
  };
}
export function delivery(value){
  if(!value||typeof value!=='object')throw fail(400,'Introduce los datos de entrega.');
  if(value.password!==undefined&&(typeof value.password!=='string'||value.password.length>500))throw fail(400,'Revisa la contraseña de entrega.');
  const result={username:text(value.username||'','el usuario',300,false),password:value.password||'',notes:text(value.notes||'','las instrucciones',5000,false)};
  for(const [field,label,max] of [['url','la URL',1000],['profile','el perfil',100],['pin','el PIN',100]]){
    const content=text(value[field]??'',label,max,false);if(content)result[field]=content;
  }
  if(result.url){try{const url=new URL(result.url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error();}catch{throw fail(400,'La URL de acceso debe empezar por https:// o http://, sin credenciales en el enlace.');}}
  for(const field of ['starts_on','expires_on']){
    const valueText=text(value[field]??'','las fechas de la cuenta',10,false);
    if(valueText){const parsed=new Date(valueText+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(valueText)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==valueText)throw fail(400,'Indica una fecha válida para la cuenta.');result[field]=valueText;}
  }
  if(result.starts_on&&result.expires_on&&result.expires_on<result.starts_on)throw fail(400,'La fecha de término no puede ser anterior al inicio.');
  if(!result.username&&!result.notes)throw fail(400,'Indica un usuario, licencia o instrucciones de entrega.');return result;
}
