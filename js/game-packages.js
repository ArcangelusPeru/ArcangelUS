// Group regional/service variants while keeping distinct games such as Mobile Legends: Adventure.
window.gameDisplayName=p=>String(p.brand||p.name||'').normalize('NFKC').replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
window.gameGroupKey=p=>p.filter+'|'+(p.filter==='recargas-juegos'?window.gameDisplayName(p):String(p.provider_category_id||p.brand)).toLowerCase();
window.openGamePackages=(product,products)=>{
 document.querySelector('#gamePackages')?.remove();
 const dialog=document.createElement('dialog');dialog.id='gamePackages';
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent=window.gameDisplayName(product);close.textContent='×';close.setAttribute('aria-label','Cerrar');close.onclick=()=>dialog.close();header.append(title,close);dialog.append(header);
 const image=document.createElement('img');image.src=product.banner_url;image.alt=product.brand;image.className='package-cover';dialog.append(image);
 const heading=document.createElement('h3');heading.textContent='Selecciona una opción';dialog.append(heading);
 const note=document.createElement('p');note.textContent='Elige el paquete para ingresar y verificar los datos del jugador.';dialog.append(note);
 const list=document.createElement('div');list.className='package-grid';
 const seen=new Set();products.filter(p=>{if(p.checkout_mode!=='provider'||p.filter!==product.filter||window.gameGroupKey(p)!==window.gameGroupKey(product))return false;const key=String(p.provider_category_id||p.brand)+'|'+(p.provider_offer_id||p.name.trim().toLowerCase());if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>{
 const region=String(a.brand).localeCompare(String(b.brand),'es',{numeric:true});if(region)return region;
 const quantity=p=>{const name=String(p.name).trim();if(/membership|membres|weekly|monthly|pass|pase|subscription/i.test(name))return null;const match=name.match(/^(\d[\d,.]*)/);return match?Number(match[1].replace(/,/g,'')):null;};
 const qa=quantity(a),qb=quantity(b);if(qa!==null&&qb===null)return -1;if(qa===null&&qb!==null)return 1;if(qa!==null&&qb!==null&&qa!==qb)return qa-qb;
 return String(a.name).localeCompare(String(b.name),'es',{numeric:true});
}).forEach(p=>{const button=document.createElement('a');button.className='package-option';button.href='/digital.html?comprar='+encodeURIComponent(p.id);const name=document.createElement('strong'),price=document.createElement('span');name.textContent=p.name;const variant=document.createElement("small");variant.textContent=p.brand;button.append(variant);price.textContent=p.pen==null?'Inicia sesión para ver tu precio':'S/ '+Number(p.pen).toFixed(2);button.append(name,price);list.append(button);});dialog.append(list);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
};
