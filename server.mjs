import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createAdminAccess, launchConfig } from './hosting.mjs';

export const DEFAULT_SETTINGS = {
  name:'Arcangel US', logo:'logo/arcangel-us.png', header_logo:'logo/arcangel-us.png', footer_logo:'logo/arcangel-us.png',
  tagline:'Plataformas premium · entrega inmediata · garantía total.',
  description:'Compra cuentas premium de Netflix, Spotify, Disney+, HBO, Office 365 y más. Entrega inmediata, precios bajos y garantía total.',
  whatsapp:'51929688960', whatsapp_message:'Hola! Quiero comprar una cuenta premium hoy. ¿Cuál es el método de pago?',
  trust:['Elige el plan que necesitas','Coordina todo por WhatsApp','Resuelve tus dudas antes de comprar'],
  proof_before:'Más de', proof_count:'230', proof_after:'clientes', proof_bottom:'confían en nosotros',
  footer:'© 2026 Arcangel US · Cuentas y licencias premium · Atención por WhatsApp',
  footer_contact_text:'¿Quieres una web así?', footer_contact_label:'Contáctame aquí', footer_contact_phone:'51929688960',
  footer_contact_message:'¡Hola! Me gustaría crear una plataforma web para mi negocio. ¿Podemos conversar?', show_footer_contact:true,
  all_label:'Todos', all_image:'logo/todos.png', offers_label:'Promos y Ofertas', offers_image:'logo/ofertas.png',
  search_placeholder:'Buscar', buy_label:'Comprar ahora por WhatsApp',
  wave_primary:'#ef2c2c',wave_secondary:'#f87171',wave_teal:'#2dd4bf',
};
const fallbackImages={streaming:'logo/streaming.png',musica:'logo/musica.png',software:'logo/licenciasysoftware.png','diseño':'logo/diseñoyeducacion.png'};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff2':'font/woff2','.ttf':'font/ttf'};
const fail=(status,message)=>Object.assign(new Error(message),{status});
const jsonText=value=>JSON.stringify(value,null,2).replace(/</g,'\\u003c');
const script=state=>'const CATALOG = '+jsonText(state)+';\n';
const publicState=state=>({...state,products:state.products.filter(p=>p.active!==false)});
const parseCatalog=source=>JSON.parse(source.replace(/^\s*const CATALOG\s*=\s*/,'').replace(/;\s*$/,''));
const isPlain=value=>value&&typeof value==='object'&&!Array.isArray(value);
function str(value,label,max=500,required=false){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw fail(400,`${label}: revisa el texto${required?' (obligatorio)':''}.`);
  return value.trim();
}
function number(value,label,nullable=false){
  if(nullable&&(value===null||value===''))return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e7)throw fail(400,`${label}: usa un número entre 0 y 10000000.`);
  return Math.round(value*100)/100;
}
function img(value,label){
  const s=str(value||'',label,2000);
  if(!s)return '';
  if(/[\s<>"'\\]/.test(s)||s.includes('..'))throw fail(400,`${label}: enlace de imagen no válido.`);
  if(/^https?:\/\//.test(s)){
    let u;try{u=new URL(s);}catch{throw fail(400,`${label}: enlace no válido.`);}
    if(u.username||u.password)throw fail(400,'El enlace no debe incluir credenciales.');
  }else if(!/^(?:assets|banners|logo|uploads)\/[\p{L}\p{N}_./%-]+$/u.test(s))throw fail(400,`${label}: sube una imagen o usa un enlace http(s).`);
  return s;
}
export function validateState(input){
  if(!isPlain(input)||!Array.isArray(input.products)||!Array.isArray(input.categories)||!isPlain(input.settings))throw fail(400,'Datos incompletos.');
  if(input.products.length>5000||input.categories.length>100)throw fail(400,'Hay demasiados elementos.');
  const categorySlugs=new Set(),categoryIds=new Set(),productIds=new Set();
  const categories=input.categories.map(c=>{
    const id=str(String(c.id||''),'Identificador',100,true),slug=str(c.slug,'Categoría',100,true);
    if(categoryIds.has(id)||categorySlugs.has(slug)||['all','ofertas'].includes(slug)||!/^[-\p{L}\p{N}_]+$/u.test(slug))throw fail(400,'La categoría tiene un identificador repetido o no válido.');
    categoryIds.add(id);categorySlugs.add(slug);
    return {id,slug,name:str(c.name,'Nombre de categoría',100,true),image_url:img(c.image_url,'Imagen de categoría'),sort_order:number(c.sort_order??0,'Orden de categoría')};
  });
  const products=input.products.map(p=>{
    const id=str(String(p.id||''),'Identificador de producto',100,true);
    if(productIds.has(id))throw fail(400,'Hay identificadores de producto repetidos.');productIds.add(id);
    if(!categorySlugs.has(p.filter))throw fail(400,`Selecciona una categoría válida para ${p.name||'el producto'}.`);
    if(!Array.isArray(p.features)||p.features.length>60)throw fail(400,'Revisa las características del producto.');
    const item={id,filter:p.filter,name:str(p.name,'Nombre del producto',160,true),brand:str(p.brand||'','Marca',100),sub:str(p.sub||'','Subtítulo',250),description:str(p.description||'','Descripción',12000),type:str(p.type||'','Tipo de cuenta',150),duration:str(p.duration||'','Duración',100),pen:number(p.pen,'Precio'),original_pen:number(p.original_pen,'Precio anterior',true),banner_url:img(p.banner_url,'Imagen del producto'),features:p.features.map(x=>str(x,'Característica',2000)).filter(Boolean),note:str(p.note||'','Nota',12000),sort_order:number(p.sort_order??0,'Posición'),cat_sort_order:number(p.cat_sort_order??0,'Posición en categoría'),palette:str(p.palette||'','Paleta',80)};
    item.stock_quantity=p.stock_quantity==null||p.stock_quantity===''?null:number(p.stock_quantity,'Unidades disponibles');
    if(item.stock_quantity!==null&&!Number.isInteger(item.stock_quantity))throw fail(400,'El stock debe ser un número entero de unidades.');
    for(const key of ['active','out_of_stock','is_oferta']){if(typeof p[key]!=='boolean')throw fail(400,'Revisa el estado del producto.');item[key]=p[key];}
    if(item.stock_quantity===0)item.out_of_stock=true;
    return item;
  });
  const settings={};
  for(const key of Object.keys(DEFAULT_SETTINGS)){
    const value=input.settings[key];
    if(['logo','header_logo','footer_logo','all_image','offers_image'].includes(key))settings[key]=img(value,key);
    else if(key.startsWith('wave_')){if(!/^#[0-9a-f]{6}$/i.test(value))throw fail(400,'Elige un color válido.');settings[key]=value;}
    else if(key==='trust'){if(!Array.isArray(value)||value.length!==3)throw fail(400,'Se necesitan tres mensajes de confianza.');settings[key]=value.map(x=>str(x,'Mensaje',250));}
    else if(key==='show_footer_contact'){if(typeof value!=='boolean')throw fail(400,'Revisa la visibilidad del contacto.');settings[key]=value;}
    else settings[key]=str(value,key,2000,key==='name');
  }
  for(const key of ['whatsapp','footer_contact_phone'])if(!/^\d{7,15}$/.test(settings[key]))throw fail(400,'Escribe el WhatsApp con código de país y solo números (por ejemplo: 51929688960).');
  products.sort((a,b)=>a.sort_order-b.sort_order);categories.sort((a,b)=>a.sort_order-b.sort_order);
  return {products,categories,settings};
}
async function atomicWrite(file,content){
  const temp=file+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,content,{flag:'wx'});await fs.rename(temp,file);}catch(e){await fs.unlink(temp).catch(()=>{});throw e;}
}
function detectImage(bytes){
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['png','image/png'];
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return ['jpg','image/jpeg'];
  if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return ['webp','image/webp'];
  if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString()))return ['gif','image/gif'];
  return null;
}
async function body(req,limit){
  if(Number(req.headers['content-length']||0)>limit)throw fail(413,'El archivo es demasiado grande. El máximo es 12 MB.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw fail(413,'El archivo es demasiado grande.');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
export async function createShopServer({root=path.dirname(fileURLToPath(import.meta.url)),hosted=false,adminPassword='',publicOrigin='',dataDir}={}){
  root=path.resolve(root);
  const storageRoot=hosted?path.resolve(root,dataDir||'public/assets/arcangel-us'):root;
  const catalogFile=path.join(storageRoot,hosted?'catalog.json':'js/catalog.js');
  const backups=path.join(storageRoot,'.backups'),uploadDir=path.join(storageRoot,'uploads');
  const access=createAdminAccess({hosted,adminPassword,publicOrigin});
  const serialize=value=>hosted?jsonText(value):script(value);
  let state,newStore=false;
  try{const source=await fs.readFile(catalogFile,'utf8');state=hosted?JSON.parse(source):parseCatalog(source);}
  catch(e){if(!hosted||e.code!=='ENOENT'){if(e.code)e.message=`No se puede leer el catálogo en DATA_DIR (${e.code}). Comprueba los permisos de la carpeta. `+e.message;throw e;}state=parseCatalog(await fs.readFile(path.join(root,'js/catalog.js'),'utf8'));newStore=true;}
  const needsInit=!state.settings||!state.revision;
  state.settings={...DEFAULT_SETTINGS,...state.settings};state.revision=Number(state.revision)||1;
  state.categories=state.categories.map(c=>({...c,image_url:c.image_url||fallbackImages[c.slug]||'logo/todos.png'}));
  if(needsInit||newStore){
    state={...validateState(state),revision:state.revision};
    try{await fs.mkdir(backups,{recursive:true});if(!newStore)await fs.copyFile(catalogFile,path.join(backups,'catalog-before-admin-'+Date.now()+(hosted?'.json':'.js')));await atomicWrite(catalogFile,serialize(state));}
    catch(e){e.message=`No se puede inicializar DATA_DIR (${e.code||'error'}). Usa public/assets/arcangel-us, sin barra inicial, dentro del proyecto. `+e.message;throw e;}
  }
  let queue=Promise.resolve();
  const serialized=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
  const server=http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Cache-Control','no-store');
    try{
      const actualPort=server.address()?.port;
      const host=req.headers.host;
      if(!hosted&&![`127.0.0.1:${actualPort}`,`localhost:${actualPort}`].includes(host))throw fail(403,'Este panel solo admite acceso local.');
      const url=new URL(req.url,'http://app.invalid');
      if(url.pathname==='/healthz')return send(200,{status:'ok'});
      if(url.pathname.startsWith('/api/')){
        if(req.headers.origin&&!access.sameOrigin(req))throw fail(403,'Origen no permitido.');
        if(req.method==='GET'&&url.pathname==='/api/catalog')return send(200,publicState(state));
        if(req.method==='GET'&&url.pathname==='/api/admin/session')return send(200,access.status(req));
        if(req.method==='POST'&&url.pathname==='/api/admin/login'){
          if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Formato no válido.');
          let input;try{input=JSON.parse((await body(req,4096)).toString());}catch(e){if(e.status)throw e;throw fail(400,'Datos de acceso no válidos.');}
          return send(200,access.login(req,res,input.password));
        }
        if(req.method==='POST'&&url.pathname==='/api/admin/logout')return send(200,access.logout(req,res));
        if(req.method==='GET'&&url.pathname==='/api/admin/state')return send(200,{...state,token:access.require(req).token});
        if(!['PUT','POST'].includes(req.method))throw fail(405,'Método no permitido.');
        const {token}=access.checkWrite(req);
        if(req.method==='POST'&&url.pathname==='/api/admin/upload'){
          const bytes=await body(req,12*1024*1024);const type=detectImage(bytes);
          if(!type||req.headers['content-type']!==type[1])throw fail(400,'Sube una imagen PNG, JPG, WebP o GIF válida.');
          const relative=`uploads/${randomUUID()}.${type[0]}`;
          await fs.mkdir(uploadDir,{recursive:true});await fs.writeFile(path.join(uploadDir,path.basename(relative)),bytes,{flag:'wx'});
          return send(201,{url:relative});
        }
        if(req.method==='PUT'&&url.pathname==='/api/admin/state'){
          if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Formato no válido.');
          let input;try{input=JSON.parse((await body(req,8*1024*1024)).toString());}catch(e){if(e.status)throw e;throw fail(400,'No se pudieron leer los datos.');}
          const result=await serialized(async()=>{
            if(input.revision!==state.revision)throw fail(409,'La tienda cambió en otra pestaña. Recarga el panel antes de volver a guardar.');
            const next={...validateState(input),revision:state.revision+1};
            await fs.mkdir(backups,{recursive:true});
            await fs.writeFile(path.join(backups,`revision-${state.revision}-${Date.now()}.json`),jsonText(state));
            await atomicWrite(catalogFile,serialize(next));state=next;
            return {...state,token};
          });
          return send(200,result);
        }
        throw fail(404,'Ruta no encontrada.');
      }
      if(!['GET','HEAD'].includes(req.method))throw fail(405,'Método no permitido.');
      let relative=decodeURIComponent(url.pathname).replace(/^\//,'');
      if(relative.split(/[\\/]/).some(part=>part==='.'||part==='..'||part.startsWith('.')))throw fail(404,'No encontrado.');
      if(!relative)relative='index.html';
      if(relative==='admin'||relative==='admin/')relative='admin/index.html';
      if(relative==='js/catalog.js'){
        res.writeHead(200,{'Content-Type':MIME['.js']});return res.end(req.method==='HEAD'?undefined:script(publicState(state)));
      }
      if(relative!=='index.html'&&!/^(admin|css|js|assets|banners|logo|uploads)\//.test(relative))throw fail(404,'No encontrado.');
      const file=path.resolve(root,relative);let ext=path.extname(file).toLowerCase();
      if(!file.startsWith(root+path.sep)||!MIME[ext])throw fail(404,'No encontrado.');
      let bytes;
      if(hosted&&/^uploads\/[\w-]+\.(png|jpe?g|webp|gif)$/i.test(relative))bytes=await fs.readFile(path.join(uploadDir,path.basename(relative))).catch(()=>null);
      if(!bytes)try{bytes=await fs.readFile(file);}catch{
        // Deployment images may be losslessly encoded as WebP; old catalog references still work.
        if(ext==='.png')try{bytes=await fs.readFile(file.slice(0,-4)+'.webp');ext='.webp';}catch{}
        if(!bytes)throw fail(404,'No encontrado.');
      }
      res.writeHead(200,{'Content-Type':MIME[ext]});res.end(req.method==='HEAD'?undefined:bytes);
    }catch(e){if(!res.headersSent)send(e.status||500,{error:e.status?e.message:'No se pudo guardar o leer el archivo. Inténtalo de nuevo.'});else res.end();if(!e.status)console.error(e.message);}
  });
  return server;
}
export async function startShopServer(config=launchConfig()){
  const server=await createShopServer(config);
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(config.port,config.host,()=>{server.removeListener('error',reject);resolve();});
  });
  console.log(config.hosted?`[READY] Arcangel US escuchando en 0.0.0.0:${config.port}`:`Tienda: http://127.0.0.1:${config.port}/\nPanel: http://127.0.0.1:${config.port}/admin`);
  if(config.hosted&&!createAdminAccess(config).configured)console.log('La tienda está disponible. Configura ADMIN_PASSWORD (mínimo 12 caracteres) para habilitar el panel.');
  return server;
}

// Keep direct `node server.mjs` launches working for existing hosting settings.
const canonical=async file=>fs.realpath(file).catch(()=>path.resolve(file));
if(process.argv[1]&&await canonical(process.argv[1])===await canonical(fileURLToPath(import.meta.url))){
  startShopServer().catch(error=>{console.error(`[STARTUP_ERROR] ${error.code||error.name}: ${error.message}`);process.exitCode=1;});
}
