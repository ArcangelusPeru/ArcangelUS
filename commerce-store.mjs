import { randomUUID } from 'node:crypto';
import { createMercadoStore } from './mercado-store.mjs';
import { createYapeStore } from './yape-store.mjs';
import { priceForRole } from './pricing.mjs';
import { fail, digest, delivery, email, username, validatePassword, hashPassword, verifyPassword, secretToken, equalSecret, cents, soles, text, requestId } from './commerce-security.mjs';

// Amounts are integer céntimos. Every sale locks the catalogue, customer and
// inventory in one transaction so money, stock and the order commit together.
export async function createCommerceStore({pool,transaction,catalogId:cat,sealer,updateCatalog}){
  const common='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  const catalog='catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
  const uuid='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
  for(const ddl of [
    `arcangel_commerce_meta (${catalog},document TEXT NOT NULL,PRIMARY KEY(catalog_id))`,
    `arcangel_users (${catalog},user_id ${uuid} NOT NULL,username VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NULL,email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,password_hash VARCHAR(220) NOT NULL,recovery_hash CHAR(64) NOT NULL,balance_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,blocked BOOLEAN NOT NULL DEFAULT FALSE,role VARCHAR(16) NOT NULL DEFAULT 'customer',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,user_id),UNIQUE KEY email_unique(catalog_id,email),UNIQUE KEY username_unique(catalog_id,username))`,
    `arcangel_user_sessions (${catalog},token_hash CHAR(64) NOT NULL,user_id ${uuid} NOT NULL,expires_at DATETIME NOT NULL,PRIMARY KEY(catalog_id,token_hash),KEY user_sessions(catalog_id,user_id))`,
    `arcangel_auth_limits (${catalog},bucket CHAR(64) NOT NULL,hits INT NOT NULL,expires_at BIGINT NOT NULL,PRIMARY KEY(catalog_id,bucket))`,
    `arcangel_inventory_batches (${catalog},batch_id ${uuid} NOT NULL,fingerprint CHAR(64) NOT NULL,units INT NOT NULL,PRIMARY KEY(catalog_id,batch_id))`,
    `arcangel_ledger (${catalog},entry_id ${uuid} NOT NULL,user_id ${uuid} NOT NULL,order_id ${uuid} NULL,kind VARCHAR(32) NOT NULL,amount_cents BIGINT NOT NULL,status VARCHAR(24) NOT NULL,reference VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,note VARCHAR(1000) NOT NULL DEFAULT '',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,entry_id),UNIQUE KEY reference_unique(catalog_id,reference),KEY ledger_user(catalog_id,user_id,created_at),KEY ledger_order(catalog_id,order_id,kind,status))`,
    `arcangel_inventory (${catalog},inventory_id ${uuid} NOT NULL,account_number BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,product_id VARCHAR(100) NOT NULL,secret TEXT NOT NULL,fingerprint CHAR(64) NOT NULL,state VARCHAR(24) NOT NULL DEFAULT 'available',order_id ${uuid} NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,inventory_id),UNIQUE KEY inventory_number_unique(account_number),UNIQUE KEY inventory_unique(catalog_id,fingerprint),KEY inventory_product(catalog_id,product_id,state))`,
    `arcangel_orders (${catalog},order_id ${uuid} NOT NULL,user_id ${uuid} NOT NULL,product_id VARCHAR(100) NOT NULL,product_name VARCHAR(160) NOT NULL,amount_cents BIGINT UNSIGNED NOT NULL,delivery_mode VARCHAR(16) NOT NULL,status VARCHAR(24) NOT NULL,inventory_id ${uuid} NULL,delivery_secret TEXT NULL,stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,order_id),KEY orders_user(catalog_id,user_id,created_at))`,
    `arcangel_reports (${catalog},report_id ${uuid} NOT NULL,user_id ${uuid} NOT NULL,order_id ${uuid} NOT NULL,message TEXT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'open',owner_reply TEXT NOT NULL,revision INT UNSIGNED NOT NULL DEFAULT 1,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,report_id),KEY reports_order(catalog_id,order_id),KEY reports_user(catalog_id,user_id,created_at))`,
    `arcangel_replacements (${catalog},replacement_id ${uuid} NOT NULL,order_id ${uuid} NOT NULL,user_id ${uuid} NOT NULL,product_id VARCHAR(100) NOT NULL,old_inventory_id ${uuid} NOT NULL,new_inventory_id ${uuid} NOT NULL,old_secret TEXT NOT NULL,new_secret TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(catalog_id,replacement_id),UNIQUE KEY replacement_order(catalog_id,order_id),KEY replacements_user(catalog_id,user_id,created_at))`,
  ])await pool.query(`CREATE TABLE IF NOT EXISTS ${ddl} ${common}`);
  // Assign existing and future accounts an immutable, database-generated number.
  // The unique index is created in the same ALTER as the auto-increment column.
  const [accountNumberColumn]=await pool.query("SHOW COLUMNS FROM arcangel_inventory LIKE 'account_number'");
  if(!accountNumberColumn.length){try{await pool.query('ALTER TABLE arcangel_inventory ADD COLUMN account_number BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, ADD UNIQUE KEY inventory_number_unique(account_number)');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  // Additive migration for stores already using customer accounts.
  const [deletedColumn]=await pool.query("SHOW COLUMNS FROM arcangel_users LIKE 'deleted_at'");
  if(!deletedColumn.length){try{await pool.query('ALTER TABLE arcangel_users ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  const [recoveryColumn]=await pool.query("SHOW COLUMNS FROM arcangel_users LIKE 'recovery_secret'");
  if(!recoveryColumn.length){try{await pool.query('ALTER TABLE arcangel_users ADD COLUMN recovery_secret TEXT NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  const [usernameColumn]=await pool.query("SHOW COLUMNS FROM arcangel_users LIKE 'username'");
  if(!usernameColumn.length){try{await pool.query("ALTER TABLE arcangel_users ADD COLUMN username VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NULL");}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  // Nullable usernames keep rolling deployments compatible with the previous
  // version. Existing customers keep email access and receive a unique handle.
  try{await pool.query('ALTER TABLE arcangel_users ADD UNIQUE KEY username_unique(catalog_id,username)');}catch(error){if(error.code!=='ER_DUP_KEYNAME')throw error;}
  const [legacyUsers]=await pool.execute("SELECT user_id FROM arcangel_users WHERE catalog_id=? AND username IS NULL",[cat]);
  for(const legacy of legacyUsers){
    const handle='cliente_'+legacy.user_id.replaceAll('-','');
    try{await pool.execute('UPDATE arcangel_users SET username=? WHERE catalog_id=? AND user_id=? AND username IS NULL',[handle,cat,legacy.user_id]);}catch(error){if(error.code!=='ER_DUP_ENTRY')throw error;}
  }
  const [roleColumn]=await pool.query("SHOW COLUMNS FROM arcangel_users LIKE 'role'");
  if(!roleColumn.length){try{await pool.query("ALTER TABLE arcangel_users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'customer'");}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  const [ledgerOrderColumn]=await pool.query("SHOW COLUMNS FROM arcangel_ledger LIKE 'order_id'");
  if(!ledgerOrderColumn.length){try{await pool.query(`ALTER TABLE arcangel_ledger ADD COLUMN order_id ${uuid} NULL, ADD KEY ledger_order(catalog_id,order_id,kind,status)`);}catch(error){if(error.code!=='ER_DUP_FIELDNAME'&&error.code!=='ER_DUP_KEYNAME')throw error;}}
  // Link legacy renewals when there is exactly one unambiguous delivered order
  // for the same customer and product. Ambiguous records stay unlinked so a
  // historical payment is never assigned to the wrong sale.
  const [legacyRenewals]=await pool.execute("SELECT entry_id,user_id,note,created_at FROM arcangel_ledger WHERE catalog_id=? AND kind='renewal' AND order_id IS NULL",[cat]);
  for(const renewal of legacyRenewals){
    const prefix='Renovación · ',productName=String(renewal.note||'').startsWith(prefix)?String(renewal.note).slice(prefix.length):'';
    if(!productName)continue;
    const [matches]=await pool.execute("SELECT order_id FROM arcangel_orders WHERE catalog_id=? AND user_id=? AND product_name=? AND status='delivered' AND created_at<=? ORDER BY created_at DESC,order_id",[cat,renewal.user_id,productName,renewal.created_at]);
    if(matches.length===1)await pool.execute('UPDATE arcangel_ledger SET order_id=? WHERE catalog_id=? AND entry_id=? AND order_id IS NULL',[matches[0].order_id,cat,renewal.entry_id]);
  }
  // A wrong or rotated encryption key must fail at startup, before new sales.
  await pool.execute('INSERT IGNORE INTO arcangel_commerce_meta(catalog_id,document) VALUES(?,?)',[cat,sealer.seal('arcangel-commerce-v1',`${cat}:key-check`)]);
  const [meta]=await pool.execute('SELECT document FROM arcangel_commerce_meta WHERE catalog_id=?',[cat]);
  try{if(sealer.open(meta[0].document,`${cat}:key-check`)!=='arcangel-commerce-v1')throw Error();}catch{throw Error('COMMERCE_KEY no coincide con la clave usada para este catálogo. Restablece la clave original; no se han cambiado las ventas.');}
  const fingerprint=value=>sealer.mac(`${cat}:fingerprint:${JSON.stringify(value)}`);
  const query=async(db,sql,values=[])=>{const [rows]=await db.execute(sql,[cat,...values]);return rows;};
  async function catalogLock(db){const rows=await query(db,'SELECT revision,document FROM arcangel_catalogs WHERE catalog_id=? FOR UPDATE');if(!rows.length)throw fail(409,'Configura primero el catálogo.');return {row:rows[0],data:JSON.parse(rows[0].document)};}
  const userLock=async(db,id)=>{const rows=await query(db,'SELECT * FROM arcangel_users WHERE catalog_id=? AND user_id=? FOR UPDATE',[id]);if(!rows.length)throw fail(401,'Inicia sesión de nuevo.');return rows[0];};
  const profile=user=>({id:user.user_id,username:user.username||'',email:user.email,balance_cents:Number(user.balance_cents),blocked:!!user.blocked,role:user.role==='reseller'?'reseller':'customer'});
  const duplicate=error=>{if(error.code==='ER_DUP_ENTRY')throw fail(409,'Este registro ya existe. No se guardó un duplicado.');throw error;};
  const session=async(db,user)=>{const token=secretToken();await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND (expires_at<NOW() OR user_id=?)',[user.user_id]);await query(db,'INSERT INTO arcangel_user_sessions(catalog_id,token_hash,user_id,expires_at) VALUES(?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))',[digest(token),user.user_id]);return {token,user:profile(user)};};
  const userByToken=async token=>{if(!/^[a-f0-9]{64}$/.test(token||''))return null;const [user]=await query(pool,'SELECT u.* FROM arcangel_users u JOIN arcangel_user_sessions s ON s.catalog_id=u.catalog_id AND s.user_id=u.user_id WHERE u.catalog_id=? AND s.token_hash=? AND s.expires_at>NOW() AND u.blocked=FALSE AND u.deleted_at IS NULL',[digest(token)]);return user||null;};
  async function stock(db,snapshot){
    const counts=await query(db,"SELECT product_id,COUNT(*) AS units FROM arcangel_inventory WHERE catalog_id=? AND state='available' GROUP BY product_id");
    const units=new Map(counts.map(row=>[row.product_id,Number(row.units)]));
    for(const p of snapshot.products)if(p.checkout_mode==='automatic'){p.stock_quantity=units.get(p.id)||0;p.out_of_stock=p.stock_quantity===0;}
  }
  const accountCode=number=>number==null?null:'CTA-'+String(number).padStart(6,'0');
  const orderView=row=>({order_id:row.order_id,account_code:accountCode(row.account_number),product_id:row.product_id,product_name:row.product_name,amount_cents:Number(row.amount_cents),delivery_mode:row.delivery_mode,status:row.status,created_at:row.created_at});
  const dateOnly=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const addDays=(value,days)=>{const d=new Date((value||dateOnly())+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  const periodDays=value=>{const textValue=String(value||'').toLocaleLowerCase('es');const match=textValue.match(/(\d+)\s*(mes|m[eé]s|a[nñ]o|d[ií]a)/);if(!match)return 30;const n=Math.max(1,Math.min(730,Number(match[1])));return match[2].startsWith('a')?n*365:match[2].startsWith('d')?n:n*30;};
  return {
    mercado:await createMercadoStore({pool,transaction,catalogId:cat}),
    yape:await createYapeStore({pool,transaction,catalogId:cat,sealer}),
    async syncCatalog(db,next,previous){
      if(previous){
        const removed=previous.products.filter(p=>!next.products.some(n=>n.id===p.id));
        for(const p of removed){
          const [open]=await query(db,"SELECT COUNT(*) AS n FROM arcangel_orders WHERE catalog_id=? AND product_id=? AND status='pending_manual'",[p.id]);
          const [available]=await query(db,"SELECT COUNT(*) AS n FROM arcangel_inventory WHERE catalog_id=? AND product_id=? AND state='available'",[p.id]);
          if(Number(open.n)||Number(available.n))throw fail(409,`Oculta «${p.name}» o atiende sus pedidos y retira sus cuentas disponibles antes de eliminarlo.`);
        }
      }
      await stock(db,next);
    },
    async limit(key,max=10,seconds=900){
      const bucket=digest(key),now=Date.now();
      const hits=await transaction(async db=>{
        await query(db,'INSERT INTO arcangel_auth_limits(catalog_id,bucket,hits,expires_at) VALUES(?,?,1,?) ON DUPLICATE KEY UPDATE hits=IF(expires_at<=?,1,hits+1),expires_at=IF(expires_at<=?,VALUES(expires_at),expires_at)',[bucket,now+seconds*1000,now,now]);
        const [row]=await query(db,'SELECT hits FROM arcangel_auth_limits WHERE catalog_id=? AND bucket=?',[bucket]);return row.hits;
      });
      if(hits>max)throw fail(429,'Demasiados intentos. Vuelve a intentarlo más tarde.');
      if(Math.random()<0.02)await query(pool,'DELETE FROM arcangel_auth_limits WHERE catalog_id=? AND expires_at<?',[now]);
    },
    async register(handle,address,password){
      handle=username(handle);address=email(address);const passwordHash=await hashPassword(password),recovery=secretToken(),id=randomUUID();
      try{return await transaction(async db=>{
        await query(db,'INSERT INTO arcangel_users(catalog_id,user_id,username,email,password_hash,recovery_hash,recovery_secret,role) VALUES(?,?,?,?,?,?,?,\'customer\')',[id,handle,address,passwordHash,digest(recovery),sealer.seal(recovery,`${cat}:recovery:${id}`)]);
        return {...await session(db,{user_id:id,username:handle,email:address,balance_cents:0,blocked:false,role:'customer'}),recovery_code:recovery};
      });}catch(error){duplicate(error);}
    },
    async createCustomer(handle,address,password,role='customer'){
      handle=username(handle);address=email(address);validatePassword(password);if(!['customer','reseller'].includes(role))throw fail(400,'Elige un rol válido.');const passwordHash=await hashPassword(password),recovery=secretToken(),id=randomUUID();
      try{return await transaction(async db=>{
        await catalogLock(db);
        await query(db,'INSERT INTO arcangel_users(catalog_id,user_id,username,email,password_hash,recovery_hash,recovery_secret,role) VALUES(?,?,?,?,?,?,?,?)',[id,handle,address,passwordHash,digest(recovery),sealer.seal(recovery,`${cat}:recovery:${id}`),role]);
        return {customer:profile({user_id:id,username:handle,email:address,balance_cents:0,blocked:false,role}),recovery_code:recovery};
      });}catch(error){duplicate(error);}
    },
    async changeCustomerPassword(id,password){
      id=requestId(id);validatePassword(password);const passwordHash=await hashPassword(password),recovery=secretToken();
      return transaction(async db=>{const user=await userLock(db,id);if(user.deleted_at)throw fail(409,'Restaura primero al usuario desde Eliminados.');await db.execute('UPDATE arcangel_users SET password_hash=?,recovery_hash=?,recovery_secret=? WHERE catalog_id=? AND user_id=?',[passwordHash,digest(recovery),sealer.seal(recovery,`${cat}:recovery:${id}`),cat,id]);await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[id]);return {updated:true};});
    },
    async login(identifier,password){
      const handle=text(identifier,'el usuario o correo',254);const lookup=handle.includes('@')?email(handle):username(handle);const [user]=await query(pool,'SELECT * FROM arcangel_users WHERE catalog_id=? AND (email=? OR username=?) LIMIT 1',[lookup,lookup]);
      const valid=await verifyPassword(password,user?.password_hash);if(!valid||!user||user.blocked||user.deleted_at)throw fail(401,'Usuario, correo o contraseña incorrectos, o acceso desactivado.');
      return transaction(async db=>{const latest=await userLock(db,user.user_id);if(latest.blocked||latest.deleted_at||latest.password_hash!==user.password_hash)throw fail(401,'Inicia sesión de nuevo.');return session(db,latest);});
    },
    async recover(address,code,password){
      address=email(address);text(code,'el código de recuperación',64);
      const passwordHash=await hashPassword(password),newCode=secretToken();
      return transaction(async db=>{const [user]=await query(db,'SELECT * FROM arcangel_users WHERE catalog_id=? AND email=? FOR UPDATE',[address]);if(!user||user.blocked||user.deleted_at||!equalSecret(user.recovery_hash,digest(code)))throw fail(401,'Correo o código de recuperación incorrectos.');await db.execute('UPDATE arcangel_users SET password_hash=?,recovery_hash=?,recovery_secret=? WHERE catalog_id=? AND user_id=?',[passwordHash,digest(newCode),sealer.seal(newCode,`${cat}:recovery:${user.user_id}`),cat,user.user_id]);return {...await session(db,user),recovery_code:newCode};});
    },
    async customerRecovery(id,generate=false){
      id=requestId(id);
      return transaction(async db=>{
        const user=await userLock(db,id);
        if(user.deleted_at)throw fail(409,'Restaura el usuario antes de consultar su código.');
        // Legacy hashes cannot be reversed. Only an explicit owner action replaces one.
        let code=null;
        if(user.recovery_secret){
          code=sealer.open(user.recovery_secret,`${cat}:recovery:${id}`);
          if(typeof code!=='string'||!/^[a-f0-9]{64}$/.test(code)||!equalSecret(digest(code),user.recovery_hash))throw fail(409,'No se pudo verificar el código de recuperación.');
        }else if(generate){
          code=secretToken();
          await db.execute('UPDATE arcangel_users SET recovery_hash=?,recovery_secret=? WHERE catalog_id=? AND user_id=?',[digest(code),sealer.seal(code,`${cat}:recovery:${id}`),cat,id]);
        }
        return {user_id:id,email:user.email,blocked:!!user.blocked,recovery_code:code};
      });
    },
    async userFromToken(token){const user=await userByToken(token);return user?profile(user):null;},
    async logout(token){await query(pool,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND token_hash=?',[digest(token)]);},
    async movements(userId){return (await query(pool,'SELECT entry_id,kind,amount_cents,status,reference,note,created_at FROM arcangel_ledger WHERE catalog_id=? AND user_id=? ORDER BY created_at DESC,entry_id LIMIT 200',[userId])).map(row=>({...row,amount_cents:Number(row.amount_cents)}));},
    async topup(userId,input){
      const amount=soles(input.amount_soles),reference='topup:qr:'+requestId(input.request_id);
      return transaction(async db=>{
        const {data}=await catalogLock(db);if(!data.settings.payment_qr)throw fail(409,'El QR de pago todavía no está configurado.');
        const user=await userLock(db,userId);if(user.blocked||user.deleted_at)throw fail(403,'Acceso desactivado.');
        const [old]=await query(db,'SELECT entry_id,user_id,amount_cents,status FROM arcangel_ledger WHERE catalog_id=? AND reference=?',[reference]);
        if(old){if(old.user_id===userId&&Number(old.amount_cents)===amount)return {status:old.status};throw fail(409,'Esta solicitud ya existe con otros datos. Actualiza tu billetera.');}
        const [pending]=await query(db,"SELECT COUNT(*) AS n FROM arcangel_ledger WHERE catalog_id=? AND user_id=? AND kind='topup' AND status='pending'",[userId]);if(Number(pending.n))throw fail(409,'Ya tienes una recarga en revisión. Espera su respuesta antes de solicitar otra.');
        try{await query(db,"INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'topup',?,'pending',?,'')",[randomUUID(),userId,amount,reference]);}catch(error){duplicate(error);}
        return {status:'pending'};
      });
    },
    async addCustomerBalance(id,input){
      id=requestId(id);const amount=soles(input.amount_soles),reference='topup:admin:'+requestId(input.request_id),note=text(input.note||'','la nota',400,false);
      return transaction(async db=>{
        const user=await userLock(db,id);
        const [old]=await query(db,'SELECT entry_id,user_id,amount_cents,note FROM arcangel_ledger WHERE catalog_id=? AND reference=?',[reference]);
        if(old){if(old.user_id!==id||Number(old.amount_cents)!==amount||old.note!==note)throw fail(409,'La operación ya existe con otros datos. Revisa el historial de recargas.');return {entry_id:old.entry_id,balance_cents:Number(user.balance_cents),amount_cents:amount};}
        if(user.deleted_at||user.blocked)throw fail(409,'Activa al cliente antes de agregarle saldo.');
        const balance=Number(user.balance_cents)+amount;if(balance>100000000)throw fail(409,'La recarga supera el límite de saldo de la cuenta.');
        const entryId=randomUUID();
        try{await query(db,"INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'admin_topup',?,'approved',?,?)",[entryId,id,amount,reference,note]);}catch(error){duplicate(error);}
        await db.execute('UPDATE arcangel_users SET balance_cents=? WHERE catalog_id=? AND user_id=?',[balance,cat,id]);
        return {entry_id:entryId,balance_cents:balance,amount_cents:amount};
      });
    },
    async approveTopup(id,approved,note){
      requestId(id);if(typeof approved!=='boolean')throw fail(400,'Elige aprobar o rechazar.');note=text(note||'','la nota',400,false);
      return transaction(async db=>{
        const [entry]=await query(db,"SELECT * FROM arcangel_ledger WHERE catalog_id=? AND entry_id=? AND kind='topup' FOR UPDATE",[id]);if(!entry)throw fail(404,'Recarga no encontrada.');
        const status=approved?'approved':'rejected';if(entry.status===status)return {status};if(entry.status!=='pending')throw fail(409,'La recarga ya fue procesada.');
        const user=await userLock(db,entry.user_id),balance=Number(user.balance_cents)+(approved?Number(entry.amount_cents):0);if(balance>100000000)throw fail(409,'La recarga supera el límite de saldo de la cuenta.');
        if(approved)await db.execute('UPDATE arcangel_users SET balance_cents=? WHERE catalog_id=? AND user_id=?',[balance,cat,user.user_id]);
        await db.execute('UPDATE arcangel_ledger SET status=?,note=? WHERE catalog_id=? AND entry_id=?',[status,entry.note+(note?' · Revisión: '+note:''),cat,id]);return {status};
      });
    },
    async addInventory(productId,items,batchId){
      requestId(batchId);if(!Array.isArray(items)||!items.length||items.length>200)throw fail(400,'Carga entre 1 y 200 cuentas.');
      const entries=items.map(value=>{const data=delivery(value),id=randomUUID();return {id,data,fingerprint:fingerprint(data),secret:sealer.seal(data,`${cat}:inventory:${id}`)};});
      return transaction(async db=>{
        const snapshot=await catalogLock(db);if(!snapshot.data.products.some(p=>p.id===productId))throw fail(404,'Producto no encontrado.');
        const batchHash=fingerprint([productId,entries.map(entry=>entry.data)]);
        const [batch]=await query(db,'SELECT fingerprint,units FROM arcangel_inventory_batches WHERE catalog_id=? AND batch_id=?',[batchId]);
        if(batch){if(batch.fingerprint!==batchHash)throw fail(409,'Este lote ya existe con otros datos. Recarga el panel.');return {added:batch.units};}
        for(const entry of entries)try{await query(db,'INSERT INTO arcangel_inventory(catalog_id,inventory_id,product_id,secret,fingerprint) VALUES(?,?,?,?,?)',[entry.id,productId,entry.secret,entry.fingerprint]);}catch(error){duplicate(error);}
        await query(db,'INSERT INTO arcangel_inventory_batches(catalog_id,batch_id,fingerprint,units) VALUES(?,?,?,?)',[batchId,batchHash,entries.length]);
        await stock(db,snapshot.data);await updateCatalog(db,cat,snapshot.row,snapshot.data);return {added:entries.length};
      });
    },
    async inventory(productId=''){
      const rows=await query(pool,'SELECT inventory_id,account_number,product_id,state,order_id,created_at,secret FROM arcangel_inventory WHERE catalog_id=?'+(productId?' AND product_id=?':'')+' ORDER BY created_at DESC,inventory_id LIMIT 500',productId?[productId]:[]);
      // Only the owner route calls this list. Keep passwords on the explicit reveal route.
      return rows.map(({secret,account_number,...row})=>{const d=delivery(sealer.open(secret,`${cat}:inventory:${row.inventory_id}`));return {...row,account_code:accountCode(account_number),username:d.username,url:d.url||'',profile:d.profile||'',pin:d.pin||'',has_password:!!d.password,renewable:!!d.renewable};});
    },
    async inventorySecret(id){const [row]=await query(pool,'SELECT secret,inventory_id FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=?',[requestId(id)]);if(!row)throw fail(404,'Cuenta no encontrada.');return delivery(sealer.open(row.secret,`${cat}:inventory:${id}`));},
    async inventoryDetails(id){
      id=requestId(id);const [row]=await query(pool,'SELECT secret,state,account_number FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=?',[id]);if(!row)throw fail(404,'Cuenta no encontrada.');
      return {account_code:accountCode(row.account_number),delivery:delivery(sealer.open(row.secret,`${cat}:inventory:${id}`)),revision:sealer.mac(row.state+':'+row.secret),state:row.state};
    },
    async updateInventory(id,value,revision){
      id=requestId(id);const data=delivery(value);
      if(typeof revision!=='string'||!/^[a-f0-9]{64}$/.test(revision))throw fail(400,'Vuelve a abrir la cuenta para editarla.');
      return transaction(async db=>{
        // Use the same lock order as checkout: an edit cannot overwrite a sale.
        await catalogLock(db);
        const [row]=await query(db,'SELECT secret,state,order_id FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=? FOR UPDATE',[id]);
        if(!row)throw fail(404,'Cuenta no encontrada.');
        if(!['available','sold','external'].includes(row.state))throw fail(409,'Esta cuenta está retirada o cancelada.');
        if(!equalSecret(revision,sealer.mac(row.state+':'+row.secret)))throw fail(409,'La cuenta o su estado cambió en otra ventana. Cancela y vuelve a abrirla antes de editar.');
        const secret=sealer.seal(data,`${cat}:inventory:${id}`);
        try{await db.execute('UPDATE arcangel_inventory SET secret=?,fingerprint=? WHERE catalog_id=? AND inventory_id=?',[secret,fingerprint(data),cat,id]);}catch(error){duplicate(error);}
        if(row.state==='sold'){
          const [order]=await query(db,'SELECT status,inventory_id FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[row.order_id]);
          if(!order||order.inventory_id!==id)throw fail(409,'No se encontró el pedido asociado a esta cuenta.');
          if(order.status==='delivered')await db.execute('UPDATE arcangel_orders SET delivery_secret=? WHERE catalog_id=? AND order_id=?',[sealer.seal(data,`${cat}:order:${row.order_id}`),cat,row.order_id]);
        }
        return {updated:true,revision:sealer.mac(row.state+':'+secret)};
      });
    },
    async retireInventory(id,state){
      requestId(id);if(!['retired','external'].includes(state))throw fail(400,'Elige retirar o vender por WhatsApp.');
      return transaction(async db=>{const snapshot=await catalogLock(db);const [row]=await query(db,'SELECT state FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=? FOR UPDATE',[id]);if(!row)throw fail(404,'Cuenta no encontrada.');if(row.state===state)return {state};if(row.state!=='available')throw fail(409,'La cuenta ya no está disponible.');await db.execute('UPDATE arcangel_inventory SET state=? WHERE catalog_id=? AND inventory_id=?',[state,cat,id]);await stock(db,snapshot.data);await updateCatalog(db,cat,snapshot.row,snapshot.data);return {state};});
    },
    async purchase(userId,input){
      const id=requestId(input.request_id),productId=text(input.product_id,'el producto',100),expected=cents(input.expected_cents);
      return transaction(async db=>{
        const snapshot=await catalogLock(db),user=await userLock(db,userId);if(user.blocked||user.deleted_at)throw fail(403,'Acceso desactivado.');
        const [old]=await query(db,'SELECT * FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[id]);
        if(old){if(old.user_id!==userId||old.product_id!==productId||Number(old.amount_cents)!==expected)throw fail(409,'La operación ya existe con otros datos.');const [item]=old.inventory_id?await query(db,'SELECT account_number FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=?',[old.inventory_id]):[];return {order:orderView({...old,account_number:item?.account_number}),balance_cents:Number(user.balance_cents)};}
        const product=snapshot.data.products.find(p=>p.id===productId);
        if(!product||!product.active||product.checkout_mode!=='automatic')throw fail(409,'Este producto no admite compras con saldo.');
        const amount=soles(priceForRole(product,user.role));if(amount!==expected)throw fail(409,'El precio cambió. Revisa el precio y confirma nuevamente.');
        if(product.out_of_stock||product.stock_quantity===0)throw fail(409,'Producto agotado.');
        if(Number(user.balance_cents)<amount)throw fail(402,'Saldo insuficiente. Recarga antes de comprar.');
        const [inventory]=await query(db,"SELECT * FROM arcangel_inventory WHERE catalog_id=? AND product_id=? AND state='available' ORDER BY created_at,inventory_id LIMIT 1 FOR UPDATE",[productId]);
        if(!inventory)throw fail(409,'No quedan cuentas disponibles.');
        const account=delivery(sealer.open(inventory.secret,`${cat}:inventory:${inventory.inventory_id}`));
        // Explicit dates set by the owner always take precedence. New sales
        // without dates receive their term at checkout, so it never drifts.
        if(!account.expires_on&&/\d+\s*(mes|m[eé]s|a[nñ]o|d[ií]a)/i.test(product.duration||'')){account.starts_on=account.starts_on||dateOnly();account.expires_on=addDays(account.starts_on,periodDays(product.duration));}
        await db.execute('UPDATE arcangel_inventory SET secret=?,fingerprint=? WHERE catalog_id=? AND inventory_id=?',[sealer.seal(account,`${cat}:inventory:${inventory.inventory_id}`),fingerprint(account),cat,inventory.inventory_id]);
        const secret=sealer.seal(account,`${cat}:order:${id}`);
        const reserved=false,status='delivered';
        await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents-? WHERE catalog_id=? AND user_id=?',[amount,cat,userId]);
        await query(db,'INSERT INTO arcangel_orders(catalog_id,order_id,user_id,product_id,product_name,amount_cents,delivery_mode,status,inventory_id,delivery_secret,stock_reserved) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,userId,productId,product.name,amount,product.checkout_mode,status,inventory?.inventory_id||null,secret,reserved]);
        await query(db,"INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'purchase',?,'approved',?,?)",[randomUUID(),userId,-amount,'purchase:'+id,product.name]);
        if(inventory)await db.execute("UPDATE arcangel_inventory SET state='sold',order_id=? WHERE catalog_id=? AND inventory_id=?",[id,cat,inventory.inventory_id]);
        await stock(db,snapshot.data);await updateCatalog(db,cat,snapshot.row,snapshot.data);
        return {order:{order_id:id,account_code:accountCode(inventory.account_number),product_id:productId,product_name:product.name,amount_cents:amount,delivery_mode:product.checkout_mode,status},balance_cents:Number(user.balance_cents)-amount};
      });
    },
    async orders(userId){
      const rows=await query(pool,'SELECT o.*,i.account_number FROM arcangel_orders o LEFT JOIN arcangel_inventory i ON i.catalog_id=o.catalog_id AND i.inventory_id=o.inventory_id WHERE o.catalog_id=? AND o.user_id=? ORDER BY o.created_at DESC,o.order_id LIMIT 200',[userId]);
      const [customer]=await query(pool,'SELECT role FROM arcangel_users WHERE catalog_id=? AND user_id=?',[userId]);
      const [catalog]=await query(pool,'SELECT document FROM arcangel_catalogs WHERE catalog_id=?');
      const products=catalog?JSON.parse(catalog.document).products:[];
      const replacements=await query(pool,'SELECT order_id FROM arcangel_replacements WHERE catalog_id=? AND user_id=?',[userId]);
      const replaced=new Set(replacements.map(row=>row.order_id));
      return rows.map(row=>{
        const product=products.find(p=>p.id===row.product_id);
        let account=null;
        if(row.status==='delivered'&&row.delivery_secret){
          const d=delivery(sealer.open(row.delivery_secret,`${cat}:order:${row.order_id}`));
          account={username:d.username,url:d.url||'',profile:d.profile||'',pin:d.pin||'',notes:d.notes,has_password:!!d.password,starts_on:d.starts_on||'',expires_on:d.expires_on||'',renewable:!!d.renewable};
        }
        return {...orderView(row),product_logo:product?.logo_url||product?.banner_url||'',product_type:product?.type||'',product_brand:product?.brand||'',product_duration:product?.duration||'',renewal_price_cents:product&&customer?soles(priceForRole(product,customer.role)):null,account,replacement_used:replaced.has(row.order_id),replacement_available:row.status==='delivered'&&!replaced.has(row.order_id)};
      });
    },
    async replaceAccount(userId,input){
      const orderId=requestId(input.order_id),request=requestId(input.request_id);
      return transaction(async db=>{
        const snapshot=await catalogLock(db),user=await userLock(db,userId);if(user.blocked||user.deleted_at)throw fail(403,'Acceso desactivado.');
        const [order]=await query(db,'SELECT * FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[orderId]);
        if(!order||order.user_id!==userId)throw fail(404,'Pedido no encontrado.');
        if(order.status!=='delivered'||!order.inventory_id||!order.delivery_secret)throw fail(409,'Solo puedes reemplazar una cuenta entregada.');
        const [already]=await query(db,'SELECT replacement_id FROM arcangel_replacements WHERE catalog_id=? AND order_id=? FOR UPDATE',[orderId]);
        if(already)throw fail(409,'Esta cuenta ya utilizó su único reemplazo.');
        const [oldItem]=await query(db,'SELECT * FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=? FOR UPDATE',[order.inventory_id]);
        if(!oldItem||oldItem.state!=='sold')throw fail(409,'La cuenta anterior ya no está disponible para reemplazo.');
        const oldData=delivery(sealer.open(order.delivery_secret,`${cat}:order:${orderId}`));
        const [candidates]=await Promise.all([query(db,"SELECT * FROM arcangel_inventory WHERE catalog_id=? AND product_id=? AND state='available' ORDER BY created_at,inventory_id LIMIT 200 FOR UPDATE",[order.product_id])]);
        let replacement=null,replacementData=null;
        for(const candidate of candidates){const candidateData=delivery(sealer.open(candidate.secret,`${cat}:inventory:${candidate.inventory_id}`));const oldIdentity=String(oldData.username||'').trim().toLocaleLowerCase();const newIdentity=String(candidateData.username||'').trim().toLocaleLowerCase();if(!oldIdentity||newIdentity!==oldIdentity){replacement=candidate;replacementData=candidateData;break;}}
        if(!replacement)throw fail(409,'No hay otra cuenta disponible con un correo diferente.');
        if(!replacementData.expires_on){replacementData.starts_on=replacementData.starts_on||oldData.starts_on||'';replacementData.expires_on=oldData.expires_on||'';}
        await db.execute('UPDATE arcangel_inventory SET secret=?,fingerprint=? WHERE catalog_id=? AND inventory_id=?',[sealer.seal(replacementData,`${cat}:inventory:${replacement.inventory_id}`),fingerprint(replacementData),cat,replacement.inventory_id]);
        const replacementSecret=sealer.seal(replacementData,`${cat}:order:${orderId}`),oldSecret=order.delivery_secret;
        await db.execute("UPDATE arcangel_inventory SET state='cancelled',order_id=? WHERE catalog_id=? AND inventory_id=?",[orderId,cat,oldItem.inventory_id]);
        await db.execute("UPDATE arcangel_inventory SET state='sold',order_id=? WHERE catalog_id=? AND inventory_id=?",[orderId,cat,replacement.inventory_id]);
        await db.execute('UPDATE arcangel_orders SET inventory_id=?,delivery_secret=? WHERE catalog_id=? AND order_id=?',[replacement.inventory_id,replacementSecret,cat,orderId]);
        try{await query(db,'INSERT INTO arcangel_replacements(catalog_id,replacement_id,order_id,user_id,product_id,old_inventory_id,new_inventory_id,old_secret,new_secret) VALUES(?,?,?,?,?,?,?,?,?)',[request,orderId,userId,order.product_id,oldItem.inventory_id,replacement.inventory_id,sealer.seal(oldData,`${cat}:replacement-old:${request}`),sealer.seal(replacementData,`${cat}:replacement-new:${request}`)]);}catch(error){duplicate(error);}
        await stock(db,snapshot.data);await updateCatalog(db,cat,snapshot.row,snapshot.data);
        return {replaced:true,order_id:orderId,account_code:accountCode(replacement.account_number),account:{username:replacementData.username,profile:replacementData.profile||'',pin:replacementData.pin||'',url:replacementData.url||'',starts_on:replacementData.starts_on||'',expires_on:replacementData.expires_on||'',renewable:!!replacementData.renewable}};
      });
    },
    async renewOrder(userId,input){
      const orderId=requestId(input.order_id),request=requestId(input.request_id),expected=cents(input.expected_cents);
      return transaction(async db=>{
        const snapshot=await catalogLock(db),user=await userLock(db,userId);if(user.blocked||user.deleted_at)throw fail(403,'Acceso desactivado.');
        const [existing]=await query(db,"SELECT * FROM arcangel_ledger WHERE catalog_id=? AND reference=? AND kind='renewal'",['renewal:'+request]);
        if(existing)return {status:existing.status,balance_cents:Number(user.balance_cents)};
        const [order]=await query(db,'SELECT * FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[orderId]);
        if(!order||order.user_id!==userId||order.status!=='delivered'||!order.delivery_secret)throw fail(409,'Solo puedes renovar una cuenta entregada.');
        const current=delivery(sealer.open(order.delivery_secret,`${cat}:order:${orderId}`));if(!current.renewable)throw fail(403,'La tienda no habilitó la renovación para esta cuenta.');
        const product=snapshot.data.products.find(p=>p.id===order.product_id);if(!product)throw fail(404,'Producto no encontrado.');
        const amount=soles(priceForRole(product,user.role));if(amount!==expected)throw fail(409,'El precio de renovación cambió. Actualiza la página.');if(Number(user.balance_cents)<amount)throw fail(402,'Saldo insuficiente para renovar.');
        const today=dateOnly(),base=current.expires_on&&current.expires_on>today?current.expires_on:today,next={...current,starts_on:current.starts_on||today,expires_on:addDays(base,periodDays(product.duration))};
        await db.execute('UPDATE arcangel_users SET balance_cents=balance_cents-? WHERE catalog_id=? AND user_id=?',[amount,cat,userId]);
        await db.execute('UPDATE arcangel_orders SET delivery_secret=? WHERE catalog_id=? AND order_id=?',[sealer.seal(next,`${cat}:order:${orderId}`),cat,orderId]);
        if(order.inventory_id)await db.execute('UPDATE arcangel_inventory SET secret=?,fingerprint=? WHERE catalog_id=? AND inventory_id=?',[sealer.seal(next,`${cat}:inventory:${order.inventory_id}`),fingerprint(next),cat,order.inventory_id]);
        await query(db,"INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,order_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,?,'renewal',?,'approved',?,?)",[randomUUID(),userId,orderId,-amount,'renewal:'+request,'Renovación · '+order.product_name]);
        return {status:'approved',balance_cents:Number(user.balance_cents)-amount,expires_on:next.expires_on};
      });
    },
    async orderSecret(userId,id){const [row]=await query(pool,"SELECT delivery_secret FROM arcangel_orders WHERE catalog_id=? AND user_id=? AND order_id=? AND status='delivered'",[userId,requestId(id)]);if(!row?.delivery_secret)throw fail(404,'La entrega todavía no está disponible.');return sealer.open(row.delivery_secret,`${cat}:order:${id}`);},
    async deliverOrder(id,value){
      requestId(id);const details=delivery(value);return transaction(async db=>{const [row]=await query(db,'SELECT status FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[id]);if(!row)throw fail(404,'Pedido no encontrado.');if(row.status!=='pending_manual')throw fail(409,'Este pedido ya fue atendido.');await db.execute("UPDATE arcangel_orders SET status='delivered',delivery_secret=? WHERE catalog_id=? AND order_id=?",[sealer.seal(details,`${cat}:order:${id}`),cat,id]);return {status:'delivered'};});
    },
    async orderDetails(id){
      id=requestId(id);const [row]=await query(pool,"SELECT delivery_secret,status,product_name FROM arcangel_orders WHERE catalog_id=? AND order_id=?",[id]);
      if(!row||row.status!=='delivered'||!row.delivery_secret)throw fail(409,'Solo se pueden editar cuentas entregadas.');
      return {delivery:delivery(sealer.open(row.delivery_secret,`${cat}:order:${id}`)),revision:sealer.mac(row.status+':'+row.delivery_secret),product_name:row.product_name};
    },
    async updateOrder(id,value,revision){
      id=requestId(id);const data=delivery(value);
      if(typeof revision!=='string'||!/^[a-f0-9]{64}$/.test(revision))throw fail(400,'Vuelve a abrir el pedido para editarlo.');
      return transaction(async db=>{
        await catalogLock(db);
        const [row]=await query(db,'SELECT * FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[id]);
        if(!row||row.status!=='delivered'||!row.delivery_secret)throw fail(409,'Solo se pueden editar cuentas entregadas.');
        if(!equalSecret(revision,sealer.mac(row.status+':'+row.delivery_secret)))throw fail(409,'La cuenta cambió. Vuelve a abrirla antes de editar.');
        if(row.inventory_id){
          const [item]=await query(db,'SELECT state,order_id FROM arcangel_inventory WHERE catalog_id=? AND inventory_id=? FOR UPDATE',[row.inventory_id]);
          if(!item||item.state!=='sold'||item.order_id!==id)throw fail(409,'No se encontró la cuenta asociada al pedido.');
          try{await db.execute('UPDATE arcangel_inventory SET secret=?,fingerprint=? WHERE catalog_id=? AND inventory_id=?',[sealer.seal(data,`${cat}:inventory:${row.inventory_id}`),fingerprint(data),cat,row.inventory_id]);}catch(error){duplicate(error);}
        }
        await db.execute('UPDATE arcangel_orders SET delivery_secret=? WHERE catalog_id=? AND order_id=?',[sealer.seal(data,`${cat}:order:${id}`),cat,id]);
        return {updated:true};
      });
    },
    async reports(userId=null){
      const rows=await query(pool,"SELECT r.*,o.product_name,o.status AS order_status,o.delivery_secret,u.email,u.username AS customer_username FROM arcangel_reports r JOIN arcangel_orders o ON o.catalog_id=r.catalog_id AND o.order_id=r.order_id JOIN arcangel_users u ON u.catalog_id=r.catalog_id AND u.user_id=r.user_id WHERE r.catalog_id=?"+(userId?' AND r.user_id=?':'')+" ORDER BY (r.status<>'resolved') DESC,r.created_at DESC,r.report_id LIMIT 200",userId?[userId]:[]);
      return rows.map(({delivery_secret,...row})=>({...row,revision:Number(row.revision),...(!userId?{account_username:delivery_secret?delivery(sealer.open(delivery_secret,`${cat}:order:${row.order_id}`)).username:''}:{})}));
    },
    async reportAccount(userId,input){
      const id=requestId(input.request_id),orderId=requestId(input.order_id),message=text(input.message,'el problema de la cuenta',3000);
      return transaction(async db=>{
        await catalogLock(db);
        const user=await userLock(db,userId);if(user.blocked||user.deleted_at)throw fail(403,'Acceso desactivado.');
        const [order]=await query(db,'SELECT user_id,status FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[orderId]);
        if(!order||order.user_id!==userId)throw fail(404,'Pedido no encontrado.');
        const [old]=await query(db,'SELECT * FROM arcangel_reports WHERE catalog_id=? AND report_id=?',[id]);
        if(old){if(old.user_id!==userId||old.order_id!==orderId||old.message!==message)throw fail(409,'Esta solicitud ya existe con otros datos.');return {report_id:id,status:old.status};}
        if(order.status!=='delivered')throw fail(409,'Solo puedes reportar cuentas entregadas.');
        const [active]=await query(db,"SELECT report_id FROM arcangel_reports WHERE catalog_id=? AND order_id=? AND status<>'resolved' LIMIT 1",[orderId]);
        if(active)throw fail(409,'Ya hay un reporte abierto para esta cuenta. Consulta su estado en Mis cuentas y compras.');
        try{await query(db,"INSERT INTO arcangel_reports(catalog_id,report_id,user_id,order_id,message,owner_reply) VALUES(?,?,?,?,?,'')",[id,userId,orderId,message]);}catch(error){duplicate(error);}
        return {report_id:id,status:'open'};
      });
    },
    async updateReport(id,status,reply,revision){
      id=requestId(id);reply=text(reply||'','la respuesta al cliente',3000,false);
      if(!['open','in_progress','resolved'].includes(status))throw fail(400,'Estado de reporte no válido.');
      if(status==='resolved'&&!reply)throw fail(400,'Indica al cliente cómo resolviste el reporte.');
      if(!Number.isSafeInteger(revision)||revision<1)throw fail(400,'Actualiza el reporte antes de responder.');
      return transaction(async db=>{
        const [row]=await query(db,'SELECT * FROM arcangel_reports WHERE catalog_id=? AND report_id=? FOR UPDATE',[id]);if(!row)throw fail(404,'Reporte no encontrado.');
        if(row.status===status&&row.owner_reply===reply)return {updated:true};
        if(row.status==='resolved'&&status!=='resolved')throw fail(409,'Este reporte ya está resuelto. El cliente puede enviar otro si surge una nueva falla.');
        if(Number(row.revision)!==revision)throw fail(409,'El reporte cambió en otra ventana. Actualiza antes de responder.');
        await db.execute('UPDATE arcangel_reports SET status=?,owner_reply=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE catalog_id=? AND report_id=?',[status,reply,cat,id]);return {updated:true};
      });
    },
    async refundOrder(id){
      requestId(id);return transaction(async db=>{
        const snapshot=await catalogLock(db);const [order]=await query(db,'SELECT * FROM arcangel_orders WHERE catalog_id=? AND order_id=? FOR UPDATE',[id]);if(!order)throw fail(404,'Pedido no encontrado.');if(order.status==='refunded')return {status:'refunded'};
        const user=await userLock(db,order.user_id),balance=Number(user.balance_cents)+Number(order.amount_cents);if(balance>100000000)throw fail(409,'El cliente supera el límite de saldo.');
        await db.execute('UPDATE arcangel_users SET balance_cents=? WHERE catalog_id=? AND user_id=?',[balance,cat,order.user_id]);
        await query(db,"INSERT INTO arcangel_ledger(catalog_id,entry_id,user_id,kind,amount_cents,status,reference,note) VALUES(?,?,?,'refund',?,'approved',?,?)",[randomUUID(),order.user_id,order.amount_cents,'refund:'+id,order.product_name]);
        await db.execute("UPDATE arcangel_orders SET status='refunded' WHERE catalog_id=? AND order_id=?",[cat,id]);
        const product=snapshot.data.products.find(p=>p.id===order.product_id);
        if(order.status==='pending_manual'&&order.stock_reserved&&product?.checkout_mode==='manual'&&Number.isInteger(product.stock_quantity)){product.stock_quantity++;product.out_of_stock=false;await updateCatalog(db,cat,snapshot.row,snapshot.data);}
        // Delivered accounts never return to stock: their credentials were exposed.
        return {status:'refunded'};
      });
    },
    async customers(search='',status='all'){
      const escaped=text(search,'la búsqueda',100,false).replace(/[!%_]/g,'!$&');
      const filters={all:'deleted_at IS NULL',active:'deleted_at IS NULL AND blocked=FALSE',suspended:'deleted_at IS NULL AND blocked=TRUE',deleted:'deleted_at IS NOT NULL'};
      if(!Object.hasOwn(filters,status))throw fail(400,'Filtro de clientes no válido.');
      const rows=await query(pool,"SELECT user_id,username,email,balance_cents,blocked,role,created_at,deleted_at FROM arcangel_users WHERE catalog_id=? AND "+filters[status]+" AND (email LIKE ? ESCAPE '!' OR username LIKE ? ESCAPE '!') ORDER BY created_at DESC,user_id LIMIT 200",['%'+escaped+'%','%'+escaped+'%']);return rows.map(row=>({...profile(row),created_at:row.created_at,deleted_at:row.deleted_at}));
    },
    async customerCounts(){
      const rows=await query(pool,"SELECT CASE WHEN deleted_at IS NOT NULL THEN 'deleted' WHEN blocked THEN 'suspended' ELSE 'active' END AS state,COUNT(*) AS n FROM arcangel_users WHERE catalog_id=? GROUP BY state");
      const counts={active:0,suspended:0,deleted:0};for(const row of rows)counts[row.state]=Number(row.n);return {...counts,all:counts.active+counts.suspended};
    },
    async alerts(){
      const [{pending}]=await query(pool,"SELECT COUNT(*) AS pending FROM arcangel_ledger WHERE catalog_id=? AND kind='topup' AND status='pending'");
      const requests=await query(pool,"SELECT entry_id,amount_cents,created_at FROM arcangel_ledger WHERE catalog_id=? AND kind='topup' AND status='pending' ORDER BY created_at DESC,entry_id LIMIT 200");
      const [{n}]=await query(pool,"SELECT COUNT(*) AS n FROM arcangel_reports WHERE catalog_id=? AND status<>'resolved'");
      const reports=await query(pool,"SELECT report_id,status,created_at FROM arcangel_reports WHERE catalog_id=? AND status<>'resolved' ORDER BY created_at DESC,report_id LIMIT 200");
      const yape=await query(pool,"SELECT claim_id FROM arcangel_yape_claims WHERE catalog_id=? AND status='review' ORDER BY started_at DESC LIMIT 100");
      return {pending:Number(pending),requests:requests.map(row=>({...row,amount_cents:Number(row.amount_cents)})),pending_yape:yape.length,yape,pending_reports:Number(n),reports};
    },
    async blockUser(id,blocked){if(typeof blocked!=='boolean')throw fail(400,'Estado no válido.');return transaction(async db=>{const user=await userLock(db,requestId(id));if(user.deleted_at)throw fail(409,'Restaura primero el usuario desde Eliminados.');await db.execute('UPDATE arcangel_users SET blocked=? WHERE catalog_id=? AND user_id=?',[blocked,cat,id]);await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[id]);return {blocked};});},
    async setCustomerRole(id,role,handle){id=requestId(id);if(handle!==undefined)handle=username(handle);if(!['customer','reseller'].includes(role))throw fail(400,'Elige un rol válido.');return transaction(async db=>{const user=await userLock(db,id);if(user.deleted_at)throw fail(409,'Restaura primero al usuario desde Eliminados.');try{await db.execute('UPDATE arcangel_users SET role=?,username=? WHERE catalog_id=? AND user_id=?',[role,handle??user.username,cat,id]);}catch(error){duplicate(error);}await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[id]);return {role};});},
    async deleteCustomer(id,confirmation){
      id=requestId(id);confirmation=email(confirmation);
      return transaction(async db=>{
        const user=await userLock(db,id);if(user.email!==confirmation)throw fail(400,'Escribe el correo del cliente para confirmar la eliminación.');
        await db.execute('UPDATE arcangel_users SET blocked=TRUE,deleted_at=COALESCE(deleted_at,NOW()) WHERE catalog_id=? AND user_id=?',[cat,id]);
        await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[id]);return {deleted:true};
      });
    },
    async restoreCustomer(id){
      id=requestId(id);return transaction(async db=>{
        const user=await userLock(db,id);if(!user.deleted_at)return {restored:true,blocked:!!user.blocked};
        await db.execute('UPDATE arcangel_users SET deleted_at=NULL,blocked=TRUE WHERE catalog_id=? AND user_id=?',[cat,id]);
        await query(db,'DELETE FROM arcangel_user_sessions WHERE catalog_id=? AND user_id=?',[id]);return {restored:true,blocked:true};
      });
    },
    async replacements(){
      const rows=await query(pool,"SELECT r.*,old_i.account_number AS old_number,new_i.account_number AS new_number,o.product_name,u.email,u.username AS customer_username FROM arcangel_replacements r JOIN arcangel_orders o ON o.catalog_id=r.catalog_id AND o.order_id=r.order_id JOIN arcangel_users u ON u.catalog_id=r.catalog_id AND u.user_id=r.user_id LEFT JOIN arcangel_inventory old_i ON old_i.catalog_id=r.catalog_id AND old_i.inventory_id=r.old_inventory_id LEFT JOIN arcangel_inventory new_i ON new_i.catalog_id=r.catalog_id AND new_i.inventory_id=r.new_inventory_id WHERE r.catalog_id=? ORDER BY r.created_at DESC,r.replacement_id LIMIT 200");
      return rows.map(row=>{const oldData=delivery(sealer.open(row.old_secret,`${cat}:replacement-old:${row.replacement_id}`)),newData=delivery(sealer.open(row.new_secret,`${cat}:replacement-new:${row.replacement_id}`));return {replacement_id:row.replacement_id,order_id:row.order_id,product_id:row.product_id,product_name:row.product_name,email:row.email,customer_username:row.customer_username,old_inventory_id:row.old_inventory_id,new_inventory_id:row.new_inventory_id,old_account_code:accountCode(row.old_number),new_account_code:accountCode(row.new_number),old_account:oldData.username,new_account:newData.username,created_at:row.created_at,status:'cancelled'};});
    },
    async accountExport(kind='active'){
      if(!['active','expired'].includes(kind))throw fail(400,'Tipo de descarga no válido.');
      const rows=await query(pool,"SELECT i.inventory_id,i.account_number,i.product_id,i.secret,i.order_id,i.created_at AS inventory_created_at,o.product_name,o.amount_cents,o.delivery_mode,o.status AS order_status,o.created_at AS purchased_at,u.username AS customer_username,u.email AS customer_email,(SELECT COALESCE(SUM(-r.amount_cents),0) FROM arcangel_ledger r WHERE r.catalog_id=o.catalog_id AND r.order_id=o.order_id AND r.kind='renewal' AND r.status='approved') AS renewal_total_cents FROM arcangel_inventory i JOIN arcangel_orders o ON o.catalog_id=i.catalog_id AND o.inventory_id=i.inventory_id AND o.order_id=i.order_id JOIN arcangel_users u ON u.catalog_id=o.catalog_id AND u.user_id=o.user_id WHERE i.catalog_id=? AND i.state='sold' AND o.status='delivered' ORDER BY i.created_at DESC,i.inventory_id LIMIT 5000");
      const today=dateOnly();
      const daysBetween=(from,to)=>Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);
      return rows.flatMap(row=>{
        const data=delivery(sealer.open(row.secret,`${cat}:inventory:${row.inventory_id}`));
        const expiresOn=String(data.expires_on||'').slice(0,10),expired=!!expiresOn&&expiresOn<today;
        if((kind==='expired')!==expired)return [];
        const remaining=expiresOn?daysBetween(today,expiresOn):null;
        const renewalTotal=Number(row.renewal_total_cents||0),amount=Number(row.amount_cents||0)+renewalTotal;
        return [{
          account_code:accountCode(row.account_number),product_name:row.product_name,product_id:row.product_id,
          email:data.username||'',password:data.password||'',profile:data.profile||'',pin:data.pin||'',url:data.url||'',
          buyer_username:row.customer_username||'',buyer_email:row.customer_email||'',order_id:row.order_id,
          purchased_at:row.purchased_at,starts_on:data.starts_on||'',expires_on:expiresOn,days_remaining:remaining,
          amount_cents:amount,renewal_total_cents:renewalTotal,delivery_mode:row.delivery_mode,
          status:expired?'Vencida':'Activa',renewable:!!data.renewable
        }];
      });
    },
    async adminData(){
      const topups=await query(pool,"SELECT l.*,u.email,u.username AS customer_username FROM arcangel_ledger l JOIN arcangel_users u ON u.catalog_id=l.catalog_id AND u.user_id=l.user_id WHERE l.catalog_id=? AND l.kind IN ('topup','mp_topup','yape_topup','admin_topup') ORDER BY (l.status='attention') DESC,(l.status='pending') DESC,l.created_at DESC,l.entry_id LIMIT 200");
      const orders=await query(pool,"SELECT o.*,i.account_number,u.email,u.username AS customer_username,(SELECT COALESCE(SUM(-r.amount_cents),0) FROM arcangel_ledger r WHERE r.catalog_id=o.catalog_id AND r.order_id=o.order_id AND r.kind='renewal' AND r.status='approved') AS renewal_total_cents FROM arcangel_orders o JOIN arcangel_users u ON u.catalog_id=o.catalog_id AND u.user_id=o.user_id LEFT JOIN arcangel_inventory i ON i.catalog_id=o.catalog_id AND i.inventory_id=o.inventory_id WHERE o.catalog_id=? ORDER BY o.created_at DESC,o.order_id LIMIT 200");
      const inventory=await query(pool,'SELECT product_id,state,COUNT(*) AS units FROM arcangel_inventory WHERE catalog_id=? GROUP BY product_id,state');
      const replacements=await this.replacements();
      const [[summary]]=await pool.execute("SELECT (SELECT COUNT(*) FROM arcangel_users WHERE catalog_id=? AND deleted_at IS NULL) AS customers,(SELECT COUNT(*) FROM arcangel_ledger WHERE catalog_id=? AND kind='topup' AND status='pending') AS pending_topups,(SELECT COUNT(*) FROM arcangel_orders WHERE catalog_id=? AND status='pending_manual') AS pending_orders,(SELECT COUNT(*) FROM arcangel_inventory WHERE catalog_id=? AND state='available') AS available",[cat,cat,cat,cat]);
      return {summary:Object.fromEntries(Object.entries(summary).map(([key,value])=>[key,Number(value)])),topups:topups.map(row=>({...row,amount_cents:Number(row.amount_cents)})),orders:orders.map(row=>{const d=row.delivery_secret?delivery(sealer.open(row.delivery_secret,`${cat}:order:${row.order_id}`)):null;const renewalTotal=Number(row.renewal_total_cents||0);return {...orderView(row),renewal_total_cents:renewalTotal,total_amount_cents:Number(row.amount_cents)+renewalTotal,email:row.email,customer_username:row.customer_username,account_username:d?.username||'',account_profile:d?.profile||'',expires_on:d?.expires_on||'',starts_on:d?.starts_on||''};}),inventory:inventory.map(row=>({...row,units:Number(row.units)})),replacements};
    },
  };
}
