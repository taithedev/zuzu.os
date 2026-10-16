/* ZuzuOS private, account-scoped desktop preference sync. */
(() => {
  'use strict';
  const KEYS = [
    'zuzu:theme-preset', 'zuzu:wallpaper','zuzu:accent','zuzu:shell-style',
    'zuzu:desktop-ui:v1','zuzu:os-vfs:v1','zuzu:windows-remake-v1',
    'zuzu:os-label','zuzu:os-welcome','zuzu:background:selected:v2'
  ];
  const META_KEY='zuzu:desktop-sync:pending';
  const client=()=>window.zuzuOSAuth?.client || null;
  let userId=null,ready=false,restoring=false,dirty=false;
  let generation=0,lastCloudAt='',timer=0,inflight=Promise.resolve(),pulling=false;

  const read = key => {try{return localStorage.getItem(key)}catch{return null}};
  function markStatus(state,details) {
    const title=document.getElementById('sync-title');
    const desc=document.getElementById('sync-description');
    const connection=document.getElementById('connection-label');
    if(title)title.textContent=state;
    if(desc)desc.textContent=details;
    if(connection)connection.textContent=state;
  }
  function snapshot(){
    const state={};
    for(const key of KEYS){const v=read(key);if(v!==null)state[key]=v;}
    return state;
  }
  function schedule() {
    if(!ready||!userId||restoring)return;
    dirty=true;
    try{localStorage.setItem(META_KEY,'1')}catch{}
    clearTimeout(timer);
    timer=setTimeout(()=>{void push()},700);
  }
  async function push(){
    const id=userId,epoch=generation,db=client();
    if(!ready||!id||!db||restoring||!dirty)return;
    const values=snapshot();
    dirty=false;
    inflight=inflight.then(async()=>{
      if(id!==userId||epoch!==generation)return;
      markStatus('Syncing','Saving workspace changes…');
      const {data,error}=await db.from('user_data').upsert({
        user_id:id,namespace:'desktop',item_key:'state',value:values,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id,namespace,item_key'}).select('updated_at').single();
      if(error)throw error;
      if(id!==userId||epoch!==generation)return;
      lastCloudAt=data?.updated_at||lastCloudAt;
      try{localStorage.removeItem(META_KEY)}catch{}
      markStatus('Synced','Workspace saved to your account.');
    }).catch(error=>{
      if(id!==userId||epoch!==generation)return;
      dirty=true;
      console.warn('ZuzuOS desktop preferences sync:',error?.message||error);
      markStatus('Offline changes','Saved on this device; cloud sync will retry.');
    });
    await inflight;
  }
  function applyRemote(state){
    if(!state||typeof state!=='object'||Array.isArray(state))return;
    restoring=true;
    try{
      for(const key of KEYS){
        if(typeof state[key]==='string')localStorage.setItem(key,state[key]);
      }
    }finally{restoring=false;}
    let style='cine',theme='cine',wallpaper='none',accent=null;
    try{style=JSON.parse(read('zuzu:shell-style')||'"cine"')}catch{}
    try{theme=JSON.parse(read('zuzu:theme-preset')||'"cine"')}catch{}
    try{wallpaper=JSON.parse(read('zuzu:wallpaper')||'"none"')}catch{}
    try{accent=JSON.parse(read('zuzu:accent')||'null')}catch{}
    if(typeof window.zuzuApplySyncedDesktop==='function'){
      window.zuzuApplySyncedDesktop({style,theme,wallpaper,accent});
    }
    const chosen=read('zuzu:background:selected:v2');
    if(chosen&&window.ZuzuBackgrounds?.select)window.ZuzuBackgrounds.select(chosen);
    const name=read('zuzu:os-label');
    if(name&&document.querySelector('.top-brand'))document.querySelector('.top-brand').dataset.syncName='1';
  }
  async function pull(id,epoch,initial=false){
    const db=client();
    if(!db||pulling)return;
    pulling=true;
    try{
      const {data,error}=await db.from('user_data').select('value,updated_at')
        .eq('user_id',id).eq('namespace','desktop').eq('item_key','state').maybeSingle();
      if(error)throw error;
      if(id!==userId||epoch!==generation)return;
      if(data?.updated_at&&data.updated_at!==lastCloudAt&&!dirty&&!read(META_KEY)){
        applyRemote(data.value);
        lastCloudAt=data.updated_at;
      }else if(initial&&!data){
        dirty=true;
        await push();
      }
      if(!dirty)markStatus('Synced','Workspace synced with your account.');
    }catch(error){
      if(id!==userId||epoch!==generation)return;
      console.warn('ZuzuOS desktop sync unavailable:',error?.message||error);
      markStatus('Offline changes','Working locally; sync will retry when connected.');
    }finally{pulling=false;}
  }
  async function setUser(user) {
    const next=user?.id||null;
    if(next===userId&&ready)return;
    ++generation;
    clearTimeout(timer);
    userId=next;ready=false;dirty=false;lastCloudAt='';
    if(!next){markStatus('Not signed in','Sign in to sync desktop preferences.');return;}
    markStatus('Connecting','Loading your desktop settings…');
    ready=true;
    if(read(META_KEY)==='1')dirty=true;
    await pull(next,generation,true);
    if(dirty)await push();
  }
  window.zuzuApplySyncedDesktop=function({style,theme,wallpaper,accent}={}){
    if(['cine','windows','macos'].includes(style)){
      const el=document.getElementById('desktop');
      if(el)el.dataset.shellStyle=style;
      document.documentElement.dataset.shellStyle=style;
      document.body.dataset.shellStyle=style;
      const select=document.getElementById('shell-layout-choice');
      if(select)select.value=style;
    }
    if(typeof theme==='string'){
      document.documentElement.dataset.themePreset=theme;
      document.body.dataset.themePreset=theme;
    }
    if(typeof accent==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(accent))
      document.documentElement.style.setProperty('--accent',accent);
    const bgIds={aurora:'photo-aurora',obsidian:'photo-obsidian',afterglow:'photo-afterglow','silent-shore':'photo-shore'};
    if(bgIds[wallpaper])window.ZuzuBackgrounds?.select(bgIds[wallpaper]);
  };
  const originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    if(this===localStorage&&KEYS.includes(String(key))&&!restoring)schedule();
  };
  const originalRemove=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(key){
    originalRemove.call(this,key);
    if(this===localStorage&&KEYS.includes(String(key))&&!restoring)schedule();
  };
  function init(){
    const db=client();
    if(!db)return;
    db.auth.onAuthStateChange((_event,session)=>setTimeout(()=>{void setUser(session?.user)},0));
    db.auth.getSession().then(({data})=>setUser(data?.session?.user)).catch(e=>console.warn('ZuzuOS session sync:',e));
    window.addEventListener('online',()=>{if(userId&&dirty)void push();else if(userId)void pull(userId,generation)});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&userId&&!dirty)void pull(userId,generation)});
  }
  window.zuzuCloudSync={save:()=>{dirty=true;return push()},refresh:()=>userId?pull(userId,generation):Promise.resolve(),get status(){return {signedIn:Boolean(userId),dirty,ready}}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();