import {useRef,useState} from 'react';
import {Image,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File as ExpoFile} from 'expo-file-system';
import {AppButton,AppText} from '@wow/ui';
import {useAttachOfferMedia,useUploadWowMedia,useOfferMediaSignedUrl,type OfferMedia} from '@wow/api';
import {useOfferEditor} from '../context/OfferEditorContext';

function DraftImage({media}:{media:OfferMedia}){
  const image=useOfferMediaSignedUrl(media.storage_key);
  return image.data&&!image.isError
    ? <Image source={{uri:image.data}} accessibilityLabel={media.alt_text??'صورة العرض'} style={{width:100,height:100,borderRadius:10}} />
    : <View className="w-24 h-24 rounded-xl bg-slate-200 items-center justify-center"><AppText variant="caption">الصورة غير متاحة</AppText></View>;
}
type Pending={businessId:string;versionId:string;storageKey:string;isCover:boolean;sortOrder:number};

export function OfferMediaUploadPanel(){
  const editor=useOfferEditor();
  const upload=useUploadWowMedia(),attach=useAttachOfferMedia();
  const pending=useRef<Pending|null>(null);
  const picking=useRef(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
  const [hasPending,setHasPending]=useState(false);
  async function handleUpload(){
    if(picking.current||editor.isSaving||editor.businessConflict||editor.isSyntheticPreview)return;
    picking.current=true;setBusy(true);setMessage(null);
    let locked=false;
    try{
      if(pending.current){
        if(pending.current.businessId!==editor.businessId||pending.current.versionId!==editor.versionId)throw new Error('Draft scope changed');
        if(!editor.beginEvidenceUpload())return;
        locked=true;
      }else{
        const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp'],multiple:false,copyToCacheDirectory:true});
        if(result.canceled||!result.assets?.length)return;
        const asset=result.assets[0];
        const mime=asset.mimeType;
        if(mime!=='image/jpeg'&&mime!=='image/png'&&mime!=='image/webp'){setMessage('اختر صورة JPG أو PNG أو WebP.');return;}
        if(asset.size!==undefined&&(asset.size<1||asset.size>5*1024*1024)){setMessage('الحد الأقصى 5 ميجابايت.');return;}
        const bytes=asset.file?await asset.file.arrayBuffer():await new ExpoFile(asset.uri).arrayBuffer();
        if(bytes.byteLength<1||bytes.byteLength>5*1024*1024){setMessage('الحد الأقصى 5 ميجابايت.');return;}
        const b=new Uint8Array(bytes);
        const valid=mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255
          :mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)
          :b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
        if(!valid){setMessage('محتوى الصورة لا يطابق نوعها.');return;}
        const target=await editor.prepareOfferMediaUpload();
        if(!target){setMessage('تعذر حفظ المسودة قبل رفع الصورة.');return;}
        locked=true;
        const sortOrder=editor.media.reduce((max,m)=>Math.max(max,m.sort_order),-1)+1;
        if(sortOrder>99){setMessage('بلغت الصور الحد المسموح.');return;}
        const stored=await upload.mutateAsync({scope:{kind:'offer',...target},bytes,contentType:mime});
        pending.current={...target,storageKey:stored.key,isCover:editor.media.length===0,sortOrder};
        setHasPending(true);
      }
      const item=pending.current;
      if(!item)return;
      await attach.mutateAsync({versionId:item.versionId,storageKey:item.storageKey,isCover:item.isCover,sortOrder:item.sortOrder});
      pending.current=null;setHasPending(false);
      setMessage('تم رفع الصورة وربطها بالمسودة.');
    }catch{
      setMessage(pending.current?'رُفعت الصورة ولم يُؤكد الربط. أعد المحاولة لربط الملف نفسه.':'تعذر تأكيد رفع الصورة. تحقق من الاتصال وحالة المسودة.');
    }finally{if(locked)editor.endEvidenceUpload();picking.current=false;setBusy(false);}
  }
  if(editor.isSyntheticPreview)return null;
  return <View className="w-full rounded-2xl border border-slate-200 p-4 gap-3 mb-4">
    <AppText variant="heading">صور العرض</AppText>
    <AppText variant="caption" muted>صور العرض منفصلة عن مستندات الإثبات الخاصة. لا تُنشر قبل الاعتماد.</AppText>
    <View className="flex-row flex-wrap gap-2">{editor.media.map(m=><DraftImage key={m.id} media={m}/>)}</View>
    <AppButton title={hasPending?'إعادة محاولة ربط الصورة':'إضافة صورة العرض'} disabled={busy||editor.isSaving||editor.businessConflict} loading={busy} onPress={()=>void handleUpload()}/>
    {message&&<AppText accessibilityLiveRegion="polite">{message}</AppText>}
  </View>;
}
