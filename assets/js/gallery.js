/* Local-first portfolio: verified Instagram media is displayed from this repository,
 * never in unreliable Instagram iframes. The original post always remains one tap away.
 */
(()=>{
  'use strict';
  const gallery=document.querySelector('#ib-native-gallery');
  if(!gallery)return;
  const featured=document.querySelector('#ib-soft-video');
  const items=[
    {stem:'parting',type:'reel',id:'DBBnjADxbx4',title:'The art of precise parting',tag:'Behind the chair',description:'The foundation of beautifully finished braids.'},
    {stem:'boho',type:'reel',id:'DIVOZl2OKeE',title:'Boho knotless braids',tag:'Signature braids',description:'Lightweight boho knots, curls and effortless movement.'},
    {stem:'hair-store',type:'reel',id:'DMty3PQOV2U',title:'Premium hair collection',tag:'Hair & beauty',description:'Find beautiful textures for your next signature style.'},
    {stem:'braid-work',type:'reel',id:'C5tbVbHh2SH',title:'Beautiful boho styling',tag:'The braid edit',description:'A close-up of the artistry behind the look.'},
    {stem:'boho-box',type:'post',id:'DPY-NR1DrK7',title:'Boho braid inspiration',tag:'Fresh finishes',description:'Distinctive boho styling from Shana’s own page.'},
    {stem:'braid-finish',type:'post',id:'DLurVy7KGBH',title:'Soft boho hair',tag:'Style inspiration',description:'Natural movement, careful finishing and detail.'}
  ];
  const base='./assets/instagram/';
  const byName=new Map(items.map(item=>[item.stem,item]));
  const linkFor=item=>'https://www.instagram.com/'+item.type+'/'+item.id+'/';
  function node(tag,attrs={},children=[]){
    const el=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs)){
      if(key==='class')el.className=value;
      else if(key==='text')el.textContent=value;
      else el.setAttribute(key,value);
    }
    for(const child of children)el.append(child);
    return el;
  }
  function createCard(item,manifest){
    const card=node('article',{class:'ib-native-card'});
    const body=node('div',{class:'ib-native-body'});
    const eyebrow=node('p',{class:'ib-native-kicker',text:item.tag});
    const heading=node('h3',{text:item.title});
    const desc=node('p',{text:item.description});
    const open=node('a',{class:'ib-native-visit',href:linkFor(item),target:'_blank',rel:'noopener noreferrer',text:'View original on Instagram ↗'});
    body.append(eyebrow,heading,desc,open);
    const photoReady=Boolean(manifest && manifest.photo);
    if(photoReady){
      const image=node('img',{src:base+item.stem+'.webp',alt:item.title+' — Island Braids & Beauty',loading:'lazy',decoding:'async'});
      const imageLink=node('a',{class:'ib-native-media',href:linkFor(item),target:'_blank',rel:'noopener noreferrer','aria-label':'View '+item.title+' on Instagram'},[image]);
      image.onerror=()=>{
        imageLink.replaceChildren(node('span',{class:'ib-native-error',text:'See this look on Instagram ↗'}));
        imageLink.classList.add('ib-native-no-photo');
      };
      if(manifest.video){
        const video=node('video',{
          controls:'',playsinline:'',preload:'none',poster:base+item.stem+'.webp',
          'aria-label':'Play the Island Braids video: '+item.title
        },[node('source',{src:base+item.stem+'.mp4',type:'video/mp4'})]);
        video.addEventListener('error',()=>{video.replaceWith(imageLink)});
        const media=node('div',{class:'ib-native-media ib-native-video'},[video]);
        card.append(media);
      }else card.append(imageLink);
    }else{
      const photoLink=node('a',{class:'ib-native-media ib-native-no-photo',href:linkFor(item),target:'_blank',rel:'noopener noreferrer','aria-label':'Open '+item.title+' on Instagram'},[
        node('span',{class:'ib-native-ornament','aria-hidden':'true',text:'✳'}),
        node('span',{class:'ib-native-type',text:item.tag}),
        node('span',{class:'ib-native-error',text:'See Shana’s work on Instagram ↗'})
      ]);
      card.append(photoLink);
    }
    card.append(body);
    return card;
  }
  function installVideo(manifests){
    if(!featured)return;
    const item=items.find(x=>manifests.get(x.stem) && manifests.get(x.stem).video);
    if(!item)return;
    const source=node('source',{src:base+item.stem+'.mp4',type:'video/mp4'});
    const video=node('video',{autoplay:'',muted:'',loop:'',playsinline:'',preload:'none','aria-hidden':'true'},[source]);
    video.muted=true;
    if(manifests.get(item.stem).photo)video.poster=base+item.stem+'.webp';
    video.addEventListener('error',()=>featured.hidden=true);
    const layer=featured.querySelector('.ib-motion-background');
    if(!layer)return;
    layer.append(video);
    featured.hidden=false;
    if(typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.some(e=>e.isIntersecting);
      if(visible && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        video.play().catch(()=>{});
      }else video.pause();
    },{threshold:.15});
    observer.observe(featured);
  }
  function draw(records){
    const verified=new Map();
    for(const record of records){
      if(byName.has(record.name) && record.post===byName.get(record.name).id)verified.set(record.name,record);
    }
    const ready=items.filter(item=>verified.get(item.stem) && verified.get(item.stem).photo);
    // Only show actual first-party images, never blank or failed embed cards.
    if (ready.length) gallery.replaceChildren(...ready.map(item=>createCard(item,verified.get(item.stem))));
    installVideo(verified);
  }
  gallery.addEventListener('play',event=>{
    if(event.target.tagName==='VIDEO'){
      gallery.querySelectorAll('video').forEach(v=>{if(v!==event.target)v.pause()});
    }
  },true);
  fetch(base+'manifest.json',{cache:'no-store'})
    .then(resp=>resp.ok?resp.json():Promise.reject(new Error('No media manifest')))
    .then(list=>draw(Array.isArray(list)?list:[]))
    .catch(()=>draw([]));
})();