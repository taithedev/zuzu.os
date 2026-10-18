import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, extname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const pathOf = path => join(root, path.replace(/^\//, ''));
const html = readFileSync(pathOf('index.html'),'utf8');
const manifest = JSON.parse(readFileSync(pathOf('assets/backgrounds/manifest.json'),'utf8'));
const errors = [];
const scripts = [];

function check(condition,message) {
  try { assert.ok(condition,message); } catch (err) { errors.push(err.message); }
}
function scan(dir) {
  if (!existsSync(dir)) { errors.push('Missing directory: ' + relative(root,dir)); return; }
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    const full = join(dir,item.name);
    if (item.isDirectory()) scan(full);
    if (item.isFile() && extname(item.name) === '.js') scripts.push(full);
  }
}
for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) continue;
  check(existsSync(pathOf(value.split(/[?#]/)[0])),'Missing HTML asset: ' + value);
}
for (const id of ['desktop','auth-screen','reset-password-screen','setup-screen','app-window','os-start-button']) {
  if (id === 'os-start-button') continue; // injected by the shell module
  check(html.includes('id="' + id + '"'),'Missing app element: ' + id);
}
check(!html.includes('\\n  <link') && !html.includes('\\n  <script'),'Literal newline escapes found in HTML head');
check(Array.isArray(manifest.backgrounds) && manifest.backgrounds.length > 0,'Wallpaper manifest is empty');
const found = new Set();
for (const item of manifest.backgrounds || []) {
  check(/^[a-z0-9-]+$/.test(item.id || ''),'Invalid wallpaper ID: ' + item.id);
  check(!found.has(item.id),'Duplicate wallpaper ID: ' + item.id);
  found.add(item.id);
  check(['motion','photo','video'].includes(item.type),'Invalid wallpaper type: ' + item.type);
  if (item.type === 'video' || item.type === 'photo') {
    check(typeof item.source === 'string' && item.source.startsWith('/assets/backgrounds/'),'Invalid media path for ' + item.id);
    if (item.source) check(existsSync(pathOf(item.source)),'Missing wallpaper media: ' + item.source);
    if (item.poster) check(existsSync(pathOf(item.poster)),'Missing wallpaper poster: ' + item.poster);
  }
}
check(found.has(manifest.default),'Default wallpaper does not exist in manifest');

check(html.includes('/src/styles/experience/release-v035a.css'),'Missing current desktop stylesheet');
check(html.includes('/src/scripts/experience/release-v035a.js'),'Missing current desktop controller');
check(html.includes('id="auth-form"'),'Missing sign-in form');
check(html.includes('id="os-start-button"') || html.includes('src/scripts/core/os-shell.js'),'Start launcher is unavailable');
const shell=readFileSync(pathOf('src/scripts/experience/studio-shell.js'),'utf8');
check(shell.includes("v0.3.5a"),'Version label missing');
check(!shell.includes("requestAnimationFrame(frame)") && !shell.includes("zu-fps"),'Obsolete FPS sampler was reintroduced');

const authCore=readFileSync(pathOf('src/scripts/core/app.js'),'utf8');
const accountUI=readFileSync(pathOf('src/scripts/experience/account-desktop.js'),'utf8');
const taskbarUI=readFileSync(pathOf('src/scripts/experience/taskbar-manager.js'),'utf8');
const taskbarCSS=readFileSync(pathOf('src/styles/experience/taskbar-no-overlap.css'),'utf8');
check(authCore.includes('persistSession: false'),'ZuzuOS must request a password on each new visit');
check(authCore.includes('passwordEnteredThisVisit'),'Email confirmation must not silently unlock the desktop');
check(authCore.includes('zuzuos_pin_required'),'Signup must preserve optional PIN intent');
check(accountUI.includes("Find an account on this device"),'Account chooser search missing');
check(accountUI.includes("auth-form')?.classList.add('hidden')"),'Account selection must happen before password entry');
check(accountUI.includes("value=\"none\"") && accountUI.includes("value=\"pin\""),'Signup PIN/No PIN choice missing');
check(accountUI.includes('{4,6}'),'PIN inputs must support 4–6 digits');
check(taskbarUI.includes('scrollIntoView'),'Taskbar keyboard navigation is missing');
check(taskbarCSS.includes('overflow-x:auto!important'),'Taskbar icons must not overlap in narrow screens');
check(html.includes('taskbar-manager.js') && html.includes('taskbar-no-overlap.css'),'Taskbar controller/styles are not loaded');

const iconManifest=JSON.parse(readFileSync(pathOf('assets/icons/icon-manifest.json'),'utf8'));
check(iconManifest.version === 1,'Unknown ZuzuOS icon manifest version');
for (const category of ['apps','windows']) {
  check(iconManifest[category] && typeof iconManifest[category]==='object','Invalid icon manifest section: '+category);
  for (const [name,src] of Object.entries(iconManifest[category]||{})) {
    check(/^[a-z0-9_-]+$/.test(name),'Unsafe registered icon name');
    check(typeof src==='string' && /^\/assets\/icons\/[a-zA-Z0-9_%./-]+\.png$/.test(src) && !src.includes('..'),'Unsafe icon path: '+src);
    if (typeof src==='string' && src.startsWith('/assets/icons/')) {
      check(existsSync(pathOf(decodeURIComponent(src))),'Registered icon file is missing: '+src);
    }
  }
}

scan(pathOf('src/scripts'));
for (const file of scripts) {
  const result = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if (result.status !== 0) errors.push('JavaScript syntax error: ' + relative(root,file) + '\n' + result.stderr);
}
for (const file of ['assets/icons/icon-manifest.json','src/scripts/experience/release-v035a.js','src/scripts/experience/taskbar-manager.js','src/styles/experience/release-v035a.css','src/styles/experience/taskbar-no-overlap.css','src/scripts/experience/arcade.js','src/styles/experience/arcade.css','src/styles/experience/finishing.css','src/styles/experience/studio.css','src/styles/experience/wallpapers.css','src/styles/experience/controls.css','assets/icons/ui.svg','assets/graphics/helix-z.svg','vercel.json']) {
  check(existsSync(pathOf(file)),'Missing required asset: ' + file);
}
if (errors.length) {
  console.error(errors.map(e => 'FAIL ' + e).join('\n'));
  process.exitCode = 1;
} else {
  console.log('ZuzuOS checks passed: ' + scripts.length + ' scripts, ' + manifest.backgrounds.length + ' wallpapers, HTML assets present.');
}
