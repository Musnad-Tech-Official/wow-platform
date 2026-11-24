import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';
export type PrivacyRequestKind = 'access' | 'correct' | 'close';
export type PrivacyRequestStatus = 'submitted' | 'in_review' | 'resolved' | 'declined';
export interface PrivacyRequest {
 id:string;kind:PrivacyRequestKind;status:PrivacyRequestStatus;note:string;response:string|null;
 created_at:string;updated_at:string;
}
export interface AdminPrivacyRequest extends PrivacyRequest { user_id:string }
export const privacyRequestLabels:Record<PrivacyRequestKind,string> = {
 access:'نسخة من البيانات الشخصية',correct:'تصحيح البيانات',close:'إغلاق الحساب',
};
export const privacyStatusLabels:Record<PrivacyRequestStatus,string> = {
 submitted:'مستلم',in_review:'قيد المراجعة',resolved:'تمت المعالجة',declined:'تعذر قبول الطلب',
};
function parseRows(data:unknown,admin:boolean):PrivacyRequest[] {
 if(!Array.isArray(data))throw new Error('Invalid privacy request list');
 return data.map((r:Record<string,unknown>)=>{
  if(!r||!uuid(r.id)||!['access','correct','close'].includes(String(r.kind))||
   !['submitted','in_review','resolved','declined'].includes(String(r.status))||
   typeof r.note!=='string'||(r.response!==null&&typeof r.response!=='string')||
   typeof r.created_at!=='string'||typeof r.updated_at!=='string'||
   (admin?typeof r.user_id!=='string':'user_id' in r))throw new Error('Invalid privacy request projection');
  return r as unknown as PrivacyRequest;
 });
}
export async function listMyPrivacyRequests(client:WowSupabaseClient,offset=0,limit=20) {
 const {data,error}=await client.rpc('wow_list_my_privacy_requests',{p_limit:limit,p_offset:offset});
 if(error)throw error;return parseRows(data,false);
}
export async function listAdminPrivacyRequests(client:WowSupabaseClient,offset=0,limit=20) {
 const {data,error}=await client.rpc('wow_admin_list_privacy_requests',{p_limit:limit,p_offset:offset});
 if(error)throw error;return parseRows(data,true) as AdminPrivacyRequest[];
}
export async function submitPrivacyRequest(client:WowSupabaseClient,kind:PrivacyRequestKind,note:string):Promise<string> {
 const {data,error}=await client.rpc('wow_submit_privacy_request',{p_kind:kind,p_note:note.trim()});
 if(error)throw error;if(!uuid(data))throw new Error('Unconfirmed privacy request');return data;
}
export async function updatePrivacyRequest(client:WowSupabaseClient,input:{id:string;status:Exclude<PrivacyRequestStatus,'submitted'>;response:string}) {
 const {data,error}=await client.rpc('wow_admin_update_privacy_request',{p_id:input.id,p_status:input.status,p_response:input.response.trim()});
 if(error)throw error;if(data!==true)throw new Error('Unconfirmed privacy request update');
}
