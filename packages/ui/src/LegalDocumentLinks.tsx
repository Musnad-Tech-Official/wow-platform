import { useState } from 'react';
import { Linking, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { validateLegalDocumentUrl } from './legal-documents';

/** Documents are supplied by the release environment, never guessed. */
export function LegalDocumentLinks({termsUrl,privacyUrl}:{termsUrl?:string|null;privacyUrl?:string|null}) {
 const [failed,setFailed]=useState(false);
 const terms=validateLegalDocumentUrl(termsUrl), privacy=validateLegalDocumentUrl(privacyUrl);
 async function open(url:string|null) {
  if(!url)return;
  setFailed(false);
  try { await Linking.openURL(url); } catch { setFailed(true); }
 }
 return <View style={{width:'100%',alignItems:'center',gap:4}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>
   <AppButton title="شروط الخدمة" variant="quiet" disabled={!terms} onPress={()=>void open(terms)} />
   <AppButton title="سياسة الخصوصية" variant="quiet" disabled={!privacy} onPress={()=>void open(privacy)} />
  </View>
  {(!terms||!privacy)&&<AppText variant="caption" muted style={{textAlign:'center'}}>الوثائق القانونية النهائية غير متاحة في هذه البيئة.</AppText>}
  {failed&&<AppText variant="caption" accessibilityLiveRegion="polite">تعذّر فتح الوثيقة. أعد المحاولة.</AppText>}
 </View>;
}
