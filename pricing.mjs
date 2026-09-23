// Only the owner's catalog contains both prices. Every public response projects
// one authenticated role; visitors can browse products and sign in for prices.
export const priceForRole=(product,role)=>role==='reseller'?(product.reseller_pen??product.pen):product.pen;
export function catalogForRole(state,role=null){
  return {revision:state.revision,settings:state.settings,categories:state.categories,products:state.products.filter(p=>p.active!==false).map(product=>{
    const {client_pen,reseller_pen,client_original_pen,reseller_original_pen,...safe}=product;
    return {...safe,pen:role?Number(priceForRole(product,role)):null,original_pen:role==='reseller'?(reseller_original_pen??null):role==='customer'?(product.original_pen??null):null};
  })};
}
