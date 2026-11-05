(function(global){
  'use strict';
  function random(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
  function features(x){const k=x.k/200,d=x.d/24,l=x.l/600,p=Math.cos(x.p*Math.PI/180);return [1,k,d,p,l,d*d,l*l,d*l,k*l];}
  function reference(x){const [one,k,d,p,l]=features(x);return 38+18*k+34*d+18*l-12*d*d-6*l*l+8*d*l+7*k*l-3*p;}
  function cost(x){return 8+1.6*x.d+.06*x.l+(x.p===60?5:x.p===90?2:0);}
  function generate(){const rng=random(234);return Array.from({length:240},(_,i)=>{const x={k:10+rng()*190,d:8+rng()*16,p:[60,90,120][Math.floor(rng()*3)],l:200+rng()*400};return {...x,id:i,y:reference(x)+(rng()-.5)*2};});}
  function fit(rows){const n=features(rows[0]).length,a=Array.from({length:n},()=>Array(n+1).fill(0));for(const row of rows){const f=features(row);for(let i=0;i<n;i++){for(let j=0;j<n;j++)a[i][j]+=f[i]*f[j];a[i][n]+=f[i]*row.y;}}for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;[a[i],a[pivot]]=[a[pivot],a[i]];const v=a[i][i];if(Math.abs(v)<1e-12)throw Error('样本矩阵不可解');for(let j=i;j<=n;j++)a[i][j]/=v;for(let k=0;k<n;k++){if(k===i)continue;const f=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}}return a.map(r=>r[n]);}
  const rows=generate(),train=rows.filter(r=>r.id%5!==0),test=rows.filter(r=>r.id%5===0),weights=fit(train),mean=train.reduce((s,r)=>s+r.y,0)/train.length;
  const predict=x=>features(x).reduce((s,v,i)=>s+v*weights[i],0);
  const mae=test.reduce((s,r)=>s+Math.abs(predict(r)-r.y),0)/test.length,baselineMAE=test.reduce((s,r)=>s+Math.abs(mean-r.y),0)/test.length;
  const experience=k=>({k,d:12,p:90,l:300});
  function search(k,budget){
    const start=global.performance.now(),all=[];
    for(const d of [8,12,16,20,24])for(const p of [60,90,120])for(const l of [200,300,400,500,600]){const x={k,d,p,l};all.push({...x,cost:cost(x),response:predict(x),index:all.length});}
    const feasible=all.filter(x=>x.cost<=budget).sort((a,b)=>b.response-a.response||a.cost-b.cost);
    // Two criteria: maximize response, minimize cost. Recommendation maximizes Y under C <= budget.
    const pareto=feasible.filter(x=>!feasible.some(y=>y.response>=x.response&&y.cost<=x.cost&&(y.response>x.response||y.cost<x.cost)));
    const elapsedMs=global.performance.now()-start,benchmarkStart=global.performance.now();
    // Fixed batch reduces timer quantization; timing is measured, not synthetic data.
    let benchmarkChecksum=0;for(let i=0;i<1000;i++)benchmarkChecksum+=predict(all[i%all.length]);
    return {all,feasible,pareto,elapsedMs,predictionMs:(global.performance.now()-benchmarkStart)/1000,benchmarkChecksum};
  }
  function contributions(from,to){
    // Exact three-variable Shapley decomposition: average the six replacement orders.
    // Interactions D*L are shared rather than arbitrarily assigned to the first variable.
    const keys=['d','p','l'],values={d:0,p:0,l:0};
    for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
      const x={...from};let before=predict(x);
      for(const i of order){const key=keys[i];x[key]=to[key];const after=predict(x);values[key]+=(after-before)/6;before=after;}
    }
    return values;
  }
  const model={generate,train,test,weights,predict,search,reference,cost,mae,baselineMAE,experience,contributions};global.PerforationModel=model;
  if(!global.document?.querySelector('#scatter'))return;
  const $=s=>document.querySelector(s),num=(v,n=2)=>v.toFixed(n);
  $('#fitted-equation').textContent='本次训练得到 w = ['+weights.map(v=>num(v,6)).join(', ')+']（与上方特征顺序对应）。';
  let results=null,selected=null,activeSegment=0,dirty=false,motion=true;const cache=new Map();global.PerforationRunStats={searches:0};
  function reportState(){if(!results)return;parent.postMessage({type:'field-demo-state',state:{k:Number($('#permeability').value),budget:Number($('#budget').value),segment:activeSegment,computedK:results.k,computedBudget:results.budget,selected:selected?.index??null}},'*');}
  function labels(){$('#perm-out').textContent=$('#permeability').value+' mD';$('#budget-out').textContent=$('#budget').value+' 指数';}
  function syncDirty(){dirty=!!results&&(results.k!==Number($('#permeability').value)||results.budget!==Number($('#budget').value));$('#message').textContent=dirty?`条件已改动，请重新计算。图表仍对应 ${results.k}mD、预算${results.budget}。`:'教学响应未经现场资料校准，仅用于理解模型与约束搜索。';$('#calculate').textContent=dirty?'重新计算（条件已改动）':'重新计算';reportState();}
  function plot(){
    const w=Math.max(270,$('#scatter').clientWidth),h=300,left=48,right=18,top=28,bottom=48,minX=25,maxX=90,minY=45,maxY=110;
    const px=v=>left+(v-minX)/(maxX-minX)*(w-left-right),py=v=>h-bottom-(v-minY)/(maxY-minY)*(h-top-bottom);
    let s=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="75个候选方案的代价与预测响应；可用下方候选表选择"><text x="${left}" y="16">响应指数</text>`;
    for(const y of [50,65,80,95,110])s+=`<path d="M${left} ${py(y)}H${w-right}" stroke="#D5CEBF" stroke-dasharray="3 5"/><text x="${left-8}" y="${py(y)+4}" text-anchor="end">${y}</text>`;
    for(const x of [30,50,70,90])s+=`<text x="${px(x)}" y="${h-26}" text-anchor="middle">${x}</text>`;
    s+=`<path d="M${left} ${top}V${h-bottom}H${w-right}" fill="none" stroke="#62665C"/><text x="${w-right}" y="${h-4}" text-anchor="end">代价指数 →</text>`;
    const budget=results.budget;if(budget>=minX&&budget<=maxX)s+=`<path d="M${px(budget)} ${top}V${h-bottom}" stroke="#A9432D" stroke-dasharray="4 4"/><text x="${Math.min(w-18,px(budget)+4)}" y="42" fill="#A9432D">预算${budget}</text>`;
    for(const x of results.all){const a=px(x.cost),b=py(x.response);s+=x.cost<=budget?`<circle class="point" tabindex="0" role="button" aria-label="孔密${x.d}，相位${x.p}，穿深${x.l}，响应${num(x.response)}" data-index="${x.index}" cx="${a}" cy="${b}" r="4" fill="#245B50"><title>${x.d}孔/m · ${x.p}° · ${x.l}mm</title></circle>`:`<path d="M${a} ${b-4}l4 4-4 4-4-4Z" fill="none" stroke="#62665C"/>`;}
    const baseline={k:results.k,d:12,p:90,l:300},bx=px(cost(baseline)),by=py(predict(baseline));s+=`<path d="M${bx-7} ${by}h14M${bx} ${by-7}v14" stroke="#242822" stroke-width="2"><title>默认：12孔/m，90°，300mm</title></path>`;
    if(selected)s+=`<rect x="${px(selected.cost)-6}" y="${py(selected.response)-6}" width="12" height="12" fill="#A9432D" stroke="#FFFCF5" stroke-width="2"/>`;
    $('#scatter').innerHTML=s+'</svg>';
    $('#scatter').querySelectorAll('[data-index]').forEach(n=>{n.onclick=()=>choose(Number(n.dataset.index));n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const index=Number(n.dataset.index);choose(index);$('#scatter').querySelector(`[data-index="${index}"]`)?.focus();}};});
  }
  function layout(){
    if(!selected){$('#layout').innerHTML='';return;}
    const angles=Array.from({length:Math.ceil(360/selected.p)},(_,i)=>i*selected.p*Math.PI/180);const points=angles.map(a=>`<path d="M80 80L${80+Math.cos(a)*54} ${80+Math.sin(a)*54}" stroke="#A9432D" stroke-width="3"/><circle cx="${80+Math.cos(a)*54}" cy="${80+Math.sin(a)*54}" r="3" fill="#A9432D"/>`).join('');
    $('#layout').innerHTML=`<figure>${FieldScene.layout(selected.d,selected.l)}<figcaption>${selected.d} 孔/m · 穿深 ${selected.l}mm<br>二维展开，非比例</figcaption></figure><figure><svg viewBox="0 0 160 160" role="img" data-phase="${selected.p}" aria-label="相位${selected.p}度的井筒俯视示意"><circle cx="80" cy="80" r="54" fill="#242822" stroke="#A88B65" stroke-width="1"/><circle cx="80" cy="80" r="26" fill="none" stroke="#62665C" stroke-width="1"/>${points}<circle cx="80" cy="80" r="16" fill="#FFFCF5" stroke="#62665C" stroke-width="4"/></svg><figcaption>相位 ${selected.p}° · 相邻孔眼方位<br>俯视示意，非真实三维轨迹</figcaption></figure>`;
  }
  function choose(index){selected=results.all[index];if(selected.cost>results.budget)return;render(false);reportState();}
  const signed=(v,n=2)=>(v>=0?'+':'−')+num(Math.abs(v),n);
  function explain(){
    const base=experience(results.k),by=predict(base),bc=cost(base),best=results.feasible[0];
    const budgetText=c=>c<=results.budget?`预算内 · 结余 ${num(results.budget-c,1)}（使用 ${num(c/results.budget*100,1)}%）`:`超预算 ${num(c-results.budget,1)} · 不可行`;
    const card=(title,x,y,c)=>`<article class="compare-card"><h3>${title}</h3><p class="parameters">${x.d} 孔/m · ${x.p}° · ${x.l} mm</p><b>${num(y)}<small> 预测响应指数</small></b><div class="response-track"><span style="width:${Math.min(100,y/110*100)}%"></span></div><p>施工代价 ${num(c,1)} / ${results.budget}</p><p class="${c>results.budget?'error':'note'}">${budgetText(c)}</p></article>`;
    $('#comparison').innerHTML=card('传统经验方案（教学对照）',base,by,bc)+(best?card('AI 智能推荐方案',best,best.response,best.cost):'<article class="compare-card"><h3>AI 智能推荐方案</h3><p>当前预算无可行解，无法给出推荐。</p></article>');
    $('#gain').textContent=best?`预测响应 ${signed((best.response-by)/by*100,1)}% · ${signed(best.response-by)} 指数；可行 ${results.feasible.length}/75，Pareto 前沿 ${results.pareto.length} 个。`:'无可行解：不显示增益或特征贡献。最低施工代价为 '+num(Math.min(...results.all.map(x=>x.cost)),1)+'。';
    $('#gain').classList.toggle('error',!!best&&best.response<by);
    $('#constraint-check').textContent=best?`约束检测：经验方案${bc>results.budget?'超预算':'满足预算'}；AI 方案满足预算。经验响应相对最优可行响应${best.response>=by?'低 '+num((best.response-by)/best.response*100,1)+'%':'高 '+num((by-best.response)/best.response*100,1)+'%（但不可行）'}。这是方案响应差距，不是回归欠拟合判定。`:`约束检测：经验方案${bc>results.budget?'超预算':'满足预算'}；搜索没有可行方案。`;
    $('#search-timing').textContent=`单次代理预测实测均值 ${num(results.predictionMs,4)} ms（固定1000次计时均值，${results.predictionMs<1?'小于':'不小于'}1 ms）。本次首次搜索 ${num(results.elapsedMs,3)} ms（75组预测、预算筛选与 Pareto 比较；相同条件复用缓存）。计时随设备负载变化，不参与响应或推荐计算。`;
    if(!best){$('#contribution-chart').innerHTML='<p class="note">提高预算并重新计算后查看贡献。</p>';$('#contribution-summary').textContent='';return;}
    const values=contributions(base,best),scale=Math.max(1,...Object.values(values).map(Math.abs)),zero=340,width=140;
    let svg=`<svg viewBox="0 0 680 174" role="img" aria-label="经验方案到AI推荐方案的预测响应贡献，单位为响应指数"><path d="M${zero} 10V146" stroke="#62665C" stroke-dasharray="3 3"/>`;
    for(const [i,key] of ['d','p','l'].entries()){
      const v=values[key],y=16+i*44,w=Math.abs(v)/scale*width;
      svg+=`<text x="8" y="${y+18}">${{d:'孔密',p:'相位',l:'穿深'}[key]} ${base[key]} → ${best[key]}</text><rect x="${v>=0?zero:zero-w}" y="${y}" width="${w}" height="26" rx="2" fill="${v>=0?'#245B50':'#A9432D'}"/><text x="${zero+width+16}" y="${y+18}">${signed(v,3)}</text>`;
    }
    $('#contribution-chart').innerHTML=svg+`<text x="${zero}" y="166">0 · 响应指数增量（可为负）</text></svg>`;
    $('#contribution-summary').textContent=`贡献合计 ${signed(Object.values(values).reduce((a,b)=>a+b,0),3)} = 推荐响应 ${num(best.response,3)} − 经验响应 ${num(by,3)}。枚举三变量的6种替换顺序取平均，交互项由相关变量分摊；固定渗透率，不表示因果贡献或现场增产。`;
  }
  function render(refreshTable=true){
    plot();layout();explain();$('#result-conditions').textContent=`本次结果：${results.k}mD · 预算${results.budget}`;
    $('#feasible').textContent=`${results.feasible.length} / 75 个可行组合`;
    if(selected){const baseline={k:selected.k,d:12,p:90,l:300},gain=selected.response-predict(baseline);$('#selection').innerHTML=`当前方案：<b>${selected.d} 孔/m · ${selected.p}° · ${selected.l} mm</b><br>预测响应 ${num(selected.response)} · 代价 ${num(selected.cost,1)} / 预算 ${results.budget}<br>相对默认响应 ${gain>=0?'+':''}${num(gain)}${cost(baseline)>results.budget?'（默认方案超出本次预算）':''}`;}
    else $('#selection').textContent='当前预算下没有可行解。最便宜组合代价32.8，请提高预算后重新计算。';
    if(refreshTable)$('#candidates').innerHTML='<table><thead><tr><th>选择</th><th>孔密 / 孔·m⁻¹</th><th>相位 / °</th><th>穿深 / mm</th><th>代价指数</th><th>响应指数</th></tr></thead><tbody>'+results.feasible.map(x=>`<tr class="${selected?.index===x.index?'selected':''}"><td><button data-index="${x.index}" aria-pressed="${selected?.index===x.index}" aria-label="选择${x.d}孔每米、${x.p}度、${x.l}毫米方案">选择</button></td><td>${x.d}</td><td>${x.p}</td><td>${x.l}</td><td>${num(x.cost,1)}</td><td>${num(x.response)}</td></tr>`).join('')+'</tbody></table>';
    $('#candidates').querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.index)===selected?.index;b.setAttribute('aria-pressed',String(active));b.closest('tr').classList.toggle('selected',active);b.onclick=()=>choose(Number(b.dataset.index));});
  }
  function calculate(k=Number($('#permeability').value),budget=Number($('#budget').value),index=null,forceDefault=false){
    const button=$('#calculate');button.disabled=true;button.setAttribute('aria-busy','true');$('#input-status').className='note';$('#input-status').textContent='正在计算…';$('#message').classList.remove('error');
    try{
      if(!Number.isFinite(k)||k<10||k>200||!Number.isFinite(budget)||budget<10||budget>110)throw Error('输入超出教学支持范围：渗透率10—200mD、预算10—110。');
      const key=k+'/'+budget;if(!forceDefault&&results?.k===k&&results?.budget===budget&&index===null)index=selected?.index??null;if(!cache.has(key)){cache.set(key,{...search(k,budget),k,budget});global.PerforationRunStats.searches++;}results=cache.get(key);selected=index===null?results.feasible[0]||null:results.feasible.find(x=>x.index===index)||results.feasible[0]||null;
      $('#metrics').innerHTML=`<div class="stat"><span>模型测试 MAE</span><b>${num(mae,3)}</b></div><div class="stat"><span>均值基线 MAE</span><b>${num(baselineMAE,3)}</b></div><div class="stat"><span>训练 / 测试样本</span><b>192 / 48</b></div><div class="stat"><span>默认响应指数</span><b>${num(predict({k,d:12,p:90,l:300}))}</b></div>`;
      render();syncDirty();reportState();$('#input-status').textContent='';
    }catch(e){$('#input-status').className='note error';$('#input-status').textContent=e.message;$('#message').textContent=results?'输入未通过检查，保留上次有效结果。':'输入未通过检查，尚无计算结果。';$('#message').classList.add('error');}finally{button.disabled=false;button.setAttribute('aria-busy','false');}
  }
  $('#calculate').onclick=()=>calculate();for(const id of ['#budget','#permeability'])$(id).oninput=()=>{labels();syncDirty();};
  function segmentButtons(){document.querySelectorAll('[data-segment]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.segment)===activeSegment)));}
  document.querySelectorAll('[data-segment]').forEach(b=>b.onclick=()=>{activeSegment=Number(b.dataset.segment);$('#permeability').value=[40,100,180][activeSegment];segmentButtons();labels();calculate();});
  $('#reset').onclick=()=>{$('#permeability').value=40;$('#budget').value=65;activeSegment=0;segmentButtons();labels();calculate(40,65,null,true);};
  $('#export').onclick=()=>{if(!results)return;const csv='\uFEFF渗透率(mD),孔密(孔/m),相位(度),穿深(mm),代价指数,响应指数,预算内\n'+results.all.map(x=>[x.k,x.d,x.p,x.l,x.cost,num(x.response,6),x.cost<=results.budget?'是':'否'].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='射孔参数候选.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('#test-results').innerHTML='<table><thead><tr><th>样本</th><th>参考指数</th><th>预测指数</th><th>绝对误差</th></tr></thead><tbody>'+test.map(r=>`<tr><td>${r.id}</td><td>${num(r.y,3)}</td><td>${num(predict(r),3)}</td><td>${num(Math.abs(predict(r)-r.y),3)}</td></tr>`).join('')+'</tbody></table>';
  // Resize callbacks only schedule work; drawing and iframe sizing happen next frame.
  // Watching width avoids replotting in response to the SVG's own height changes.
  let plotFrame=0,lastPlotWidth=0;
  new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(Math.abs(width-lastPlotWidth)<1)return;lastPlotWidth=width;cancelAnimationFrame(plotFrame);plotFrame=requestAnimationFrame(()=>{if(results)plot();});}).observe($('#scatter'));
  let lastHeight=0,heightFrame=0;
  new ResizeObserver(()=>{if(heightFrame)return;heightFrame=requestAnimationFrame(()=>{heightFrame=0;const height=Math.ceil(document.body.getBoundingClientRect().height);if(Math.abs(height-lastHeight)>4){lastHeight=height;parent.postMessage({type:'field-demo-height',height:height+8},'*');}});}).observe(document.body);
  addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='field-motion'){motion=e.data.enabled;document.body.classList.toggle('paused',!motion);}if(e.data?.type==='field-state'){motion=e.data.enabled;const s=e.data.state;if(s){$('#permeability').value=s.k;$('#budget').value=s.budget;activeSegment=s.segment;segmentButtons();calculate(s.computedK,s.computedBudget,s.selected);labels();syncDirty();}document.body.classList.toggle('paused',!motion);}});
  window.addEventListener('error',e=>parent.postMessage({type:'field-demo-error',message:e.message||'资源读取失败'},'*'));
  let initial=null;try{initial=JSON.parse(new URLSearchParams(location.hash.slice(1)).get('state')||'null')}catch{}
  if(initial){$('#permeability').value=initial.k;$('#budget').value=initial.budget;activeSegment=initial.segment;segmentButtons();labels();calculate(initial.computedK,initial.computedBudget,initial.selected);syncDirty();}else{labels();calculate();}
})(typeof window==='undefined'?globalThis:window);
