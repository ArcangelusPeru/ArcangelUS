import {createFazerOrders} from './fazer-orders.mjs';
import {createFazerProducts} from './fazer-products.mjs';
import {fazerClient} from './fazer-client.mjs';
import {fail} from './commerce-security.mjs';
export async function createFazerStore({pool,cat,sealer}){
 await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_fazer_config (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,secret TEXT NOT NULL,exchange_rate DECIMAL(12,6) NOT NULL) ENGINE=InnoDB`);
 const read=async()=>{const [rows]=await pool.execute('SELECT secret,exchange_rate FROM arcangel_fazer_config WHERE catalog_id=?',[cat]);return rows[0];};
 const client=async()=>{const row=await read();return fazerClient(row?sealer.open(row.secret,cat+':fazer-key'):'');};
 const products=await createFazerProducts({pool,cat,client});
 return {products,orders:await createFazerOrders({pool,cat,sealer,client}),
  async config(){const row=await read();return {configured:!!row,exchange_rate:row?Number(row.exchange_rate):null};},
  async save(input){const rate=Number(input.exchange_rate);if(!Number.isFinite(rate)||rate<=0||rate>1000)throw fail(400,'Indica el tipo de cambio de dólares a soles.');const previous=await read();const key=String(input.api_key||'').trim()||(previous?sealer.open(previous.secret,cat+':fazer-key'):'');if(!key||key.length>4096||/[\r\n]/.test(key))throw fail(400,'Indica una clave API válida.');const status=await fazerClient(key).status();await pool.execute('INSERT INTO arcangel_fazer_config(catalog_id,secret,exchange_rate) VALUES(?,?,?) ON DUPLICATE KEY UPDATE secret=VALUES(secret),exchange_rate=VALUES(exchange_rate)',[cat,sealer.seal(key,cat+':fazer-key'),rate]);return {configured:true,exchange_rate:rate,status};},
  async status(){return (await client()).status();},
  async categories(kind,cursor){return (await client()).categories(kind,cursor);},
  async offers(kind,id){if(typeof id!=='string'||!id||id.length>200)throw fail(400,'Selecciona un producto.');return (await client()).offers(kind,id);}
 };
}

