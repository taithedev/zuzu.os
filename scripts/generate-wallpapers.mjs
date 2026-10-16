#!/usr/bin/env node
// Run after adding files in assets/backgrounds/photos and videos.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {extname,join,basename} from 'node:path';
const root='assets/backgrounds';
const path=join(root,'manifest.json');
const old=JSON.parse(readFileSync(path,'utf8'));
const extensions={photo:new Set(['.png','.jpeg','.jpg','.webp','.gif','.svg']),video:new Set(['.mov','.mp4','.webm'])};
const items=[];
for(const [type,folder] of [['photo','photos'],['video','videos']]){
 for(const file of readdirSync(join(root,folder)).sort((a,b)=>a.localeCompare(b))){
  if(!extensions[type].has(extname(file).toLowerCase()))continue;
  const filename=basename(file,extname(file));
  const id='github-'+type+'-'+filename.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45);
  const source='/'+['assets','backgrounds',folder,file].map(encodeURIComponent).join('/');
  items.push({id,name:filename.replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().slice(0,64)||'Wallpaper',type,category:type,source});
 }
}
const core=old.backgrounds.filter(x=>!x.id?.startsWith('github-') && !x.id?.startsWith('file-'));
const sources=new Set(core.map(x=>x.source).filter(Boolean));
const ids=new Set(core.map(x=>x.id));
for(const item of items){
 if(sources.has(item.source))continue;
 let id=item.id,increment=2;
 while(ids.has(id))id=item.id+'-'+increment++;
 item.id=id;ids.add(id);core.push(item);
}
old.backgrounds=core;
delete old.generated_at;
writeFileSync(path,JSON.stringify(old,null,2)+'\n');
console.log('Wallpaper manifest: '+old.backgrounds.length+' total, '+items.length+' files discovered.');
