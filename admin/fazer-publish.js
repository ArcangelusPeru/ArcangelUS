window.fazerPublicationControls=async({root,api,esc,kind,categoryId,categoryName,offers})=>{
 const base='/api/admin/commerce/fazer/';
 const saved=(await api(base+'products')).items;const norm=value=>String(value||'').normalize('NFKC').trim().replace(/\\s+/g,' ').toLowerCase();
 const rows=root.querySelectorAll('tbody tr');
 offers.forEach((offer,index)=>{
  const offerId=String(offer.offer_id??offer.card_id??offer.key_id),existing=saved.find(p=>p.kind===kind&&norm(p.category_name)===norm(categoryName)&&norm(p.name)===norm(offer.name));
  const cell=document.createElement('td');
  cell.innerHTML=`<form class="fazer-price-form" style="min-width:260px;display:grid;gap:8px"><label>Precio cliente · S/<input name="client_price" type="number" min="0.01" step="0.01" required value="${existing?Number(existing.client_cents)/100:''}" style="width:100%"></label><label>Precio revendedor · S/<input name="reseller_price" type="number" min="0.01" step="0.01" required value="${existing?Number(existing.reseller_cents)/100:''}" style="width:100%"></label><label>Descripción y región<textarea name="description" maxlength="12000" rows="4" style="width:100%">${esc(existing?.description||'')}</textarea></label><label><input name="published" type="checkbox" ${existing?.published?'checked':''}> Publicar en mi tienda</label><button class="button primary" type="submit">Guardar precios y publicación</button><p role="status">${existing?.published?'Publicado':'Sin publicar'}</p></form>`;
  rows[index]?.append(cell);
  cell.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role=status]');button.disabled=true;
   try{await api(base+'products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,category_id:categoryId,category_name:categoryName,offer_id:offerId,client_price:form.elements.client_price.value,reseller_price:form.elements.reseller_price.value,published:form.elements.published.checked,description:form.elements.description.value})});status.textContent=form.elements.published.checked?'Publicado. Ya aparece en tu tienda.':'Guardado como oculto.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
  };
 });
};



