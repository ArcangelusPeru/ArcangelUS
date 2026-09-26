export const FAZER_CATEGORIES = [
  {id:'fazer-topups',slug:'recargas-juegos',name:'Recargas de juegos',image_url:'logo/fazer-topups.svg',sort_order:60},
  {id:'fazer-giftcards',slug:'tarjetas-regalo',name:'Tarjetas de regalo',image_url:'logo/fazer-giftcards.svg',sort_order:70},
  {id:'fazer-gamekeys',slug:'claves-juegos',name:'Claves de juegos',image_url:'logo/fazer-gamekeys.svg',sort_order:80}
];
export function withFazerCategories(state){
  const categories=[...state.categories];
  for(const category of FAZER_CATEGORIES)if(!categories.some(c=>c.slug===category.slug))categories.push({...category});
  return {...state,categories};
}
