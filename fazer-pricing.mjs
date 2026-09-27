import {fail} from './commerce-security.mjs';

export function automaticPrice(cost, rate, markup=0){
 const usd=Number(cost),fx=Number(rate),percent=Number(markup);
 if(!Number.isFinite(usd)||usd<=0||!Number.isFinite(fx)||fx<=0||fx>1000||!Number.isFinite(percent)||percent<0||percent>1000)throw fail(400,'Revisa el costo, el tipo de cambio y el porcentaje de ganancia.');
 return Math.ceil((usd*fx*(1+percent/100)-Number.EPSILON)*100)/100;
}

// Use explicit provider regions; names alone cannot establish activation rights.
export function latamEligible(region){
 const value=String(region||'').trim().toUpperCase();
 if(!value)return false;
 return value==='GLOBAL'||value==='WORLDWIDE'||value==='LATAM'||value.startsWith('LATAM ')||value.startsWith('LATAM-')||value.includes('LATIN AMERICA');
}

export function providerDescription(category,details){
 return [details.description||details.note||category.description||category.note||'',
 category.platform?`Plataforma: ${category.platform}`:'',
 (details.region||category.region)?`Región: ${details.region||category.region}`:'']
 .filter(Boolean).join('\n').slice(0,12000);
}
