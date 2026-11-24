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
