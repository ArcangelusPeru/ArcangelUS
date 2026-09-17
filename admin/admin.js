(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset=s=>/^https?:\/\//.test(s||'')?s:'/'+String(s||'logo/arcangel-us.png').replace(/^\//,'');
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const copy=x=>JSON.parse(JSON.stringify(x));
  let state,token,view='products',dirty=false,editing=null,saving=false,query='',category='',status='';
  let toastTimer,pendingUploads=0,storage;
  function updateSaveButtons(){ $$('button[type=submit]').forEach(b=>b.disabled=saving||pendingUploads>0); }
  function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,error?9000:4500);}
  async function api(url,options={}){
    const response=await fetch(url,{...options,headers:{'X-Admin-Token':token||'',...options.headers},cache:'no-store'});
    let result;try{result=await response.json();}catch{throw Error('El servidor no respondió como se esperaba. En GoDaddy revisa el despliegue; en este equipo abre INICIAR-TIENDA.cmd.');}
    if(!response.ok)throw Object.assign(Error(result.error||'No se pudo completar la operación.'),{status:response.status});return result;
  }
  function installState(data){token=data.token||token;state={products:data.products,categories:data.categories,settings:data.settings,revision:data.revision};$('#adminName').textContent=state.settings.name;$('#adminLogo').src=asset(state.settings.logo);$('#navCount').textContent=state.products.length;document.title='Administración · '+state.settings.name;}
  async function save(next){
    if(saving)return false;if(pendingUploads){toast('Espera a que terminen de subir las imágenes.',true);return false;}saving=true;updateSaveButtons();
    try{installState(await api('/api/admin/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...next,revision:state.revision})}));dirty=false;toast('Cambios guardados. Tu tienda ya está actualizada.');return true;}
    finally{saving=false;updateSaveButtons();}
  }
  const catName=slug=>state.categories.find(c=>c.slug===slug)?.name||slug;
  function availability(p){return p.active===false?'hidden':(p.out_of_stock||p.stock_quantity===0)?'soldout':'available';}
  const statusLabel={available:'Disponible',soldout:'Agotado',hidden:'Oculto'};
  function render(){
    if(!state)return;
    $$('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    const labels={products:['Productos','Administra tu catálogo, sus precios y su disponibilidad.'],categories:['Categorías','Organiza tus productos y cambia las imágenes de los filtros.'],settings:['Configurar web','Edita la marca, los textos, el contacto y el fondo de tu tienda.'],backups:['Respaldos','Descarga una copia de tus productos, configuración e imágenes subidas.']};
    $('#pageTitle').textContent=labels[view][0];$('#pageIntro').textContent=labels[view][1];
    $('#pageAction').innerHTML=view==='products'?'<button class="button primary" id="addProduct"><span aria-hidden="true">＋</span> Agregar producto</button>':view==='categories'?'<button class="button primary" id="addCategory"><span aria-hidden="true">＋</span> Nueva categoría</button>':'<a class="button secondary" href="/" target="_blank" rel="noopener">Ver tienda ↗</a>';
    if(view==='products')renderProducts();else if(view==='categories')renderCategories();else if(view==='backups')renderBackups();else renderSettings();
    $('#addProduct')?.addEventListener('click',()=>openProduct());$('#addCategory')?.addEventListener('click',()=>openCategory());
  }
  function renderProducts(){
    const counts={all:state.products.length,available:0,soldout:0,hidden:0};state.products.forEach(p=>counts[availability(p)]++);
    $('#mainContent').innerHTML=`<div class="stats">${[['all','Productos'],['available','Disponibles'],['soldout','Agotados'],['hidden','Ocultos']].map(([k,t])=>`<div class="stat ${k}"><span>${t}</span><strong>${counts[k]}</strong></div>`).join('')}</div><section class="catalog-panel" aria-label="Catálogo"><div class="catalog-toolbar"><input id="productSearch" type="search" aria-label="Buscar productos" placeholder="Buscar por nombre, marca o descripción…" value="${esc(query)}"><select id="categoryFilter" aria-label="Filtrar categoría"><option value="">Todas las categorías</option>${state.categories.map(c=>`<option value="${esc(c.slug)}" ${category===c.slug?'selected':''}>${esc(c.name)}</option>`).join('')}</select><select id="statusFilter" aria-label="Filtrar disponibilidad"><option value="">Todos los estados</option>${Object.entries(statusLabel).map(([v,n])=>`<option value="${v}" ${v===status?'selected':''}>${n}</option>`).join('')}</select></div><div class="table-wrap"><table class="product-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody id="productRows"></tbody></table></div><div id="tableCaption" class="table-caption"></div></section>`;
    $('#productSearch').addEventListener('input',e=>{query=e.target.value;renderRows();});$('#categoryFilter').addEventListener('change',e=>{category=e.target.value;renderRows();});$('#statusFilter').addEventListener('change',e=>{status=e.target.value;renderRows();});renderRows();
  }
  function renderRows(){
    const q=query.toLocaleLowerCase('es').trim();const list=state.products.filter(p=>(!q||[p.name,p.brand,p.sub,p.description].join(' ').toLocaleLowerCase('es').includes(q))&&(!category||p.filter===category)&&(!status||availability(p)===status));
    $('#productRows').innerHTML=list.length?list.map(p=>`<tr><td><div class="product-ident"><img src="${esc(asset(p.banner_url))}" alt="" loading="lazy"><div><strong>${esc(p.name)}</strong><small>${esc([p.type,p.duration].filter(Boolean).join(' · '))}</small></div></div></td><td class="category-text">${esc(catName(p.filter))}</td><td class="money">${money(p.pen)}${p.original_pen?`<small class="old-price">${money(p.original_pen)}</small>`:''}</td><td><span class="badge ${availability(p)}">${statusLabel[availability(p)]}</span>${p.stock_quantity!=null?`<small class="stock-units">${p.stock_quantity} unidades</small>`:''}</td><td><div class="row-actions"><button class="button small secondary" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">Editar</button><button class="button small ghost duplicate" data-duplicate="${esc(p.id)}" aria-label="Duplicar ${esc(p.name)}">Duplicar</button></div></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty"><strong>No hay productos</strong>Cambia los filtros o agrega tu primer producto.</div></td></tr>';
    $('#tableCaption').textContent=`${list.length} de ${state.products.length} productos`;
    $$('[data-edit]').forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));$$('[data-duplicate]').forEach(b=>b.onclick=()=>openProduct(b.dataset.duplicate,true));
  }
  function field(name,label,value='',options={}){
    const attrs=`name="${name}" id="field-${name}" ${options.required?'required':''} ${options.max?`maxlength="${options.max}"`:''}`;
    let control=options.area?`<textarea ${attrs} rows="${options.rows||3}">${esc(value)}</textarea>`:`<input ${attrs} type="${options.type||'text'}" value="${esc(value)}" ${options.type==='number'?'min="0" max="10000000" step="'+(options.step||'0.01')+'"':''}>`;
    return `<label class="field ${options.wide?'wide':''}"><span>${label}${options.required?' *':''}</span>${control}${options.help?`<small>${options.help}</small>`:''}</label>`;
  }
  function imageEditor(name,value,label){return `<div class="image-editor"><div class="image-preview"><img data-preview="${name}" src="${esc(asset(value))}" alt="${esc(label)}"></div><div class="image-controls"><label for="upload-${name}">Subir imagen</label><input type="file" id="upload-${name}" data-upload="${name}" accept="image/png,image/jpeg,image/webp,image/gif"><p class="help">PNG, JPG, WebP o GIF. Hasta 12 MB.</p><label class="field"><span>Imagen actual o enlace</span><input name="${name}" data-image="${name}" value="${esc(value||'')}" placeholder="https://…"></label></div></div>`;}
  function wireImages(scope){
    scope.querySelectorAll('[data-image]').forEach(input=>input.addEventListener('input',()=>{scope.querySelector(`[data-preview="${input.dataset.image}"]`).src=asset(input.value);dirty=true;}));
    scope.querySelectorAll('[data-upload]').forEach(input=>input.addEventListener('change',async()=>{
      const file=input.files[0];if(!file)return;
      if(file.size>12*1024*1024){toast('La imagen supera los 12 MB.',true);input.value='';return;}
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){toast('Usa una imagen PNG, JPG, WebP o GIF.',true);return;}
      input.disabled=true;dirty=true;pendingUploads++;updateSaveButtons();
      try{const uploaded=await api('/api/admin/upload',{method:'POST',headers:{'Content-Type':file.type},body:file});const target=scope.querySelector(`[data-image="${input.dataset.upload}"]`);target.value=uploaded.url;scope.querySelector(`[data-preview="${input.dataset.upload}"]`).src=asset(uploaded.url);dirty=true;toast('Imagen subida. Guarda los cambios para aplicarla.');}
      catch(e){toast(e.message,true);}finally{input.disabled=false;pendingUploads--;updateSaveButtons();}
    }));
  }
  function openProduct(id,duplicate=false){
    let p=id?copy(state.products.find(p=>String(p.id)===String(id))):{id:crypto.randomUUID(),name:'',brand:'',sub:'',description:'',type:'',duration:'1 mes',filter:state.categories[0]?.slug||'',pen:0,original_pen:null,stock_quantity:null,banner_url:'',features:[],note:'',active:true,out_of_stock:false,is_oferta:false,sort_order:Math.max(0,...state.products.map(p=>p.sort_order))+10,cat_sort_order:0,palette:''};
    if(duplicate){p.id=crypto.randomUUID();p.name+=' (copia)';p.active=false;p.sort_order=Math.max(...state.products.map(p=>p.sort_order))+10;}
    if(!p)return;
    editing={type:'product',item:p,isNew:!id||duplicate};dirty=false;
    $('#editorTitle').textContent=!id?'Agregar producto':duplicate?'Duplicar producto':'Editar producto';$('#editorEyebrow').textContent='CATÁLOGO';$('#deleteItem').hidden=editing.isNew;$('#saveItem').textContent=editing.isNew?'Crear producto':'Guardar cambios';$('#editorError').textContent='';
    $('#editorFields').innerHTML=`<div class="editor-layout"><div><section class="form-section"><h3>Información del producto</h3>${field('name','Nombre',p.name,{required:true,max:160})}<div class="field-grid">${field('brand','Marca o plataforma',p.brand,{max:100})}<label class="field"><span>Categoría *</span><select name="filter" required>${state.categories.map(c=>`<option value="${esc(c.slug)}" ${c.slug===p.filter?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>${field('type','Tipo de cuenta o licencia',p.type,{max:150})}${field('duration','Duración',p.duration,{max:100})}</div><div style="margin-top:16px">${field('sub','Subtítulo',p.sub,{max:250})}${field('description','Descripción completa',p.description,{area:true,max:12000,help:'Se muestra en la ficha del producto.'})}</div></section><section class="form-section"><h3>Precio y stock</h3><div class="field-grid">${field('pen','Precio en soles',p.pen,{type:'number',required:true})}${field('original_pen','Precio anterior',p.original_pen??'',{type:'number',help:'Opcional. Se muestra tachado.'})}<label class="field"><span>Disponibilidad</span><select name="availability" id="availability"><option value="available" ${!p.out_of_stock?'selected':''}>Disponible</option><option value="soldout" ${p.out_of_stock?'selected':''}>Agotado</option></select></label>${field('stock_quantity','Unidades disponibles',p.stock_quantity??'',{type:'number',step:'1',help:'Opcional. Con 0 se marca agotado. Actualiza las unidades después de cada venta por WhatsApp.'})}</div><label class="check-field"><input name="active" type="checkbox" ${p.active?'checked':''}>Mostrar producto en la tienda</label><label class="check-field"><input name="is_oferta" type="checkbox" ${p.is_oferta?'checked':''}>Incluir en Promos y Ofertas</label></section><section class="form-section"><h3>Detalles y orden</h3>${field('features','Características incluidas',(p.features||[]).join('\n'),{area:true,rows:5,help:'Una característica por línea.'})}${field('note','Nota o condiciones',p.note,{area:true,max:12000})}<div class="field-grid">${field('sort_order','Posición en la tienda',p.sort_order,{type:'number',step:'1',help:'Los números menores aparecen primero.'})}${field('cat_sort_order','Posición en su categoría',p.cat_sort_order,{type:'number',step:'1'})}</div></section></div><aside class="editor-sidebar"><div><h3 style="font-size:15px;margin-bottom:12px">Imagen del producto</h3>${imageEditor('banner_url',p.banner_url,'Vista previa del producto')}</div><div class="mini-preview"><p style="margin-bottom:12px">VISTA PREVIA</p><strong id="previewName">${esc(p.name||'Nombre del producto')}</strong><p id="previewDetail">${esc([p.type,p.duration].filter(Boolean).join(' · '))}</p><div class="preview-price" id="previewPrice">${money(p.pen)}</div></div></aside></div>`;
    const form=$('#editorForm');wireImages(form);form.querySelector('[name=name]').addEventListener('input',e=>$('#previewName').textContent=e.target.value||'Nombre del producto');form.querySelector('[name=pen]').addEventListener('input',e=>$('#previewPrice').textContent=money(e.target.value));
    form.querySelector('[name=stock_quantity]').addEventListener('input',e=>{if(e.target.value!==''&&Number(e.target.value)===0)$('#availability').value='soldout';});
    $('#availability').addEventListener('change',e=>{const qty=form.querySelector('[name=stock_quantity]');if(e.target.value==='available'&&qty.value==='0')qty.value='';});
    $('#editor').showModal();form.querySelector('[name=name]').focus();
  }
  function renderCategories(){
    $('#mainContent').innerHTML=`<div class="category-grid">${state.categories.map(c=>`<article class="category-card"><img src="${esc(asset(c.image_url))}" alt=""><h3>${esc(c.name)}</h3><p>${state.products.filter(p=>p.filter===c.slug).length} productos · posición ${c.sort_order}</p><button class="button secondary small" data-category="${esc(c.id)}">Editar categoría</button></article>`).join('')}</div><h2 class="section-heading">Filtros generales</h2><p class="section-note">Estos filtros reúnen todos los productos y las promociones.</p><div class="category-grid">${[['all','Todos'],['offers','Promociones']].map(([k,t])=>`<article class="category-card"><img src="${esc(asset(state.settings[k+'_image']))}" alt=""><h3>${esc(state.settings[k+'_label'])}</h3><p>${t}</p><button class="button secondary small" data-special="${k}">Editar imagen y nombre</button></article>`).join('')}</div>`;
    $$('[data-category]').forEach(b=>b.onclick=()=>openCategory(b.dataset.category));$$('[data-special]').forEach(b=>b.onclick=()=>openSpecial(b.dataset.special));
  }
  function openCategory(id){
    const c=id?copy(state.categories.find(c=>String(c.id)===String(id))):{id:crypto.randomUUID(),slug:'cat-'+crypto.randomUUID().slice(0,8),name:'',image_url:'logo/todos.png',sort_order:Math.max(0,...state.categories.map(c=>c.sort_order))+10};
    editing={type:'category',item:c,isNew:!id};dirty=false;$('#editorTitle').textContent=id?'Editar categoría':'Nueva categoría';$('#editorEyebrow').textContent='ORGANIZACIÓN';$('#deleteItem').hidden=!id;$('#saveItem').textContent='Guardar categoría';$('#editorError').textContent='';
    $('#editorFields').innerHTML=`<div class="editor-layout"><div>${field('name','Nombre de la categoría',c.name,{required:true,max:100})}${field('sort_order','Posición',c.sort_order,{type:'number',step:'1',help:'Los números menores aparecen primero.'})}<p class="help">Los productos asociados conservarán esta categoría cuando cambies su nombre.</p></div><div>${imageEditor('image_url',c.image_url,'Imagen de la categoría')}</div></div>`;wireImages($('#editorForm'));$('#editor').showModal();
  }
  function openSpecial(key){
    editing={type:'special',key,isNew:false};dirty=false;$('#editorTitle').textContent='Editar filtro';$('#editorEyebrow').textContent='CATEGORÍAS';$('#deleteItem').hidden=true;$('#saveItem').textContent='Guardar filtro';$('#editorError').textContent='';$('#editorFields').innerHTML=`<div class="editor-layout"><div>${field('label','Nombre del filtro',state.settings[key+'_label'],{required:true})}</div><div>${imageEditor('image_url',state.settings[key+'_image'],'Imagen del filtro')}</div></div>`;wireImages($('#editorForm'));$('#editor').showModal();
  }
  function renderSettings(){
    const s=state.settings;
    $('#mainContent').innerHTML=`<form id="settingsForm" class="settings-form"><section class="settings-card"><h2>Marca e imágenes</h2><div class="field-grid">${field('name','Nombre de la tienda',s.name,{required:true})}${field('tagline','Frase debajo del logo',s.tagline)}</div><div class="image-grid" style="margin-top:22px">${[['logo','Logo principal'],['header_logo','Logo de la cabecera'],['footer_logo','Logo del pie de página']].map(([k,t])=>`<div><h3>${t}</h3>${imageEditor(k,s[k],t)}</div>`).join('')}</div></section><section class="settings-card"><h2>WhatsApp y compras</h2><div class="field-grid">${field('whatsapp','WhatsApp para las ventas',s.whatsapp,{required:true,help:'Código de país y número, sin espacios. Ejemplo: 51929688960.'})}${field('buy_label','Texto del botón de compra',s.buy_label)}</div>${field('whatsapp_message','Mensaje del botón flotante',s.whatsapp_message,{area:true})}</section><section class="settings-card"><h2>Textos de la portada</h2><div class="field-grid">${s.trust.map((t,i)=>field('trust_'+i,'Mensaje de confianza '+(i+1),t,{wide:i===2})).join('')}${field('proof_before','Antes del número de clientes',s.proof_before)}${field('proof_count','Número de clientes',s.proof_count)}${field('proof_after','Después del número',s.proof_after)}${field('proof_bottom','Segunda línea',s.proof_bottom)}${field('search_placeholder','Texto del buscador',s.search_placeholder,{wide:true})}</div></section><section class="settings-card"><h2>Pie de página</h2>${field('footer','Texto del pie',s.footer,{area:true})}<label class="check-field"><input name="show_footer_contact" type="checkbox" ${s.show_footer_contact?'checked':''}>Mostrar contacto adicional en el pie</label><div class="field-grid">${field('footer_contact_text','Texto de contacto',s.footer_contact_text)}${field('footer_contact_label','Texto del enlace',s.footer_contact_label)}${field('footer_contact_phone','WhatsApp de contacto',s.footer_contact_phone,{wide:true})}${field('footer_contact_message','Mensaje de contacto',s.footer_contact_message,{area:true,wide:true})}</div></section><section class="settings-card"><h2>Colores del fondo</h2><div class="field-grid">${field('wave_primary','Olas principales',s.wave_primary,{type:'color'})}${field('wave_secondary','Olas secundarias',s.wave_secondary,{type:'color'})}${field('wave_teal','Ola turquesa',s.wave_teal,{type:'color'})}</div></section><section class="settings-card"><h2>Descripción de la web</h2>${field('description','Descripción para buscadores y enlaces',s.description,{area:true})}</section><div class="settings-save"><span id="settingsSaveStatus">Los cambios se aplican al guardar.</span><button class="button primary" type="submit">Guardar configuración</button></div></form>`;
    const form=$('#settingsForm');wireImages(form);form.addEventListener('input',()=>{dirty=true;$('#settingsSaveStatus').textContent='Hay cambios sin guardar.';});form.addEventListener('change',()=>dirty=true);
    form.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form),next=copy(state);for(const key of Object.keys(s)){if(key==='trust')next.settings.trust=[0,1,2].map(i=>String(f.get('trust_'+i)));else if(key==='show_footer_contact')next.settings[key]=f.has(key);else if(f.has(key))next.settings[key]=String(f.get(key)).trim();}try{if(await save(next))render();}catch(err){toast(err.message,true);}});
  }
  function closeEditor(){if(saving)return;if(pendingUploads){toast('Espera a que termine la subida de imágenes.',true);return;}if(dirty&&!confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?'))return;dirty=false;$('#editor').close();editing=null;}
  function importField(){return '<label class="field"><span>Restaurar un respaldo (.jsonl.gz)</span><input type="file" id="backupFile" accept=".gz,application/gzip"><small>Incluye catálogo, configuración e imágenes subidas. Los cambios se aplican al terminar de verificar el archivo.</small></label><button type="button" class="button secondary" id="importBackup">Seleccionar y restaurar respaldo</button>';}
  function wireImport(){
    $('#importBackup').onclick=async()=>{
      const file=$('#backupFile').files[0];if(!file){toast('Selecciona un archivo .jsonl.gz.',true);return;}
      if(!confirm(state?'El respaldo reemplazará el catálogo actual. Se conservará la versión anterior. ¿Restaurar?':'¿Iniciar este catálogo con el contenido del respaldo?'))return;
      saving=true;$('#importBackup').disabled=true;
      try{const result=await api('/api/admin/import',{method:'POST',headers:{'Content-Type':'application/gzip','X-Catalog-Revision':String(state?.revision??'new')},body:file});installState(result);dirty=false;view='backups';await boot();toast('Respaldo restaurado.');}
      catch(error){toast(error.message,true);}finally{saving=false;$('#importBackup')?.removeAttribute('disabled');}
    };
  }
  function renderBackups(){
    $('#mainContent').innerHTML=`<section class="settings-card"><h2>Guardar una copia en tu equipo</h2><p class="section-note">Catálogo: <strong>${esc(storage.catalogId)}</strong>. ${storage.kind==='mysql'?'Los cambios y las imágenes subidas se guardan en MySQL.':'Los cambios se guardan en este equipo.'} Las imágenes originales del diseño siguen incluidas en el proyecto.</p><a class="button primary" href="/api/admin/backup" download>Descargar respaldo completo</a></section><section class="settings-card"><h2>Restaurar una copia</h2>${importField()}</section><section class="settings-card"><h2>Versiones anteriores</h2><p class="section-note">Se conservan las últimas 50 versiones del catálogo en MySQL. Descarga una copia antes de restaurarla.</p><div id="backupList">Consultando versiones…</div></section>`;
    wireImport();
    api('/api/admin/storage').then(data=>{storage=data;const list=$('#backupList');if(!list)return;list.innerHTML=data.backups.length?data.backups.map(b=>`<p class="backup-row"><span>Revisión ${Number(b.revision)} · ${esc(new Date(b.created_at).toLocaleString('es-PE'))}</span><a class="button secondary small" href="/api/admin/backup?revision=${Number(b.revision)}" download>Descargar</a></p>`).join(''):'<p class="section-note">Todavía no hay versiones anteriores disponibles aquí.</p>';}).catch(error=>toast(error.message,true));
  }
  function showSetup(){
    state=null;$('#pageTitle').textContent='Configurar catálogo';$('#pageIntro').textContent='Este catálogo de la base de datos está vacío. No se han cargado productos automáticamente.';$('#pageAction').innerHTML='';
    $('#mainContent').innerHTML=`<section class="settings-card"><h2>Catálogo: ${esc(storage.catalogId)}</h2><p class="section-note">Restaura un respaldo si lo tienes. El catálogo inicial contiene los productos del paquete; no recupera los cambios perdidos.</p>${importField()}${storage.legacyAvailable?'<p><button class="button secondary" id="importLegacy">Importar catálogo anterior de esta instancia</button></p>':''}<p><button class="button secondary" id="useBundled">Usar catálogo inicial del paquete</button></p></section>`;wireImport();
    const initialize=async source=>{
      if(!confirm(source==='bundled'?'¿Iniciar con los productos originales del paquete? Esto no recupera los cambios perdidos.':'¿Importar el catálogo anterior y sus imágenes disponibles en esta instancia?'))return;
      if(saving)return;saving=true;$('#mainContent').querySelectorAll('button').forEach(b=>b.disabled=true);
      try{installState(await api('/api/admin/initialize?source='+source,{method:'POST'}));view='products';await boot();}
      catch(error){toast(error.message,true);}finally{saving=false;$('#mainContent').querySelectorAll('button').forEach(b=>b.disabled=false);}
    };
    $('#useBundled').onclick=()=>initialize('bundled');$('#importLegacy')?.addEventListener('click',()=>initialize('legacy'));
  }
  $('#closeEditor').onclick=closeEditor;$('#cancelEditor').onclick=closeEditor;$('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});$('#editorForm').addEventListener('input',()=>dirty=true);$('#editorForm').addEventListener('change',()=>dirty=true);
  $('#editorForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!editing)return;$('#editorError').textContent='';const f=new FormData(e.target),next=copy(state);
    if(editing.type==='product'){
      const p={...editing.item};for(const key of ['name','brand','sub','description','type','duration','filter','banner_url','note'])p[key]=String(f.get(key)||'').trim();
      for(const key of ['pen','sort_order','cat_sort_order'])p[key]=Number(f.get(key));p.original_pen=f.get('original_pen')===''?null:Number(f.get('original_pen'));p.stock_quantity=f.get('stock_quantity')===''?null:Number(f.get('stock_quantity'));p.features=String(f.get('features')||'').split('\n').map(s=>s.trim()).filter(Boolean);p.active=f.has('active');p.is_oferta=f.has('is_oferta');p.out_of_stock=f.get('availability')==='soldout'||p.stock_quantity===0;
      if(editing.isNew)next.products.push(p);else next.products[next.products.findIndex(x=>String(x.id)===String(p.id))]=p;
    }else if(editing.type==='category'){
      const c={...editing.item,name:String(f.get('name')).trim(),image_url:String(f.get('image_url')).trim(),sort_order:Number(f.get('sort_order'))};if(editing.isNew)next.categories.push(c);else next.categories[next.categories.findIndex(x=>String(x.id)===String(c.id))]=c;
    }else{next.settings[editing.key+'_label']=String(f.get('label')).trim();next.settings[editing.key+'_image']=String(f.get('image_url')).trim();}
    try{if(await save(next)){$('#editor').close();editing=null;render();}}catch(err){$('#editorError').textContent=err.message;}
  });
  $('#deleteItem').onclick=async()=>{
    if(!editing||editing.isNew||saving||pendingUploads)return;const item=editing.item;
    if(editing.type==='category'&&state.products.some(p=>p.filter===item.slug)){$('#editorError').textContent='Esta categoría tiene productos. Muévelos a otra categoría antes de eliminarla.';return;}
    if(!confirm(`¿Eliminar “${item.name}”? Se quitará de la tienda.`))return;
    const next=copy(state),key=editing.type==='product'?'products':'categories';next[key]=next[key].filter(x=>String(x.id)!==String(item.id));
    try{if(await save(next)){$('#editor').close();editing=null;render();}}catch(err){$('#editorError').textContent=err.message;}
  };
  $$('.nav-button').forEach(b=>b.addEventListener('click',()=>{if(saving)return;if(pendingUploads){toast('Espera a que termine la subida de imágenes.',true);return;}if(dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;dirty=false;view=b.dataset.view;render();}));
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  function showLogin(configured=true){
    $('.admin-shell').hidden=true;$('#loginScreen').hidden=false;$('#passwordField').hidden=!configured;$('#loginButton').hidden=!configured;
    $('#loginIntro').textContent=configured?'Introduce tu contraseña para administrar los productos y la web.':'Para activar el panel, añade ADMIN_PASSWORD en Manage Secrets de GoDaddy con una contraseña de al menos 12 caracteres y reinicia la aplicación.';
    $('#loginError').textContent='';
  }
  async function boot(){
    const session=await api('/api/admin/session');
    if(session.hosted&&!session.authenticated){showLogin(session.configured);return;}
    storage=await api('/api/admin/storage');token=storage.token;$('.admin-shell').hidden=false;$('#loginScreen').hidden=true;$('#logoutButton').hidden=!session.hosted;$('#accessLabel').textContent=storage.kind==='mysql'?'MySQL · '+storage.catalogId:'En este equipo';
    if(!storage.initialized){showSetup();return;}
    installState(await api('/api/admin/state'));render();
  }
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();$('#loginButton').disabled=true;$('#loginError').textContent='';
    try{await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#adminPassword').value})});$('#adminPassword').value='';await boot();}
    catch(err){$('#loginError').textContent=err.message;}finally{$('#loginButton').disabled=false;}
  });
  $('#logoutButton').addEventListener('click',async()=>{
    if(saving||pendingUploads)return;if(dirty&&!confirm('¿Descartar los cambios sin guardar y cerrar sesión?'))return;
    try{await api('/api/admin/logout',{method:'POST'});dirty=false;token='';state=null;$('#mainContent').innerHTML='';showLogin();}catch(err){toast(err.message,true);}
  });
  boot().catch(e=>{if(e.status===401){showLogin();return;}const box=$('#connectionError');box.textContent=e.message;box.hidden=false;$('#mainContent').innerHTML='';});
})();
