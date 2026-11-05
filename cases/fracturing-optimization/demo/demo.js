/* 固定种子的教学样本与前端小模型。所有测试指标由当前预测计算。 */
(function(){
'use strict';
const cfg=window.CASE_CONFIG, $=s=>document.querySelector(s),fmt=(n,d=3)=>Number(n).toFixed(d);
let seed=cfg.seed;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rows=Array.from({length:240},(_,id)=>{const x=[rng(),rng(),rng()];return {id,x,noise:(rng()-.5)};});
const train=rows.filter(r=>r.id%5!==0),test=rows.filter(r=>r.id%5===0);
const features=x=>[1,...x,x[0]*x[1],x[0]**2,x[1]**2];
function fit(data,target){const n=features(data[0].x).length,a=Array.from({length:n},()=>Array(n+1).fill(0));for(const r of data){const f=features(r.x);for(let i=0;i<n;i++){for(let j=0;j<n;j++)a[i][j]+=f[i]*f[j];a[i][n]+=f[i]*target(r);}}for(let i=0;i<n;i++){a[i][i]+=1e-7;let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;[a[i],a[p]]=[a[p],a[i]];const div=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=div;for(let k=0;k<n;k++){if(k===i)continue;const q=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=q*a[i][j];}}return x=>features(x).reduce((v,f,i)=>v+f*a[i][n],0);}
const majority=labels=>[...new Set(labels)].sort((a,b)=>labels.filter(v=>v===b).length-labels.filter(v=>v===a).length)[0];
const knn=(x,labels)=>{const ns=train.map((r,i)=>({label:labels[i],d:r.x.reduce((s,v,j)=>s+(v-x[j])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,7);return {label:majority(ns.map(n=>n.label)),votes:ns};};
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mae=(a,b)=>mean(a.map((v,i)=>Math.abs(v-b[i])));
const metric=(a,b)=>{let tp=0,fp=0,fn=0,ok=0;a.forEach((v,i)=>{if(v===b[i])ok++;if(v===1&&b[i]===1)tp++;if(v===0&&b[i]===1)fp++;if(v===1&&b[i]===0)fn++;});return {accuracy:ok/a.length,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),f1:2*tp/(2*tp+fp+fn||1),iou:tp/(tp+fp+fn||1),tp,fp,fn};};
function svg(body,desc='计算结果'){return `<svg viewBox="0 0 680 360" role="img" aria-label="${desc}">${body}</svg>`;}
function line(values,color,min,max,dash=''){return `<path d="${values.map((v,i)=>(i?'L':'M')+(44+i/(values.length-1)*600)+' '+(310-(v-min)/(max-min)*260)).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`;}
function axes(xlabel,ylabel){return `<path d="M44 35V310H650" fill="none" stroke="#71806e"/><text x="44" y="22">${ylabel}</text><text x="490" y="347">${xlabel}</text>`;}
function confusion(truth,pred,names){let cells='';names.forEach((name,i)=>names.forEach((_,j)=>{const count=truth.filter((v,k)=>v===i&&pred[k]===j).length;cells+=`<rect x="${160+j*100}" y="${55+i*76}" width="96" height="70" fill="${i===j?'#34594a':'#51352b'}"/><text x="${205+j*100}" y="${98+i*76}" text-anchor="middle">${count}</text>`;}));return svg(`<text x="160" y="23">预测类别 →</text>${names.map((n,i)=>`<text x="${200+i*100}" y="48" text-anchor="middle">${n}</text><text x="20" y="${98+i*76}">${n}</text>`).join('')}${cells}<text x="20" y="335">行：参考类别；列：模型预测。数字为留出样本数量。</text>`,'留出测试样本混淆矩阵');}
function inputs(label,min,max,value,step=1){$('#controls').innerHTML=`<label>${label}<input id="control" type="range" min="${min}" max="${max}" value="${value}" step="${step}"><output id="out"></output></label><button id="reset">恢复默认</button>`;$('#reset').onclick=()=>{$('#control').value=value;run();};$('#control').oninput=run;}
function stats(pairs){$('#metrics').innerHTML=pairs.map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');}
function draw(){const v=Number($('#control').value);$('#out').textContent=v;let report={};
if(cfg.kind==='channel'){
  const target=r=>620-230*r.x[0]+90*r.x[1]+35*r.x[0]*r.x[1]+r.noise*25,predict=fit(train,target),truth=test.map(target),pred=test.map(r=>predict(r.x)),baseline=mean(train.map(target)),x=[v/100,.6,.5],length=predict(x),width=12+18*(1-x[0]);
  $('#main-graphic').innerHTML=svg(`<rect x="60" y="60" width="560" height="240" fill="#263b30"/><rect x="68" y="60" width="20" height="240" fill="#a9ada2"/><path d="M88 ${180-width}Q${100+length*.45} ${180-width*.7} ${88+length*.72} 180Q${100+length*.45} ${180+width*.7} 88 ${180+width}Z" fill="#c65d3b"/><path d="M88 265H${88+length*.72}" stroke="#ddd4b9"/><text x="125" y="294">预测穿深 ${fmt(length,1)} mm · 孔口直径 ${fmt(width*2,1)} mm（规则示意）</text><text x="60" y="38">岩石强度教学设定 ${v} MPa · 固定装药条件</text>`,'不同岩石强度下的预测孔道轮廓');
  $('#secondary').innerHTML=svg(axes('参考穿深 / mm','预测穿深 / mm')+`<path d="M44 310L644 50" stroke="#8d8e7e" stroke-dasharray="5 5"/>`+truth.map((t,i)=>`<circle cx="${44+(t-300)/450*600}" cy="${310-(pred[i]-300)/450*260}" r="3" fill="#a8c4ad"/>`).join(''));
  stats([['测试 MAE / mm',fmt(mae(truth,pred))],['均值基线 MAE / mm',fmt(mae(truth,truth.map(()=>baseline)))],['训练 / 测试','192 / 48']]);report={length,mae:mae(truth,pred)};
}else if(cfg.kind==='charge'){
  const label=r=>r.x[0]+.5*r.x[1]+r.noise*.12>.95?2:r.x[1]>.55?1:0,labels=train.map(label),truth=test.map(label),pred=test.map(r=>knn(r.x,labels).label),x=[v/100,.6,.5],res=knn(x,labels),names=['A型','B型','C型'];
  $('#main-graphic').innerHTML=svg(`<text x="40" y="30">当前强度 ${v} MPa · 套管厚度条件固定</text>`+names.map((n,i)=>{const votes=res.votes.filter(t=>t.label===i).length;return `<text x="40" y="${85+i*75}">${n}</text><rect x="110" y="${60+i*75}" width="${votes*65}" height="35" fill="${i===res.label?'#c65d3b':'#34594a'}"/><text x="${125+votes*65}" y="${85+i*75}">${votes} / 7 邻居</text>`;}).join('')+`<text x="40" y="330">推荐 ${names[res.label]}；A/B/C为教学类别，不对应实际商品。</text>`);
  $('#secondary').innerHTML=confusion(truth,pred,names);stats([['测试准确率',fmt(metric(truth,pred).accuracy*100,1)+'%'],['多数类基线',fmt(truth.filter(t=>t===majority(labels)).length/48*100,1)+'%'],['训练 / 测试','192 / 48']]);report={recommendation:names[res.label],accuracy:metric(truth,pred).accuracy};
}else if(cfg.kind==='effect'){
  const label=r=>r.x[0]-.65*r.x[1]+r.noise*.2>.15?1:0,labels=train.map(label),truth=test.map(label),scores=test.map(r=>knn(r.x,labels).votes.filter(n=>n.label===1).length/7),pred=scores.map(s=>s>=v/100?1:0),m=metric(truth,pred);
  $('#main-graphic').innerHTML=svg(axes('48条留出井段记录 →','增效类别得分 / 0—1')+`<path d="M44 ${310-v/100*260}H644" stroke="#c65d3b" stroke-dasharray="4 4"/>`+scores.map((s,i)=>`<circle cx="${50+i/47*580}" cy="${310-s*260}" r="4" fill="${truth[i]?'#a8c4ad':'#c65d3b'}"/>`).join('')+`<text x="60" y="339">浅绿：参考有效；橙色：参考无效；虚线：决策阈值。</text>`);
  $('#secondary').innerHTML=confusion(truth,pred,['无效','有效']);stats([['精确率',fmt(m.precision)],['召回率',fmt(m.recall)],['F1',fmt(m.f1)],['多数类基线准确率',fmt(truth.filter(t=>t===majority(labels)).length/48)]]);report=m;
}else if(cfg.kind==='welllog'){
  const label=r=>r.x[0]>.65?0:r.x[1]>.5?1:2,labels=train.map(label),truth=test.map(label),shift=test.map(r=>r.x.map((x,j)=>Math.max(0,Math.min(1,x+Math.sin(r.id*3+j)*v/100)))),pred=shift.map(x=>knn(x,labels).label),colors=['#96836b','#557b67','#6b8193'];
  $('#main-graphic').innerHTML=svg(`<text x="40" y="25">48个留出采样点 · 相对深度向下（非实际井深）</text>`+truth.map((t,i)=>`<rect x="75" y="${40+i*5.2}" width="80" height="5.2" fill="${colors[t]}"/><rect x="170" y="${40+i*5.2}" width="80" height="5.2" fill="${colors[pred[i]]}"/><circle cx="${320+shift[i][0]*260}" cy="${40+i*5.2}" r="2" fill="#c6d1bc"/>`).join('')+`<text x="75" y="318">参考</text><text x="170" y="318">预测</text><text x="320" y="318">归一化伽马特征 0 → 1</text><text x="60" y="347">灰褐：泥岩；青绿：砂岩；灰蓝：碳酸盐岩。均为教学标签。</text>`);
  $('#secondary').innerHTML=confusion(truth,pred,['泥岩','砂岩','碳酸盐']);stats([['当前噪声下准确率',fmt(metric(truth,pred).accuracy*100,1)+'%'],['多数类基线',fmt(truth.filter(t=>t===majority(labels)).length/48*100,1)+'%'],['训练 / 测试','192 / 48']]);report={accuracy:metric(truth,pred).accuracy};
}else if(cfg.kind==='fracture'){
  const pos=mean(train.filter(r=>r.x[0]>.5).map(r=>.3+r.noise*.5)),neg=mean(train.filter(r=>r.x[0]<=.5).map(r=>.7+r.noise*.5));let truth=[],pred=[],body='';
  for(let y=0;y<36;y++)for(let x=0;x<48;x++){const t=Math.abs(y-(17+8*Math.sin(x/48*Math.PI*2)))<1.2?1:0,intensity=Math.max(0,Math.min(1,(t?.3:.7)+Math.sin(x*78+y*13)*.25)),score=(neg-intensity)/(neg-pos),q=score>=v/100?1:0;truth.push(t);pred.push(q);const shade=Math.round(intensity*210);body+=`<rect x="${25+x*6}" y="${55+y*7}" width="6" height="7" fill="rgb(${shade},${shade},${shade})"/><rect x="${360+x*6}" y="${55+y*7}" width="6" height="7" fill="${q?'#c65d3b':'#17251e'}"/>`;}
  const m=metric(truth,pred);$('#main-graphic').innerHTML=svg(`<text x="25" y="30">合成井壁展开图</text><text x="360" y="30">学习灰度分布后分割</text>${body}<text x="25" y="340">横向：方位展开；纵向：相对深度。橙色为预测裂缝。</text>`);$('#secondary').innerHTML=confusion(truth,pred,['非裂缝','裂缝']);stats([['像素 IoU',fmt(m.iou)],['像素 F1',fmt(m.f1)],['全判非裂缝基线 IoU','0.000'],['训练 / 测试像素','192 / 1728']]);report=m;
}else if(cfg.kind==='forecast'){
  const series=Array.from({length:90},(_,i)=>100*Math.exp(-.012*i)+(rngForecast(i)-.5)*5),training=series.slice(0,60),xs=Array.from({length:60},(_,i)=>i),ym=mean(training.map(Math.log)),xm=29.5,b=xs.reduce((s,x,i)=>s+(x-xm)*(Math.log(training[i])-ym),0)/xs.reduce((s,x)=>s+(x-xm)**2,0),a=ym-b*xm,pred=series.map((_,i)=>Math.exp(a+b*i)),h=v,truth=series.slice(60,60+h),estimated=pred.slice(60,60+h),baseline=truth.map(()=>training[59]);
  $('#main-graphic').innerHTML=svg(axes('时间 / 天（第1—90天）','产量教学指数（0—110）')+`<rect x="${44+60/89*600}" y="35" width="${29/89*600}" height="275" fill="#23372d" opacity=".7"/>`+line(series,'#c6d1bc',0,110)+line(pred,'#c65d3b',0,110,'5 4')+`<text x="70" y="65">前60天训练</text><text x="460" y="65">后30天留出</text><text x="70" y="337">浅色：参考；橙色虚线：对数线性回归预测。测试期不参与拟合。</text>`);
  $('#secondary').innerHTML=svg(axes('留出天数 →','绝对误差 / 指数')+line(truth.map((t,i)=>Math.abs(t-estimated[i])),'#c65d3b',0,40)+line(truth.map((t,i)=>Math.abs(t-baseline[i])),'#a8c4ad',0,40,'5 4'));
  stats([['留出 '+h+' 天 MAE',fmt(mae(truth,estimated))],['末值保持基线 MAE',fmt(mae(truth,baseline))],['训练 / 完整留出','60 / 30 天']]);report={mae:mae(truth,estimated),baseline:mae(truth,baseline)};
}else if(cfg.kind==='fracturing'){
  const target=r=>40+32*r.x[0]+28*r.x[1]-20*r.x[0]**2-16*r.x[1]**2+18*r.x[0]*r.x[1]+r.noise*2,predict=fit(train,target),truth=test.map(target),pred=test.map(r=>predict(r.x)),all=[];
  for(let fluid=1;fluid<=5;fluid++)for(let sand=1;sand<=5;sand++)all.push({fluid,sand,cost:10+fluid*8+sand*6,response:predict([fluid/5,sand/5,.5])});const feasible=all.filter(c=>c.cost<=v).sort((a,b)=>b.response-a.response),best=feasible[0],base=all.find(c=>c.fluid===2&&c.sand===2);
  $('#main-graphic').innerHTML=svg(axes('代价指数（20—90）','预测响应指数（40—90）')+`<path d="M${44+(v-20)/70*600} 35V310" stroke="#c65d3b" stroke-dasharray="4 4"/>`+all.map(c=>`<circle cx="${44+(c.cost-20)/70*600}" cy="${310-(c.response-40)/50*260}" r="${best===c?8:5}" fill="${best===c?'#c65d3b':c.cost<=v?'#a8c4ad':'#555a51'}"><title>液量等级${c.fluid}、砂量等级${c.sand}：响应${fmt(c.response)}</title></circle>`).join(''));
  $('#secondary').innerHTML=best?`<p>推荐液量等级 <b>${best.fluid}</b>、砂量等级 <b>${best.sand}</b>。代价${best.cost} / 预算${v}，响应${fmt(best.response)}；默认2/2方案响应${fmt(base.response)}，代价${base.cost}。</p>`:'<p>当前预算无可行组合，最低代价24。提高预算后重新比较。</p>';
  stats([['可行候选',feasible.length+' / 25'],['模型测试 MAE',fmt(mae(truth,pred))],['均值基线 MAE',fmt(mae(truth,truth.map(()=>mean(train.map(target)))))] ]);report={feasible:feasible.length,recommendation:best||null};
}
window.CaseResult={...report,kind:cfg.kind,input:v};$('#status').textContent='已按当前输入重新计算。全部数据为固定种子的教学合成数据。';
}
function rngForecast(i){let x=(i+cfg.seed)*374761393;x=(x^(x>>>13))*1274126177;return ((x^(x>>>16))>>>0)/4294967296;}
function run(){try{draw();}catch(e){$('#status').textContent='计算失败：'+e.message;throw e;}}
document.querySelector('#title').textContent=cfg.title;document.querySelector('#question').textContent=cfg.question;
const setup={channel:['岩石强度 / MPa（教学设定）',20,100,60],charge:['岩石强度 / MPa（教学设定）',10,100,55],effect:['判为有效的阈值 / %',10,90,50],welllog:['测试特征附加噪声 / %',0,50,0],fracture:['裂缝判定得分阈值 / %',10,90,50],forecast:['参与评价的留出天数',5,30,20],fracturing:['施工预算指数',15,90,60]}[cfg.kind];inputs(...setup);run();
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({case:cfg.id,seed:cfg.seed,result:window.CaseResult},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=cfg.id+'-结果.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
