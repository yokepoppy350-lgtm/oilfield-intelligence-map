(() => {
  'use strict';
  const main=document.querySelector('#main'),V=FieldViews,esc=CaseStore.esc;
  const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const storage={get(k,fallback){try{return JSON.parse(sessionStorage.getItem(k))??fallback;}catch{return fallback;}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch{}}};
  let motion=storage.get('field-motion',true),current=null,mapDOM=null,host=null,chartObserver=null,resizeObserver=null;
  let caseId=null,builtinError=false,loadingCase=true,navigating=false,introTimer=null,introLabelTimer=null;
  let camera={x:0,y:0,scale:1,zoomed:false},mapStage=null,drag=null;
  const views=storage.get('field-history',{}),caseState=new Map();
  if(storage.get('field-composition')!=='cinematic-2'){for(const v of Object.values(views))delete v.camera;storage.set('field-history',views);storage.set('field-composition','cinematic-2');}
  const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const animated=()=>motion&&!reducedQuery.matches&&!document.hidden;
  function parse(){
    const raw=location.hash.slice(1)||'/map',[pathname,search='']=raw.split('?');
    let p=pathname.split('/').filter(Boolean);if(!p.length||p[0]==='chain')p=['map'];
    const q=new URLSearchParams(search);
    if(['cases','method'].includes(p[0])){
      const legacy={低:'low',中:'medium',高:'high'},d=legacy[q.get('d')]||q.get('d');
      if(['low','medium','high'].includes(d))q.set('d',d);else q.delete('d');
      if(q.has('m')&&!ATLAS.methods[q.get('m')])q.delete('m');
      if(q.has('s')&&!FieldScene.anchors[q.get('s')])q.delete('s');
      if(q.get('runnable')!=='1')q.delete('runnable');
      if(q.has('q')){const text=q.get('q').trim();if(text)q.set('q',text);else q.delete('q');}
      for(const key of [...q.keys()])if(!q.get(key))q.delete(key);
      if(p[0]==='method')q.delete('m');
    }
    if(['case','scene'].includes(p[0])&&q.has('tab')&&!['background','workflow','demo'].includes(q.get('tab')))q.set('tab','background');
    return {p,q,hash:'#/'+p.join('/')+(q.size?'?'+q:'')};
  }

  function ensureEntry(){if(!history.state?.fieldId)history.replaceState({fieldId:uid(),fieldIndex:(current?.index??-1)+1,parent:current?.id||null},'',location.href);return history.state;}
  function stateForCase(){if(!caseId)return null;if(!caseState.has(caseId))caseState.set(caseId,{layer:'all',step:0,tab:'background',demo:null});return caseState.get(caseId);}
  function remember(){
    if(!current)return;
    views[current.id]={hash:current.hash,scroll:scrollY,camera:{...camera},focus:document.activeElement?.closest('a')?.getAttribute('href')||document.activeElement?.id||null,parent:current.parent,index:current.index};
    storage.set('field-history',views);
  }
  function backTo(kind){
    const sc=caseId?ATLAS.index.byScene[CaseStore.get(caseId)?.sceneId]:null;
    const target=kind==='map'?'#/map':'#/stage/'+(sc?.stageId||mapStage||'perforation');
    const saved=current?.parent&&views[current.parent];
    if(saved&&(saved.hash===target||kind==='stage'&&/^#\/(cases|method)\b/.test(saved.hash))){remember();history.go((saved.index??current.index-1)-current.index);}else navigate(target);
  }
  function toggleMotion(){motion=!motion;storage.set('field-motion',motion);syncMotion();}
  function syncMotion(){
    const reduced=reducedQuery.matches;
    document.body.classList.toggle('paused',!motion||document.hidden);
    document.body.classList.toggle('reduced',reduced);
    const b=mapDOM?.querySelector('#motion');
    if(b){b.textContent=reduced?'系统静态模式':motion?'暂停动效':'播放动效';b.setAttribute('aria-pressed',String(!motion||reduced));b.disabled=reduced;}
    const globalButton=document.querySelector('#motion-global');
    globalButton.textContent=motion&&!reduced?'动态：开':'动态：关';globalButton.setAttribute('aria-checked',String(motion&&!reduced));globalButton.disabled=reduced;
    globalButton.setAttribute('aria-label',reduced?'系统已设置减少动态效果':'动态效果');
    document.querySelector('.case-frame')?.contentWindow?.postMessage({type:'field-motion',enabled:stateForCase()?.tab==='demo'&&animated()},'*');
    if(!animated())finishIntro();
  }

  function finishIntro(){clearTimeout(introTimer);clearInterval(introLabelTimer);document.body.classList.remove('intro');mapDOM?.querySelector('.intro-skip')?.remove();mapDOM?.querySelector('.intro-label')?.remove();}
  function playIntro(){
    finishIntro();if(!animated()||!mapDOM?.isConnected)return;
    storage.set('field-intro-seen',true);
    const area=mapDOM.querySelector('.scene-viewport'),skip=document.createElement('button'),label=document.createElement('span');
    skip.className='intro-skip';skip.textContent='跳过';skip.onclick=finishIntro;label.className='intro-label';label.setAttribute('aria-live','polite');label.textContent='地震扫描';area.append(skip,label);
    document.body.classList.add('intro');let started=performance.now();
    introLabelTimer=setInterval(()=>{const t=performance.now()-started;label.textContent=t<450?'地震扫描':t<950?'地层显现':t<1550?'井筒连接':'射孔连通';},100);
    introTimer=setTimeout(finishIntro,2000);
  }
  function availableWidth(){return mapDOM.querySelector('.scene-viewport').clientWidth;}
  function defaultCamera(){
    if(window.AtlasScene?.init)return {...camera};
    const area=mapDOM.querySelector('.scene-viewport'),w=area.clientWidth,h=area.clientHeight;
    if(!camera.zoomed){const mobile=innerWidth<=760,scale=mobile?Math.min(.9,w/440):Math.max(.9,Math.min(1.2,w/1300));return {x:Math.round(w*(mobile?.4:.6)-780*scale),y:Math.round(h*(mobile?.2:.15)),scale,zoomed:false};}
    const a=FieldScene.atlasAnchors[mapStage||'perforation'],scale=innerWidth<=760?1.5:(mapStage==='perforation'?2.2:1.5);
    return {x:Math.round(w*(innerWidth<=760?.46:.44)-a.x*scale),y:Math.round(h*(innerWidth<=760?.72:.52)-a.y*scale),scale,zoomed:camera.zoomed};
  }
  function applyCamera(animate=true){
    if(!mapDOM?.isConnected)return;
    if(window.AtlasScene?.init)return;
    const art=mapDOM.querySelector('.scene-art'),area=mapDOM.querySelector('.scene-viewport');
    art.style.transition=animate&&animated()?'':'none';art.style.transform=`translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    mapDOM.querySelectorAll('.map-node').forEach((n,i)=>{const a=FieldScene.atlasPositions[i],x=camera.x+a[0]*camera.scale,y=camera.y+a[1]*camera.scale;n.style.transition=animate&&animated()?'':'none';n.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;n.hidden=x<24||x>area.clientWidth-24||y<80||y>area.clientHeight-24||!!mapStage&&n.dataset.stage!==mapStage;});
    for(const [node,left,right]of [[art.querySelector('.pump'),928,1044],[art.querySelector('.pipes'),788,1272],[art.querySelector('.flow-field'),668,892]])node?.classList.toggle('motion-sleep',camera.x+right*camera.scale<0||camera.x+left*camera.scale>availableWidth());
    mapDOM.querySelector('#zoom-map').textContent=camera.zoomed?'显示全图':mapStage?'聚焦井段':'局部放大';
  }
  function hoverStage(stage){
    if(!mapDOM)return;
    const active=stage&&!mapStage?stage:null;
    mapDOM.classList.toggle('has-hover',!!active);
    mapDOM.dataset.hover=active||'';
    mapDOM.querySelectorAll('.map-node').forEach(n=>n.classList.toggle('is-hovered',n.dataset.stage===active));
    mapDOM.querySelectorAll('.atlas-piece').forEach(n=>n.classList.toggle('is-region-active',!!active&&n.dataset.stages.split(' ').includes(active)));
  }
  function buildMap(){
    const wrapper=document.createElement('div');wrapper.innerHTML=V.map();mapDOM=wrapper.firstElementChild;
    const area=mapDOM.querySelector('.scene-viewport');
    const regions=[['.scene-art .geology>path','geology seismic mudlogging'],['.scene-art .reservoir-body','geology seismic welllog perforation eor'],['.scene-art .drilling-rig','drilling mudlogging'],['.scene-art .pump','production workover'],['.scene-art .processing','refining transport'],['.scene-art .pipes','transport production'],['.scene-art .well-line','welllog cementing completion perforation workover']];
    for(const [selector,stages]of regions)mapDOM.querySelectorAll(selector).forEach(n=>{if(n.hasAttribute('opacity'))return;n.classList.add('atlas-piece');n.dataset.stages=stages;});
    mapDOM.querySelectorAll('.map-node,.stage-rail a').forEach(n=>{
      const stage=n.dataset.stage||n.dataset.stageNav;
      n.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hoverStage(stage);});
      n.addEventListener('pointerleave',()=>hoverStage(null));
      n.addEventListener('focus',()=>hoverStage(stage));
      n.addEventListener('blur',()=>hoverStage(null));
    });
    mapDOM.querySelector('.map-menu').addEventListener('toggle',e=>{if(e.target.open)hoverStage(null);});
    mapDOM.querySelector('#motion').onclick=toggleMotion;
    const layers=storage.get('field-section-layers',{geology:true,well:true});
    mapDOM.querySelectorAll('[data-section-layer]').forEach(button=>{const key=button.dataset.sectionLayer;const apply=()=>{button.setAttribute('aria-pressed',String(layers[key]!==false));mapDOM.classList.toggle(key+'-hidden',layers[key]===false);};button.onclick=()=>{layers[key]=layers[key]===false;storage.set('field-section-layers',layers);apply();};apply();});
    let showFlow=storage.get('field-flow',false);const flowButton=mapDOM.querySelector('#toggle-flow');function setFlow(){mapDOM.classList.toggle('flow-hidden',!showFlow);flowButton.setAttribute('aria-pressed',String(showFlow));flowButton.textContent='流向示意：'+(showFlow?'开':'关');}flowButton.onclick=()=>{showFlow=!showFlow;storage.set('field-flow',showFlow);setFlow();};setFlow();
    mapDOM.querySelector('#replay').onclick=()=>{mapDOM.querySelector('.map-menu').open=false;window.oilfieldEngine?.replaySplash();playIntro();};
    mapDOM.querySelector('#reset-map').onclick=()=>{window.oilfieldEngine?.setFocusStage(mapStage || 'default');};
    mapDOM.querySelector('#zoom-map').onclick=()=>window.oilfieldEngine?.adjust('ArrowUp');
    area.onpointerdown=e=>{if(e.button!==0||e.target.closest('a,button,input,select,summary'))return;finishIntro();drag={x:e.clientX,y:e.clientY,camera:{...camera},moved:false,pointer:e.pointerId};area.setPointerCapture(e.pointerId);area.classList.add('is-dragging');};
    area.onpointermove=e=>{if(!drag||e.pointerId!==drag.pointer)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;if(window.oilfieldEngine?.panByPixels){window.oilfieldEngine.panByPixels(dx,dy);drag.x=e.clientX;drag.y=e.clientY;return;}camera={...drag.camera,x:Math.max(-1440*camera.scale+80,Math.min(availableWidth()-80,drag.camera.x+dx))};applyCamera(false);};
    const endDrag=()=>{if(drag?.moved)remember();drag=null;area.classList.remove('is-dragging');};
    area.onpointerup=endDrag;area.onpointercancel=endDrag;area.onlostpointercapture=endDrag;
    area.onkeydown=e=>{if(window.oilfieldEngine){if(e.target===area&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(window.oilfieldEngine.adjust){window.oilfieldEngine.adjust(e.key);return;}const c=window.oilfieldEngine.camera;if(e.key==='ArrowLeft')c.targetYaw-=.1;if(e.key==='ArrowRight')c.targetYaw+=.1;if(e.key==='ArrowUp')c.targetZoom=Math.min(3.2,c.targetZoom+.15);if(e.key==='ArrowDown')c.targetZoom=Math.max(.25,c.targetZoom-.15);}return;}if(e.target!==area||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();finishIntro();if(e.key==='ArrowLeft'||e.key==='ArrowRight')camera.x+=e.key==='ArrowLeft'?64:-64;else{const prev=camera.scale;camera.scale=Math.max(.25,Math.min(3.2,camera.scale+(e.key==='ArrowUp'?.15:-.15)));camera.x=availableWidth()/2-(availableWidth()/2-camera.x)*camera.scale/prev;camera.y=area.clientHeight/2-(area.clientHeight/2-camera.y)*camera.scale/prev;camera.zoomed=true;}applyCamera();remember();};
    resizeObserver=new ResizeObserver(()=>{const size=area.clientWidth+':'+area.clientHeight;if(mapDOM.isConnected&&size!==area.dataset.size){area.dataset.size=size;camera=defaultCamera();applyCamera(false);}});resizeObserver.observe(area);
  }
  function updateMap(stage,saved){
    if(!mapDOM)buildMap();const wasAttached=mapDOM.isConnected,previous={...camera};
    if(!wasAttached)main.replaceChildren(mapDOM);
    caseId=null;mapStage=stage||null;hoverStage(null);mapDOM.classList.toggle('stage',!!stage);const area=mapDOM.querySelector('.scene-viewport');area.dataset.size=area.clientWidth+':'+area.clientHeight;
    mapDOM.dataset.focus=stage||'all';mapDOM.querySelector('.map-menu').open=false;
    const panel=mapDOM.querySelector('#stage-panel');panel.hidden=!stage;panel.innerHTML=stage?V.panel(stage):'';
    V.mountMap(stage);
    mapDOM.querySelector('#map-preview').innerHTML=V.overview(storage.get('field-preview-budget',65));bindPreview();
    for(const n of mapDOM.querySelectorAll('[data-stage]')){n.classList.toggle('selected',n.dataset.stage===stage);if(n.dataset.stage===stage)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}
    for(const n of mapDOM.querySelectorAll('[data-stage-nav]')){n.classList.toggle('active',n.dataset.stageNav===stage);if(n.dataset.stageNav===stage)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}
    const original=CaseStore.list().filter(c=>c.builtin||c.original).length,run=CaseStore.list().filter(c=>c.tabs?.demo).length;
    mapDOM.querySelector('#map-counts').innerHTML=`<span><b>13</b>作业环节</span><span><b>${original}</b>原创案例</span><span><b>${run}</b>可运行案例</span>`;
    loadStatus();syncMotion();
    if(saved?.camera)camera={...saved.camera};else{camera.zoomed=!!stage;camera=defaultCamera();}
    if(wasAttached&&animated()&&!saved){const target={...camera};camera=previous;applyCamera(false);void mapDOM.offsetWidth;camera=target;requestAnimationFrame(()=>applyCamera(true));}else applyCamera(false);
    if(stage&&innerWidth<=760){const n=mapDOM.querySelector('.stage-rail .active');if(n)mapDOM.querySelector('.stage-rail').scrollLeft=n.offsetLeft-mapDOM.querySelector('.stage-rail').offsetLeft-100;}
    window.FieldStudy?.mount(stage);
    if(stage&&wasAttached&&animated()&&panel.animate)panel.animate([{opacity:.2,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
    if(!stage&&!storage.get('field-intro-seen',false))playIntro();
  }
  function bindPreview(){
    const select=mapDOM.querySelector('#preview-budget');if(!select)return;
    function applyBudget(budget,entered=false){const result=V.previewResult(budget),best=result.feasible[0];FieldScene.configure(best.d,best.p,best.l);window.oilfieldEngine?.setParams(best.d,best.l,best.p);mapDOM.querySelectorAll('[data-map-value]').forEach(n=>n.textContent=({density:best.d,phase:best.p,penetration:best.l})[n.dataset.mapValue]);if(entered){storage.set('field-preview-budget',budget);const prior=caseState.get('perforation-optimization')||{layer:'all',step:0,tab:'background'};caseState.set('perforation-optimization',{...prior,demo:{k:40,budget,segment:0,computedK:40,computedBudget:budget,selected:best.index}});mapDOM.querySelector('#map-preview').innerHTML=V.overview(budget);bindPreview();}}
    select.onchange=()=>applyBudget(Number(select.value),true);
    mapDOM.querySelector('.preview-enter').onclick=()=>{const budget=Number(select.value),best=V.previewResult(budget).feasible[0],prior=caseState.get('perforation-optimization')||{layer:'all',step:0,tab:'background'};caseState.set('perforation-optimization',{...prior,demo:{k:40,budget,segment:0,computedK:40,computedBudget:budget,selected:best.index}});};
    applyBudget(Number(select.value));
  }
  function loadStatus(){
    const status=mapDOM?.querySelector('#load-status');if(!status)return;
    status.innerHTML=loadingCase?'<p class="notice">正在读取射孔案例资料，地图已可浏览。</p>':builtinError?'<div class="status-banner" role="alert">射孔案例资料未能加载。地图仍可浏览，案例尚未就绪。<button id="retry-case">重新加载案例</button></div>':'';
    status.querySelector('#retry-case')?.addEventListener('click',async e=>{e.target.disabled=true;await loadBuiltin();updateMap(mapStage,views[current?.id]);});
  }
  function cleanupDetail(){if(host){host.destroy();host=null;}chartObserver?.disconnect();chartObserver=null;caseId=null;}
  function setLayer(layer){const state=stateForCase();state.layer=layer;document.querySelector('#well-figure').innerHTML=V.wellFigure(layer);document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));document.querySelector('#structure-note').textContent=V.layerNotes[layer];}
  function showStep(step){
    stateForCase().step=step;const data=document.querySelector('#step-data');data.innerHTML=V.workflowStep(step);
    document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===step)));
    chartObserver?.disconnect();const area=document.querySelector('#workflow-graphic');const draw=()=>{area.innerHTML=V.chart(step,area.clientWidth);};chartObserver=new ResizeObserver(draw);chartObserver.observe(area);draw();
  }
  function safeHTML(html){const d=new DOMParser().parseFromString(html,'text/html');d.querySelectorAll('script,iframe,object,embed,link,style,base,form').forEach(n=>n.remove());d.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(a.name.startsWith('on')||/javascript:|data:text\/html/i.test(a.value)||a.name==='srcdoc')n.removeAttribute(a.name);});return d.body.innerHTML;}
  function externalContent(c,tab){const t=c.tabs[tab];if(tab==='background')return `<div class="imported-content"><p>${esc(t.lede||'')}</p>${(t.sections||[]).map(s=>`<section><h2>${esc(s.title)}</h2>${safeHTML(s.html||s.body||'')}</section>`).join('')}</div>`;return `<div class="imported-content">${t.diagram?'<figure>'+safeHTML(t.diagram)+'</figure>':''}<h2>${esc(t.title||'案例流程')}</h2>${(t.lead||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${(t.steps||[]).map((s,i)=>`<section><h2>${i+1}. ${esc(s.name)}</h2>${s.diagram?'<figure>'+safeHTML(s.diagram)+'</figure>':''}<p>${esc(s.do)}</p><p>输出：${esc(s.effect)}</p><p>注意：${esc(s.trap)}</p></section>`).join('')}</div>`;}
  function mountExternal(c){
    const box=document.querySelector('#external-demo');if(!box||host)return;
    if(typeof c.tabs.demo.mount==='function'&&!c.imported){const live=c.tabs.demo.mount(box,{scene:ATLAS.index.byScene[c.sceneId],kase:c,kit:window.K});host={destroy(){if(live?.unmount)live.unmount();if(c.tabs.demo.unmount)c.tabs.demo.unmount();box.replaceChildren();}};return;}
    const mode=CaseDemoHost.resolveMode({files:c.files,demo:c.tabs.demo});
    if(mode==='module'){
      const js=CaseDemoHost.findFile(c.files,c.tabs.demo.js)||c.files.find(f=>/\.js$/.test(f.name)),css=c.files.filter(f=>/\.css$/.test(f.name)).map(f=>f.data).join('\n');
      const assets=Object.fromEntries(c.files.map(f=>[f.name,f.enc==='dataurl'?f.data:'data:'+f.mime+';charset=utf-8,'+encodeURIComponent(f.data)]));
      const texts=Object.fromEntries(c.files.map(f=>[f.name,f.enc==='text'?f.data:'']));
      const jsValue=x=>JSON.stringify(x).replace(/</g,'\\u003c');
      const shell=`<!doctype html><meta charset="utf-8"><style>${css.replace(/<\/style/gi,'<\\/style')}</style><div id="root"></div><script>var module={exports:{}};var exports=module.exports;var cleanups=[];var assets=${jsValue(assets)},texts=${jsValue(texts)};var api={asset:n=>assets[n]||'',readText:n=>Promise.resolve(texts[n]||''),list:()=>Object.keys(assets),scene:${jsValue(ATLAS.index.byScene[c.sceneId])},kase:{id:${jsValue(c.id)}},onDestroy:fn=>cleanups.push(fn),height:()=>{}};${(js?.data||'').replace(/<\/script/gi,'<\\/script')}\n;var m=module.exports;var mount=m.mount||(m.default&&m.default.mount)||window.__CASE_MOUNT__;if(mount)mount(document.getElementById('root'),api);window.addEventListener('pagehide',()=>cleanups.forEach(fn=>fn()));<\/script>`;
      host=CaseDemoHost.create(box,{files:[{name:'index.html',data:shell,enc:'text'}],demo:{mode:'page',height:c.tabs.demo.height||620},meta:c});
    }else host=CaseDemoHost.create(box,{files:c.files,demo:c.tabs.demo,meta:c});
  }
  async function mountDemo(c){
    const holder=document.querySelector('#builtin-demo');if(!holder||holder.querySelector('iframe')||holder.dataset.loading)return;
    holder.dataset.loading='1';const status=document.querySelector('#demo-loading');status.textContent='正在加载交互演示…';
    try{
      await Promise.all(['index.html','demo.js','demo.css','case-scene.js'].map(async name=>{const r=await fetch('cases/perforation-optimization/demo/'+name,{method:'HEAD'});if(!r.ok)throw Error('resource');}));
      if(!holder.isConnected||caseId!==c.id)return;
      const priorState=stateForCase()?.demo||null;const frame=document.createElement('iframe');frame.className='case-frame';frame.title='射孔参数优化交互演示';frame.sandbox='allow-scripts allow-downloads';frame.src='cases/perforation-optimization/demo/index.html'+(priorState?'#state='+encodeURIComponent(JSON.stringify(priorState)):'');
      frame.onload=()=>{if(!holder.isConnected)return;status.textContent='';frame.contentWindow.postMessage({type:'field-state',state:priorState,enabled:animated()},'*');};holder.append(frame);
    }catch{if(holder.isConnected){status.className='notice error';status.innerHTML='演示资源未能加载，当前没有计算结果。<button id="retry-demo">重新加载</button>';status.querySelector('button').onclick=()=>mountDemo(c);}}
    finally{delete holder.dataset.loading;}
  }
  function setTab(c,tab){
    const state=stateForCase();state.tab=tab;
    document.querySelectorAll('.tabs [role=tab]').forEach(a=>{const active=a.id==='tab-'+tab;a.setAttribute('aria-selected',String(active));a.tabIndex=active?0:-1;});
    document.querySelectorAll('.tab-panel').forEach(p=>{const active=p.id==='panel-'+tab;p.hidden=!active;p.classList.toggle('enter',active&&animated());});
    if(c.builtin){if(tab==='background')setLayer(state.layer);if(tab==='workflow')showStep(state.step);if(tab==='demo')mountDemo(c);}
    else if(tab==='demo')mountExternal(c);else {const target=document.querySelector('#external-'+tab);if(target&&!target.innerHTML)target.innerHTML=externalContent(c,tab);}
    const frame=document.querySelector('.case-frame');if(frame)frame.contentWindow.postMessage({type:'field-motion',enabled:tab==='demo'&&animated()},'*');
  }
  function detail(c,tab){
    if(caseId!==c.id||!document.querySelector('.detail-page')){
      cleanupDetail();caseId=c.id;main.innerHTML=V.detail(c);
      document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>setLayer(b.dataset.layer));
      document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>showStep(Number(b.dataset.step)));
      document.querySelector('#case-switch')?.addEventListener('change',e=>navigate('#/case/'+e.target.value+'?tab='+tab));
      document.querySelectorAll('.tabs a').forEach(a=>a.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const links=[...a.parentElement.children],i=links.indexOf(a),to=links[e.key==='Home'?0:e.key==='End'?links.length-1:(i+(e.key==='ArrowRight'?1:links.length-1))%links.length];to.focus();navigate(to.getAttribute('href'),{focus:to.id});});
    }
    setTab(c,tab);
  }
  function getCase(p,q){
    if(p[0]==='case')return CaseStore.get(p[1]);
    const scene=ATLAS.index.byScene[p[1]];if(!scene)return null;
    const all=CaseStore.list().filter(c=>c.sceneId===p[1]);return q.has('case')?all.find(c=>c.id===q.get('case')):all[0];
  }
  function sharedNames(enable){
    document.querySelectorAll('[style*="view-transition-name"]').forEach(n=>n.style.viewTransitionName='');
    if(!enable)return;
    const c=document.querySelector('.archive-card[data-case-entry="perforation-optimization"]')||document.querySelector('.library-row[data-case-entry="perforation-optimization"]');
    const title=document.querySelector('.detail-page h1')||c?.querySelector('.case-title');const well=document.querySelector('.detail-page #well-figure svg')||c?.querySelector('.archive-thumb');
    if(title)title.style.viewTransitionName='case-title';if(well)well.style.viewTransitionName='well-view';
  }
  async function render(options={}){
    const parsed=parse(),{p,q}=parsed,entry=ensureEntry();
    const saved=options.restore?views[entry.fieldId]:null;
    const outgoingCase=caseId,outgoingRoute=current?.hash||'';
    current={id:entry.fieldId,index:entry.fieldIndex,parent:entry.parent,hash:parsed.hash};
    if(location.hash!==parsed.hash)history.replaceState(entry,'',parsed.hash);
    const c=['case','scene'].includes(p[0])?getCase(p,q):null;
    let tab=q.get('tab')||'background';
    if(c&&(!['background','workflow','demo'].includes(tab)||!c.tabs[tab]))tab='background';
    if(c&&q.get('tab')!==tab){q.set('tab',tab);const hash='#/'+p.join('/')+'?'+q;history.replaceState(entry,'',hash);current.hash=hash;}
    const mapRoute=p[0]==='map'||p[0]==='stage'&&FieldScene.anchors[p[1]];
    const crossing=!!outgoingRoute&&outgoingRoute!==current.hash&&((outgoingCase&&mapRoute)||(!outgoingCase&&c));
    const sameCase=c&&outgoingCase===c.id;
    const update=()=>{
      document.body.classList.toggle('map-workspace',!!mapRoute);
      document.querySelector('meta[name=theme-color]').content='#173B52';
      if(mapRoute){cleanupDetail();updateMap(p[0]==='stage'?p[1]:null,saved);}
      else if(c)detail(c,tab);
      else{
        cleanupDetail();finishIntro();
        if(p[0]==='cases'||p[0]==='method')main.innerHTML=p[0]==='method'&&!ATLAS.methods[p[1]]?V.missing('未找到这个方法','请从方法筛选中选择已有分类。'):(p[0]==='method'?V.methodPage(q,p[1]):V.library(q,null));
        else if(p[0]==='guide')main.innerHTML=V.guide();
        else if(p[0]==='scene'&&ATLAS.index.byScene[p[1]]){const sc=ATLAS.index.byScene[p[1]];if(q.has('case'))main.innerHTML=V.missing('这个本机案例尚未导入','当前场景没有此ID的案例，请在本机导入原案例包。',sc.stageId,true);else{if(q.get('tab')!=='background'){q.set('tab','background');current.hash='#/scene/'+sc.id+'?'+q;history.replaceState(entry,'',current.hash);}main.innerHTML=V.scenePending(sc);}}
        else if(p[0]==='case'&&p[1]==='perforation-optimization'&&loadingCase)main.innerHTML='<div class="page"><p role="status">正在读取射孔案例资料…</p></div>';
        else if(p[0]==='case'&&p[1]==='perforation-optimization'&&builtinError)main.innerHTML=V.missing('射孔案例加载失败','返回地图后可重新加载，当前不能展示或计算该案例。');
        else if(p[0]==='case')main.innerHTML=V.missing('未找到这个案例','可能是本机案例尚未导入，或链接ID不正确。预置案例不需要导入。','map',true);
        else main.innerHTML=V.missing('页面或环节不存在','请返回油田地图，选择已有作业环节。');
      }
      const nav=p[0]==='stage'?'map':p[0];document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
      document.title=(c?c.title:p[0]==='stage'?V.stageLabel(p[1]):p[0]==='cases'?'案例库':p[0]==='method'?(ATLAS.methods[p[1]]?.name||'方法检索'):p[0]==='guide'?'使用说明':'油田地图')+' · 油田作业图谱';
      document.querySelector('#filters')?.addEventListener('submit',e=>{e.preventDefault();const params=new URLSearchParams();for(const [k,v]of new FormData(e.target))if(v)params.set(k,v);navigate('#/cases'+(params.size?'?'+params:''));});
      if(crossing&&animated())sharedNames(true);
      if((!outgoingRoute||c&&!outgoingCase&&!crossing)&&!mapRoute)main.classList.add('direct-enter');else main.classList.remove('direct-enter');
    };
    if(crossing&&animated()&&document.startViewTransition){sharedNames(true);const transition=document.startViewTransition(update);try{await transition.finished;}catch{}sharedNames(false);}
    else {update();if(crossing&&animated()){main.classList.remove('direct-enter');void main.offsetWidth;main.classList.add('direct-enter');}}
    syncMotion();
    if(saved){requestAnimationFrame(()=>{scrollTo(0,saved.scroll||0);if(saved.focus){const target=document.getElementById(saved.focus)||[...main.querySelectorAll('a')].find(a=>a.getAttribute('href')===saved.focus);target?.focus({preventScroll:true});}});}
    else if(!sameCase){scrollTo(0,0);if(outgoingRoute)main.focus({preventScroll:true});}
    if(options.focus)document.getElementById(options.focus)?.focus({preventScroll:true});
    remember();
  }
  async function navigate(hash,options={}){
    if(navigating||hash===location.hash)return;remember();finishIntro();
    const outgoing=current;const sameCase=caseId&&hash.startsWith('#/case/'+caseId+'?');history.pushState({fieldId:uid(),fieldIndex:(outgoing?.index??0)+1,parent:sameCase?(outgoing?.parent||null):(outgoing?.id||null)},'',hash);
    navigating=true;try{await render(options);}finally{navigating=false;}
  }
  document.addEventListener('change',e=>{if(!e.target.matches('[data-compare-select]'))return;const picks=[...document.querySelectorAll('[data-compare-select]')].map(s=>s.value);const link=document.getElementById('compare-enter');if(link)link.href='#/cases?compare='+picks.map(encodeURIComponent).join(',');});
  document.addEventListener('click',e=>{
    const back=e.target.closest('[data-back]');if(back){e.preventDefault();backTo(back.dataset.back);return;}
    if(e.target.closest('[data-open-import]')){document.querySelector('#add-case').click();return;}
    const a=e.target.closest('a[href^="#/"]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
    e.preventDefault();navigate(a.getAttribute('href'));
  });
  document.querySelector('.skip').onclick=e=>{e.preventDefault();main.focus();};
  window.addEventListener('popstate',()=>{remember();finishIntro();render({restore:true});});
  window.addEventListener('hashchange',()=>{if(current?.hash===location.hash)return;remember();finishIntro();render({restore:!!history.state?.fieldId});});
  window.addEventListener('pagehide',remember);document.addEventListener('visibilitychange',syncMotion);reducedQuery.addEventListener('change',syncMotion);
  window.addEventListener('message',e=>{
    const frame=document.querySelector('.case-frame');if(!frame||e.source!==frame.contentWindow)return;
    if(e.data?.type==='field-demo-state'&&caseId){
      stateForCase().demo=e.data.state;const index=e.data.state?.selected;
      if(caseId==='perforation-optimization'&&Number.isInteger(index)&&index>=0&&index<75){const d=[8,12,16,20,24][Math.floor(index/15)],p=[60,90,120][Math.floor(index%15/5)],l=[200,300,400,500,600][index%5];FieldScene.configure(d,p,l);window.oilfieldEngine?.setParams(d,l,p);}
    }
    if(e.data?.type==='field-demo-height')frame.style.height=Math.max(500,Math.min(6000,Number(e.data.height)||820))+'px';
    if(e.data?.type==='field-demo-error'){const status=document.querySelector('#demo-loading');if(status){status.className='notice error';status.innerHTML='演示运行异常：'+esc(e.data.message||'未提供错误详情')+'<button id="retry-demo">重新加载</button>';status.querySelector('button').onclick=()=>{frame.src=frame.src;status.textContent='正在重新加载…';};}}
  });
  async function loadBuiltin(){
    const failures=[];
    try{
      const response=await fetch('cases/perforation-optimization/case.json');if(!response.ok)throw Error('首例加载失败');
      const c=await response.json();if(!CaseStore.get(c.id))CaseStore.register({...c,builtin:true,original:true});
      const catalogResponse=await fetch('cases/catalog.json');if(!catalogResponse.ok)throw Error('案例目录加载失败');
      const ids=await catalogResponse.json();
      await Promise.all(ids.map(async id=>{try{
        if(CaseStore.get(id))return;
        const base='cases/'+id+'/',r=await fetch(base+'case.json');if(!r.ok)throw Error(id);const pkg=await r.json();
        const files=await Promise.all(['demo/index.html','demo/demo.js','demo/demo.css','demo/publication.css','data-source.md','README.txt'].map(async name=>{const res=await fetch(base+name);if(!res.ok)throw Error(name);const data=await res.text();return {name,data,enc:'text',mime:CaseDemoHost.mimeOf(name),size:new Blob([data]).size};}));
        CaseStore.register({...pkg,files,original:true});
      }catch(e){failures.push(id);}}));
      builtinError=failures.length>0;
    }catch(e){builtinError=true;}finally{loadingCase=false;}
  }
  window.SiteApp={navigate,inspect:()=>({current,camera:{...camera},motion,reduced:reducedQuery.matches,builtinError}),version:'0.6.0'};
  document.querySelector('#motion-global').onclick=toggleMotion;
  syncMotion();main.innerHTML='<div class="page"><p role="status">正在读取案例资料…</p></div>';
  render({restore:!!history.state?.fieldId});loadBuiltin().then(()=>{if(mapDOM?.isConnected)updateMap(mapStage,{camera:{...camera}});else render({restore:true});});
})();
