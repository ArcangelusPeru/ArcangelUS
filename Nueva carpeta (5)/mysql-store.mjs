import { createHash } from 'node:crypto';
import { createCommerceStore } from './commerce-store.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function databaseConfig(env=process.env){
  const fields={host:env.DB_HOST,port:Number(env.DB_PORT||3306),database:env.DB_NAME,user:env.DB_USER,password:env.DB_PASSWORD};
  if(!fields.host||!fields.database||!fields.user||fields.password===undefined)throw Error('Configura DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD de la base MySQL de GoDaddy. No se guardarán datos en el disco temporal.');
  if(!Number.isInteger(fields.port)||fields.port<1||fields.port>65535)throw Error('DB_PORT no es válido.');
  if(env.DB_SSL==='true'||env.DB_SSL==='1')fields.ssl={rejectUnauthorized:true,...(env.DB_SSL_CA?{ca:env.DB_SSL_CA.replace(/\\n/g,'\n')}:{})};
  return fields;
}

export async function updateCatalog(connection,catalogId,current,next){
  await connection.execute('INSERT INTO arcangel_backups(catalog_id,revision,document) VALUES(?,?,?)',[catalogId,current.revision,current.document]);
  const saved={...next,revision:Number(current.revision)+1};
  await connection.execute('UPDATE arcangel_catalogs SET revision=?,document=? WHERE catalog_id=?',[saved.revision,JSON.stringify(saved),catalogId]);
  await connection.execute('DELETE FROM arcangel_backups WHERE catalog_id=? AND revision<?',[catalogId,Math.max(0,saved.revision-50)]);
  return saved;
}
export async function createMySQLStore({database,catalogId,commerceEnabled=false,sealer=null}){
  if(!/^[a-z0-9_-]{1,48}$/.test(catalogId||''))throw Error('Configura SHOP_CATALOG_ID: publicado para la tienda y pruebas para la vista previa.');
  const {default:mysql}=await import('mysql2/promise');
  const pool=mysql.createPool({...database,charset:'utf8mb4',connectionLimit:4,waitForConnections:true,queueLimit:20,connectTimeout:10000,multipleStatements:false});
  try{
    for(const sql of [
      `CREATE TABLE IF NOT EXISTS arcangel_catalogs (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, revision BIGINT UNSIGNED NOT NULL, document LONGTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS arcangel_backups (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, revision BIGINT UNSIGNED NOT NULL, document LONGTEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(catalog_id,revision)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS arcangel_images (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, image_path VARCHAR(200) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, mime VARCHAR(40) NOT NULL, byte_length INT UNSIGNED NOT NULL, sha256 CHAR(64) NOT NULL, PRIMARY KEY(catalog_id,image_path)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS arcangel_image_chunks (catalog_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, image_path VARCHAR(200) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, part INT UNSIGNED NOT NULL, bytes MEDIUMBLOB NOT NULL, PRIMARY KEY(catalog_id,image_path,part)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ])await pool.query(sql);
  }catch(error){await pool.end();throw error;}
  async function transaction(run){
    const connection=await pool.getConnection();
    try{await connection.beginTransaction();const result=await run(connection);await connection.commit();return result;}
    catch(error){await connection.rollback().catch(()=>{});throw error;}
    finally{connection.release();}
  }
  let commerce=null;
  try{if(commerceEnabled)commerce=await createCommerceStore({pool,transaction,catalogId,sealer,updateCatalog});}catch(error){await pool.end();throw error;}
  return {
    kind:'mysql',catalogId,commerce,
    async read(){
      const [rows]=await pool.execute('SELECT revision,document FROM arcangel_catalogs WHERE catalog_id=?',[catalogId]);
      if(!rows.length)return null;
      const state=JSON.parse(rows[0].document);
      if(state.revision!==Number(rows[0].revision))throw Error('La revisión del catálogo no coincide con los datos guardados.');
      return state;
    },
    async save(next,expected){
      return transaction(async connection=>{
        const [rows]=await connection.execute('SELECT revision,document FROM arcangel_catalogs WHERE catalog_id=? FOR UPDATE',[catalogId]);
        const current=rows[0];
        if(!current){
          if(expected!==null)throw fail(409,'El catálogo no existe. No se ha reemplazado por el catálogo inicial.');
          if(commerce)await commerce.syncCatalog(connection,next);
          const saved={...next,revision:1};
          try{await connection.execute('INSERT INTO arcangel_catalogs(catalog_id,revision,document) VALUES(?,?,?)',[catalogId,1,JSON.stringify(saved)]);}
          catch(error){if(error.code==='ER_DUP_ENTRY'||error.code==='ER_LOCK_DEADLOCK')throw fail(409,'Otro proceso ya inició este catálogo. Recarga el panel.');throw error;}
          return saved;
        }
        if(Number(current.revision)!==expected)throw fail(409,'La tienda cambió en otra pestaña o instancia. Recarga el panel antes de guardar.');
        if(commerce)await commerce.syncCatalog(connection,next,JSON.parse(current.document));
        return updateCatalog(connection,catalogId,current,next);
      });
    },
    async putImage(imagePath,mime,bytes){
      const digest=hash(bytes);
      await transaction(async connection=>{
        const [existing]=await connection.execute('SELECT sha256 FROM arcangel_images WHERE catalog_id=? AND image_path=?',[catalogId,imagePath]);
        if(existing.length){if(existing[0].sha256!==digest)throw fail(409,'La ruta de imagen ya contiene otro archivo.');return;}
        await connection.execute('INSERT INTO arcangel_images(catalog_id,image_path,mime,byte_length,sha256) VALUES(?,?,?,?,?)',[catalogId,imagePath,mime,bytes.length,digest]);
        for(let offset=0,part=0;offset<bytes.length;offset+=512*1024,part++)await connection.execute('INSERT INTO arcangel_image_chunks(catalog_id,image_path,part,bytes) VALUES(?,?,?,?)',[catalogId,imagePath,part,bytes.subarray(offset,offset+512*1024)]);
      });
    },
    async getImage(imagePath){
      const [rows]=await pool.execute('SELECT mime,byte_length,sha256 FROM arcangel_images WHERE catalog_id=? AND image_path=?',[catalogId,imagePath]);
      if(!rows.length)return null;
      const [chunks]=await pool.execute('SELECT bytes FROM arcangel_image_chunks WHERE catalog_id=? AND image_path=? ORDER BY part',[catalogId,imagePath]);
      const bytes=Buffer.concat(chunks.map(chunk=>chunk.bytes));
      if(bytes.length!==rows[0].byte_length||hash(bytes)!==rows[0].sha256)throw Error('No se pudo verificar la integridad de la imagen.');
      return {bytes,mime:rows[0].mime};
    },
    async listBackups(){const [rows]=await pool.execute('SELECT revision,created_at FROM arcangel_backups WHERE catalog_id=? ORDER BY revision DESC LIMIT 50',[catalogId]);return rows.map(row=>({revision:Number(row.revision),created_at:row.created_at}));},
    async getBackup(revision){const [rows]=await pool.execute('SELECT document FROM arcangel_backups WHERE catalog_id=? AND revision=?',[catalogId,revision]);return rows.length?JSON.parse(rows[0].document):null;},
    close:()=>pool.end(),
  };
}
