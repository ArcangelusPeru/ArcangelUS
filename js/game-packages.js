window.openGamePackages=(product,products)=>{
 document.querySelector('#gamePackages')?.remove();
 const dialog=document.createElement('dialog');dialog.id='gamePackages';
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent=product.brand;close.textContent='×';close.setAttribute('aria-label','Cerrar');close.onclick=()=>dialog.close();header.append(title,close);dialog.append(header);
 const image=document.createElement('img');image.src=product.banner_url;image.alt=product.brand;image.className='package-cover';dialog.append(image);
 const heading=document.createElement('h3');heading.textContent='Selecciona una opción';dialog.append(heading);
 const note=document.createElement('p');note.textContent='Elige el paquete para ingresar y verificar los datos del jugador.';dialog.append(note);
 const list=document.createElement('div');list.className='package-grid';
 products.filter(p=>p.checkout_mode==='provider'&&p.filter===product.filter&&p.brand===product.brand).forEach(p=>{const button=document.createElement('a');button.className='package-option';button.href='/digital.html?comprar='+encodeURIComponent(p.id);const name=document.createElement('strong'),price=document.createElement('span');name.textContent=p.name;price.textContent=p.pen==null?'Inicia sesión para ver tu precio':'S/ '+Number(p.pen).toFixed(2);button.append(name,price);list.append(button);});dialog.append(list);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
};
