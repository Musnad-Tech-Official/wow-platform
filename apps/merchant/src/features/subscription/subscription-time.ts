/** Match the server's half-open subscription interval [starts_at, ends_at). */
export function isSubscriptionInForce(sub: {
 status: string; starts_at: string | null; ends_at: string | null;
} | null | undefined, now: number): boolean {
 if(!sub || sub.status !== 'active' || !sub.starts_at || !sub.ends_at) return false;
 const start=Date.parse(sub.starts_at), end=Date.parse(sub.ends_at);
 return Number.isFinite(start) && Number.isFinite(end) && start<=now && now<end;
}
export function isSubscriptionExpired(sub: {
 status:string;ends_at:string|null;
} | null | undefined, now:number):boolean {
 return !!sub && (sub.status==='expired' || (sub.status==='active' && !!sub.ends_at && Number.isFinite(Date.parse(sub.ends_at)) && Date.parse(sub.ends_at)<=now));
}
