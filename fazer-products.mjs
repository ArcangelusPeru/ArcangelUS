import {createHash} from 'node:crypto';
import {fail,soles} from './commerce-security.mjs';
export function providerImage(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
const groups={topups:['recargas-juegos','fazer-topups.svg'],giftcards:['tarjetas-regalo','fazer-giftcards.svg'],gamekeys:['claves-juegos','fazer-gamekeys.svg']};
export function publicationInput(input){
 if(!Object.hasOwn(groups,input.kind))throw fail(400,'Selecciona un servicio válido.');
 for(const key of ['category_id','offer_id'])if(typeof input[key]!=='string'||!input[key]||input[key].length>200)throw fail(400,'Selecciona un producto del proveedor.');
 if(input.description!==undefined&&(typeof input.description!=='string'||input.description.length>12000))throw fail(400,'La descripción debe tener como máximo 12000 caracteres.');
 if(typeof input.published!=='boolean')throw fail(400,'Indica si deseas publicar el producto.');
 return {...input,client_cents:soles(input.client_price),reseller_cents:soles(input.reseller_price)};
}
export const publicationId=input=>'fz-'+createHash('sha256').update(JSON.stringify([input.kind,input.category_id,input.offer_id])).digest('hex').slice(0,32);
export function publicFazerProduct(row,role){
 const [filter,icon]=groups[row.kind];
 return {id:row.product_id,filter,name:row.name,brand:row.category_name,sub:row.category_name,type:'Producto digital',duration:'',pen:role?Number(role==='reseller'?row.reseller_cents:row.client_cents)/100:null,original_pen:null,banner_url:providerImage(row.image_url)||'logo/'+icon,logo_url:'logo/'+icon,features:[],description:row.description||'',note:'La entrega se confirma en Mis compras digitales.',sort_order:1000,cat_sort_order:0,palette:'red',active:true,checkout_mode:'provider',whatsapp_enabled:false};
}
export async function createFazerProducts({pool,cat,client}){
 await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_fazer_products(catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,product_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,kind VARCHAR(20) NOT NULL,category_id VARCHAR(200) NOT NULL,offer_id VARCHAR(200) NOT NULL,name VARCHAR(300) NOT NULL,category_name VARCHAR(300) NOT NULL,description TEXT NOT NULL,client_cents BIGINT NOT NULL,reseller_cents BIGINT NOT NULL,cost_usd DECIMAL(16,6) NOT NULL,published BOOLEAN NOT NULL DEFAULT FALSE,PRIMARY KEY(catalog_id,product_id)) ENGINE=InnoDB`);
 const [imageColumns]=await pool.query("SHOW COLUMNS FROM arcangel_fazer_products LIKE 'image_url'");
 if(!imageColumns.length){
  try{await pool.query("ALTER TABLE arcangel_fazer_products ADD COLUMN image_url TEXT NULL");}
  catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}
 }
 const list=async()=>{const [rows]=await pool.execute('SELECT * FROM arcangel_fazer_products WHERE catalog_id=? ORDER BY name',[cat]);return rows;};
 return {list,public:async role=>(await list()).filter(r=>r.published).map(r=>publicFazerProduct(r,role)),
 async save(raw){const input=publicationInput(raw),api=await client(),data=await api.offers(input.kind,input.category_id);
 const offers=data.offers||data.keys||data.cards||[];
 const offer=offers.find(o=>String(o.offer_id??o.card_id??o.key_id)===input.offer_id);
 if(!offer)throw fail(409,'La oferta ya no existe en FazerCards. Actualiza el catálogo.');
 const cost=Number(offer.price_usd);if(!Number.isFinite(cost)||cost<0)throw fail(409,'El proveedor no devolvió un costo válido.');
 const id=publicationId(input);
 const [previous]=await pool.execute('SELECT description FROM arcangel_fazer_products WHERE catalog_id=? AND product_id=?',[cat,id]);
 const description=input.description!==undefined?input.description:(previous[0]?.description??String(data.note||'').slice(0,12000));
 const categoryName=String(data.name||data.GameName||raw.category_name||'Producto digital').slice(0,300),name=String(offer.name||categoryName).slice(0,300);
 await pool.execute('INSERT INTO arcangel_fazer_products(catalog_id,product_id,kind,category_id,offer_id,name,category_name,description,client_cents,reseller_cents,cost_usd,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),category_name=VALUES(category_name),description=VALUES(description),client_cents=VALUES(client_cents),reseller_cents=VALUES(reseller_cents),cost_usd=VALUES(cost_usd),published=VALUES(published)',[cat,id,input.kind,input.category_id,input.offer_id,name,categoryName,description,input.client_cents,input.reseller_cents,cost,input.published]);await pool.execute('UPDATE arcangel_fazer_products SET image_url=? WHERE catalog_id=? AND product_id=?',[providerImage(data.imageurl),cat,id]);return {product_id:id,published:input.published};
 },async visibility(input){if(typeof input.published!=='boolean')throw fail(400,'Estado no válido.');const [result]=await pool.execute('UPDATE arcangel_fazer_products SET published=? WHERE catalog_id=? AND product_id=?',[input.published,cat,String(input.product_id||'')]);if(!result.affectedRows)throw fail(404,'Producto no encontrado.');return {published:input.published};}};
}


