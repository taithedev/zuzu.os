(() => {
'use strict';
const KEY='zuzu:os-vfs:v1';
const seed={'/':{type:'folder',name:'/'},'/Home':{type:'folder',name:'Home'},'/Home/Welcome.txt':{type:'file',name:'Welcome.txt',content:'Welcome to ZuzuOS.\n\nYour browser-based workspace. Create files, write notes, and customize your desktop.'},'/Documents':{type:'folder',name:'Documents'},'/Pictures':{type:'folder',name:'Pictures'},'/Downloads':{type:'folder',name:'Downloads'}};
let fs;try{fs=JSON.parse(localStorage.getItem(KEY)||'null')||seed}catch{fs=seed}
let cwd='/Home',z=100,seq=0;const opened=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apps=[['files','File Explorer','▧','Browse virtual files'],['editor','Text Editor','▤','Create and edit text'],['calc','Calculator','＋','Calculate expressions'],['system','System Monitor','◫','Browser and workspace info'],['studio','Workspace Studio','✦','Customize this device'],['notes','Notes','▤','Quick notes'],['settings','Settings','⚙','Account and appearance'],['browser','Web','◉','Open a website'],['cinehub','Cine Hub','▣','Discover what to watch'],['music','Music','♫','Play local audio'],['paint','Paint','✎','Sketch and export'],['terminal','Terminal','⌘','Safe command simulator'],['store','App Store','＋','Browse tools']];
function save(){try{localStorage.setItem(KEY,JSON.stringify(fs))}catch{toast('Virtual storage is full.')}}
function toast(t){const e=document.getElementById('toast');if(e){e.textContent=t;e.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hidden'),2400)}}
function el(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}

function restoreDesktopWallpaper(){
 const desktop=document.getElementById('desktop');
 let wallpaper='none';
 try{wallpaper=JSON.parse(localStorage.getItem('zuzu:wallpaper')||'"none"')}catch{}
 const custom=localStorage.getItem('zuzu:os-wallpaper');
 let image='';
 if(custom) image='url("'+custom+'")';
 else if(['silent-shore','aurora','obsidian','afterglow'].includes(wallpaper)) image='url("assets/wallpapers/'+wallpaper+'.svg")';
 if(image){
  const composed='linear-gradient(180deg,#07111b22 0%,#07111b05 40%,#03070d45 100%),'+image;
  document.body.style.backgroundImage=composed;
  document.body.style.backgroundSize='cover';
  document.body.style.backgroundAttachment='fixed';
  if(desktop){desktop.style.backgroundImage=composed;desktop.style.backgroundSize='cover';desktop.style.backgroundAttachment='fixed'}
 }else{
  document.body.style.backgroundImage='';
  document.body.style.backgroundSize='';
  document.body.style.backgroundAttachment='';
  if(desktop){desktop.style.backgroundImage='';desktop.style.backgroundSize='';desktop.style.backgroundAttachment=''}
 }
}

function init(){
 const desktop=document.getElementById('desktop'),bar=desktop?.querySelector('.taskbar');if(!desktop||!bar||document.getElementById('os-start-button'))return;
 const start=el('button','os-start-button','<span class="os-start-mark">z.</span><span class="os-start-label">Start</span>');start.id='os-start-button';bar.insertBefore(start,bar.firstChild);
 const menu=el('section','os-start-menu hidden','<div class="os-start-head"><div><span class="os-start-mark">z.</span><div><strong>ZuzuOS</strong><small>Arctic workspace</small></div></div><button id="os-start-close" aria-label="Close Start">×</button></div><label class="os-search"><span>⌕</span><input id="os-search-input" placeholder="Search apps…" autocomplete="off"></label><div class="os-start-section"><strong>All apps</strong><span>YOUR WORKSPACE</span></div><div class="os-launch-grid" id="os-launch-grid"></div><div class="os-start-bottom"><span><i></i> Browser session active</span><button id="os-signout">⏻ Sign out</button></div>');
 menu.id='os-start-menu';desktop.appendChild(menu);
 menu.querySelector('#os-launch-grid').innerHTML=apps.map(a=>'<button class="os-launch-item" data-os-launch="'+a[0]+'"><span>'+a[2]+'</span><span><strong>'+esc(a[1])+'</strong><small>'+esc(a[3])+'</small></span></button>').join('');
 const shortcuts=el('div','os-desktop-shortcuts',apps.slice(0,5).map(a=>'<button class="os-shortcut" data-os-launch="'+a[0]+'"><span>'+a[2]+'</span><small>'+esc(a[1])+'</small></button>').join(''));desktop.appendChild(shortcuts);
 const layer=el('div','os-window-layer');layer.id='os-window-layer';desktop.appendChild(layer);
 start.onclick=()=>menu.classList.toggle('hidden');menu.querySelector('#os-start-close').onclick=()=>menu.classList.add('hidden');
 menu.querySelector('#os-signout').onclick=()=>document.getElementById('sign-out')?.click();
 menu.querySelector('#os-search-input').oninput=e=>menu.querySelectorAll('[data-os-launch]').forEach(b=>b.classList.toggle('hidden',!b.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
 desktop.addEventListener('click',e=>{const b=e.target.closest('[data-os-launch]');if(b){menu.classList.add('hidden');launch(b.dataset.osLaunch)}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();menu.classList.remove('hidden');menu.querySelector('#os-search-input').focus()}if(e.key==='Escape')menu.classList.add('hidden')});
 const aw=document.getElementById('app-window'),head=aw?.querySelector('.window-bar');
 if(aw&&head){head.addEventListener('pointerdown',e=>{if(e.target.closest('button')||aw.classList.contains('os-maximized'))return;const r=aw.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;const move=v=>{aw.style.left=Math.max(0,r.left+v.clientX-sx)+'px';aw.style.top=Math.max(65,r.top+v.clientY-sy)+'px';aw.style.transform='none'};const up=()=>{head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',up)};head.addEventListener('pointermove',move);head.addEventListener('pointerup',up,{once:true})})}
 document.getElementById('close-window')?.insertAdjacentHTML('beforebegin','<button class="window-control" id="os-existing-min" title="Minimize">−</button><button class="window-control" id="os-existing-max" title="Maximize">□</button>');
 document.getElementById('os-existing-min')?.addEventListener('click',()=>aw.classList.add('hidden'));
 document.getElementById('os-existing-max')?.addEventListener('click',()=>aw.classList.toggle('os-maximized'));
 restoreDesktopWallpaper();
 const greeting=localStorage.getItem('zuzu:os-welcome');if(greeting){const p=document.querySelector('.welcome-row .muted');if(p)p.textContent=greeting}
}
function launch(id){
 const existing=['notes','settings','browser','cinehub','music','paint','terminal','ciri','store'];
 if(existing.includes(id)){const b=document.querySelector('[data-app="'+id+'"]');if(b){b.click();const w=document.getElementById('app-window');w.classList.remove('hidden');w.style.zIndex=String(++z)}return}
 const titles={files:'File Explorer',editor:'Text Editor',calc:'Calculator',system:'System Monitor',studio:'Workspace Studio'};
 if(opened.has(id)){const w=opened.get(id);w.classList.remove('os-minimized');w.style.zIndex=String(++z);return}
 let content='';
 if(id==='files')content='<div class="os-toolbar"><button data-up>↑ Up</button><button data-new-file>＋ New file</button><button data-new-folder>＋ New folder</button></div><div class="os-path" id="os-path"></div><div id="os-file-list"></div><p class="os-hint">These files stay in this browser on this device. They are separate from your private Supabase uploads.</p>';
 if(id==='editor')content='<div class="os-toolbar"><label>Filename <input id="ed-name" value="Untitled.txt"></label><button id="ed-save">Save file</button><button id="ed-new">New</button></div><textarea id="ed-content" class="os-editor" placeholder="Start writing…"></textarea><p id="ed-status" class="os-hint">Browser-local storage</p>';
 if(id==='calc')content='<div class="os-calc"><output id="calc-display">0</output><div class="os-calc-grid">'+['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','＋','±','0','.','='].map(k=>'<button data-calc="'+k+'">'+k+'</button>').join('')+'</div></div>';
 if(id==='system')content='<div class="os-system-grid"><div><small>ENVIRONMENT</small><strong>Browser desktop</strong><span>ZuzuOS web shell</span></div><div><small>DISPLAY</small><strong id="sys-screen"></strong><span>Viewport</span></div><div><small>STORAGE</small><strong id="sys-size"></strong><span>Virtual file system</span></div><div><small>PLATFORM</small><strong id="sys-platform"></strong><span>Browser-reported platform</span></div><div><small>FILES</small><strong id="sys-count"></strong><span>Virtual files and folders</span></div></div><p class="os-hint">This is a browser desktop simulation, not a replacement for your computer’s underlying operating system.</p>';
 if(id==='studio')content='<div class="os-owner-banner"><span>✦</span><div><strong>Workspace Studio</strong><p>Personalize your ZuzuOS environment on this device.</p></div></div><label class="os-owner-field">Desktop label<input id="studio-label" maxlength="36" value="'+esc(localStorage.getItem('zuzu:os-label')||'ZuzuOS')+'"></label><label class="os-owner-field">Welcome message<input id="studio-welcome" maxlength="100" value="'+esc(localStorage.getItem('zuzu:os-welcome')||'Your space. Your pace.')+'"></label><label class="os-owner-field">Wallpaper image<input id="studio-wallpaper" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="os-toolbar"><button id="studio-save">Save workspace</button><button id="studio-clear">Clear wallpaper</button><button id="studio-export">Export virtual files</button><label class="os-import">Import backup<input id="studio-import" type="file" accept=".json,application/json" hidden></label></div><p class="os-hint">These are local customization controls, not privileged platform administration. True owner permissions need server-side role checks.</p>';
 const win=el('section','os-window');win.dataset.osApp=id;win.style.zIndex=String(++z);win.style.left='calc(50% - 280px)';win.style.top='calc(50% - 235px)';
 win.innerHTML='<header class="os-window-bar"><div class="os-window-title"><span>'+(apps.find(a=>a[0]===id)?.[2]||'◫')+'</span><strong>'+titles[id]+'</strong></div><div class="os-window-controls"><button data-min title="Minimize">−</button><button data-max title="Maximize">□</button><button data-close title="Close">×</button></div></header><div class="os-window-content">'+content+'</div><div class="os-resize-grip"></div>';
 document.getElementById('os-window-layer').appendChild(win);opened.set(id,win);
 win.addEventListener('pointerdown',()=>win.style.zIndex=String(++z));
 win.querySelector('[data-close]').onclick=()=>{win.remove();opened.delete(id)};
 win.querySelector('[data-min]').onclick=()=>win.classList.add('os-minimized');
 win.querySelector('[data-max]').onclick=()=>win.classList.toggle('os-maximized');
 const head=win.querySelector('.os-window-bar');
 head.addEventListener('pointerdown',e=>{if(e.target.closest('button')||win.classList.contains('os-maximized'))return;const r=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;const move=v=>{win.style.left=Math.max(0,Math.min(innerWidth-r.width,r.left+v.clientX-sx))+'px';win.style.top=Math.max(65,Math.min(innerHeight-r.height-60,r.top+v.clientY-sy))+'px';win.style.transform='none'};const up=()=>{head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',up)};head.addEventListener('pointermove',move);head.addEventListener('pointerup',up,{once:true})});
 const grip=win.querySelector('.os-resize-grip');grip.addEventListener('pointerdown',e=>{e.preventDefault();const r=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;const move=v=>{win.style.width=Math.max(320,r.width+v.clientX-sx)+'px';win.style.height=Math.max(260,r.height+v.clientY-sy)+'px'};const up=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up)};grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up,{once:true});});
 if(id==='files')wireFiles(win);if(id==='editor')wireEditor(win);if(id==='calc')wireCalc(win);if(id==='system')fillSystem(win);if(id==='studio')wireStudio(win);
}
function pathJoin(base,name){return (base==='/'?'':base)+'/'+name.replace(/[\\/]/g,'').trim()}
function wireFiles(win){
 const refresh=()=>{win.querySelector('#os-path').textContent=cwd;const list=win.querySelector('#os-file-list');list.innerHTML='';const items=Object.entries(fs).filter(([p,v])=>p!=='/'&&p.slice(0,p.lastIndexOf('/'))===(cwd==='/'?'':cwd)).sort((a,b)=>(a[1].type===b[1].type?0:a[1].type==='folder'?-1:1)||a[1].name.localeCompare(b[1].name));if(!items.length)list.innerHTML='<p class="os-hint">This folder is empty.</p>';items.forEach(([p,v])=>{const row=el('div','os-file-row','<span>'+(v.type==='folder'?'▰':'▤')+'</span><button class="os-file-name">'+esc(v.name)+'</button><small>'+esc(v.type==='folder'?'Folder':String((v.content||'').length)+' chars')+'</small><button class="os-file-delete">×</button>');row.querySelector('.os-file-name').onclick=()=>{if(v.type==='folder'){cwd=p;refresh()}else{launch('editor');const ed=opened.get('editor');ed.querySelector('#ed-name').value=v.name;ed.querySelector('#ed-content').value=v.content||'';ed.dataset.path=p}};row.querySelector('.os-file-delete').onclick=()=>{if(!confirm('Delete '+v.name+'?'))return;delete fs[p];Object.keys(fs).filter(k=>k.startsWith(p+'/')).forEach(k=>delete fs[k]);save();refresh()};list.appendChild(row)})};
 win.querySelector('[data-up]').onclick=()=>{cwd=cwd==='/'?'/':cwd.slice(0,cwd.lastIndexOf('/'))||'/';refresh()};
 win.querySelector('[data-new-file]').onclick=()=>{const name=prompt('Name your text file','New document.txt');if(!name)return;const p=pathJoin(cwd,name);if(fs[p])return toast('That name is already used.');fs[p]={type:'file',name,content:''};save();refresh()};
 win.querySelector('[data-new-folder]').onclick=()=>{const name=prompt('Name your folder','New folder');if(!name)return;const p=pathJoin(cwd,name);if(fs[p])return toast('That name is already used.');fs[p]={type:'folder',name};save();refresh()};refresh()
}
function wireEditor(win){const name=win.querySelector('#ed-name'),text=win.querySelector('#ed-content'),status=win.querySelector('#ed-status');win.querySelector('#ed-save').onclick=()=>{const n=name.value.trim();if(!n)return toast('Enter a file name.');const p=win.dataset.path||pathJoin(cwd,n);if(win.dataset.path&&win.dataset.path!==p)delete fs[win.dataset.path];fs[p]={type:'file',name:n,content:text.value,updatedAt:new Date().toISOString()};win.dataset.path=p;save();status.textContent='Saved · '+new Date().toLocaleTimeString();toast('File saved.')};win.querySelector('#ed-new').onclick=()=>{delete win.dataset.path;name.value='Untitled.txt';text.value='';status.textContent='New document'};text.oninput=()=>status.textContent='Unsaved changes'}
function evaluateMath(input){const tokens=input.match(/\d*\.?\d+|[()+\-*/%]/g)||[];if(tokens.join('')!==input.replace(/\s+/g,''))throw Error('Invalid expression');let i=0;function factor(){const t=tokens[i++];if(t==='+')return factor();if(t==='-')return -factor();if(t==='('){const n=expr();if(tokens[i++]!==')')throw Error('Missing parenthesis');return n}if(t===undefined||!/^\d*\.?\d+$/.test(t))throw Error('Expected a number');let n=Number(t);if(tokens[i]==='%'){i++;n/=100}return n}function term(){let n=factor();while(['*','/'].includes(tokens[i])){const op=tokens[i++],r=factor();n=op==='*'?n*r:n/r}return n}function expr(){let n=term();while(['+','-'].includes(tokens[i])){const op=tokens[i++],r=term();n=op==='+'?n+r:n-r}return n}const result=expr();if(i!==tokens.length||!Number.isFinite(result))throw Error('Invalid result');return result}
function wireCalc(win){let expr='';const out=win.querySelector('#calc-display');win.querySelectorAll('[data-calc]').forEach(b=>b.onclick=()=>{const k=b.dataset.calc;if(k==='C')expr='';else if(k==='⌫')expr=expr.slice(0,-1);else if(k==='±')expr=expr.startsWith('-')?expr.slice(1):'-'+expr;else if(k==='='){try{const safe=expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/＋/g,'+');if(!safe.trim())throw Error();const n=evaluateMath(safe);expr=String(Number(n.toPrecision(12)))}catch{expr='';out.textContent='Error';return}}else expr+=({'%':'%','÷':'/','×':'*','−':'-','＋':'+'}[k]??k);out.textContent=expr||'0'})}
function fillSystem(win){win.querySelector('#sys-screen').textContent=innerWidth+' × '+innerHeight;win.querySelector('#sys-size').textContent=Math.round(new Blob([JSON.stringify(fs)]).size/1024)+' KB';win.querySelector('#sys-platform').textContent=navigator.userAgentData?.platform||navigator.platform||'Unknown';win.querySelector('#sys-count').textContent=Object.keys(fs).length-1}
function wireStudio(win){
 win.querySelector('#studio-save').onclick=()=>{localStorage.setItem('zuzu:os-label',win.querySelector('#studio-label').value.trim()||'ZuzuOS');localStorage.setItem('zuzu:os-welcome',win.querySelector('#studio-welcome').value.trim()||'Your space. Your pace.');const p=document.querySelector('.welcome-row .muted');if(p)p.textContent=localStorage.getItem('zuzu:os-welcome');const brand=document.querySelector('.top-brand');if(brand)brand.lastElementChild.innerHTML=esc(localStorage.getItem('zuzu:os-label'))+'<span class="brand-dim">.os</span>';toast('Workspace preferences saved.')};
 win.querySelector('#studio-wallpaper').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2*1024*1024)return toast('Choose an image under 2 MB.');if(!['image/png','image/jpeg','image/webp'].includes(f.type))return toast('Choose PNG, JPEG or WebP.');const r=new FileReader();r.onload=()=>{try{localStorage.setItem('zuzu:os-wallpaper',r.result);restoreDesktopWallpaper();toast('Wallpaper saved on this device.')}catch{toast('Could not store that image.')}};r.readAsDataURL(f)};
 win.querySelector('#studio-clear').onclick=()=>{localStorage.removeItem('zuzu:os-wallpaper');restoreDesktopWallpaper();toast('Custom wallpaper removed.')};
 win.querySelector('#studio-export').onclick=()=>download({format:'zuzu-os-virtual-files',version:1,fs},'zuzu-os-files.json');
 win.querySelector('#studio-import').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.format!=='zuzu-os-virtual-files'||!d.fs||typeof d.fs!=='object')throw Error('Invalid ZuzuOS backup.');if(!confirm('Replace current virtual files with this backup?'))return;fs=d.fs;save();toast('Backup imported. Close and reopen File Explorer.')}catch(err){toast(err.message||'Import failed.')}};
}
function download(data,name){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function boot(){init();if(document.readyState==='loading')return;const root=document.getElementById('desktop');if(!root)return;new MutationObserver(()=>{if(!root.classList.contains('hidden')){const b=document.getElementById('os-start-button');if(b)b.classList.add('os-ready')}}).observe(root,{attributes:true,attributeFilter:['class']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();