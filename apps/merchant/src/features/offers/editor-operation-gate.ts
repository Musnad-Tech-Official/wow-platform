export type EditorOperation='save'|'submit'|'upload';
/** A synchronous gate shared across all editor routes; no queued writes from stale renders. */
export function createEditorOperationGate(){
 let active:EditorOperation|null=null;
 return {
  begin(kind:EditorOperation):boolean{if(active!==null)return false;active=kind;return true;},
  finish(kind:EditorOperation):boolean{if(active!==kind)return false;active=null;return true;},
  current:()=>active,
 };
}

/** Per-editor identity, accessed only by gated event handlers. Keep retry IDs
 * until a confirmed response or an explicit business reset. UI state remains
 * in React; this closure coordinates in-flight operations synchronously. */
export function createDraftIdentity(initialOfferId: string | null) {
 let offer = initialOfferId;
 let version: string | null = null;
 let request: string | null = null;
 return {
  offerId: () => offer,
  versionId: () => version,
  requestId(generate: () => string): string { return request ??= generate(); },
  confirmOffer(id: string) { offer = id; },
  confirmVersion(id: string) { version = id; },
  reset() { offer = null; version = null; request = null; },
 };
}
