/* ZuzuOS Account Experience — browser UI with server-verified optional PIN. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => window.zuzuOSAuth?.client;
  const ACCOUNTS_KEY = 'zuzuos:known-accounts:v1';
  const ALIGN_KEY = 'zuzu:taskbar-align';
  const MENU_KEY = 'zuzu:start-menu-layout';
  let approved = null, unlockPromise = null, unlockResolve = null, unlockUser = null;
  let selectedEmail = '', accountsRendered = false, loadedFor = null;
  const json = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const store = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const safeName = value => String(value || '').trim().slice(0, 56);
  function accounts() { return json(ACCOUNTS_KEY, []).filter(a => a && typeof a.email === 'string').slice(0,6); }
  function remember(user) {
    if (!user?.email) return;
    const email = user.email.toLowerCase();
    const current = accounts().filter(a => a.email !== email);
    current.unshift({email, name:safeName(user.user_metadata?.display_name || email.split('@')[0])});
    store(ACCOUNTS_KEY, current.slice(0,6));
    renderAccounts();
  }
  function accountLabel(a) {
    const label = document.createElement('span');
    label.className = 'zu-account-name';
    const main = document.createElement('strong'); main.textContent = a.name || a.email.split('@')[0];
    const small = document.createElement('small'); small.textContent = a.email;
    label.append(main,small);
    return label;
  }
  function pick(email) {
    const changed = selectedEmail && selectedEmail !== email;
    selectedEmail = email;
    $('email').value = email;
    // Do not carry a password across different local account tiles.
    if (changed && $('password')) $('password').value = '';
    $('zu-email-field')?.classList.add('hidden');
    $('zu-account-tiles')?.querySelectorAll('button[data-email]').forEach(b=>b.classList.toggle('selected',b.dataset.email===email));
    $('password')?.focus();
  }
  function showEmail() {
    selectedEmail = '';
    $('email').value = '';
    if ($('password')) $('password').value = '';
    $('zu-email-field')?.classList.remove('hidden');
    $('zu-account-tiles')?.querySelectorAll('button.selected').forEach(b=>b.classList.remove('selected'));
    $('email')?.focus();
  }
  function renderAccounts() {
    const tiles = $('zu-account-tiles'), picker = $('zu-account-picker');
    if (!tiles || !picker) return;
    const signingUp = !$('name-field')?.classList.contains('hidden');
    const list = accounts();
    picker.classList.toggle('hidden',signingUp || list.length===0);
    if (signingUp || list.length===0) { $('zu-email-field')?.classList.remove('hidden'); return; }
    tiles.replaceChildren();
    list.forEach(a => {
      const button = document.createElement('button');
      button.type='button'; button.className='zu-account-tile'; button.dataset.email=a.email;
      button.setAttribute('aria-label','Sign in as ' + a.name);
      const avatar = document.createElement('span');avatar.className='zu-account-avatar';
      avatar.textContent=(a.name || a.email).slice(0,1).toUpperCase();
      button.append(avatar,accountLabel(a));
      button.addEventListener('click',()=>pick(a.email));
      tiles.append(button);
    });
    if (selectedEmail && list.some(a=>a.email===selectedEmail)) pick(selectedEmail);
    else pick(list[0].email);
  }
  function initAccounts() {
    if (accountsRendered) return;
    const form=$('auth-form');if(!form)return;
    accountsRendered=true;
    const wrap=document.createElement('section');wrap.id='zu-account-picker';wrap.className='zu-account-picker hidden';
    const label=document.createElement('p');label.textContent='Choose an account';label.className='zu-picker-caption';
    const tiles=document.createElement('div');tiles.id='zu-account-tiles';
    const other=document.createElement('button');other.type='button';other.id='zu-other-account';other.textContent='Use another account';
    other.className='zu-other-account';
    other.addEventListener('click',showEmail);
    wrap.append(label,tiles,other);
    form.before(wrap);
    const email=$('email');
    const row=email?.closest('label');
    if(row)row.id='zu-email-field';
    $('switch-mode')?.addEventListener('click',()=>setTimeout(renderAccounts,0));
    const title=$('auth-title');
    if(title)new MutationObserver(renderAccounts).observe(title,{childList:true});
    renderAccounts();
  }
  function lockUI() {
    if ($('zu-pin-screen')) return;
    const wrap=document.createElement('section');
    wrap.id='zu-pin-screen';wrap.className='zu-pin-screen hidden';
    wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','zu-pin-heading');
    wrap.innerHTML='<div class="zu-lock-time" id="zu-lock-time"></div><div class="zu-lock-card"><div class="zu-lock-avatar" id="zu-lock-avatar">Z</div><h1 id="zu-pin-heading">Welcome back</h1><p class="zu-lock-subtitle">Enter your six-digit ZuzuOS PIN to unlock this desktop.</p><form id="zu-pin-form"><label for="zu-pin-input">Account PIN</label><input id="zu-pin-input" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="••••••"><button type="submit">Unlock desktop →</button></form><p id="zu-pin-error" role="alert" aria-live="polite"></p><button class="zu-switch-user" id="zu-lock-signout" type="button">Switch account</button></div><div class="zu-lock-footer">ZUZU.OS <span>•</span> SECURE ACCOUNT SCREEN</div>';
    document.body.append(wrap);
    $('zu-pin-form').addEventListener('submit',async event=>{
      event.preventDefault();
      const input=$('zu-pin-input'), button=$('zu-pin-form').querySelector('button');
      const pin=input.value; if(!/^[0-9]{6}$/.test(pin))return;
      button.disabled=true;
      $('zu-pin-error').textContent='Checking PIN…';
      try{
        const result=await db().rpc('zuzuos_verify_pin',{p_pin:pin});
        if(result.error)throw result.error;
        if(!result.data){ $('zu-pin-error').textContent='Incorrect PIN or temporarily locked. Try again later.'; input.value=''; return; }
        approved=unlockUser;
        $('zu-pin-screen').classList.add('hidden');
        if(unlockResolve)unlockResolve(true);
        unlockResolve=null;unlockPromise=null;
      }catch(e){ $('zu-pin-error').textContent=e.message || 'Could not check PIN. Try again.'; }
      finally{button.disabled=false; }
    });
    $('zu-lock-signout').addEventListener('click',async()=>{
      if(unlockResolve)unlockResolve(false);
      unlockResolve=null;unlockPromise=null;approved=null;unlockUser=null;
      $('zu-pin-screen').classList.add('hidden');
      await db()?.auth.signOut();
      $('auth-screen')?.classList.remove('hidden');
      $('desktop')?.classList.add('hidden');
    });
  }
  function paintLock(user) {
    lockUI();
    $('zu-lock-avatar').textContent=(user.user_metadata?.display_name||user.email||'Z').slice(0,1).toUpperCase();
    $('zu-pin-heading').textContent=user.user_metadata?.display_name||user.email?.split('@')[0]||'ZuzuOS';
    $('zu-lock-time').textContent=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date());
    $('zu-pin-error').textContent='';
    $('zu-pin-input').value='';
    $('zu-pin-screen').classList.remove('hidden');
    setTimeout(()=>$('zu-pin-input')?.focus(),75);
  }
  async function beforeDesktop(user) {
    if (!user || !db()) return false;
    if (approved === user.id) return true;
    if (unlockPromise && unlockUser===user.id) return unlockPromise;
    unlockUser=user.id;
    unlockPromise=(async()=>{
      try {
        const {data,error}=await db().rpc('zuzuos_has_pin');
        if(error) throw error;
        if(!data){approved=user.id;unlockPromise=null;return true;}
        paintLock(user);
        return await new Promise(resolve=>{unlockResolve=resolve;});
      }catch(e){
        lockUI();paintLock(user);
        $('zu-pin-error').textContent='PIN service unavailable: '+(e.message||'Try again later');
        return await new Promise(resolve=>{unlockResolve=resolve;});
      }
    })();
    return unlockPromise;
  }
  function applyLayout() {
    const align=json(ALIGN_KEY,'center')==='left'?'left':'center';
    const menu=json(MENU_KEY,'windows')==='macos'?'macos':'windows';
    const desktop=$('desktop');if(!desktop)return;
    desktop.dataset.zuDockAlign=align;
    desktop.dataset.zuStartLayout=menu;
    if($('zu-align-choice'))$('zu-align-choice').value=align;
    if($('zu-start-choice'))$('zu-start-choice').value=menu;
  }
  function settingRow(title,detail,id,options,value,onChange) {
    const row=document.createElement('div');row.className='setting-row';
    const words=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=title;
    const p=document.createElement('p');p.textContent=detail;words.append(strong,p);
    const holder=document.createElement('label'),select=document.createElement('select');select.id=id;
    for(const [key,label] of options){const o=document.createElement('option');o.value=key;o.textContent=label;select.append(o);}
    select.value=value;select.addEventListener('change',e=>onChange(e.target.value));
    holder.append(select);row.append(words,holder);return row;
  }
  function mountSettings() {
    const target=$('shell-layout-choice');
    if(!target||$('zu-personalize-options'))return;
    const area=document.createElement('section');area.className='setting-section';area.id='zu-personalize-options';
    const h=document.createElement('h3');h.textContent='Start menu and taskbar';area.append(h);
    area.append(settingRow('Taskbar alignment','Center like Windows 11, or align to the left like Windows 10.','zu-align-choice',
      [['center','Center'],['left','Left']],json(ALIGN_KEY,'center'),v=>{store(ALIGN_KEY,v);applyLayout();}));
    area.append(settingRow('Start menu','Choose a Windows-style launcher or macOS-inspired app grid.','zu-start-choice',
      [['windows','Windows'],['macos','macOS']],json(MENU_KEY,'windows'),v=>{store(MENU_KEY,v);applyLayout();}));
    target.closest('.setting-section')?.after(area);
    const security=document.createElement('section');security.className='setting-section';security.id='zu-pin-setup';
    security.innerHTML='<h3>Windows-style PIN</h3><p class="muted">Add a six-digit PIN to unlock the ZuzuOS screen after password sign-in. Your account password remains required for full sign-in.</p><form id="zu-pin-setup-form" class="app-form"><label>New six-digit PIN<input id="zu-pin-new" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="new-password"></label><label>Confirm PIN<input id="zu-pin-confirm" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="new-password"></label><button class="primary" type="submit">Save account PIN</button><p id="zu-pin-save-status" role="status" class="muted"></p></form>';
    area.after(security);
    $('zu-pin-setup-form').addEventListener('submit',async e=>{
      e.preventDefault();
      const pin=$('zu-pin-new').value, confirm=$('zu-pin-confirm').value, button=$('zu-pin-setup-form').querySelector('button');
      if(!/^[0-9]{6}$/.test(pin)||pin!==confirm){$('zu-pin-save-status').textContent='PINs must match and contain exactly six digits.';return;}
      button.disabled=true;
      const result=await db().rpc('zuzuos_set_pin',{p_pin:pin});
      $('zu-pin-save-status').textContent=result.error?result.error.message:'PIN saved. You will be prompted to unlock next time.';
      if(!result.error){$('zu-pin-new').value='';$('zu-pin-confirm').value='';}
      button.disabled=false;
    });
    applyLayout();
  }
  let iconCatalog = {windows:{},apps:{}};
  async function loadIconCatalog() {
    try {
      const res=await fetch('/assets/icons/icon-manifest.json',{cache:'no-store'});
      if (!res.ok) return;
      const data=await res.json();
      if (!data || data.version!==1) return;
      for (const kind of ['windows','apps']) {
        if (!data[kind] || typeof data[kind]!=='object') continue;
        for (const [name,source] of Object.entries(data[kind])) {
          if (!/^[a-z0-9_-]+$/.test(name)) continue;
          // Never load arbitrary external URLs, scripts or SVG uploads as icons.
          if (typeof source!=='string' || !/^\/assets\/icons\/[a-zA-Z0-9_%./-]+\.png$/.test(source) || source.includes('..')) continue;
          iconCatalog[kind][name]=source;
        }
      }
      updateIcons();
    } catch (error) {
      console.warn('Optional ZuzuOS icon manifest unavailable:',error?.message||error);
    }
  }
  function iconFallback(button,kind,id) {
    if (!button || button.dataset.zuIconChecked) return;
    const src=iconCatalog[kind]?.[id];
    if (!src) return; // Use the working SVG. Missing PNGs must not produce 404s.
    button.dataset.zuIconChecked='1';
    const img=new Image();img.alt='';img.className='zu-custom-app-icon';
    img.onload=()=>{
      if (!button.isConnected) return;
      const old=button.querySelector('svg');
      if(old) old.replaceWith(img);
    };
    img.onerror=()=>{delete button.dataset.zuIconChecked;};
    img.src=src;
  }
  function updateIcons() {
    const root=$('desktop');if(!root)return;
    root.querySelectorAll('.taskbar .task-app').forEach(btn=>iconFallback(btn,'apps',btn.dataset.app||btn.dataset.osDock||'app'));
    const start=$('os-start-button');if(start)iconFallback(start,'windows','start');
    root.querySelectorAll('#os-launch-grid [data-os-launch]').forEach(btn=>iconFallback(btn,'apps',btn.dataset.osLaunch||'app'));
  }
  function showStudio() {
    const modal=$('zu-app-studio');if(!modal)return;
    modal.classList.remove('hidden');$('zu-studio-title')?.focus();
  }
  function setupStudio() {
    if($('zu-app-studio'))return;
    const modal=document.createElement('section');modal.id='zu-app-studio';modal.className='zu-studio-overlay hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="zu-studio-modal"><header><span>APPLICATION STUDIO</span><button type="button" id="zu-studio-close" aria-label="Close">×</button></header><h2>Create a web app</h2><p>Add a personal shortcut to a secure HTTPS website. Apps appear in your launcher and open inside ZuzuOS Browser when embedding is permitted.</p><form id="zu-studio-form"><label>App name<input id="zu-studio-title" required maxlength="56" placeholder="My app"></label><label>Website URL<input id="zu-studio-url" type="url" required placeholder="https://example.com"></label><label>Description<input id="zu-studio-description" maxlength="400" placeholder="What does it do?"></label><button type="submit">Create app</button><span id="zu-studio-status" role="status"></span></form></div>';
    $('desktop')?.append(modal);
    $('zu-studio-close').onclick=()=>modal.classList.add('hidden');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden');});
    $('zu-studio-form').addEventListener('submit',async e=>{
      e.preventDefault();
      const title=$('zu-studio-title').value.trim(), raw=$('zu-studio-url').value.trim(),desc=$('zu-studio-description').value.trim();
      let url;
      try{url=new URL(raw);if(url.protocol!=='https:')throw Error('Use an HTTPS website.');}
      catch{ $('zu-studio-status').textContent='Enter a valid HTTPS URL.'; return; }
      const {data:{user}}=await db().auth.getUser();
      if(!user){$('zu-studio-status').textContent='Sign in before creating an app.';return;}
      const button=$('zu-studio-form').querySelector('button');button.disabled=true;
      const {error}=await db().from('zuzuos_custom_apps').insert({owner_id:user.id,title,description:desc,url:url.href});
      button.disabled=false;
      $('zu-studio-status').textContent=error?error.message:'App saved to your launcher.';
      if(!error){$('zu-studio-form').reset();await loadApps();setTimeout(()=>modal.classList.add('hidden'),700);}
    });
  }
  async function loadApps() {
    const grid=$('os-launch-grid');if(!grid||!db())return;
    const {data:{user}}=await db().auth.getUser();
    if(!user)return;
    const {data,error}=await db().from('zuzuos_custom_apps').select('id,title,description,url').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(40);
    if(error){console.warn('ZuzuOS apps:',error.message);return;}
    grid.querySelectorAll('[data-zu-created]').forEach(x=>x.remove());
    (data||[]).forEach(app=>{
      const item=document.createElement('button');item.type='button';item.className='os-launch-item zu-created-app';item.dataset.zuCreated=app.id;
      const ico=document.createElement('span');ico.className='zu-created-symbol';ico.textContent=(app.title||'A').slice(0,1).toUpperCase();
      const details=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small');
      title.textContent=app.title;sub.textContent=app.description||new URL(app.url).hostname;details.append(title,sub);item.append(ico,details);
      item.addEventListener('click',()=>{ $('os-start-menu')?.classList.add('hidden');window.ZuzuBrowser?.open?.(app.url);});
      grid.append(item);
    });
    let studio=grid.querySelector('[data-zu-app-studio]');
    if(!studio){
      studio=document.createElement('button');studio.type='button';studio.className='os-launch-item zu-created-app';studio.dataset.zuAppStudio='true';
      studio.innerHTML='<span class="zu-created-symbol">＋</span><span><strong>Create app</strong><small>App Studio</small></span>';
      studio.onclick=()=>{ $('os-start-menu')?.classList.add('hidden');showStudio(); };
      grid.append(studio);
    }
    loadedFor=user.id;
  }
  function boot() {
    initAccounts();lockUI();applyLayout();setupStudio();
    const settingsObserver=new MutationObserver(()=>{if($('shell-layout-choice')&&!$('zu-pin-setup'))mountSettings();});
    if($('app-window'))settingsObserver.observe($('app-window'),{subtree:true,childList:true});
    const dbClient=db();
    dbClient?.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){approved=null;unlockUser=null;loadedFor=null;selectedEmail='';$('zu-pin-screen')?.classList.add('hidden');renderAccounts();return;}
      if(session?.user){remember(session.user);setTimeout(()=>{if(loadedFor!==session.user.id)loadApps();},100);}
    });
    document.addEventListener('click',e=>{
      if(e.target.closest('#os-start-button'))setTimeout(()=>{updateIcons();loadApps();},0);
      if(e.target.closest('[data-app="settings"],[data-os-launch="settings"]'))setTimeout(mountSettings,10);
    });
    void loadIconCatalog();
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')$('zu-app-studio')?.classList.add('hidden');
    });
  }
  window.ZuzuGate={beforeDesktop};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();