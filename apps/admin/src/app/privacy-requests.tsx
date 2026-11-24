import {useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {useAdminPrivacyRequests,useUpdatePrivacyRequest,privacyRequestLabels,privacyStatusLabels,type AdminPrivacyRequest,type PrivacyRequestStatus} from '@wow/api';
import {useWowColors} from '@wow/theme';
import {AppButton,AppText,Card} from '@wow/ui';
import {W06GuardedPage,W06Header,W06Message,W06Paging} from '../features/w06/W06Shared';

function RequestCard({item}:{item:AdminPrivacyRequest}) {
 const colors=useWowColors(),update=useUpdatePrivacyRequest(),busy=useRef(false);
 const [decision,setDecision]=useState<Exclude<PrivacyRequestStatus,'submitted'>|null>(null),[response,setResponse]=useState(''),[error,setError]=useState(false);
 async function confirm(){
  if(!decision||busy.current||(decision!=='in_review'&&response.trim().length<10))return;
  busy.current=true;setError(false);
  try{await update.mutateAsync({id:item.id,status:decision,response});setDecision(null);setResponse('');}
  catch{setError(true);}finally{busy.current=false;}
 }
 return <Card className="gap-3 p-4">
  <AppText variant="heading">{privacyRequestLabels[item.kind]} — {privacyStatusLabels[item.status]}</AppText>
  <AppText selectable variant="caption">الطلب: {item.id}</AppText>
  <AppText selectable variant="caption">الحساب: {item.user_id}</AppText>
  {!!item.note&&<AppText selectable>{item.note}</AppText>}
  {!!item.response&&<AppText selectable>{item.response}</AppText>}
  {item.status==='submitted'&&<AppButton title="بدء المراجعة" variant="outline" disabled={update.isPending} onPress={()=>setDecision('in_review')}/>}
  {item.status==='in_review'&&<View style={{gap:8}}>
   <AppText muted variant="caption">أتمم التحقق والمعالجة المصرح بها خارج هذا السجل أولاً. لا يؤدي هذا الزر إلى حذف الحساب أو تغيير بياناته.</AppText>
   <TextInput value={response} onChangeText={setResponse} maxLength={1000} multiline editable={!update.isPending}
    accessibilityLabel="نتيجة المعالجة الموجهة لصاحب الطلب" placeholder="نتيجة المعالجة أو سبب عدم القبول"
    placeholderTextColor={colors.mutedForeground} style={{minHeight:80,borderWidth:1,borderColor:colors.border,color:colors.foreground,borderRadius:10,padding:12,textAlign:'right'}}/>
   <AppButton title="تسجيل اكتمال المعالجة" variant="outline" disabled={response.trim().length<10||update.isPending} onPress={()=>setDecision('resolved')}/>
   <AppButton title="تسجيل عدم قبول الطلب" variant="outline" disabled={response.trim().length<10||update.isPending} onPress={()=>setDecision('declined')}/>
  </View>}
  {decision&&<View style={{gap:8}}>
   <AppText>تأكيد تسجيل الحالة: {privacyStatusLabels[decision]}</AppText>
   <AppButton title="تأكيد وتسجيل الحالة" loading={update.isPending} disabled={update.isPending||(decision!=='in_review'&&response.trim().length<10)} onPress={()=>void confirm()}/>
   <AppButton title="إلغاء" variant="quiet" disabled={update.isPending} onPress={()=>setDecision(null)}/>
  </View>}
  {error&&<AppText>تعذر تأكيد التحديث. حدّث القائمة وتحقق من حالة الطلب.</AppText>}
 </Card>;
}
function Queue(){
 const [offset,setOffset]=useState(0);
 const query=useAdminPrivacyRequests(true,offset);
 return <View className="gap-4">
  <W06Header section="الخصوصية" title="طلبات الخصوصية" description="سجل متابعة مقيد للمشرف العام؛ لا ينفذ حذفاً أو إفصاحاً تلقائياً."/>
  <AppButton title="تحديث" variant="outline" onPress={()=>void query.refetch()} disabled={query.isFetching}/>
  {query.isPending&&<W06Message title="جارٍ تحميل الطلبات" kind="info"/>}
  {query.isError&&<W06Message title="تعذر تحميل الطلبات" kind="error" retry={()=>void query.refetch()}/>}
  {query.isSuccess&&query.data.length===0&&<W06Message title="لا توجد طلبات في هذه الصفحة"/>}
  {query.isSuccess&&query.data.map(item=><RequestCard key={item.id+':'+item.status} item={item}/>)}
  <W06Paging offset={offset} count={query.isSuccess?query.data.length:0} pageSize={20} loading={query.isFetching} previous={()=>setOffset(n=>Math.max(0,n-20))} next={()=>setOffset(n=>n+20)}/>
 </View>;
}
export default function PrivacyRequestsPage(){
 return <W06GuardedPage title="طلبات الخصوصية">{role=>role==='super_admin'?<Queue/>:<W06Message title="طلبات الخصوصية متاحة للمشرف العام فقط" kind="info"/>}</W06GuardedPage>;
}
