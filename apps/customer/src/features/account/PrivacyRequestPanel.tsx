import {useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {useMyPrivacyRequests,useSubmitPrivacyRequest,privacyRequestLabels,privacyStatusLabels,type PrivacyRequestKind} from '@wow/api';
import {useWowColors} from '@wow/theme';
import {AppButton,AppText,Card} from '@wow/ui';

export function PrivacyRequestPanel({kind,onCancel,enabled}:{kind:PrivacyRequestKind|null;onCancel:()=>void;enabled:boolean}) {
 const colors=useWowColors();
 const [offset,setOffset]=useState(0),[note,setNote]=useState(''),[confirm,setConfirm]=useState(false),[message,setMessage]=useState<string|null>(null);
 const busy=useRef(false);
 const list=useMyPrivacyRequests(enabled,offset),submit=useSubmitPrivacyRequest();
 async function send(){
  if(!enabled||!kind||!confirm||busy.current)return;
  busy.current=true;setMessage(null);
  try{
   const id=await submit.mutateAsync({kind,note});
   setMessage('تم تسجيل الطلب أو استرجاع الطلب المفتوح السابق. الرقم المرجعي: '+id);
   setOffset(0);setNote('');setConfirm(false);onCancel();
  }catch{
   setMessage('تعذر تأكيد تسجيل الطلب. حدّث قائمة الطلبات قبل إعادة الإرسال.');
   void list.refetch();
  }finally{busy.current=false;}
 }
 if(!enabled)return <AppText muted variant="caption">تقديم الطلبات متاح للحساب الحقيقي النشط فقط.</AppText>;
 return <View style={{gap:12}}>
  {kind&&<Card className="gap-3 p-4">
   <AppText variant="heading">{privacyRequestLabels[kind]}</AppText>
   <AppText variant="caption" muted>هذا طلب للمراجعة وليس حذفاً فورياً أو تعديلاً تلقائياً. لا تكتب كلمات مرور أو أرقام هوية أو معلومات مالية.</AppText>
   <TextInput accessibilityLabel="ملاحظات الطلب الاختيارية" value={note} maxLength={1000} multiline editable={!submit.isPending&&!confirm}
    onChangeText={setNote} placeholder="ملاحظات اختيارية" placeholderTextColor={colors.mutedForeground}
    style={{minHeight:80,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:12,color:colors.foreground,textAlign:'right'}}/>
   {confirm?<><AppText>هل تؤكد إرسال الطلب للمراجعة؟</AppText>
    <AppButton title="تأكيد إرسال الطلب" disabled={submit.isPending} loading={submit.isPending} onPress={()=>void send()}/>
    <AppButton title="تعديل الطلب" variant="outline" disabled={submit.isPending} onPress={()=>setConfirm(false)}/>
   </>:<AppButton title="متابعة إلى التأكيد" onPress={()=>setConfirm(true)}/>}
   <AppButton title="إلغاء" variant="quiet" disabled={submit.isPending} onPress={()=>{setNote('');setConfirm(false);onCancel();}}/>
  </Card>}
  {message&&<AppText selectable accessibilityLiveRegion="polite">{message}</AppText>}
  <AppText variant="heading">متابعة طلبات الخصوصية</AppText>
  <AppButton title="تحديث الطلبات" variant="outline" disabled={list.isFetching} onPress={()=>void list.refetch()}/>
  {list.isPending&&<AppText muted>جارٍ تحميل الطلبات…</AppText>}
  {list.isError&&<AppText>تعذر تحميل الطلبات. أعد المحاولة.</AppText>}
  {list.isSuccess&&list.data.length===0&&<AppText muted>لا توجد طلبات في هذه الصفحة.</AppText>}
  {list.isSuccess&&list.data.map(item=><Card key={item.id} className="gap-2 p-3">
   <AppText>{privacyRequestLabels[item.kind]} — {privacyStatusLabels[item.status]}</AppText>
   <AppText selectable variant="caption">{item.id}</AppText>
   {item.response&&<AppText>{item.response}</AppText>}
  </Card>)}
  <View style={{flexDirection:'row',gap:8}}>
   <AppButton title="السابق" variant="quiet" disabled={offset===0||list.isFetching} onPress={()=>setOffset(n=>Math.max(0,n-20))}/>
   <AppButton title="التالي" variant="quiet" disabled={!list.isSuccess||list.data.length<20||list.isFetching} onPress={()=>setOffset(n=>n+20)}/>
  </View>
 </View>;
}
