import { useState } from 'react';
import { Linking,View } from 'react-native';
import { AppButton,AppText } from '@wow/ui';
import { legalDocuments } from './legal-documents';

export function LegalDocumentLinks() {
  const [failed,setFailed]=useState(false);
  async function open(url:string|null) {
    if(!url)return;
    setFailed(false);
    try { await Linking.openURL(url); } catch { setFailed(true); }
  }
  return <View style={{width:'100%',alignItems:'center',gap:4}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>
      <AppButton title="شروط الخدمة" variant="quiet" disabled={!legalDocuments.terms}
        onPress={()=>void open(legalDocuments.terms)} />
      <AppButton title="سياسة الخصوصية" variant="quiet" disabled={!legalDocuments.privacy}
        onPress={()=>void open(legalDocuments.privacy)} />
    </View>
    {(!legalDocuments.terms||!legalDocuments.privacy)&&
      <AppText variant="caption" muted style={{textAlign:'center'}}>الوثائق القانونية النهائية غير متاحة في هذه البيئة.</AppText>}
    {failed&&<AppText variant="caption" accessibilityLiveRegion="polite">تعذّر فتح الوثيقة. أعد المحاولة.</AppText>}
  </View>;
}
