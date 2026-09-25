import {randomUUID} from 'node:crypto';
import {fail,soles} from './commerce-security.mjs';
export async function createCoupons({pool,transaction,cat,catalogLock,userLock}){
 await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_coupons (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,kind VARCHAR(16) NOT NULL,value INT NOT NULL,max_uses INT NOT NULL,used INT NOT NULL DEFAULT 0,expires_ms BIGINT NOT NULL,products TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE,PRIMARY KEY(catalog_id,code)) ENGINE=InnoDB`);
 await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_coupon_uses (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,user_id CHAR(36) NOT NULL,reference VARCHAR(80) NOT NULL,amount_cents BIGINT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,code,user_id),UNIQUE KEY coupon_reference(catalog_id,reference)) ENGINE=InnoDB`);
 const normalize=v=>{const code=String(v||'').trim().toUpperCase();if(!/^[A-Z0-9-]{3,40}$/.test(code))throw fail(400,'El código debe tener de 3 a 40 letras, números o guiones.');return code;};
 async function eligible(db,code,userId,kind,productId){
  code=normalize(code);const [[c]]=await db.execute('SELECT * FROM arcangel_coupons WHERE catalog_id=? AND code=? FOR UPDATE',[cat,code]);
  if(!c||!c.active||c.kind!==kind)throw fail(409,'Cupón no disponible para esta operación.');
  if(Date.now()>=Number(c.expires_ms))throw fail(409,'El cupón venció.');
  if(c.used>=c.max_uses)throw fail(409,'El cupón agotó sus usos.');
  const [[used]]=await db.execute('SELECT reference FROM arcangel_coupon_uses WHERE catalog_id=? AND code=? AND user_id=?',[cat,code,userId]);if(used)throw fail(409,'Ya utilizaste este cupón.');
  const products=JSON.parse(c.products);if(kind==='discount'&&products.length&&!products.includes(productId))throw fail(409,'El cupón no aplica a este producto.');return c;
 }
 async function consume(db,c,userId,reference,amount){
  await db.execute('INSERT INTO arcangel_coupon_uses(catalog_id,code,user_id,reference,amount_cents) VALUES(?,?,?,?,?)',[cat,c.code,userId,reference,amount]);
  await db.execute('UPDATE arcangel_coupons SET used=used+1 WHERE catalog_id=? AND code=?',[cat,c.code]);
 }
 return {
  eligible,consume,
  async list(){const [rows]=await pool.execute('SELECT * FROM arcangel_coupons WHERE catalog_id=? ORDER BY expires_ms DESC',[cat]);return rows.map(r=>({...r,products:JSON.parse(r.products)}));},
  async create(input){
   const code=normalize(input.code),kind=input.kind;if(!['discount','balance'].includes(kind))throw fail(400,'Tipo de cupón no válido.');
   const value=kind==='balance'?soles(input.value):Number(input.value),max=Number(input.max_uses);
   if(!Number.isInteger(value)||value<1||value>(kind==='discount'?100:100000000)||!Number.isInteger(max)||max<1||max>1000000)throw fail(400,'Revisa el valor y el límite de usos.');
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.expires||''))throw fail(400,'Indica fecha y hora de vencimiento.');
   const expires=Date.parse(input.expires+':00-05:00');if(!Number.isFinite(expires)||expires<=Date.now())throw fail(400,'El vencimiento debe ser futuro.');
   return transaction(async db=>{await catalogLock(db);const products=[];
    try{await db.execute('INSERT INTO arcangel_coupons(catalog_id,code,kind,value,max_uses,expires_ms,products) VALUES(?,?,?,?,?,?,?)',[cat,code,kind,value,max,expires,JSON.stringify(products)]);}catch(e){if(e.code==='ER_DUP_ENTRY')throw fail(409,'Ya existe ese código.');throw e;}return {code};});
  },
  async disable(code){return transaction(async db=>{await catalogLock(db);await db.execute('UPDATE arcangel_coupons SET active=FALSE WHERE catalog_id=? AND code=?',[cat,normalize(code)]);return {ok:true};});},
  async redeem(userId,code){return transaction(async db=>{await catalogLock(db);const u=await userLock(db,userId);if(u.blocked||u.deleted_at)throw fail(403,'Acceso desactivado.');
   const c=await eligible(db,code,userId,'balance');if(Number(u.balance_cents)+c.value>100000000)throw fail(409,'El saldo excedería el máximo permitido.');
   await consume(db,c,userId,'coupon:'+randomUUID(),c.value);
   await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents+? WHERE catalog_id=? AND user_id=?',[c.value,cat,userId]);
   await db.execute("INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'coupon_topup',?,'approved',?,?)",[cat,randomUUID(),userId,c.value,'coupon:'+randomUUID(),'Cupón de saldo · '+c.code]);return {amount_cents:c.value,balance_cents:Number(u.balance_cents)+c.value};});}
 };
}
