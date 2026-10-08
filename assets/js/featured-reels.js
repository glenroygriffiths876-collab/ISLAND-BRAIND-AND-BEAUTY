/* First-party Island Braids video showcase.
   Only renders downloadable public posts verified as @islandbraids.us.
   Never displays broken Instagram embeds or invented video thumbnails. */
(()=>{
'use strict';
const section=document.getElementById('ib-featured-reels');
const row=document.getElementById('ib-featured-reels-row');
if(!section || !row)return;
const base='./assets/instagram/';
const selected=[
  {name:'featured-dztpo',id:'DZtpoIIuAhH',title:'Boho Knotless · Hair Included'},
  {name:'featured-dyn5',id:'DYN5x57ubAK',title:'A Fresh Look from Shana'},
  {name:'featured-dxq',id:'DXqVCdCEhJ-',title:'The HD Lace Difference'},
  {name:'featured-dxar',id:'DXarAiYAagj',title:'Luxury Boho Knotless Braids'},
  {name:'featured-dwaa',id:'DWAaovIjksS',title:'Comfortable Knotless Styling'}
];
const known=new Map(selected.map((x,i)=>[x.name,{id:x.id,position:i}]));
const mk=(tag,classes,text)=>{
  const e=document.createElement(tag);
  if(classes)e.className=classes;
  if(text)e.textContent=text;
  return e;
};
function cardFor(record,i){
  const match=known.get(record.name);
  const title=match ? selected[match.position].title : 'More from Shana’s chair';
  const card=mk('article','ib-reel-feature');
  const frame=mk('div','ib-reel-feature-frame');
  const video=mk('video','ib-reel-player');
  video.controls=true;
  video.playsInline=true;
  video.preload='none';
  video.poster=base+record.name+'.webp';
  video.setAttribute('aria-label','Play '+title);
  const source=mk('source');
  source.src=base+record.name+'.mp4';
  source.type='video/mp4';
  video.append(source);
  const fallback=mk('a','ib-reel-video-fallback','Watch this Reel on Instagram ↗');
  fallback.href='https://www.instagram.com/reel/'+record.post+'/';
  fallback.target='_blank';
  fallback.rel='noopener noreferrer';
  fallback.hidden=true;
  video.addEventListener('error',()=>{
    video.hidden=true;
    video.style.display='none';
    fallback.hidden=false;
  });
  frame.append(video,fallback);
  const body=mk('div','ib-reel-feature-body');
  const label=mk('span','ib-reel-feature-kicker',match?'Shana’s Featured Reel':'From Shana’s Instagram');
  const heading=mk('h3','',title);
  const link=mk('a','ib-reel-original','Open original ↗');
  link.href='https://www.instagram.com/reel/'+record.post+'/';
  link.target='_blank';
  link.rel='noopener noreferrer';
  body.append(label,heading,link);
  card.append(frame,body);
  return card;
}
row.addEventListener('play',ev=>{
  if(ev.target.tagName!=='VIDEO')return;
  document.querySelectorAll('video').forEach(v=>{
    if(v!==ev.target&&!v.closest('.ib-motion-background'))v.pause();
  });
},true);
fetch(base+'manifest.json',{cache:'no-store'}).then(r=>{
  if(!r.ok)throw Error('No verified gallery manifest');
  return r.json();
}).then(records=>{
  if(!Array.isArray(records))return;
  const verified=records.filter(r=>r && r.video && r.photo && /^[a-z0-9-]+$/.test(r.name||'') && /^[A-Za-z0-9_-]+$/.test(r.post||''));
  const selectedAvailable=selected.map(item=>verified.find(r=>r.name===item.name && r.post===item.id)).filter(Boolean);
  const extras=verified.filter(r=>r.name.startsWith('discovered-') || r.name.startsWith('more-')).slice(0,5);
  const display=[...selectedAvailable,...extras];
  if(!display.length)return;  // Old verified gallery remains visible without new empty cards.
  const frag=document.createDocumentFragment();
  display.forEach((r,i)=>frag.appendChild(cardFor(r,i)));
  row.replaceChildren(frag);
  section.hidden=false;
  const hero=document.querySelector('#home .ib-mosaic-tile--video video');
  const heroPoster=document.querySelector('#home .ib-mosaic-tile--video img');
  const heroSlides=[document.querySelector('#home .ib-feature-frame--boho'),
                    document.querySelector('#home .ib-feature-frame--finish')];
  if(hero && selectedAvailable.length){
    const featured=selectedAvailable[0];
    const source=hero.querySelector('source');
    if(source){
      hero.pause();
      source.src=base+featured.name+'.mp4';
      hero.poster=base+featured.name+'.webp';
      if(heroPoster)heroPoster.src=base+featured.name+'.webp';
      hero.load();
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
         !document.getElementById('home').classList.contains('ib-collage-paused')){
        hero.play().catch(()=>{});
      }
    }
  }
  const newSlidePosters=selectedAvailable.slice(0,2).map(r=>base+r.name+'.webp');
  heroSlides.forEach((img,i)=>{
    if(img && newSlidePosters[i])img.src=newSlidePosters[i];
  });
  const counter=document.getElementById('ib-featured-reels-count');
  if(counter)counter.textContent=String(display.length)+' original Island Braids videos';
}).catch(()=>{
  // Connection failure must never damage the original working gallery.
});
})();