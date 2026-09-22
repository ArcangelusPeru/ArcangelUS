import { randomUUID, createHmac } from 'node:crypto';
import { fail, requestId, soles, digest, secretToken, equalSecret } from './commerce-security.mjs';

export const YAPE_PACKAGE='com.bcp.innovacxion.yapeapp';
export function firstName(value){
  if(typeof value!=='string'||value.length>100)throw fail(400,'Escribe el primer nombre que aparece en Yape.');
  const name=value.trim().normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  if(!/^[a-z]{2,40}$/.test(name))throw fail(400,'Escribe solo el primer nombre, sin apellidos.');
  return name;
}
export function parseYapeNotification(value){
  if(typeof value!=='string'||value.length>600)return null;
  const match=value.trim().match(/^([\p{L}* .'-]{2,100}) te envi[oó] un pago por S\/\s*(\d{1,4}(?:[.,]\d{1,2})?)\.\s*El c[oó]d\. de seguridad es:\s*(\d{3})\.?$/u);
  if(!match)return null;
  try{return {name:match[1].trim(),first_name:firstName(match[1].trim().split(/\s+/)[0]),amount_cents:soles(match[2].replace(',','.')),code:match[3]};}catch{return null;}
}
export function yapeSignature(secret,timestamp,nonce,raw){return createHmac('sha256',secret).update(`${timestamp}\n${nonce}\n`).update(raw).digest('hex');}

export async function createYapeStore({pool,transaction,catalogId:cat,sealer}){
  const common='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  for(const definition of [
    `arcangel_yape_devices (catalog_id VARCHAR(48) PRIMARY KEY,device_id CHAR(36) NOT NULL UNIQUE,phone CHAR(9) NOT NULL UNIQUE,secret TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT FALSE,last_seen BIGINT NULL,last_payment BIGINT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `arcangel_yape_events (event_id CHAR(36) PRIMARY KEY,catalog_id VARCHAR(48) NOT NULL,event_key CHAR(64) NOT NULL UNIQUE,payment_key CHAR(64) NULL UNIQUE,first_name VARCHAR(40) NULL,match_key CHAR(64) NULL,amount_cents BIGINT UNSIGNED NULL,posted_at BIGINT NOT NULL,received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,state VARCHAR(24) NOT NULL,details TEXT NOT NULL,claim_id CHAR(36) NULL UNIQUE,KEY yape_match(catalog_id,match_key,posted_at),KEY yape_history(catalog_id,posted_at,event_id))`,
    `arcangel_yape_claims (claim_id CHAR(36) PRIMARY KEY,catalog_id VARCHAR(48) NOT NULL,user_id CHAR(36) NOT NULL,request_id CHAR(36) NOT NULL,amount_cents BIGINT UNSIGNED NOT NULL,started_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'yape_pending',attempts INT NOT NULL DEFAULT 0,event_id CHAR(36) NULL UNIQUE,UNIQUE KEY yape_request(catalog_id,request_id),KEY yape_user(catalog_id,user_id))`
  ])await pool.query(`CREATE TABLE IF NOT EXISTS ${definition} ${common}`);
  const matchKey=(name,amount,code)=>sealer.mac(`yape:${cat}:${name}:${amount}:${code}`);
  const view=row=>({id:row.claim_id,amount_cents:Number(row.amount_cents),status:row.status,expires_at:Number(row.expires_at),attempts_remaining:Math.max(0,3-row.attempts)});
  const device=async(db=pool,lock=false)=>{const [[row]]=await db.execute('SELECT * FROM arcangel_yape_devices WHERE catalog_id=?'+(lock?' FOR UPDATE':''),[cat]);return row;};
  const userLock=async(db,id)=>{const [[u]]=await db.execute('SELECT * FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[cat,id]);if(!u||u.blocked||u.deleted_at)throw fail(403,'Acceso desactivado.');return u;};
  async function ready(db){const d=await device(db,true);if(!d?.enabled||!d.last_seen||Date.now()-Number(d.last_seen)>180000)throw fail(503,'Yape automático no está disponible ahora. Usa la revisión manual.');return d;}
  async function claim(db,id,userId){const [[row]]=await db.execute('SELECT * FROM arcangel_yape_claims WHERE catalog_id=? AND claim_id=? AND user_id=? FOR UPDATE',[cat,requestId(id),userId]);if(!row)throw fail(404,'Solicitud no encontrada.');return row;}
  async function finish(db,row,status,eventId=null,note=''){
    await db.execute('UPDATE arcangel_yape_claims SET status=?,event_id=? WHERE claim_id=?',[status,eventId,row.claim_id]);
    await db.execute('UPDATE arcangel_ledger SET status=?,note=? WHERE catalog_id=? AND entry_id=?',[status,note,cat,row.claim_id]);return view({...row,status});
  }
  return {
    async publicStatus(){const d=await device();return {enabled:!!d?.enabled,online:!!d?.last_seen&&Date.now()-Number(d.last_seen)<180000};},
    async status(){const d=await device();return {catalog_id:cat,device_id:d?.device_id||'',paired:!!d,enabled:!!d?.enabled,online:!!d?.last_seen&&Date.now()-Number(d.last_seen)<180000,last_seen:d?.last_seen?Number(d.last_seen):null,last_payment:d?.last_payment?Number(d.last_payment):null,phone:d?.phone||'',max_soles:100};},
    async pair(phone){
      if(typeof phone!=='string'||!/^9\d{8}$/.test(phone))throw fail(400,'Escribe los 9 dígitos del número que recibe los yapeos.');
      const id=randomUUID(),secret=secretToken();
      try{await transaction(async db=>{const old=await device(db,true);if(old&&old.phone!==phone)throw fail(409,'Este catálogo ya tiene un Yape receptor. Contacta soporte para cambiarlo sin duplicar pagos.');
        await db.execute('INSERT INTO arcangel_yape_devices(catalog_id,device_id,phone,secret) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE device_id=IF(catalog_id=VALUES(catalog_id),VALUES(device_id),device_id),secret=IF(catalog_id=VALUES(catalog_id),VALUES(secret),secret),enabled=IF(catalog_id=VALUES(catalog_id),FALSE,enabled),last_seen=IF(catalog_id=VALUES(catalog_id),NULL,last_seen),last_payment=IF(catalog_id=VALUES(catalog_id),NULL,last_payment)',[cat,id,phone,sealer.seal(secret,`${cat}:yape-device`)]);
        const row=await device(db);if(!row||row.device_id!==id)throw fail(409,'Ese número ya está vinculado a otro catálogo. Abre Yape automático en el panel donde lo vinculaste y usa Liberar número. Después genera el código en la tienda publicada.');
      });}catch(e){if(e.code==='ER_DUP_ENTRY')throw fail(409,'Ese número ya está vinculado a otro catálogo.');throw e;}
      return {device_id:id,secret};
    },
    async release(input){
      const expected=requestId(input.device_id);
      if(typeof input.phone!=='string'||!/^9\d{8}$/.test(input.phone))throw fail(400,'Escribe el número de Yape que deseas liberar.');
      if(input.confirmed!==true)throw fail(400,'Confirma que deseas dejar de recibir nuevos pagos en este catálogo.');
      return transaction(async db=>{
        // Lock the same row as payment ingestion/crediting. A concurrent callback must
        // commit before release or fail its device check after release, never use stale credentials.
        const d=await device(db,true);
        if(!d)return {released:true};
        if(d.device_id!==expected||d.phone!==input.phone)throw fail(409,'La vinculación cambió o el número no coincide. Actualiza el panel antes de liberar.');
        const [[pending]]=await db.execute("SELECT claim_id FROM arcangel_yape_claims WHERE catalog_id=? AND status NOT IN ('approved','rejected') LIMIT 1 FOR UPDATE",[cat]);
        if(pending)throw fail(409,'Hay solicitudes Yape pendientes, vencidas o por revisar. Resuélvelas en este panel antes de liberar el número. Si alguien ya pagó, verifica el ingreso; no rechaces la solicitud solo para continuar.');
        // Retain all events, claims and ledger rows. Their global payment fingerprints
        // prevent a payment already received here from being credited in another catalog.
        await db.execute('DELETE FROM arcangel_yape_devices WHERE catalog_id=? AND device_id=?',[cat,expected]);
        return {released:true};
      });
    },
    async enable(enabled){if(typeof enabled!=='boolean')throw fail(400,'Estado no válido.');return transaction(async db=>{const d=await device(db,true);if(!d)throw fail(409,'Vincula primero la app.');if(enabled&&(!d.last_payment||!d.last_seen||Date.now()-Number(d.last_seen)>180000))throw fail(409,'Primero recibe una notificación de pago reconocida en la app y comprueba el importe en Yape.');await db.execute('UPDATE arcangel_yape_devices SET enabled=? WHERE catalog_id=?',[enabled,cat]);return {enabled};});},
    async receive(headers,raw){
      const d=await device(),ts=headers['x-yape-time'],nonce=headers['x-yape-nonce'],sig=headers['x-yape-signature'];
      if(!d||headers['x-yape-device']!==d.device_id||!/^\d{13}$/.test(ts||'')||Math.abs(Date.now()-Number(ts))>300000||!/^[a-f0-9-]{36}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(sig||''))throw fail(401,'Conexión no autorizada.');
      const secret=sealer.open(d.secret,`${cat}:yape-device`);
      if(!equalSecret(sig,yapeSignature(secret,ts,nonce,raw)))throw fail(401,'Conexión no autorizada.');
      let data;try{data=JSON.parse(raw.toString('utf8'));}catch{throw fail(400,'JSON no válido.');}
      if(!data||!['heartbeat','payment'].includes(data.type))throw fail(400,'Evento no válido.');
      return transaction(async db=>{
        const latest=await device(db,true);if(!latest||latest.device_id!==d.device_id)throw fail(401,'La vinculación cambió.');
        // A revoked Android permission must not keep the payment method online.
        if(data.type==='heartbeat'){await db.execute('UPDATE arcangel_yape_devices SET last_seen=? WHERE catalog_id=?',[data.listener_ready===true?Date.now():null,cat]);return {ok:true};}
        if(data.package!==YAPE_PACKAGE||typeof data.notification_key!=='string'||data.notification_key.length>300||!data.notification_key||!Number.isSafeInteger(data.posted_at)||data.posted_at>Date.now()+120000||data.posted_at<Date.now()-86400000||typeof data.text!=='string'||data.text.length>600)throw fail(400,'Notificación no válida o demasiado antigua.');
        const id=randomUUID(),eventKey=digest(`${d.phone}:${data.notification_key}:${data.posted_at}:${data.text}`),parsed=parseYapeNotification(data.text);
        const day=new Date(data.posted_at).toLocaleDateString('en-CA',{timeZone:'America/Lima'});
        // Conservative daily dedupe also protects against reposted Android notifications.
        const paymentKey=parsed?digest(`${d.phone}:${day}:${parsed.first_name}:${parsed.amount_cents}:${parsed.code}`):null;
        const [[old]]=await db.execute('SELECT event_id,event_key,claim_id FROM arcangel_yape_events WHERE event_key=? OR payment_key=?',[eventKey,paymentKey]);if(old){if(old.event_key!==eventKey&&!old.claim_id)await db.execute("UPDATE arcangel_yape_events SET state='ambiguous' WHERE event_id=?",[old.event_id]);return {ok:true,duplicate:true};}
        await db.execute('INSERT INTO arcangel_yape_events(event_id,catalog_id,event_key,payment_key,first_name,match_key,amount_cents,posted_at,state,details) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,cat,eventKey,paymentKey,parsed?.first_name||null,parsed?matchKey(parsed.first_name,parsed.amount_cents,parsed.code):null,parsed?.amount_cents||null,data.posted_at,parsed?'received':'unrecognized',sealer.seal(data.text,`${cat}:yape:${id}`)]);
        await db.execute('UPDATE arcangel_yape_devices SET last_seen=?,last_payment=IF(?, ?,last_payment) WHERE catalog_id=?',[Date.now(),!!parsed,Date.now(),cat]);
        return {ok:true,recognized:!!parsed};
      });
    },
    async start(userId,input){
      const amount=soles(input.amount_soles),rid=requestId(input.request_id);if(amount<100||amount>10000)throw fail(400,'Yape automático admite entre S/ 1.00 y S/ 100.00 por recarga.');
      return transaction(async db=>{await ready(db);await userLock(db,userId);
        const [[old]]=await db.execute('SELECT * FROM arcangel_yape_claims WHERE catalog_id=? AND request_id=?',[cat,rid]);if(old){if(old.user_id!==userId||Number(old.amount_cents)!==amount)throw fail(409,'Solicitud repetida con otros datos.');return view(old);}
        const [[pending]]=await db.execute("SELECT * FROM arcangel_yape_claims WHERE catalog_id=? AND user_id=? AND status='yape_pending' AND expires_at>?",[cat,userId,Date.now()]);if(pending)throw fail(409,'Ya tienes una recarga Yape pendiente. Termina esa solicitud.');
        const [[limit]]=await db.execute('SELECT COUNT(*) n FROM arcangel_yape_claims WHERE catalog_id=? AND user_id=? AND started_at>?',[cat,userId,Date.now()-3600000]);if(Number(limit.n)>=3)throw fail(429,'Límite de solicitudes alcanzado. Vuelve a intentarlo más tarde.');
        const id=randomUUID(),now=Date.now(),row={claim_id:id,amount_cents:amount,status:'yape_pending',expires_at:now+900000,attempts:0};
        await db.execute('INSERT INTO arcangel_yape_claims(claim_id,catalog_id,user_id,request_id,amount_cents,started_at,expires_at) VALUES(?,?,?,?,?,?,?)',[id,cat,userId,rid,amount,now,row.expires_at]);
        await db.execute("INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'yape_topup',?,'yape_pending',?,'Yape: esperando tu pago y validación')",[cat,id,userId,amount,'yape:'+id]);return view(row);
      });
    },
    async current(userId){return transaction(async db=>{const [[row]]=await db.execute("SELECT * FROM arcangel_yape_claims WHERE catalog_id=? AND user_id=? AND status='yape_pending' ORDER BY started_at DESC LIMIT 1 FOR UPDATE",[cat,userId]);if(!row)return null;if(Number(row.expires_at)<Date.now())return finish(db,row,'expired',null,'El plazo terminó. Contacta soporte si ya pagaste; no vuelvas a pagar.');return view(row);});},
    async verify(userId,input){
      const name=firstName(input.first_name),code=input.code;if(typeof code!=='string'||!/^\d{3}$/.test(code))throw fail(400,'Escribe el código de seguridad de 3 dígitos del comprobante.');
      return transaction(async db=>{
        await ready(db);const row=await claim(db,input.id,userId);const u=await userLock(db,userId);
        if(row.status!=='yape_pending')return view(row);
        if(Number(row.expires_at)<Date.now())return finish(db,row,'expired',null,'El plazo terminó. Contacta soporte si ya pagaste; no vuelvas a pagar.');
        if(row.attempts>=3)return finish(db,row,'review',null,'Yape: verificar manualmente; intentos agotados.');
        // This shared budget prevents opening many accounts to guess a 3-digit code.
        const bucket=digest(`yape-match:${name}:${row.amount_cents}`),now=Date.now();
        await db.execute('INSERT INTO arcangel_auth_limits(catalog_id,bucket,hits,expires_at) VALUES(?,?,1,?) ON DUPLICATE KEY UPDATE hits=IF(expires_at<=?,1,hits+1),expires_at=IF(expires_at<=?,VALUES(expires_at),expires_at)',[cat,bucket,now+900000,now,now]);
        const [[budget]]=await db.execute('SELECT hits FROM arcangel_auth_limits WHERE catalog_id=? AND bucket=?',[cat,bucket]);
        if(Number(budget.hits)>3)return finish(db,row,'review',null,'Yape: límite compartido de validaciones; revisar con el receptor.');
        const key=matchKey(name,row.amount_cents,code);
        const [events]=await db.execute('SELECT * FROM arcangel_yape_events WHERE catalog_id=? AND match_key=? AND posted_at>=? AND posted_at<=? FOR UPDATE',[cat,key,Number(row.started_at),Number(row.expires_at)]);
        if(events.length!==1||events[0].claim_id||events[0].state!=='received'){
          row.attempts++;await db.execute('UPDATE arcangel_yape_claims SET attempts=? WHERE claim_id=?',[row.attempts,row.claim_id]);
          if(row.attempts>=3)return finish(db,row,'review',null,'Yape: sin coincidencia única; verificar con el receptor.');
          return {...view(row),message:'Aún no encontramos un pago disponible con esos datos. Espera a que llegue la notificación y revisa el nombre, monto y código. No vuelvas a pagar.'};
        }
        if(Number(u.balance_cents)+Number(row.amount_cents)>100000000)return finish(db,row,'review',null,'Límite de saldo: revisión necesaria.');
        const event=events[0];
        await db.execute("UPDATE arcangel_yape_events SET claim_id=?,state='credited' WHERE event_id=?",[row.claim_id,event.event_id]);
        await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents+? WHERE catalog_id=? AND user_id=?',[row.amount_cents,cat,userId]);
        return finish(db,row,'approved',event.event_id,'Yape: notificación recibida y conciliada · '+event.event_id.slice(0,8));
      });
    },
    async reviews(){const [rows]=await pool.execute("SELECT c.claim_id,c.amount_cents,c.started_at,c.status,u.email FROM arcangel_yape_claims c JOIN arcangel_users u ON u.catalog_id=c.catalog_id AND u.user_id=c.user_id WHERE c.catalog_id=? AND c.status IN ('review','expired','yape_pending') ORDER BY (c.status='review') DESC,c.started_at DESC LIMIT 100",[cat]);return rows;},
    async review(input){
      if(!['approve','reject'].includes(input.decision))throw fail(400,'Decisión no válida.');
      return transaction(async db=>{
        await device(db,true);
        const [[row]]=await db.execute('SELECT * FROM arcangel_yape_claims WHERE catalog_id=? AND claim_id=? FOR UPDATE',[cat,requestId(input.id)]);if(!row)throw fail(404,'Solicitud no encontrada.');
        if(['approved','rejected'].includes(row.status))return view(row);
        if(input.decision==='reject')return finish(db,row,'rejected',null,'Yape: revisión rechazada por el administrador.');
        if(input.verified!==true)throw fail(400,'Confirma que verificaste el pago en tus movimientos de Yape.');
        const [[event]]=await db.execute('SELECT * FROM arcangel_yape_events WHERE catalog_id=? AND event_id=? FOR UPDATE',[cat,requestId(input.event_id)]);
        if(!event||event.claim_id||Number(event.amount_cents)!==Number(row.amount_cents)||!['received','ambiguous'].includes(event.state))throw fail(409,'El pago no está disponible o no coincide con el importe.');
        const u=await userLock(db,row.user_id);if(Number(u.balance_cents)+Number(row.amount_cents)>100000000)throw fail(409,'Límite de saldo.');
        await db.execute("UPDATE arcangel_yape_events SET claim_id=?,state='credited' WHERE event_id=?",[row.claim_id,event.event_id]);
        await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents+? WHERE catalog_id=? AND user_id=?',[row.amount_cents,cat,row.user_id]);
        return finish(db,row,'approved',event.event_id,'Yape: conciliado por el administrador · '+event.event_id.slice(0,8));
      });
    },
    async history(before){const cursor=before?requestId(before):null;const params=[cat];let extra='';if(cursor){const [[r]]=await pool.execute('SELECT posted_at,event_id FROM arcangel_yape_events WHERE catalog_id=? AND event_id=?',[cat,cursor]);if(!r)throw fail(400,'Página no válida.');extra=' AND (posted_at<? OR (posted_at=? AND event_id<?))';params.push(r.posted_at,r.posted_at,r.event_id);}
      const [rows]=await pool.execute('SELECT event_id,first_name,amount_cents,posted_at,state,claim_id FROM arcangel_yape_events WHERE catalog_id=?'+extra+' ORDER BY posted_at DESC,event_id DESC LIMIT 101',params);return {events:rows.slice(0,100),next:rows.length>100?rows[99].event_id:null};
    }
  };
}
