export type MerchantOfferStatus='visible'|'paused'|'pending'|'draft'|'expired'|'needs_changes'|'scheduled'|'unavailable';
/** Operational state, not a guarantee of public discovery (server still checks branch, entitlement and categories). */
export function resolveMerchantOfferStatus(
 offer:{status:string;merchant_available:boolean;current_version_id?:string|null},
 current:{id:string;review_status:string;starts_at?:string|null;ends_at?:string|null}|undefined,
 latestReview:string|undefined,now:number,
):MerchantOfferStatus {
 if(offer.status==='closed')return 'expired';
 if(offer.status==='pending')return 'pending';
 if(offer.status==='active'||offer.status==='paused'){
  if(!current||current.id!==offer.current_version_id||current.review_status!=='approved'||!current.starts_at||!current.ends_at)return 'unavailable';
  const start=Date.parse(current.starts_at),end=Date.parse(current.ends_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 'unavailable';
  if(now>=end)return 'expired';
  if(offer.status==='paused'||!offer.merchant_available)return 'paused';
  if(now<start)return 'scheduled';
  return 'visible';
 }
 return latestReview==='rejected'?'needs_changes':'draft';
}
