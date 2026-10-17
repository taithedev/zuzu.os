/* ZuzuOS v0.3.5a: Windows-inspired sign-in, setup polish and desktop controls.
   Works with core auth and the account-desktop adapter; no duplicate auth client. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let interval = 0, initiated = false;
  const clockFormat = new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
  const dateFormat = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'});
  const safeStore = (key, fallback) => {
    try { const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value; }
    catch {return fallback;}
  };
  function mountClock() {
    const screen=$('auth-screen');
    if(!screen||$('zu-login-clock'))return;
    const clock=document.createElement('div');clock.id='zu-login-clock';clock.className='zu-login-clock';
    const label=document.createElement('div');label.id='zu-login-time';
    const date=document.createElement('small');date.id='zu-login-date';
    clock.append(label,date);
    screen.prepend(clock);
    const version=document.createElement('span');version.className='zu-login-version';
    version.textContent='ZUZU.OS  /  v0.3.5a';
    screen.append(version);
    const card=screen.querySelector('.auth-card');
    if(card){
      const avatar=document.createElement('span');avatar.className='zu-auth-avatar';avatar.id='zu-auth-avatar';
      avatar.textContent='Z';
      card.querySelector('#auth-title')?.before(avatar);
      const note=document.createElement('p');note.className='zu-auth-account-note';
      note.textContent='Sign in with your account password. If you enabled a ZuzuOS PIN, you can unlock your desktop with it next.';
      $('auth-form')?.after(note);
    }
    updateTime();
    interval=setInterval(updateTime,30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTime();});
  }
  function updateTime(){
    const now=new Date();
    const t=$('zu-login-time'),date=$('zu-login-date');
    if(t)t.textContent=clockFormat.format(now);
    if(date)date.textContent=dateFormat.format(now);
  }
  function syncAccountAvatar(){
    const avatar=$('zu-auth-avatar');if(!avatar)return;
    const selected=$('zu-account-tiles')?.querySelector('button.selected .zu-account-avatar');
    const name=$('display-name')?.value?.trim();
    const email=$('email')?.value?.trim();
    const initial=selected?.textContent || name?.charAt(0) || email?.charAt(0) || 'Z';
    avatar.textContent=initial.charAt(0).toUpperCase();
  }
  function decoratePassword(){
    const pass=$('password');
    if(!pass||$('zu-toggle-password'))return;
    const label=pass.closest('label');
    if(!label)return;
    label.classList.add('zu-password-field-wrap');
    const toggle=document.createElement('button');
    toggle.type='button';toggle.id='zu-toggle-password';toggle.className='zu-password-toggle';
    toggle.textContent='Show';toggle.setAttribute('aria-label','Show password');
    toggle.addEventListener('click',()=>{
      const visible=pass.type==='text';
      pass.type=visible?'password':'text';
      toggle.textContent=visible?'Show':'Hide';
      toggle.setAttribute('aria-label',visible?'Show password':'Hide password');
    });
    label.append(toggle);
  }
  function signupConfirmation(){
    const pass=$('password'),form=$('auth-form');
    if(!pass||!form||$('zu-confirm-password'))return;
    const label=document.createElement('label');
    label.className='field zu-password-confirm hidden';
    label.textContent='Confirm password';
    const input=document.createElement('input');
    input.type='password';
    input.id='zu-confirm-password';
    input.autocomplete='new-password';input.minLength=8;
    input.placeholder='Enter your password again';
    label.append(input);
    pass.closest('label')?.after(label);
    form.addEventListener('submit',event=>{
      if(!$('name-field')?.classList.contains('hidden')){
        const p=pass.value,confirm=$('zu-confirm-password').value;
        if(p!==confirm){
          event.preventDefault();event.stopImmediatePropagation();
          const message=$('auth-message');
          if(message){message.textContent='Passwords do not match. Re-enter the password.';message.classList.add('error');}
          $('zu-confirm-password').focus();
        }
      }
    },true);
  }
  function refreshMode(){
    const screen=$('auth-screen');
    const creating=!$('name-field')?.classList.contains('hidden');
    if(screen)screen.dataset.zuAuthMode=creating?'signup':'signin';
    const confirmation=$('zu-confirm-password')?.closest('label');
    if(confirmation){
      confirmation.classList.toggle('hidden',!creating);
      $('zu-confirm-password').required=creating;
    }
    const pass=$('password');
    if(pass){
      pass.autocomplete=creating?'new-password':'current-password';
      if(!creating){pass.type='password';const toggle=$('zu-toggle-password');if(toggle)toggle.textContent='Show';}
    }
    syncAccountAvatar();
  }
  function mountAccountWatchers(){
    const title=$('auth-title'),picker=$('zu-account-tiles');
    if(title)new MutationObserver(refreshMode).observe(title,{childList:true});
    if(picker)new MutationObserver(syncAccountAvatar).observe(picker,{childList:true,attributes:true,subtree:true,attributeFilter:['class']});
    $('email')?.addEventListener('input',syncAccountAvatar);
    $('display-name')?.addEventListener('input',syncAccountAvatar);
    $('auth-screen')?.addEventListener('click',event=>{
      if(event.target.closest('[data-email],#zu-other-account,#switch-mode'))setTimeout(()=>{refreshMode();syncAccountAvatar();},0);
    });
  }
  function initializeDesktop(){
    const desktop=$('desktop');
    if(!desktop)return;
    desktop.dataset.zuShortcuts=safeStore('zuzu:show-desktop-icons',false)?'visible':'hidden';
    const stage=$('zu-stage');
    if(stage&&!stage.querySelector('.zu-reference-motif')){
      const motif=document.createElement('div');motif.className='zu-reference-motif';
      motif.setAttribute('aria-hidden','true');
      const graphic=document.createElement('img');graphic.alt='';
      graphic.src='/assets/graphics/helix-z.svg';
      motif.append(graphic);
      stage.prepend(motif);
    }
    // Show an actual version number, never a frame-rate counter.
    const version=$('zu-version');
    if(version){version.textContent='v0.3.5a';version.title='ZuzuOS 0.3.5 alpha';}
  }
  function accountOptions(){
    const place=$('zu-personalize-options');
    if(!place||$('zu-shortcut-setting'))return;
    const holder=document.createElement('div');
    holder.className='setting-row';holder.id='zu-shortcut-setting';
    const words=document.createElement('div');
    const title=document.createElement('strong');title.textContent='Desktop app shortcuts';
    const explanation=document.createElement('p');explanation.textContent='Show desktop icons, or keep the clean Cine-style wallpaper view.';
    words.append(title,explanation);
    const select=document.createElement('select');select.setAttribute('aria-label','Show desktop icons');
    for(const [value,label] of [['hidden','Off (Cine desktop)'],['visible','On (Windows desktop)']]){
      const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
    }
    select.value=safeStore('zuzu:show-desktop-icons',false)?'visible':'hidden';
    select.addEventListener('change',()=>{
      const visible=select.value==='visible';
      localStorage.setItem('zuzu:show-desktop-icons',JSON.stringify(visible));
      $('desktop').dataset.zuShortcuts=visible?'visible':'hidden';
    });
    const label=document.createElement('label');label.append(select);
    holder.append(words,label);
    place.append(holder);
  }
  function repairRecent(){
    // Verify buttons have a launcher to open; avoid dead-click shortcuts.
    const button=$('zu-resume');
    if(button&&!button.dataset.zuLaunch)button.dataset.zuLaunch='browser';
  }
  function boot(){
    if(initiated)return;
    initiated=true;
    mountClock();decoratePassword();signupConfirmation();refreshMode();mountAccountWatchers();
    initializeDesktop();repairRecent();
    const appWindow=$('app-window');
    if(appWindow)new MutationObserver(accountOptions).observe(appWindow,{childList:true,subtree:true});
    accountOptions();
    document.addEventListener('zuzu:wallpaper-changed',initializeDesktop);
    window.ZuzuRelease={version:'0.3.5a'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();