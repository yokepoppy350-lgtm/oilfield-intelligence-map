// All input routes share the same normalized virtual file map and serialization.
window.CaseImport = (() => {
  const LIMIT = 6 * 1024 * 1024, MAX_FILES = 1024;
  function pathOf(raw) {
    const path = String(raw).replace(/\\/g, '/');
    if (/^(\/|[a-z]:)|[\x00-\x1f]/i.test(path) || path.split('/').includes('..')) throw Error('不安全的文件路径：' + path);
    return path.split('/').filter(p => p && p !== '.').join('/');
  }
  const ignored = path => path.split('/').some(p => p === '__MACOSX' || p === '.DS_Store' || p.startsWith('._'));
  function add(map, seen, name, blob) {
    if (seen.has(name.toLowerCase())) throw Error('文件路径重复：' + name);
    if (map.size >= MAX_FILES) throw Error('案例文件数量超过 1024。');
    seen.add(name.toLowerCase()); map.set(name, blob);
  }
  async function unzip(file) {
    if (!window.fflate) throw Error('本地 ZIP 解压库未加载，请检查 assets/vendor/fflate.min.js。');
    const bytes = new Uint8Array(await file.arrayBuffer()), seen = new Set();
    let declared = 0, count = 0;
    const data = await new Promise((resolve, reject) => {
      try {
        window.fflate.unzip(bytes, {filter(entry) {
          const name = pathOf(entry.name);
          if (entry.name.endsWith('/') || !name || ignored(name)) return false;
          if (seen.has(name.toLowerCase())) throw Error('ZIP 文件路径重复：' + name);
          seen.add(name.toLowerCase());
          if (++count > MAX_FILES) throw Error('案例文件数量超过 1024。');
          declared += entry.originalSize;
          if (!Number.isSafeInteger(declared) || declared > LIMIT) throw Error('ZIP 解压后超过 6 MB。');
          return true;
        }}, (error, files) => error ? reject(error) : resolve(files));
      } catch (error) { reject(error); }
    });
    const map = new Map(); seen.clear(); let total = 0;
    for (const [raw, bytes] of Object.entries(data)) {
      total += bytes.byteLength;
      if (total > LIMIT) throw Error('ZIP 解压后超过 6 MB。');
      const name = pathOf(raw);
      add(map, seen, name, new Blob([bytes], {type: CaseDemoHost.mimeOf(name)}));
    }
    return map;
  }
  async function prepare(files) {
    if (!files.length) throw Error('没有选择文件。');
    if (files.reduce((n, f) => n + f.size, 0) > LIMIT) throw Error('案例超过 6 MB。');
    const zips = files.filter(f => /\.zip$/i.test(f.name));
    if (zips.length && files.length !== 1) throw Error('每次请选择一个 ZIP，或选择一个案例的全部文件。');
    let map;
    if (zips.length) {
      try { map = await unzip(zips[0]); }
      catch (e) { throw Error('ZIP 读取失败（请确认未损坏、未加密，使用标准 ZIP）：' + e.message); }
    } else {
      map = new Map(); const seen = new Set();
      for (const file of files) {
        const name = pathOf(file.webkitRelativePath || file.relativePath || file.name);
        if (name && !ignored(name)) add(map, seen, name, file);
      }
    }
    const manifests = [...map.keys()].filter(n => n.split('/').pop() === 'case.json');
    if (!manifests.length) throw Error('未找到 case.json，请选择完整案例 ZIP 或案例核心目录。');
    if (manifests.length !== 1) throw Error('发现多个 case.json，请每次只导入一个案例。');
    const manifest = manifests[0], prefix = manifest.slice(0, -'case.json'.length);
    // Anchor paths at the unique manifest, supporting flat and arbitrarily wrapped packages.
    const items = await Promise.all([...map].filter(([name]) => name.startsWith(prefix)).map(async ([raw, blob]) => {
      const name = raw.slice(prefix.length), text = CaseDemoHost.isText(name);
      const data = text ? await blob.text() : await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error('资源读取失败：' + name));
        reader.readAsDataURL(new Blob([blob], {type: CaseDemoHost.mimeOf(name)}));
      });
      return {name, size: blob.size, mime: CaseDemoHost.mimeOf(name), enc: text ? 'text' : 'dataurl', data};
    }));
    let pkg;
    try { pkg = JSON.parse(items.find(f => f.name === 'case.json').data.replace(/^﻿/, '')); }
    catch { throw Error('case.json 不是有效的 JSON。'); }
    return {pkg, files: items.filter(f => f.name !== 'case.json')};
  }
  return {prepare};
})();

