import {fail} from './commerce-security.mjs';

export function automaticPrice(cost, rate, markup=0){
 const usd=Number(cost),fx=Number(rate),percent=Number(markup);
 if(!Number.isFinite(usd)||usd<=0||!Number.isFinite(fx)||fx<=0||fx>1000||!Number.isFinite(percent)||percent<0||percent>1000)throw fail(400,'Revisa el costo, el tipo de cambio y el porcentaje de ganancia.');
 return Math.ceil((usd*fx*(1+percent/100)-Number.EPSILON)*100)/100;
}

// Accept provider region fields and explicit region labels in category titles.
export function latamEligible(region){
 const value=String(region||'').trim().toUpperCase();
 if(!value)return false;
 return /^(?:LATAM|LATIN AMERICA(?: AND CARIBBEAN)?|GLOBAL|WORLDWIDE)$/.test(value)||
   /[([]\s*(?:LATAM|LATIN AMERICA|GLOBAL|WORLDWIDE)\s*[)\]]/.test(value);
}

export function providerDescription(category,details){
 const raw=details.description||details.note||category.description||category.note||'';
 const source=String(raw).replace(/\r/g,'').trim();
 const platform=category.platform||details.platform;
 const region=details.region||category.region;
 const kind=String(category.kind||'').toLowerCase();const specific=kind==='topups'?['1. Revisa que el juego y la región sean correctos.','2. Escribe tu ID de jugador exactamente como aparece dentro del juego.','3. Confirma la compra y revisa el resultado en «Mis compras digitales».']:kind==='giftcards'?['1. Comprueba que la tarjeta corresponde a tu país o región.','2. Confirma la compra y revisa el código en «Mis compras digitales».','3. Canjea el código siguiendo las instrucciones de la plataforma.']:['1. Comprueba que el juego, la plataforma y la región sean correctos.','2. Confirma la compra y revisa la clave en «Mis compras digitales».','3. Activa la clave únicamente en la plataforma indicada.'];const lines=['INSTRUCCIONES',...specific];
 if(platform)lines.push(`Plataforma: ${platform}`);
 if(region)lines.push(`Región: ${region}`);
 // No mostramos el texto original del proveedor: puede venir en inglés.
 return lines.join('\n').slice(0,12000);
}
