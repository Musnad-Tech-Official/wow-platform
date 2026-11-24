import { useEffect,useState } from 'react';
import { signPublicBusinessMedia,useWowPublicSupabaseClient } from '@wow/api';

/** Never render raw storage keys or external URLs. Match the result to its exact business/key. */
export function usePublicBusinessImage(businessId?:string|null,key?:string|null):string|null {
  const getClient=useWowPublicSupabaseClient();
  const [signed,setSigned]=useState<{scope:string;url:string}|null>(null);
  const scope=businessId&&key?JSON.stringify([businessId,key]):null;
  useEffect(()=>{
    if(!businessId||!key||!scope)return;
    let cancelled=false;
    let refresh:ReturnType<typeof setTimeout>|undefined;
    let expiry:ReturnType<typeof setTimeout>|undefined;
    const load=async()=>{
      try{
        const client=getClient();
        if(!client)throw new Error('Public client unavailable');
        const url=await signPublicBusinessMedia(client,businessId,key);
        if(cancelled)return;
        if(expiry)clearTimeout(expiry);
        setSigned({scope,url});
        expiry=setTimeout(()=>{if(!cancelled)setSigned(null);},55_000);
      }catch{if(!cancelled)setSigned(null);}
      finally{if(!cancelled)refresh=setTimeout(()=>void load(),40_000);}
    };
    void load();
    return()=>{cancelled=true;if(refresh)clearTimeout(refresh);if(expiry)clearTimeout(expiry);};
  },[businessId,key,scope,getClient]);
  return signed&&signed.scope===scope?signed.url:null;
}
