(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const icons = {
    games:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8a5 5 0 0 1 4.9 4l1 5a2.5 2.5 0 0 1-4.4 2L15 16H9l-2.5 3a2.5 2.5 0 0 1-4.4-2l1-5A5 5 0 0 1 8 8Z"/><path d="M7 10v5M4.5 12.5h5M16 12h.01M19 14h.01"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };
  let overlay, active = 'tiles', board = [], score=0, nextId=0;
  const bestKey='zuzu:games:best';
  function announce(text) { const el=$('zu-game-status'); if(el) el.textContent=text; }
  function best() { try { return JSON.parse(localStorage.getItem(bestKey)||'0') || 0; } catch { return 0; } }
  function saveBest(value) { try {localStorage.setItem(bestKey,JSON.stringify(value));}catch{} }
  function insertLaunchers() {
    const grid=$('os-launch-grid');
    if(grid && !grid.querySelector('[data-zuzu-games]')) {
      const btn=document.createElement('button');
      btn.className='os-launch-item';
      btn.type='button';
      btn.dataset.zuzuGames='1';
      btn.innerHTML='<span>▦</span><span><strong>Arcade</strong><small>Two offline games</small></span>';
      btn.addEventListener('click',open);
      grid.appendChild(btn);
    }
    const taskbar=document.querySelector('#desktop .taskbar');
    if(taskbar && !taskbar.querySelector('[data-zuzu-game-dock]')) {
      const btn=document.createElement('button');
      btn.className='task-app zu-arcade-dock';
      btn.type='button';
      btn.dataset.zuzuGameDock='1';
      btn.title='Arcade';
      btn.setAttribute('aria-label','Open Arcade');
      btn.innerHTML=icons.games;
      btn.addEventListener('click',open);
      taskbar.appendChild(btn);
    }
  }
  function makeOverlay(){
    if(overlay)return;
    overlay=document.createElement('div');
    overlay.className='zu-arcade-overlay';
    overlay.id='zu-arcade';
    overlay.hidden=true;
    overlay.innerHTML=`
      <section class="zu-arcade-window" role="dialog" aria-modal="true" aria-labelledby="zu-arcade-title">
        <header class="zu-arcade-head"><div class="zu-arcade-brand"><span class="zu-arcade-icon">▦</span><div><strong id="zu-arcade-title">Arcade</strong><small>LOCAL GAMES / NO DOWNLOADS</small></div></div><button type="button" class="zu-game-close" data-close-game aria-label="Close Arcade">×</button></header>
        <nav class="zu-arcade-tabs" aria-label="Choose game"><button data-play="tiles" aria-pressed="true">2048</button><button data-play="memory" aria-pressed="false">Memory</button></nav>
        <div class="zu-game-area" id="zu-game-area"></div>
        <div class="zu-game-footer"><span role="status" aria-live="polite" id="zu-game-status"></span><button data-new-game>New game</button></div>
      </section>`;
    $('desktop').appendChild(overlay);
    overlay.addEventListener('click',e=>{
      if(e.target===overlay||e.target.closest('[data-close-game]'))close();
      const tab=e.target.closest('[data-play]');
      if(tab)start(tab.dataset.play);
      if(e.target.closest('[data-new-game]'))start(active);
      const move=e.target.closest('[data-move]');
      if(move)moveTiles(move.dataset.move);
    });
    document.addEventListener('keydown',e=>{
      if(overlay?.hidden)return;
      if(e.key==='Escape'){close();return;}
      if(active!=='tiles')return;
      const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
      if(dirs[e.key]){e.preventDefault();moveTiles(dirs[e.key]);}
    });
  }
  function open(){makeOverlay();insertLaunchers();$('os-start-menu')?.classList.add('hidden');overlay.hidden=false;start(active);}
  function close(){if(overlay)overlay.hidden=true;}
  function start(which){
    active=which==='memory'?'memory':'tiles';
    overlay.querySelectorAll('[data-play]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.play===active)));
    if(active==='tiles')newTiles();else newMemory();
  }
  function spawn(){
    const empty=board.map((n,i)=>n?null:i).filter(n=>n!==null);
    if(!empty.length)return;
    const pos=empty[Math.floor(Math.random()*empty.length)];
    board[pos]=Math.random()<.9?2:4;
  }
  function newTiles(){board=Array(16).fill(0);score=0;spawn();spawn();renderTiles();}
  function renderTiles(){
    const area=$('zu-game-area');
    area.replaceChildren();
    const stats=document.createElement('div');stats.className='zu-tiles-stats';
    stats.innerHTML='<div><small>SCORE</small><strong>'+score+'</strong></div><div><small>BEST</small><strong>'+best()+'</strong></div>';
    const grid=document.createElement('div');grid.className='zu-tiles-grid';grid.setAttribute('aria-label','2048 game board');
    board.forEach(n=>{const cell=document.createElement('div');cell.className='zu-tile n'+n;cell.textContent=n||'';grid.appendChild(cell)});
    const hint=document.createElement('p');hint.className='zu-game-hint';hint.textContent='Use the arrow keys, or the controls below. Join matching numbers to reach 2048.';
    const pad=document.createElement('div');pad.className='zu-game-pad';
    for(const [label,dir] of [['↑','up'],['←','left'],['↓','down'],['→','right']]){const b=document.createElement('button');b.type='button';b.dataset.move=dir;b.textContent=label;b.setAttribute('aria-label','Move '+dir);pad.appendChild(b)}
    area.append(stats,grid,hint,pad);
    if(board.includes(2048))announce('2048 reached. You can keep playing.');
    else if(!board.some((n,i)=>!n||(i%4<3&&n===board[i+1])||(i<12&&n===board[i+4])))announce('No moves left. Start a new game.');
    else announce('2048 · Offline game');
  }
  function moveTiles(dir){
    if(active!=='tiles')return;
    const old=board.join(',');
    for(let line=0;line<4;line++){
      const indices=Array.from({length:4},(_,i)=>{
        if(dir==='left')return line*4+i;
        if(dir==='right')return line*4+3-i;
        if(dir==='up')return i*4+line;
        return (3-i)*4+line;
      });
      const nums=indices.map(i=>board[i]).filter(Boolean);
      const merged=[];
      for(let i=0;i<nums.length;i++){
        if(nums[i]===nums[i+1]){const n=nums[i]*2;merged.push(n);score+=n;i++;}else merged.push(nums[i]);
      }
      indices.forEach((i,j)=>board[i]=merged[j]||0);
    }
    if(board.join(',')!==old){spawn();if(score>best())saveBest(score);renderTiles();}
  }
  function newMemory(){
    const values=[0,1,2,3,4,5,6,7].flatMap(n=>[n,n]);
    for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
    const area=$('zu-game-area');
    area.replaceChildren();
    const info=document.createElement('p');info.className='zu-game-hint';info.textContent='Find all eight matching pairs.';
    const grid=document.createElement('div');grid.className='zu-memory-grid';
    const glyph=['◆','●','▲','■','✦','⬟','★','✚'];
    const cards=values.map((n,i)=>{
      const card=document.createElement('button');card.type='button';card.className='zu-memory-card';card.textContent='?';card.dataset.index=i;card.setAttribute('aria-label','Hidden card '+(i+1));grid.appendChild(card);return card;
    });
    let open=[],matched=new Set(),moves=0,locked=false,epoch=++nextId;
    grid.addEventListener('click',e=>{
      const card=e.target.closest('.zu-memory-card');if(!card||locked)return;
      const i=Number(card.dataset.index);
      if(open.includes(i)||matched.has(i))return;
      card.textContent=glyph[values[i]];card.classList.add('faceup');
      open.push(i);
      if(open.length===2){
        moves++;
        if(values[open[0]]===values[open[1]]){
          open.forEach(x=>{matched.add(x);cards[x].classList.add('matched')});
          open=[];
          announce(matched.size===16?'Complete in '+moves+' turns.':matched.size/2+' / 8 pairs · '+moves+' turns');
        }else{
          locked=true;const pair=open.slice();
          setTimeout(()=>{
            if(epoch!==nextId)return;
            pair.forEach(x=>{cards[x].textContent='?';cards[x].classList.remove('faceup')});
            open=[];locked=false;
          },650);
          announce(matched.size/2+' / 8 pairs · '+moves+' turns');
        }
      }
    });
    area.append(info,grid);
    announce('0 / 8 pairs · 0 turns');
  }
  window.ZuzuArcade = {open,close};
  function init(){insertLaunchers();makeOverlay();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();