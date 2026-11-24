import {useRef,useState} from 'react';
import {View} from 'react-native';
import {AppButton,AppText,Card} from '@wow/ui';
import {useBusinessVerifications,useSubmitBusinessVerification,useResubmitBusinessVerification,useUploadWowMedia,type Branch} from '@wow/api';
import {EvidencePicker,type SelectedEvidenceFile} from '../../business/components/EvidencePicker';

export function BranchVerificationPanel({businessId,branch,onBack,onEdit}:{
 businessId:string;branch:Branch;onBack:()=>void;onEdit:()=>void;
}){
 const query=useBusinessVerifications(businessId),submit=useSubmitBusinessVerification(),resubmit=useResubmitBusinessVerification(),upload=useUploadWowMedia();
 const [file,setFile]=useState<SelectedEvidenceFile|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 const [reference,setReference]=useState<string|null>(null);
 const lock=useRef(false);
 const current=query.data?.filter(v=>v.request_type==='branch_addition'&&v.branch_id===branch.id)
  .sort((a,b)=>(b.submitted_at||b.created_at||'').localeCompare(a.submitted_at||a.created_at||''))[0];
 const canResubmit=current?.status==='needs_info';
 const canSubmit=query.isSuccess&&!reference&&(canResubmit||((branch.status==='draft'||branch.status==='rejected')&&current?.status!=='submitted'));
 async function choose(next:SelectedEvidenceFile|null){
  if(lock.current)return;
  setConfirmed(false);setMessage(null);setFile(next);
 }
 async function send(){
  if(lock.current||!confirmed||!canSubmit||!file)return;
  lock.current=true;setBusy(true);setMessage(null);
  try{
   let key=file.isUploaded?file.storageKey:null;
   if(!key){
    if(!file.bytes)throw new Error('Missing evidence');
    const result=await upload.mutateAsync({scope:{kind:'verification',businessId},bytes:file.bytes,contentType:file.mimeType});
    key=result.key;
    setFile({...file,isUploaded:true,storageKey:key,bytes:undefined});
   }
   const id=canResubmit&&current
    ? await resubmit.mutateAsync({verificationId:current.id,evidenceRefs:[key]})
    : await submit.mutateAsync({businessId,branchId:branch.id,requestType:'branch_addition',evidenceRefs:[key]});
   setReference(id);setFile(null);setConfirmed(false);setMessage('تم إرسال طلب تأهيل الفرع للمراجعة.');
  }catch{
   setMessage('تعذر تأكيد الإرسال. حدّث حالة الطلب قبل إعادة المحاولة. إن تأكد رفع المستند، لن يُرفع مرة أخرى.');
   void query.refetch();
  }finally{lock.current=false;setBusy(false);}
 }
 return <View className="gap-4">
  <Card className="p-4 gap-3">
   <AppText variant="heading">تأهيل فرع إضافي — {branch.name}</AppText>
   <AppText muted>هذا الطلب خاص بالفرع ولا يغيّر تأهيل النشاط الأساسي.</AppText>
   {query.isPending&&<AppText>جارٍ التحقق من الطلبات…</AppText>}
   {query.isError&&<AppButton title="إعادة تحميل حالة الطلب" variant="outline" onPress={()=>void query.refetch()}/>}
   {current&&<><AppText>حالة طلب الفرع: {current.status==='needs_info'?'مطلوب معلومات إضافية':current.status==='submitted'?'قيد المراجعة':current.status==='rejected'?'مرفوض':current.status==='approved'?'معتمد':current.status}</AppText>
    {current.merchant_feedback&&<AppText>{current.merchant_feedback}</AppText>}</>}
   {reference&&<AppText selectable>الرقم المرجعي: {reference}</AppText>}
   {canSubmit&&<>
     <AppText variant="caption" muted>أرفق مستندًا يثبت بيانات الفرع. الملف خاص ولا يظهر للعملاء.</AppText>
     <EvidencePicker value={file} onChange={choose} disabled={busy}/>
     {file&&!confirmed&&<AppButton title="مراجعة وتأكيد الإرسال" disabled={busy} onPress={()=>setConfirmed(true)}/>}
     {file&&confirmed&&<><AppText>هل تؤكد إرسال مستند هذا الفرع إلى الإدارة؟</AppText>
      <AppButton title={canResubmit?'إعادة إرسال الطلب':'إرسال طلب تأهيل الفرع'} disabled={busy} loading={busy} onPress={()=>void send()}/>
      <AppButton title="إلغاء التأكيد" variant="quiet" disabled={busy} onPress={()=>setConfirmed(false)}/></>}
   </>}
   {message&&<AppText accessibilityLiveRegion="polite">{message}</AppText>}
   {(branch.status==='draft'||branch.status==='rejected')&&!reference&&<AppButton title="تعديل بيانات الفرع" variant="outline" disabled={busy} onPress={onEdit}/>}
   <AppButton title="العودة إلى الفروع" variant="secondary" disabled={busy} onPress={onBack}/>
  </Card>
 </View>;
}
