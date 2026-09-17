import { createGzip, createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';

const fail=message=>Object.assign(Error(message),{status:400});
export const uploadPaths=state=>[...new Set([...state.products.map(p=>p.banner_url),...state.categories.map(c=>c.image_url),...['logo','header_logo','footer_logo','all_image','offers_image'].map(k=>state.settings[k])].filter(value=>value?.startsWith('uploads/')))];
export function remapImages(state,mapping){
  for(const p of state.products)p.banner_url=mapping.get(p.banner_url)||p.banner_url;
  for(const c of state.categories)c.image_url=mapping.get(c.image_url)||c.image_url;
  for(const key of ['logo','header_logo','footer_logo','all_image','offers_image'])state.settings[key]=mapping.get(state.settings[key])||state.settings[key];
  return state;
}
export async function downloadBackup(res,state,getImage){
  const paths=uploadPaths(state);
  // Check availability before sending headers; never report a complete backup with missing images.
  for(const p of paths)if(!await getImage(p))throw fail('Falta una imagen del catálogo. No se ha generado un respaldo incompleto: '+p);
  async function* lines(){
    yield JSON.stringify({format:'arcangel-us',version:1,created_at:new Date().toISOString(),catalog:state})+'\n';
    for(const p of paths){const image=await getImage(p);if(!image)throw Error('La imagen ya no está disponible.');yield JSON.stringify({image:{path:p,mime:image.mime,data:image.bytes.toString('base64')}})+'\n';}
    yield JSON.stringify({complete:true,images:paths.length})+'\n';
  }
  res.writeHead(200,{'Content-Type':'application/gzip','Content-Disposition':`attachment; filename="arcangel-us-revision-${state.revision}.jsonl.gz"`});
  await pipeline(Readable.from(lines()),createGzip(),res);
}
export async function importBackup(req,{validateState,detectImage,putImage}){
  const MAX_LINE=18*1024*1024,MAX_TOTAL=1024*1024*1024;
  let total=0,pending=Buffer.alloc(0),catalog,paths,mapping=new Map(),completed=false;
  const unzip=createGunzip();
  const onAborted=()=>unzip.destroy(Error('Transferencia interrumpida.'));
  req.once('aborted',onAborted);req.pipe(unzip);
  async function accept(line){
    if(!line.length)return;
    if(completed)throw fail('El respaldo contiene datos después de su cierre.');
    let item;try{item=JSON.parse(line.toString('utf8'));}catch{throw fail('El respaldo no es válido.');}
    if(!catalog){
      if(item.format!=='arcangel-us'||item.version!==1)throw fail('Selecciona un respaldo descargado desde este panel (.jsonl.gz).');
      catalog=validateState(item.catalog);paths=new Set(uploadPaths(catalog));return;
    }
    if(item.complete===true){
      if(item.images!==mapping.size||paths.size!==mapping.size)throw fail('El respaldo no contiene todas las imágenes subidas.');
      completed=true;return;
    }
    const image=item.image;
    if(!image||!paths.has(image.path)||mapping.has(image.path)||typeof image.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(image.data))throw fail('La imagen del respaldo no es válida o está repetida.');
    const bytes=Buffer.from(image.data,'base64'),type=detectImage(bytes);
    if(!type||type[1]!==image.mime||bytes.length>12*1024*1024||!bytes.length)throw fail('Hay una imagen no válida en el respaldo.');
    const newPath=`uploads/${randomUUID()}.${type[0]}`;
    await putImage(newPath,type[1],bytes);mapping.set(image.path,newPath);
  }
  try{
    for await(const chunk of unzip){
      total+=chunk.length;if(total>MAX_TOTAL)throw fail('El respaldo supera 1 GB descomprimido.');
      pending=Buffer.concat([pending,chunk]);let end;
      while((end=pending.indexOf(10))!==-1){if(end>MAX_LINE)throw fail('Una entrada del respaldo es demasiado grande.');await accept(pending.subarray(0,end));pending=pending.subarray(end+1);}
      if(pending.length>MAX_LINE)throw fail('Una entrada del respaldo es demasiado grande.');
    }
    if(pending.length)await accept(pending);
    if(!catalog||!completed)throw fail('El respaldo está incompleto. El catálogo actual no se ha reemplazado.');
    return remapImages(catalog,mapping);
  }catch(error){req.unpipe(unzip);unzip.destroy();req.resume();if(error.status)throw error;throw fail('No se pudo leer el respaldo comprimido. El catálogo actual no se ha reemplazado.');}
  finally{req.removeListener('aborted',onAborted);}
}