window.CaseStore = (() => {
  const key='field-notes.imports.v1', builtinIds=new Set(["perforation-optimization", "perforation-channel-prediction", "perforation-charge-selection", "perforation-effect-evaluation", "welllog-reservoir-interpretation", "welllog-fracture-detection", "production-forecast", "fracturing-optimization", "teaching-g1", "teaching-g2", "teaching-g3", "teaching-g4", "teaching-s1", "teaching-s2", "teaching-s3", "teaching-s4", "teaching-s5", "teaching-d1", "teaching-d2", "teaching-d3", "teaching-d4", "teaching-d5", "teaching-m1", "teaching-m2", "teaching-m3", "teaching-m4", "teaching-m5", "teaching-w1", "teaching-w2", "teaching-w5", "teaching-c1", "teaching-c2", "teaching-c3", "teaching-c4", "teaching-co1", "teaching-co2", "teaching-co3", "teaching-co4", "teaching-pr1", "teaching-pr3", "teaching-pr4", "teaching-pr5", "teaching-wo1", "teaching-wo2", "teaching-wo3", "teaching-wo4", "teaching-wo5", "teaching-e2", "teaching-e3", "teaching-e4", "teaching-e5", "teaching-t1", "teaching-t2", "teaching-t3", "teaching-t4", "teaching-t5", "teaching-r1", "teaching-r2", "teaching-r3", "teaching-r4", "teaching-r5"]);
  const registry=new Map();let imports=[];let pending=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function register(c){if(registry.has(c.id))throw Error('案例 ID 冲突：'+c.id);registry.set(c.id,c);return c;}
  function validate(pkg,files){
    if(!pkg||typeof pkg!=='object'||Array.isArray(pkg))throw Error('case.json 应为对象。');
    if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pkg.id))throw Error('案例 ID 应由小写字母、数字和连字符组成。');
    if(builtinIds.has(pkg.id)||registry.has(pkg.id)||imports.some(r=>r.pkg.id===pkg.id))throw Error('案例 ID 冲突：'+pkg.id+'。已有案例未改变，请先处理重复 ID。');
    if(!ATLAS.index.byScene[pkg.sceneId])throw Error('未知场景：'+pkg.sceneId);
    if(!pkg.title||!pkg.tabs?.background)throw Error('清单缺少标题或专业背景。');
    const d=pkg.tabs.demo;
    if(d){const mode=CaseDemoHost.resolveMode({files,demo:d});if(mode==='none')throw Error('未找到演示文件。');if(d.html&&!CaseDemoHost.findFile(files,d.html))throw Error('缺少演示入口：'+d.html);}
    if(files.reduce((n,f)=>n+f.size,0)+new Blob([JSON.stringify(pkg)]).size>6*1024*1024)throw Error('案例超过 6 MB。');
    return true;
  }
  function save(pkg,files){validate(pkg,files);const next=[...imports,{pkg,files}];try{localStorage.setItem(key,JSON.stringify(next));}catch(e){if(e.name==='QuotaExceededError')throw Error('浏览器本地存储空间不足，请缩小案例素材或释放本站存储后重试。');throw e;}imports=next;register({...pkg,files,imported:true});}
  try{const old=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(old))for(const r of old){try{validate(r.pkg,r.files);imports.push(r);register({...r.pkg,files:r.files,imported:true});}catch(e){console.warn(e.message);}}}catch(e){console.warn('本地案例未能恢复',e.message);}
  const dialog=document.querySelector('#import-dialog'),result=document.querySelector('#import-result'),commit=document.querySelector('#commit-import');
  let readVersion=0;
  dialog.addEventListener('close',()=>{readVersion++;pending=null;commit.disabled=true;});
  document.querySelector('#add-case').onclick=()=>{readVersion++;pending=null;commit.disabled=true;for(const id of ['#case-folder','#case-files','#case-zip'])document.querySelector(id).value='';result.className='';result.textContent='导入内容仅保存在当前浏览器。';dialog.showModal();};
  document.querySelector('#close-import').onclick=()=>dialog.close();
  async function read(files){
    const version=++readVersion;
    pending=null;commit.disabled=true;result.className='';result.textContent='正在读取案例…';
    try{
      const prepared=await CaseImport.prepare(files);
      if(version!==readVersion)return;
      const {pkg,files:assets}=prepared;validate(pkg,assets);pending=prepared;
      result.innerHTML=`<b>${esc(pkg.title)}</b><br>${esc(pkg.id)} · ${assets.length+1} 个文件<br>清单与资源检查通过。`;commit.disabled=false;
    }catch(e){if(version!==readVersion)return;result.className='error';result.textContent=e.message;}
  }
  document.querySelector('#case-folder').onchange=e=>read([...e.target.files]);document.querySelector('#case-files').onchange=e=>read([...e.target.files]);
  document.querySelector('#case-zip').onchange=e=>read([...e.target.files]);
  const drop=document.querySelector('#drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');
  async function walk(entry,prefix=''){if(entry.isFile)return [await new Promise((yes,no)=>entry.file(f=>{Object.defineProperty(f,'relativePath',{value:prefix+f.name});yes(f);},no))];const reader=entry.createReader();let out=[],chunk;do{chunk=await new Promise((yes,no)=>reader.readEntries(yes,no));for(const child of chunk)out.push(...await walk(child,prefix+entry.name+'/'));}while(chunk.length);return out;}
  drop.ondrop=async e=>{e.preventDefault();drop.classList.remove('dragging');const version=++readVersion;pending=null;commit.disabled=true;result.textContent='正在读取拖入内容…';try{let files=[];const items=[...(e.dataTransfer.items||[])];if(!items.length)files=[...e.dataTransfer.files];for(const item of items){const entry=item.webkitGetAsEntry?.();if(entry)files.push(...await walk(entry));else if(item.kind==='file'){const file=item.getAsFile();if(file)files.push(file);}}if(version===readVersion)await read(files);}catch(err){if(version!==readVersion)return;result.className='error';result.textContent='拖入内容读取失败：'+err.message;}};
  commit.onclick=()=>{if(!pending)return;try{save(pending.pkg,pending.files);const id=pending.pkg.id;pending=null;dialog.close();if(window.SiteApp)SiteApp.navigate('#/case/'+id+'?tab=background');else location.hash='#/case/'+id+'?tab=background';}catch(e){result.className='error';result.textContent='添加失败：'+e.message;}};
  return {get:id=>registry.get(id),unregister:id=>registry.delete(id),list:()=>[...registry.values()],register,validate,save,esc};
})();
