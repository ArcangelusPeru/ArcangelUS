import {providerImage} from './fazer-products.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {fail,requestId} from './commerce-security.mjs';
export function buyerFields(schema,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Revisa los datos del jugador.');
 const result=Object.create(null);
 for(const f of schema){const value=String(input[f.key]??'').trim();if(value.length>1000||(!value&&f.required!==false))throw fail(400,'Completa '+f.label);if(value&&f.type==='select'&&!f.options.some(o=>o.value===value))throw fail(400,'Selecciona una opción válida para '+f.label);result[f.key]=value;}
 return result;
}
function schemaFields(fields=[]){return fields.map(f=>({key:String(f.key),label:String(f.label||f.key),type:f.type==='select'?'select':'text',required:f.required!==false,options:(f.options||[]).map(o=>({value:String(o.value??o.id??o.key??''),label:String(o.label??o.name??o.value??'')}))}));}
export function deliveryCodes(order){
 const values=[];
 for(const source of [order,order.payload||{}])for(const key of ['cards','keys','codes'])for(const item of Array.isArray(source[key])?source[key]:[]){
  if(typeof item==='string')values.push(item);else if(item&&typeof item==='object'){const code=item.code??item.key??item.pin??item.serial;if(typeof code==='string')values.push(code+(item.pin&&item.pin!==code?' · PIN: '+item.pin:''));}
 }
 return [...new Set(values)].map(x=>x.slice(0,4000)).slice(0,100);
}
export async function createFazerOrders({pool,cat,sealer,client}){
 await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_fazer_orders(catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,user_id CHAR(36) NOT NULL,product_id VARCHAR(40) NOT NULL,product_name VARCHAR(600) NOT NULL,kind VARCHAR(20) NOT NULL,amount_cents BIGINT NOT NULL,fingerprint CHAR(64) NOT NULL,request_secret MEDIUMTEXT NOT NULL,delivery_secret MEDIUMTEXT NULL,provider_id VARCHAR(80) NULL,status VARCHAR(24) NOT NULL,attempts INT NOT NULL DEFAULT 0,lease_until DATETIME NULL,next_check DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,order_id),KEY due_orders(catalog_id,status,next_check)) ENGINE=InnoDB`);
 const tx=async fn=>{const db=await pool.getConnection();try{await db.beginTransaction();const result=await fn(db);await db.commit();return result;}catch(e){await db.rollback();throw e;}finally{db.release();}};
 const view=r=>({order_id:r.order_id,product_name:r.product_name,amount_cents:Number(r.amount_cents),status:r.status,created_at:r.created_at,codes:r.delivery_secret?sealer.open(r.delivery_secret,cat+':fazer-delivery:'+r.order_id):[]});
 const find=async(id,user)=>{const [[r]]=await pool.execute('SELECT * FROM arcangel_fazer_orders WHERE catalog_id=? AND order_id=? AND user_id=?',[cat,id,user]);return r;};
 async function quote(productId,user){
  const [[p]]=await pool.execute('SELECT * FROM arcangel_fazer_products WHERE catalog_id=? AND product_id=? AND published=TRUE',[cat,String(productId)]);if(!p)throw fail(404,'Producto no disponible.');
  const data=await (await client()).offers(p.kind,p.category_id),offer=(data.offers||data.keys||data.cards||[]).find(o=>String(o.offer_id??o.key_id??o.card_id)===p.offer_id);
  if(!offer||Number(offer.stock??1)<1||Number(offer.min_order_quantity??1)>1)throw fail(409,'Esta oferta no está disponible por unidad.');
  if(!Number.isFinite(Number(offer.price_usd))||Number(offer.price_usd)>Number(p.cost_usd))throw fail(409,'La tienda debe actualizar el costo de este producto.');
  return {p,image_url:providerImage(data.imageurl)||providerImage(p.image_url),fields:p.kind==='topups'?schemaFields(data.fields):[],amount_cents:Number(user.role==='reseller'?p.reseller_cents:p.client_cents),note:String(p.description??data.note??''),region:String(data.region||''),platform:String(data.platform||'')};
 }
 async function process(id){
  const claimed=await tx(async db=>{const [[r]]=await db.execute('SELECT * FROM arcangel_fazer_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[cat,id]);if(!r||!['pending','processing'].includes(r.status)||(r.lease_until&&new Date(r.lease_until)>new Date()))return null;await db.execute('UPDATE arcangel_fazer_orders SET lease_until=DATE_ADD(NOW(),INTERVAL 90 SECOND),attempts=attempts+IF(provider_id IS NULL,1,0) WHERE catalog_id=? AND order_id=?',[cat,id]);return r;});
  if(!claimed)return;
  let result;
  try{const api=await client();result=claimed.provider_id?await api.order(claimed.provider_id):await api.place(claimed.kind,sealer.open(claimed.request_secret,cat+':fazer-request:'+id),cat+':'+id);if(!result.order||!/^ord-\d+$/.test(result.order.id))throw Error('Unconfirmed');}
  catch(error){if(error.rejected&&!claimed.provider_id&&Number(claimed.attempts)===0){result={order:{id:null,status:'failed'}};}else{await pool.execute("UPDATE arcangel_fazer_orders SET status=IF(provider_id IS NULL AND attempts>=5,'review',status),lease_until=NULL,next_check=DATE_ADD(NOW(),INTERVAL 60 SECOND) WHERE catalog_id=? AND order_id=?",[cat,id]);return;}}
  const order=result.order,codes=deliveryCodes(order);let status=['refunded','failed','cancelled'].includes(order.status)?'refunded':order.status==='completed'&&(claimed.kind==='topups'||codes.length)?'delivered':'processing';
  await tx(async db=>{
   // All monetary updates lock the wallet before the order, including retries.
   await db.execute('SELECT user_id FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[cat,claimed.user_id]);
   const [[r]]=await db.execute('SELECT * FROM arcangel_fazer_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[cat,id]);if(['refunded','delivered'].includes(r.status))return;
   if(status==='refunded'){await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents+? WHERE catalog_id=? AND user_id=?',[r.amount_cents,cat,r.user_id]);await db.execute("INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'refund',?,'approved',?,?)",[cat,randomUUID(),r.user_id,r.amount_cents,'fazer-refund:'+id,'Devolución · '+r.product_name]);}
   await db.execute('UPDATE arcangel_fazer_orders SET status=?,provider_id=?,delivery_secret=?,lease_until=NULL,next_check=DATE_ADD(NOW(),INTERVAL 30 SECOND) WHERE catalog_id=? AND order_id=?',[status,order.id,sealer.seal(codes,cat+':fazer-delivery:'+id),cat,id]);
  });
 }
 return {
  async validatePlayer(user,input){const q=await quote(input.product_id,user);if(q.p.kind!=='topups')throw fail(400,'Este producto no requiere ID.');const api=await client(),supported=await api.validationGames();const name=q.p.category_name.trim().toLowerCase();const aliases={'free fire (latam)':'free_fire'};const target=(supported.items||[]).find(g=>String(g.category_id)===q.p.category_id||String(g.category_id)===aliases[name]||String(g.name).trim().toLowerCase()===name);if(!target)throw fail(409,'FazerCards no ofrece verificación de ID para este juego.');const result=await api.validatePlayer(target.category_id,buyerFields(schemaFields(target.fields),input.fields));return {valid:result.valid===true,player_name:String(result.player_name||''),region:String(result.region||'')};},
  async quote(id,user){const q=await quote(id,user);return {image_url:q.image_url,product_id:q.p.product_id,name:q.p.category_name+' · '+q.p.name,amount_cents:q.amount_cents,fields:q.fields,note:q.note,region:q.region,platform:q.platform};},
  async purchase(user,input){
   const id=requestId(input.request_id);const normalized=Object.fromEntries(Object.entries(input.fields||{}).sort(([a],[b])=>a.localeCompare(b)));const fingerprint=createHash('sha256').update(JSON.stringify([input.product_id,input.expected_cents,normalized])).digest('hex');
   const old=await find(id,user.id);if(old){if(old.fingerprint!==fingerprint)throw fail(409,'Esta compra ya tiene otros datos.');return {order:view(old)};}
   const q=await quote(input.product_id,user),fields=buyerFields(q.fields,normalized);if(q.amount_cents!==input.expected_cents)throw fail(409,'El precio cambió. Actualiza antes de confirmar.');
   const provider=await (await client()).status();if(!provider.active||!Number.isFinite(Number(provider.balance))||Number(provider.balance)<Number(q.p.cost_usd))throw fail(409,'El proveedor no está disponible para esta compra. No se descontó tu saldo.');
   const p=q.p,payload=p.kind==='topups'?{category_id:p.category_id,offer_id:p.offer_id,fields}:p.kind==='giftcards'?{category_id:p.category_id,card_id:p.offer_id,quantity:1}:{game_id:p.category_id,key_id:p.offer_id,quantity:1};
   await tx(async db=>{
    const [[u]]=await db.execute('SELECT * FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[cat,user.id]);if(!u||u.blocked||u.deleted_at)throw fail(403,'Acceso desactivado.');
    const [[existing]]=await db.execute('SELECT * FROM arcangel_fazer_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[cat,id]);if(existing){if(existing.user_id!==user.id||existing.fingerprint!==fingerprint)throw fail(409,'La compra ya existe con otros datos.');return;}
    const [[current]]=await db.execute('SELECT * FROM arcangel_fazer_products WHERE catalog_id=? AND product_id=? FOR UPDATE',[cat,p.product_id]);if(!current?.published||Number(u.role==='reseller'?current.reseller_cents:current.client_cents)!==q.amount_cents||u.role!==user.role)throw fail(409,'El producto cambió. Actualiza la compra.');
    if(Number(u.balance_cents)<q.amount_cents)throw fail(402,'Saldo insuficiente.');
    await db.execute("INSERT INTO arcangel_fazer_orders(catalog_id,order_id,user_id,product_id,product_name,kind,amount_cents,fingerprint,request_secret,status) VALUES(?,?,?,?,?,?,?,?,?,'pending')",[cat,id,user.id,p.product_id,p.category_name+' · '+p.name,p.kind,q.amount_cents,fingerprint,sealer.seal(payload,cat+':fazer-request:'+id)]);
    await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents-? WHERE catalog_id=? AND user_id=?',[q.amount_cents,cat,user.id]);
    await db.execute("INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'purchase',?,'approved',?,?)",[cat,randomUUID(),user.id,-q.amount_cents,'fazer-purchase:'+id,p.category_name+' · '+p.name]);
   });
   await process(id);return {order:view(await find(id,user.id))};
  },
  async list(userId){const [rows]=await pool.execute('SELECT * FROM arcangel_fazer_orders WHERE catalog_id=?'+(userId?' AND user_id=?':'')+' ORDER BY created_at DESC LIMIT 200',[cat,...(userId?[userId]:[])]);return rows.map(r=>({...view(r),...(!userId?{user_id:r.user_id,provider_id:r.provider_id}: {})}));},
  async tick(){const [rows]=await pool.execute("SELECT order_id FROM arcangel_fazer_orders WHERE catalog_id=? AND status IN ('pending','processing') AND (next_check IS NULL OR next_check<=NOW()) AND (lease_until IS NULL OR lease_until<NOW()) ORDER BY created_at LIMIT 10",[cat]);for(const r of rows)await process(r.order_id);},process
 };
}


