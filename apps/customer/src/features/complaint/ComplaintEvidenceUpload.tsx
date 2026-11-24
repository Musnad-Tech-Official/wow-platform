import { useRef,useState } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useAttachComplaintEvidence,useUploadWowMedia } from '@wow/api';
import { AppButton,AppText,Card } from '@wow/ui';
import { MAX_COMPLAINT_EVIDENCE_BYTES,submitComplaintEvidence,validateComplaintEvidence,type ComplaintEvidenceFile } from './evidence-upload';

export function ComplaintEvidenceUpload({complaintId}:{complaintId:string}) {
  const upload=useUploadWowMedia();
  const attach=useAttachComplaintEvidence();
  const busyRef=useRef(false),pickRef=useRef(false);
  const [file,setFile]=useState<ComplaintEvidenceFile|null>(null);
  const [pendingKey,setPendingKey]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[picking,setPicking]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  async function choose() {
    if (busyRef.current||pickRef.current||pendingKey) return;
    pickRef.current=true; setPicking(true);
    try {
      const selection=await DocumentPicker.getDocumentAsync({
        type:['application/pdf','image/jpeg','image/png','image/webp'],multiple:false,copyToCacheDirectory:true,
      });
      if(selection.canceled||!selection.assets.length)return;
      const asset=selection.assets[0];
      if(typeof asset.size!=='number'||asset.size<1||asset.size>MAX_COMPLAINT_EVIDENCE_BYTES)throw new Error('Invalid size');
      const bytes=Platform.OS==='web'&&asset.file
        ? await asset.file.arrayBuffer() : await new ExpoFile(asset.uri).arrayBuffer();
      if(bytes.byteLength!==asset.size)throw new Error('Incomplete read');
      setFile(validateComplaintEvidence(asset.name,asset.mimeType,bytes));setNotice(null);
    }catch{setNotice('تعذّر قراءة ملف صالح. اختر PDF أو JPG أو PNG أو WebP حتى 10 ميجابايت.');}
    finally{pickRef.current=false;setPicking(false);}
  }
  async function send() {
    if(busyRef.current||pickRef.current||(!file&&!pendingKey))return;
    setBusy(true);setNotice(null);
    try{
      const result=await submitComplaintEvidence({
        busy:busyRef,pendingKey,
        upload:()=>{if(!file)throw new Error('Missing file');return upload.mutateAsync({
          scope:{kind:'complaint',complaintId},bytes:file.bytes,contentType:file.contentType,
        });},
        attach:storageKey=>attach.mutateAsync({complaintId,storageKey}),
      });
      if(result.kind==='attached'){
        setFile(null);setPendingKey(null);setNotice('تم إرفاق الدليل بالشكوى.');
      }else if(result.kind==='attach_unconfirmed'){
        setFile(null);setPendingKey(result.storageKey);
        setNotice('رُفع الملف لكن لم يُؤكّد ربطه. أعد محاولة الربط فقط دون رفع الملف مجدداً.');
      }else if(result.kind==='upload_unconfirmed'){
        setFile(null);setNotice('تعذّر تأكيد رفع الملف. لم يُسجّل مرفق مؤكد؛ تحقق من الاتصال قبل اختيار ملف جديد.');
      }
    }finally{setBusy(false);}
  }
  return <Card className="gap-3 p-4">
    <AppText variant="heading">الأدلة الداعمة</AppText>
    <AppText muted variant="caption">أرفق صوراً أو مستندات PDF أو JPG أو PNG أو WebP حتى 10 ميجابايت. احجب البيانات الحساسة غير اللازمة. لا تظهر أدلة العميل للتاجر أو للعامة.</AppText>
    {file&&<AppText selectable>{file.name}</AppText>}
    {notice&&<AppText accessibilityLiveRegion="polite">{notice}</AppText>}
    {!pendingKey&&<AppButton title={file?'تغيير الملف':'اختيار ملف'} variant="outline" disabled={busy||picking} loading={picking} onPress={()=>void choose()}/>}
    {(file||pendingKey)&&<AppButton title={pendingKey?'إعادة محاولة الربط':'رفع وربط الدليل'} disabled={busy||picking} loading={busy} onPress={()=>void send()}/>}
    {file&&!pendingKey&&<AppButton title="إلغاء اختيار الملف" variant="quiet" disabled={busy||picking} onPress={()=>{setFile(null);setNotice(null);}}/>}
  </Card>;
}
