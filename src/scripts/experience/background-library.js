/* ZuzuOS Background Library
 * One controller for animated, still, and video wallpapers.
 * Manifest and media live under /assets/backgrounds/.
 */
(() => {
  'use strict';

  const STORAGE = 'zuzu:background:selected:v2';
  const MANIFEST_URL = '/assets/backgrounds/manifest.json';
  const defaultId = 'motion-signal';
  const defaultItems = [
    {id:'motion-signal',name:'Signal',type:'motion'},
    {id:'motion-tide',name:'Tide',type:'motion'},
    {id:'motion-ember',name:'Ember',type:'motion'},
    {id:'motion-void',name:'Void',type:'motion'},
    {id:'photo-obsidian',name:'Obsidian',type:'photo',source:'/assets/backgrounds/photos/obsidian.svg'},
    {id:'photo-aurora',name:'Aurora',type:'photo',source:'/assets/backgrounds/photos/aurora.svg'},
    {id:'photo-afterglow',name:'Afterglow',type:'photo',source:'/assets/backgrounds/photos/afterglow.svg'},
    {id:'photo-shore',name:'Silent Shore',type:'photo',source:'/assets/backgrounds/photos/silent-shore.svg'}
  ];

  const $ = id => document.getElementById(id);
  let backgrounds = defaultItems;
  let selectedId = defaultId;
  let host = null;
  let dialog = null;
  let lastFocus = null;
  let personal = [];
  let personalUrls = new Map();
  let wallpaperEpoch = 0;
  let refreshSequence = 0;
  const BUCKET='zuzuos_wallpapers';
  const maxUpload=50*1024*1024;
  const client=()=>window.zuzuOSAuth?.client||null;
  const canPlay = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function storageRead(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function storageWrite(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private browsing */ }
  }
  function allowedSource(value) {
    if (typeof value !== 'string') return false;
    return /^\/assets\/backgrounds\/(?:photos|videos|motion)\/[a-zA-Z0-9._/%()-]+$/.test(value)
      && !value.includes('..');
  }
  function isRecord(item) {
    return item && typeof item === 'object'
      && /^[a-z0-9][a-z0-9-]{1,63}$/.test(item.id || '')
      && typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 64
      && ['motion','photo','video'].includes(item.type)
      && (item.type === 'motion' || allowedSource(item.source));
  }
  async function readManifest() {
    try {
      const response = await fetch(MANIFEST_URL, {cache:'no-cache'});
      if (!response.ok) throw new Error('manifest response ' + response.status);
      const manifest = await response.json();
      if (!Array.isArray(manifest.backgrounds)) throw new Error('invalid manifest');
      const valid = manifest.backgrounds.filter(isRecord);
      if (!valid.some(item => item.id === defaultId)) throw new Error('missing default');
      backgrounds = valid;
    } catch (err) {
      console.warn('ZuzuOS background manifest unavailable; using built-in defaults.', err);
      backgrounds = defaultItems;
    }
    if (!backgrounds.some(item => item.id === selectedId) && !personal.some(item=>item.id===selectedId) && !selectedId.startsWith('my-')) selectedId = defaultId;
    renderOptions();
    if(!(selectedId.startsWith('my-') && !personal.some(item=>item.id===selectedId))) applySelected();
  }
  function restoreSelection() {
    const own = storageRead(STORAGE);
    if (own) return own;
    const previous = storageRead('zuzu.background');
    if (previous) {
      try {
        const bg = JSON.parse(previous);
        if (bg && bg.type === 'photo' && typeof bg.source === 'string') {
          const match = backgrounds.find(item => item.source && item.source.endsWith(bg.source.split('/').pop()));
          if (match) return match.id;
        }
      } catch { /* ignore prior malformed settings */ }
    }
    const prior = storageRead('zuzu:wallpaper');
    try {
      const oldName = JSON.parse(prior || 'null');
      const ids = {aurora:'photo-aurora',obsidian:'photo-obsidian',afterglow:'photo-afterglow','silent-shore':'photo-shore'};
      if (Object.hasOwn(ids, oldName)) return ids[oldName];
    } catch { /* no prior setting */ }
    return defaultId;
  }
  function ensureHost() {
    const desktop = $('desktop');
    if (!desktop) return null;
    if (host && host.isConnected) return host;
    host = document.createElement('div');
    host.id = 'zu-background';
    host.className = 'zu-background';
    host.setAttribute('aria-hidden','true');
    desktop.prepend(host);
    return host;
  }
  function clearMedia() {
    if (!host) return;
    host.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      video.load();
    });
    host.replaceChildren();
  }
  function addMotion() {
    ['zu-bg-gradients','zu-bg-rings','zu-bg-lines','zu-bg-grain'].forEach(className => {
      const element = document.createElement('div');
      element.className = className;
      host.appendChild(element);
    });
  }
  function addPhoto(item) {
    const image = document.createElement('img');
    image.className = 'zu-bg-media';
    image.alt = '';
    image.decoding = 'async';
    image.src = item.source;
    image.addEventListener('error', () => {
      console.warn('ZuzuOS photo wallpaper could not load:', item.id);
      select(defaultId);
    }, {once:true});
    host.appendChild(image);
  }
  function addVideo(item) {
    const video = document.createElement('video');
    video.className = 'zu-bg-media';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (allowedSource(item.poster)) video.poster = item.poster;
    const source = document.createElement('source');
    source.src = item.source;
    source.type = /\.webm$/i.test(item.source) ? 'video/webm' : /\.mov$/i.test(item.source) ? 'video/quicktime' : 'video/mp4';
    video.appendChild(source);
    host.appendChild(video);
    video.addEventListener('error', () => { showStatus('This video format cannot play in your browser. MP4 (H.264) is recommended.'); select(defaultId); }, {once:true});
    if (canPlay() && !document.hidden) {
      video.play().catch(() => { showStatus('Video could not autoplay. Try MP4 (H.264) for better compatibility.'); });
    }
  }
  function applySelected() {
    if (!ensureHost()) return;
    const item = [...backgrounds,...personal].find(bg => bg.id === selectedId) || backgrounds[0];
    if (!item) return;
    clearMedia();
    host.dataset.variant = item.id;
    host.dataset.type = item.type;
    if (item.type === 'photo') addPhoto(item);
    else if (item.type === 'video') addVideo(item);
    else addMotion();
    document.documentElement.dataset.zuWallpaper = item.id;
    storageWrite(STORAGE,item.id);
    syncSelectedUI();
    document.dispatchEvent(new CustomEvent('zuzu:wallpaper-changed',{detail:{id:item.id,type:item.type}}));
  }
  function select(id) {
    if (![...backgrounds,...personal].some(item => item.id === id)) return false;
    if (selectedId === id && host && host.childElementCount) return true;
    selectedId = id;
    wallpaperEpoch++;
    applySelected();
    return true;
  }
  function svg(id) {
    const el = document.createElementNS('http://www.w3.org/2000/svg','svg');
    el.classList.add('zu-icon');
    el.setAttribute('aria-hidden','true');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href','/assets/icons/ui.svg#' + id);
    el.appendChild(use);
    return el;
  }
  function makeButton(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zu-wallpaper-option';
    button.dataset.zuSelect = item.id;
    button.setAttribute('aria-pressed',String(selectedId === item.id));
    button.setAttribute('aria-label','Use ' + item.name + ' wallpaper');
    const preview = document.createElement('span');
    preview.className = 'zu-wallpaper-preview';
    preview.dataset.variant = item.id;
    preview.dataset.type = item.type;
    if (item.type === 'photo') preview.style.backgroundImage = 'url("' + item.source + '")';
    if (item.type === 'video' && item.poster && allowedSource(item.poster)) preview.style.backgroundImage = 'url("' + item.poster + '")';
    const meta = document.createElement('span');
    meta.className = 'zu-wallpaper-meta';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const state = document.createElement('span');
    state.className = 'zu-wallpaper-state';
    state.appendChild(svg('check'));
    meta.append(name,state);
    button.append(preview,meta);
    return button;
  }
  function renderOptions() {
    if (!dialog) return;
    const container = dialog.querySelector('#zu-wallpaper-groups');
    if (!container) return;
    container.replaceChildren();
    const groups = [
      {type:'motion',label:'Animated backgrounds'},
      {type:'photo',label:'Photo & illustrated wallpapers'},
      {type:'video',label:'Video backgrounds'}
    ];
    groups.forEach(group => {
      const items = [...backgrounds,...personal].filter(item => item.type === group.type);
      if (!items.length) return;
      const section = document.createElement('section');
      section.className = 'zu-wallpaper-group';
      const heading = document.createElement('div');
      heading.className = 'zu-wallpaper-group-title';
      const title = document.createElement('strong');
      title.textContent = group.label;
      const quantity = document.createElement('small');
      quantity.textContent = items.length + ' available';
      heading.append(title,quantity);
      const grid = document.createElement('div');
      grid.className = 'zu-wallpaper-grid';
      items.forEach(item => grid.appendChild(makeButton(item)));
      section.append(heading,grid);
      container.appendChild(section);
    });
    syncSelectedUI();
  }
  function syncSelectedUI() {
    if (!dialog) return;
    dialog.querySelectorAll('[data-zu-select]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.zuSelect === selectedId));
    });
    const selectedLabel = dialog.querySelector('#zu-wallpaper-current');
    const item = [...backgrounds,...personal].find(bg => bg.id === selectedId);
    if (selectedLabel) selectedLabel.textContent = item ? 'Current: ' + item.name : '';
  }
  function ensurePicker() {
    const desktop = $('desktop');
    if (!desktop || dialog) return;
    dialog = document.createElement('div');
    dialog.className = 'zu-wallpaper-dialog';
    dialog.id = 'zu-wallpaper-dialog';
    dialog.hidden = true;
    dialog.innerHTML =
      '<section class="zu-wallpaper-sheet" role="dialog" aria-modal="true" aria-labelledby="zu-wallpaper-title" tabindex="-1">' +
      '<header class="zu-wallpaper-head"><div><span class="zu-overline">APPEARANCE / BACKGROUNDS</span>' +
      '<h2 id="zu-wallpaper-title">Wallpaper library</h2><p>Choose a background. Your selection syncs with your account.</p></div>' +
      '<button class="zu-wallpaper-dismiss" type="button" data-zu-close aria-label="Close wallpaper library">×</button></header>' +
      '<div class="zu-wallpaper-body"><section class="zu-wallpaper-upload"><strong>My wallpapers</strong><p>Private to your account. PNG, JPG, JPEG, GIF, MP4, MOV and WebM up to 50 MB.</p><label class="zu-wallpaper-upload-btn">Upload wallpaper <input id="zu-wallpaper-file" type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,image/png,image/jpeg,image/gif,video/mp4,video/quicktime,video/webm" /></label><span id="zu-upload-status" role="status" aria-live="polite"></span></section><div id="zu-wallpaper-groups"></div></div>' +
      '<footer class="zu-wallpaper-foot"><span id="zu-wallpaper-current">Current: Signal</span><button type="button" data-zu-close>Done</button></footer></section>';
    desktop.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-zu-close]')) {
        close();
        return;
      }
      const option = event.target.closest('[data-zu-select]');
      if (option) select(option.dataset.zuSelect);
    });
    dialog.querySelector('#zu-wallpaper-file')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)await uploadPersonal(file);e.target.value='';});
    renderOptions();
  }
  function open() {
    ensurePicker();
    if (!dialog) return;
    lastFocus = document.activeElement;
    dialog.hidden = false;
    dialog.querySelector('.zu-wallpaper-sheet')?.focus();
    void refreshPersonal();
  }
  function close() {
    if (!dialog) return;
    dialog.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }
  function updateSettingsLink() {
    const selectNode = $('wallpaper-choice');
    if (!selectNode || !selectNode.isConnected) return;
    const section = selectNode.closest('.setting-row') || selectNode.parentElement;
    if (!section || section.querySelector('.zu-wallpaper-setting-link')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zu-wallpaper-setting-link';
    button.append(svg('image'), document.createTextNode('Open wallpaper library'));
    button.addEventListener('click',open);
    section.appendChild(button);
  }

  function showStatus(message) {
    const element=$('zu-upload-status');
    if(element)element.textContent=message;
  }
  function personalSource(item){
    const ext=item.name.split('.').pop().toLowerCase();
    return ['mov','mp4','webm'].includes(ext)?'video':'photo';
  }
  async function refreshPersonal(){
    const db=client();
    if(!db)return;
    const sequence=++refreshSequence;
    const {data:{user}}=await db.auth.getUser();
    if(sequence!==refreshSequence)return;
    if(!user){personal=[];personalUrls.clear();showStatus('Sign in to upload and see your own wallpapers.');renderOptions();return;}
    const {data,error}=await db.storage.from(BUCKET).list(user.id,{limit:100,sortBy:{column:'created_at',order:'desc'}});
    if(error){showStatus('Could not load uploads: '+error.message);return;}
    const items=[];
    for(const file of data||[]){
      if(!/\\.(png|jpe?g|gif|webp|mp4|mov|webm)$/i.test(file.name))continue;
      const path=user.id+'/'+file.name;
      const signed=await db.storage.from(BUCKET).createSignedUrl(path,3600);
      if(signed.error||!signed.data?.signedUrl)continue;
      const id='my-'+encodeURIComponent(file.name);
      const type=personalSource(file);
      items.push({id,name:file.name.replace(/\\.[^.]+$/,'').replace(/[_-]/g,' ').slice(0,64),type,source:signed.data.signedUrl,personal:true});
    }
    if(sequence!==refreshSequence)return;
    personal=items;
    renderOptions();
    const stored=storageRead(STORAGE);
    if(stored && personal.some(x=>x.id===stored) && selectedId!==stored){selectedId=stored;applySelected();}
    else if(personal.some(x=>x.id===selectedId))applySelected();
    showStatus(items.length+' personal wallpaper'+(items.length===1?'':'s')+' available.');
  }
  async function uploadPersonal(file){
    const db=client();
    if(!db){showStatus('Account service unavailable.');return;}
    const {data:{user}}=await db.auth.getUser();
    if(!user){showStatus('Sign in before uploading a wallpaper.');return;}
    const extension=file.name.split('.').pop().toLowerCase();
    const typeMap={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mov:'video/quicktime',mp4:'video/mp4',webm:'video/webm'};
    if(!Object.hasOwn(typeMap,extension)){showStatus('Unsupported file type.');return;}
    if(!file.size||file.size>maxUpload){showStatus('File must be under 50 MB.');return;}
    const name=crypto.randomUUID()+'.'+extension;
    showStatus('Uploading '+file.name+'…');
    const {error}=await db.storage.from(BUCKET).upload(user.id+'/'+name,file,{contentType:typeMap[extension],upsert:false});
    if(error){showStatus('Upload failed: '+error.message);return;}
    await refreshPersonal();
    const choice=personal.find(item=>item.id==='my-'+encodeURIComponent(name));
    if(choice){select(choice.id);showStatus('Uploaded. Your wallpaper is private to your account.');}
  }

  function init() {
    if (!$('desktop')) return;
    ensureHost();
    ensurePicker();
    selectedId = restoreSelection();
    if (!select(selectedId) && !selectedId.startsWith('my-')) select(defaultId);
    readManifest();
    void refreshPersonal();
    document.addEventListener('zuzu:cloud-wallpaper-restored',event=>{
      const id=event.detail?.id;
      if(typeof id!=='string')return;
      selectedId=id;
      if(!select(id))void refreshPersonal();
    });
    const db=client();
    db?.auth.onAuthStateChange(()=>setTimeout(()=>{refreshSequence++;personal=[];personalUrls.clear();renderOptions();void refreshPersonal()},0));
    const winBody = $('window-body');
    if (winBody) new MutationObserver(updateSettingsLink).observe(winBody,{childList:true,subtree:true});
    updateSettingsLink();
    document.addEventListener('change',event => {
      if (event.target && event.target.id === 'wallpaper-choice') {
        const ids = {none:defaultId,aurora:'photo-aurora',obsidian:'photo-obsidian',afterglow:'photo-afterglow','silent-shore':'photo-shore'};
        if (Object.hasOwn(ids,event.target.value)) select(ids[event.target.value]);
      }
    });
    document.addEventListener('keydown',event => {
      if (event.key === 'Escape' && dialog && !dialog.hidden) {
        event.stopPropagation();
        close();
      }
    },true);
    document.addEventListener('visibilitychange',() => {
      if (!host) return;
      host.querySelectorAll('video').forEach(video => {
        if (document.hidden || !canPlay()) video.pause();
        else video.play().catch(() => {});
      });
    });
  }
  window.ZuzuBackgrounds = {
    open,close,select,
    current:() => selectedId,
    list:() => [...backgrounds,...personal],
    setMotion:() => select(defaultId),
    setPhoto:source => {
      const match = [...backgrounds,...personal].find(item => item.type === 'photo' && item.source === source);
      return match ? select(match.id) : false;
    },
    setVideo:source => {
      const match = [...backgrounds,...personal].find(item => item.type === 'video' && item.source === source);
      return match ? select(match.id) : false;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();