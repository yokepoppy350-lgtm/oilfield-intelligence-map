/* 地图上的射孔教学实验，复用案例的样本、模型和候选搜索。 */
window.FieldStudy = (() => {
  let k=40, budget=65, mode='optimized';
  function mount(stage) {
    const page=document.querySelector('.atlas-page');
    page.querySelector('.field-study')?.remove();
    page.querySelector('.field-intro')?.remove();
    const intro=document.createElement('div');intro.className='field-intro';
    intro.innerHTML='<small>井场与储层剖面 · 非比例示意</small>';
    page.append(intro);intro.hidden=!!stage;
    if(stage!=='perforation')return;
    const el=document.createElement('section');el.className='field-study';el.setAttribute('aria-label','射孔决策实验');
    el.innerHTML=`<div class="study-head"><span>射孔决策实验</span><small>回归代理模型 + 约束搜索</small></div><p>孔道连接储层与井筒。增加孔数和穿深可能提高响应，也会增加代价。模型帮助比较组合。</p><div class="study-inputs"><label>储层渗透率<select id="study-k"><option value="40">40 mD</option><option value="100">100 mD</option><option value="180">180 mD</option></select></label><label>施工预算<select id="study-budget"><option value="25">25 · 检查无解</option><option value="48">48</option><option value="65">65</option><option value="90">90</option></select></label></div><div class="study-modes"><button data-study-mode="baseline">默认方案</button><button data-study-mode="optimized">模型推荐</button></div><div class="study-result" aria-live="polite"></div><div class="study-comparison"></div><div class="study-chart"></div><p class="study-legend">● 预算内　◇ 预算外　＋ 默认　□ 推荐</p><details><summary>模型如何得到这个结果？</summary><ol><li>240条教学合成样本：渗透率、孔密、相位、穿深 响应指数。</li><li>用192条训练样本拟合含交互项的回归模型。</li><li>在48条留出样本上，与训练集均值预测比较误差。</li><li>枚举75个组合，排除超预算方案，再按预测响应排序。</li></ol><div class="study-validation"></div></details><a class="study-enter" href="#/case/perforation-optimization?tab=demo">进入完整案例：查看样本与计算</a><button class="study-reset">恢复默认井况和预算</button><small class="study-limit">教学响应与代价均为无量纲指数，未校准现场资料；图中的流线仅解释连通关系。</small>`;
    document.querySelector('#stage-panel').prepend(el);
    el.querySelector('#study-k').value=k;el.querySelector('#study-budget').value=budget;
    for(const id of ['study-k','study-budget'])el.querySelector('#'+id).onchange=()=>{k=Number(el.querySelector('#study-k').value);budget=Number(el.querySelector('#study-budget').value);update(el);};
    el.querySelectorAll('[data-study-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.studyMode;update(el);});
    el.querySelector('.study-reset').onclick=()=>{k=40;budget=65;mode='optimized';el.querySelector('#study-k').value=k;el.querySelector('#study-budget').value=budget;update(el);};
    update(el);
  }
  function update(el){
    const m=PerforationModel,r=m.search(k,budget),best=r.feasible[0],base={k,d:12,p:90,l:300};base.cost=m.cost(base);base.response=m.predict(base);
    const selected=mode==='baseline'?base:best;
    el.querySelectorAll('[data-study-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studyMode===mode)));
    if(selected){
      oilfieldEngine.setParams(selected.d,selected.l,selected.p);
      el.querySelector('.study-result').innerHTML=`<strong>${mode==='baseline'?'默认方案':'预算内推荐'}：${selected.d} 孔/m · ${selected.p}° · ${selected.l} mm</strong><dl><div><dt>预测响应指数</dt><dd>${selected.response.toFixed(2)}</dd></div><div><dt>代价 / 预算</dt><dd>${selected.cost.toFixed(1)} / ${budget}</dd></div></dl><p>${selected.cost>budget?'此方案超出当前预算。':`预算内 ${r.feasible.length} / 75 个组合。`}${best?` 推荐相对默认响应差 ${(best.response-base.response)>=0?'+':''}${(best.response-base.response).toFixed(2)}。`:''}</p>`;
    }else{
      oilfieldEngine.setParams(0,0,120);
      el.querySelector('.study-result').innerHTML='<strong>当前预算没有可行组合</strong><p>最便宜组合代价32.8。提高预算后重新比较；无解时不显示推荐孔道。</p>';
    }
    const page=el.closest('.atlas-page');page.querySelectorAll('[data-map-value]').forEach(n=>n.textContent=selected?({density:selected.d,phase:selected.p,penetration:selected.l})[n.dataset.mapValue]:'—');
    el.querySelector('.study-comparison').innerHTML=`<table class="study-compare"><caption>同一井况下比较 · 均为教学指数</caption><thead><tr><th>方案</th><th>响应</th><th>代价</th><th>预算内</th></tr></thead><tbody><tr><td>默认</td><td>${base.response.toFixed(2)}</td><td>${base.cost.toFixed(1)}</td><td>${base.cost<=budget?'是':'否'}</td></tr><tr><td>推荐</td><td>${best?best.response.toFixed(2):'—'}</td><td>${best?best.cost.toFixed(1):'—'}</td><td>${best?'是':'无解'}</td></tr></tbody></table>`;
    const x=v=>35+(v-25)/65*280,y=v=>155-(v-45)/65*120;
    let svg='<svg viewBox="0 0 340 190" role="img" aria-label="75个候选方案的代价与预测响应，虚线为当前预算"><text x="35" y="14">预测响应指数</text>';
    for(const v of [50,70,90,110])svg+=`<path d="M35 ${y(v)}H315" class="study-grid"/><text x="4" y="${y(v)+4}">${v}</text>`;
    for(const v of [30,50,70,90])svg+=`<text x="${x(v)}" y="174">${v}</text>`;
    svg+=`<text x="246" y="189">代价指数</text>`;
    if(budget>=25&&budget<=90)svg+=`<path d="M${x(budget)} 25V155" class="study-budget-line"/>`;
    for(const c of r.all)svg+=c.cost<=budget?`<circle cx="${x(c.cost)}" cy="${y(c.response)}" r="2.8" fill="#9fbaaa"/>`:`<path d="M${x(c.cost)} ${y(c.response)-3}l3 3-3 3-3-3Z" fill="none" stroke="#5c625a"/>`;
    svg+=`<path d="M${x(base.cost)-5} ${y(base.response)}h10M${x(base.cost)} ${y(base.response)-5}v10" stroke="#edece6" stroke-width="2"/>`;
    if(best)svg+=`<rect x="${x(best.cost)-5}" y="${y(best.response)-5}" width="10" height="10" fill="none" stroke="#c65d3b" stroke-width="2"/>`;
    el.querySelector('.study-chart').innerHTML=svg+'</svg>';
    el.querySelector('.study-validation').textContent=`同一48条测试样本：模型 MAE ${m.mae.toFixed(3)}；均值基线 MAE ${m.baselineMAE.toFixed(3)}。合成数据上的误差不代表现场预测能力。`;
  }
  return {mount};
})();
