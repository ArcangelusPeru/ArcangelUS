const dayMs=86400000;
export function limaDay(value=new Date()){
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function dayNumber(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time/dayMs:null;
}
export function billingPeriods(order,account,total){
  if(order.billing_periods){
    try{
      const periods=JSON.parse(order.billing_periods);
      if(Array.isArray(periods)&&periods.length&&periods.every(p=>Number.isSafeInteger(p.amount_cents)&&p.amount_cents>=0&&dayNumber(p.starts_on)!==null&&dayNumber(p.expires_on)>dayNumber(p.starts_on))&&periods.reduce((n,p)=>n+p.amount_cents,0)===total)return periods;
    }catch{}
    return [];
  }
  // Older sales have no immutable billing snapshot: use their recorded service
  // dates and paid total. Once renewed, this baseline is preserved separately.
  const starts=account?.starts_on||limaDay(order.created_at),ends=account?.expires_on||'';
  if(dayNumber(starts)===null||dayNumber(ends)===null||dayNumber(ends)<=dayNumber(starts))return [];
  return [{amount_cents:total,starts_on:starts,expires_on:ends}];
}

// Quote the unused share of the amount actually paid for this sale, including
// approved renewals. All dates use service calendar days in Peru, not browser time.
export function refundBreakdown(order,account,renewalTotal=0,asOf=limaDay()){
  const total=Number(order.amount_cents)+Number(renewalTotal);
  const result={as_of:asOf,total_paid_cents:total,refund_cents:0,used_cents:total,days_total:null,days_used:null,days_remaining:null,eligible:false,reason:''};
  if(!Number.isSafeInteger(total)||total<0)return {...result,reason:'No se pudo verificar el importe pagado.'};
  if(order.status==='refunded')return {...result,reason:'Esta venta ya tiene una devolución.'};
  if(order.status==='pending_manual')return {...result,refund_cents:total,used_cents:0,eligible:total>0,reason:'Venta pendiente de entrega: corresponde devolver el importe pagado.'};
  if(order.status!=='delivered')return {...result,reason:'Esta venta no admite devolución.'};
  const ends=account?.expires_on||'',last=dayNumber(ends),today=dayNumber(asOf);
  if(last!==null&&today!==null&&last<=today)return {...result,expires_on:ends,days_remaining:0,reason:'Cuenta vencida o sin días restantes: no corresponde devolución.'};
  const periods=billingPeriods(order,account,total);
  if(!periods.length||last===null||today===null)return {...result,reason:'Revisa las fechas de inicio y vencimiento de la cuenta antes de calcular la devolución.'};
  let daysTotal=0,remaining=0,unused=0;
  const breakdown=periods.map(p=>{
    const first=dayNumber(p.starts_on),end=dayNumber(p.expires_on),days=end-first;
    const pending=Math.max(0,Math.min(days,Math.min(end,last)-Math.max(first,today)));
    daysTotal+=days;remaining+=pending;unused+=p.amount_cents*pending/days;
    return {...p,days_total:days,days_remaining:pending};
  });
  const refund=Math.min(total,Math.round(unused));
  return {...result,periods:breakdown,expires_on:ends,days_total:daysTotal,days_used:daysTotal-remaining,days_remaining:remaining,refund_cents:refund,used_cents:total-refund,eligible:refund>0,reason:refund>0?'':'El saldo proporcional es menor a un céntimo; no corresponde devolución.'};
}
