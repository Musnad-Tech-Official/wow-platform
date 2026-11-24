import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {listMyPrivacyRequests,listAdminPrivacyRequests,submitPrivacyRequest,updatePrivacyRequest,type PrivacyRequestKind,type PrivacyRequestStatus} from '../../privacy-requests';
import {requireWowApiSession,useWowApiContext} from '../WowQueryProvider';
export function useMyPrivacyRequests(enabled:boolean,offset=0) {
 const ctx=useWowApiContext();
 return useQuery({queryKey:['privacy','own',ctx.userId,offset],enabled:enabled&&!!ctx.userId,
 queryFn:()=>listMyPrivacyRequests(requireWowApiSession(ctx).client,offset),staleTime:0});
}
export function useSubmitPrivacyRequest() {
 const ctx=useWowApiContext(),qc=useQueryClient();
 return useMutation({retry:false,mutationFn:(i:{kind:PrivacyRequestKind;note:string})=>submitPrivacyRequest(requireWowApiSession(ctx).client,i.kind,i.note),
 onSuccess:()=>{void qc.invalidateQueries({queryKey:['privacy','own',ctx.userId]});}});
}
export function useAdminPrivacyRequests(enabled:boolean,offset=0) {
 const ctx=useWowApiContext();
 return useQuery({queryKey:['privacy','admin',ctx.userId,offset],enabled:enabled&&!!ctx.userId,
 queryFn:()=>listAdminPrivacyRequests(requireWowApiSession(ctx).client,offset),staleTime:0});
}
export function useUpdatePrivacyRequest() {
 const ctx=useWowApiContext(),qc=useQueryClient();
 return useMutation({retry:false,mutationFn:(i:{id:string;status:Exclude<PrivacyRequestStatus,'submitted'>;response:string})=>updatePrivacyRequest(requireWowApiSession(ctx).client,i),
 onSuccess:()=>{void qc.invalidateQueries({queryKey:['privacy','admin',ctx.userId]});}});
}
