window.gameRegion=p=>{
 const aliases={LATAM:'Latinoamérica (LATAM)',GLOBAL:'Global',WORLDWIDE:'Global',BR:'Brasil',BRAZIL:'Brasil',BD:'Bangladés',BANGLADESH:'Bangladés',PE:'Perú',PERU:'Perú',MX:'México',MEXICO:'México',US:'Estados Unidos',USA:'Estados Unidos',AR:'Argentina',CL:'Chile',CO:'Colombia',EU:'Europa',EUROPE:'Europa',TR:'Turquía',TURKEY:'Turquía',ID:'Indonesia',PH:'Filipinas',IN:'India',ES:'España',UK:'Reino Unido'};
 const explicit=String(p.region||p.country||'').trim();
 if(explicit)return aliases[explicit.toUpperCase()]||explicit;
 const title=String(p.brand||'');const brackets=[...title.matchAll(/\(([^)]+)\)|\[([^\]]+)\]/g)].map(m=>(m[1]||m[2]).trim());
 for(const value of brackets){if(aliases[value.toUpperCase()])return aliases[value.toUpperCase()];}
 for(const token of title.toUpperCase().split(/[^A-Z]+/)){if(aliases[token])return aliases[token];}
 return 'No especificado; confirma la compatibilidad antes de comprar.';
};
// Keep provider regions and service variants separate; group only their offers.
window.gameDisplayName=p=>String(p.brand||p.name||'').normalize('NFKC').replace(/\s+/g,' ').trim();
window.gameGroupKey=p=>p.filter+'|'+String(p.provider_category_id||window.gameDisplayName(p)).toLowerCase();
window.openGamePackages=(product,products)=>{
 document.querySelector('#gamePackages')?.remove();
 const dialog=document.createElement('dialog');dialog.id='gamePackages';
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent=window.gameDisplayName(product);close.textContent='×';close.setAttribute('aria-label','Cerrar');close.onclick=()=>dialog.close();header.append(title,close);dialog.append(header);
 const media=document.createElement('div');media.className='package-media';const image=document.createElement('img');image.src=product.banner_url||product.image_url||'/logo/fazer-topups.svg';image.alt=product.brand||product.name;image.className='package-cover';image.addEventListener('error',()=>{image.onerror=null;image.src=product.logo_url||'/logo/fazer-gamekeys.svg';image.classList.add('image-fallback');},{once:true});media.append(image);const description=document.createElement('div');description.className='package-description';description.innerHTML='<h3>Instrucciones</h3><p></p>'; const filter=String(product.filter||'').toLowerCase();const region=window.gameRegion(product);description.querySelector('p').textContent=(region.startsWith('No especificado')?'':'País o región: '+region+'\n\n')+'1. Selecciona el paquete que necesitas en la lista.\n2. Revisa que el juego y la región sean correctos.\n'+(filter.includes('recarga')?'3. Completa los datos solicitados para la recarga tal como aparecen en tu cuenta.\n4. Confirma la compra y revisa la entrega en «Mis compras digitales».':filter.includes('tarjeta')?'3. Confirma la compra y revisa el código en «Mis compras digitales».\n4. Canjea el código en la plataforma correspondiente.':'3. Confirma la compra y revisa la clave en «Mis compras digitales».\n4. Activa la clave en la plataforma indicada.');media.append(description);dialog.append(media);
 const heading=document.createElement('h3');heading.textContent='Selecciona una opción';dialog.append(heading);
 const note=document.createElement('p');note.textContent='Selecciona el paquete que deseas comprar. Comprueba la compatibilidad del país o región antes de continuar.';dialog.append(note);
 const list=document.createElement('div');list.className='package-grid';
 const seen=new Set();products.filter(p=>{if(p.checkout_mode!=='provider'||p.filter!==product.filter||window.gameGroupKey(p)!==window.gameGroupKey(product))return false;const key=String(p.provider_category_id||p.brand)+'|'+(p.provider_offer_id||p.name.trim().toLowerCase());if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>{
 const region=String(a.brand).localeCompare(String(b.brand),'es',{numeric:true});if(region)return region;
 const quantity=p=>{const name=String(p.name).trim();if(/membership|membres|weekly|monthly|pass|pase|subscription/i.test(name))return null;const match=name.match(/^(\d[\d,.]*)/);return match?Number(match[1].replace(/,/g,'')):null;};
 const qa=quantity(a),qb=quantity(b);if(qa!==null&&qb===null)return -1;if(qa===null&&qb!==null)return 1;if(qa!==null&&qb!==null&&qa!==qb)return qa-qb;
 return String(a.name).localeCompare(String(b.name),'es',{numeric:true});
}).forEach(p=>{const button=document.createElement('a');button.className='package-option';button.href='/digital.html?comprar='+encodeURIComponent(p.id);const name=document.createElement('strong'),price=document.createElement('span');name.textContent=p.name;const variant=document.createElement("small");variant.textContent=[p.brand,p.region].filter(Boolean).join(' · ');button.append(variant);price.textContent=p.pen==null?'Inicia sesión para ver tu precio':'S/ '+Number(p.pen).toFixed(2);button.append(name,price);list.append(button);});dialog.append(list);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
};
