(() => {
  let loading=false,loggingOut=false;
  async function refresh(){
    if(loading||loggingOut||document.hidden)return;loading=true;
    try{
      const response=await fetch('/api/shop/config',{cache:'no-store'}),config=response.ok?await response.json():null;
      document.documentElement.dataset.commerce=config?.enabled?'true':'false';
      const nav=document.querySelector('.customer-store-nav');if(!config?.enabled||!nav)return;
      const session=await fetch('/api/shop/session',{cache:'no-store'});
      if(session.ok){
        const {user,csrf}=await session.json();
        nav.innerHTML='<a href="/cuenta#billetera" class="customer-account-link" id="storeWallet"></a><a href="/cuenta#compras" class="customer-account-link">Mis compras</a><button type="button" class="customer-account-link customer-logout" id="storeLogout"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H4v18h5m5-15 6 6-6 6m-6-6h12"/></svg>Cerrar sesión</button><span id="storeLogoutError" role="alert" hidden></span>';
        document.getElementById('storeWallet').textContent='Mi billetera · S/ '+(user.balance_cents/100).toFixed(2);
        document.getElementById('storeLogout').addEventListener('click',async event=>{
          const button=event.currentTarget,error=document.getElementById('storeLogoutError');
          if(loggingOut)return;loggingOut=true;button.disabled=true;button.setAttribute('aria-busy','true');error.hidden=true;
          try{
            const response=await fetch('/api/shop/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Shop-Client':'1','X-Shop-Csrf':csrf},body:'{}',cache:'no-store'});
            if(!response.ok&&response.status!==401)throw Error('No se pudo cerrar la sesión. Vuelve a intentarlo.');
            // Reload the public catalog too, clearing the customer's role prices.
            window.location.replace('/');
          }catch{
            loggingOut=false;button.disabled=false;button.removeAttribute('aria-busy');error.textContent='No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.';error.hidden=false;
          }
        });
      }else if(session.status===401)nav.innerHTML='<a href="/cuenta" class="customer-account-link">Iniciar sesión</a><a href="/cuenta?registro=1" class="customer-account-link">Registrarme</a>';
    }catch{ /* Keep the last visible state on a temporary connection failure. */ }
    finally{loading=false;}
  }
  refresh();window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
})();
