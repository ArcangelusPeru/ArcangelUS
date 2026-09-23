import { randomUUID } from 'node:crypto';
import { fail, requestId, soles } from './commerce-security.mjs';

// Provider references are globally unique, including across preview/catalogues.
export async function createMercadoStore({pool,transaction,catalogId:cat}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS arcangel_mp_topups (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    environment VARCHAR(16) NOT NULL, receiver_id VARCHAR(32) NOT NULL,
    application_id VARCHAR(32) NOT NULL, payer_email VARCHAR(254) NOT NULL,
    provider_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
    checkout_url TEXT NULL, status VARCHAR(24) NOT NULL DEFAULT 'mp_pending',
    credited BOOLEAN NOT NULL DEFAULT FALSE, provider_updated VARCHAR(40) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY mp_request(catalog_id,request_id), KEY mp_customer(catalog_id,user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const view=row=>({id:row.id,amount_cents:Number(row.amount_cents),status:row.status,checkout_url:row.status==='mp_pending'?row.checkout_url:null});
  async function get(id,userId) {
    const [rows]=await pool.execute('SELECT * FROM arcangel_mp_topups WHERE catalog_id=? AND id=?',[cat,requestId(id)]);
    if(!rows.length||(userId&&rows[0].user_id!==userId))throw fail(404,'Recarga no encontrada.');
    return rows[0];
  }
  return {
    get,view,
    async reserve(user,input,config) {
      const amount=soles(input.amount_soles),rid=requestId(input.request_id);
      if(amount<100||amount>100000)throw fail(400,'Recarga entre S/ 1.00 y S/ 1,000.00.');
      return transaction(async db=>{
        const [[customer]]=await db.execute('SELECT * FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[cat,user.id]);
        if(!customer||customer.blocked||customer.deleted_at)throw fail(403,'Acceso desactivado.');
        const [[old]]=await db.execute('SELECT * FROM arcangel_mp_topups WHERE catalog_id=? AND request_id=?',[cat,rid]);
        if(old){if(old.user_id!==user.id||Number(old.amount_cents)!==amount||old.environment!==config.environment||old.receiver_id!==config.receiverId||old.application_id!==config.applicationId)throw fail(409,'Esta recarga ya existe con otros datos.');return old;}
        const [[count]]=await db.execute("SELECT COUNT(*) AS n FROM arcangel_mp_topups WHERE catalog_id=? AND user_id=? AND status='mp_pending' AND created_at>DATE_SUB(NOW(),INTERVAL 1 DAY)",[cat,user.id]);
        if(Number(count.n)>=5)throw fail(409,'Ya tienes varias recargas pendientes. Revisa sus estados antes de iniciar otra.');
        const id=randomUUID(),payer=config.testBuyerEmail||customer.email;
        await db.execute('INSERT INTO arcangel_mp_topups(id,catalog_id,user_id,request_id,amount_cents,environment,receiver_id,application_id,payer_email) VALUES(?,?,?,?,?,?,?,?,?)',[id,cat,user.id,rid,amount,config.environment,config.receiverId,config.applicationId,payer]);
        await db.execute("INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'mp_topup',?,'mp_pending',?,'Mercado Pago: esperando confirmación')",[cat,id,user.id,amount,'mp:'+id]);
        const [[row]]=await db.execute('SELECT * FROM arcangel_mp_topups WHERE id=?',[id]);return row;
      });
    },
    async bind(id,providerId,checkoutUrl) {
      await transaction(async db=>{
        const [[row]]=await db.execute('SELECT provider_id FROM arcangel_mp_topups WHERE catalog_id=? AND id=? FOR UPDATE',[cat,id]);
        if(!row||row.provider_id&&row.provider_id!==providerId)throw fail(409,'La referencia de pago no coincide.');
        await db.execute('UPDATE arcangel_mp_topups SET provider_id=?,checkout_url=COALESCE(?,checkout_url) WHERE catalog_id=? AND id=?',[providerId,checkoutUrl,cat,id]);
      });
    },
    async apply(id,order,nextStatus) {
      return transaction(async db=>{
        const [[row]]=await db.execute('SELECT * FROM arcangel_mp_topups WHERE catalog_id=? AND id=? FOR UPDATE',[cat,id]);
        if(!row||row.provider_id&&row.provider_id!==order.id)throw fail(409,'La referencia de pago no coincide.');
        if(row.status==='attention')return view(row);
        const updated=Date.parse(order.last_updated_date||'');
        if(!Number.isFinite(updated))throw fail(502,'Mercado Pago no devolvió la fecha del pago.');
        if(row.provider_updated&&updated<Date.parse(row.provider_updated))return view(row);
        // A delayed creation response may never undo an already settled payment.
        if(row.credited&&nextStatus!=='attention')return view(row);
        const [[user]]=await db.execute('SELECT * FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[cat,row.user_id]);
        if(!user)throw fail(409,'No se encontró al titular de la recarga.');
        let credited=!!row.credited,note='Mercado Pago: '+order.id;
        if(nextStatus==='approved'&&!credited){
          const balance=Number(user.balance_cents)+Number(row.amount_cents);
          if(balance>100000000)nextStatus='attention';
          else {await db.execute('UPDATE arcangel_users SET balance_cents=? WHERE catalog_id=? AND user_id=?',[balance,cat,row.user_id]);credited=true;}
        }
        if(nextStatus==='attention'){
          // Reversals require reconciliation; freeze spending, never silently discard debt.
          await db.execute('UPDATE arcangel_users SET blocked=TRUE WHERE catalog_id=? AND user_id=?',[cat,row.user_id]);
          await db.execute('DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[cat,row.user_id]);
          note+=' · Revisar devolución, contracargo o límite de saldo. Cliente suspendido; conciliar antes de reactivarlo.';
        }
        await db.execute('UPDATE arcangel_mp_topups SET provider_id=?,status=?,credited=?,provider_updated=? WHERE id=?',[order.id,nextStatus,credited,new Date(updated).toISOString(),id]);
        await db.execute('UPDATE arcangel_ledger SET status=?,note=? WHERE catalog_id=? AND entry_id=?',[nextStatus,note,cat,id]);
        return view({...row,status:nextStatus});
      });
    }
  };
}
