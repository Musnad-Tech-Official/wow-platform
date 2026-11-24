import { useRef,useState } from 'react';
import { Linking } from 'react-native';
import { requireWowApiSession,signAdminComplaintEvidence,useWowApiContext } from '@wow/api';
import { AppButton,AppText,Card } from '@wow/ui';
import type { AdminRole } from '../auth/admin-access';

export function ComplaintEvidenceReview({complaintId,complaint,role}:{
  complaintId:string;complaint:Record<string,unknown>;role:AdminRole|null;
}) {
  const api=useWowApiContext();
  const busy=useRef(false);
  const [index,setIndex]=useState<number|null>(null),[error,setError]=useState(false);
  const refs=Array.isArray(complaint.private_evidence_keys)
    ? complaint.private_evidence_keys.filter((v):v is string=>typeof v==='string') : [];
  const count=typeof complaint.private_evidence_count==='number'?complaint.private_evidence_count:refs.length;
  const canOpen=(role==='reviewer'||role==='super_admin')&&Array.isArray(complaint.private_evidence_keys)&&refs.length<=8;
  async function open(i:number) {
    if(!canOpen||busy.current||!refs[i])return;
    busy.current=true;setIndex(i);setError(false);
    try{
      const {client}=requireWowApiSession(api);
      const url=await signAdminComplaintEvidence(client,complaintId,refs[i]);
      await Linking.openURL(url);
    }catch{setError(true);}
    finally{busy.current=false;setIndex(null);}
  }
  return <Card className="gap-3 p-4">
    <AppText variant="heading">الأدلة الخاصة بالعميل ({count})</AppText>
    <AppText muted variant="caption">تُفتح الملفات بروابط مؤقتة لمدة 60 ثانية بعد تحقق الخادم من الصلاحيات.</AppText>
    {!canOpen&&count>0&&<AppText muted>عرض العدد فقط؛ لا تتوفر صلاحية فتح الملفات لهذا الدور أو بسبب تعارض المصالح.</AppText>}
    {error&&<AppText accessibilityLiveRegion="polite">تعذّر فتح الدليل بشكل آمن. أعد المحاولة بعد التحقق من الصلاحية.</AppText>}
    {canOpen&&refs.map((_,i)=><AppButton key={i} title={`فتح الدليل ${i+1}`} variant="outline" disabled={index!==null} loading={index===i} onPress={()=>void open(i)}/>)}
  </Card>;
}
