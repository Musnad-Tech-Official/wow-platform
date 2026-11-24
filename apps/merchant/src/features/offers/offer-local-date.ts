/** Form dates are local calendar days; existing server instants round-trip unchanged. */
export function offerDateTimestamp(value:string,endOfDay:boolean):string|null {
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const parsed=Date.parse(value);
  if(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(parsed))throw new Error('Invalid offer date');
  return new Date(parsed).toISOString();
 }
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(0);
 date.setFullYear(year,month-1,day);
 date.setHours(endOfDay?23:0,endOfDay?59:0,endOfDay?59:0,endOfDay?999:0);
 if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw new Error('Invalid offer calendar day');
 return date.toISOString();
}
export function formatOfferLocalDate(value:string):string {
 if(!value||!value.includes('T'))return value;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 return String(date.getFullYear()).padStart(4,'0')+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
