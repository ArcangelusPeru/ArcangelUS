(() => {
  let loading=false;
  async function refresh(){
    if(loading||document.hidden)return;loading=true;
    try{
      const response=await fetch('/api/shop/config',{cache:'no-store'}),config=response.ok?await response.json():null;
      document.documentElement.dataset.commerce=config?.enabled?'true':'false';
      const nav=document.querySelector('.customer-store-nav');if(!config?.enabled||!nav)return;
      const session=await fetch('/api/shop/session',{cache:'no-store'});
      if(session.ok){
        const {user}=await session.json();
        nav.innerHTML='<a href="/cuenta#billetera" class="customer-account-link" id="storeWallet"></a><a href="/cuenta#compras" class="customer-account-link">Mis compras</a>';
        document.getElementById('storeWallet').textContent='Mi billetera · S/ '+(user.balance_cents/100).toFixed(2);
      }else if(session.status===401)nav.innerHTML='<a href="/cuenta" class="customer-account-link">Iniciar sesión</a><a href="/cuenta?registro=1" class="customer-account-link">Registrarme</a>';
    }catch{ /* Keep the last visible state on a temporary connection failure. */ }
    finally{loading=false;}
  }
  refresh();window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
})();
