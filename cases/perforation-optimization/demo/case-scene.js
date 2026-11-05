window.FieldScene=(()=>{
  const stages=[['geology','地质'],['seismic','地震'],['drilling','钻井'],['mudlogging','录井'],['welllog','测井'],['cementing','固井'],['completion','完井'],['perforation','射孔'],['production','采油'],['workover','修井'],['eor','增采'],['transport','运输'],['refining','加工']];
  const positions=[[68,220],[174,246],[308,240],[404,278],[500,316],[596,342],[688,314],[812,370],[936,250],[1036,290],[1136,338],[1246,218],[1350,194]];
  const anchors=Object.fromEntries(stages.map(([id],i)=>[id,{x:positions[i][0],y:positions[i][1]}]));
  const opacity=(mode,key)=>mode==='all'||mode===key?1:.14;
  let current={d:20,p:120,l:400};
  const boundary=(x,y)=>y+12*Math.sin(x/200)+8*Math.cos(x/360);
  const pathAt=y=>Array.from({length:73},(_,i)=>{const x=i*20;return(i?'L':'M')+x+' '+boundary(x,y).toFixed(2)}).join(' ');
  const band=(top,bottom)=>pathAt(top)+Array.from({length:73},(_,i)=>{const x=1440-i*20;return'L'+x+' '+boundary(x,bottom).toFixed(2)}).join(' ')+'Z';
  function wellCore(x,top,bottom,mode='all'){
    return `<g class="well-assembly" data-geometry="engineering-section-v3"><g class="well-cement" opacity="${opacity(mode,'cement')}" fill="#A88B65" fill-opacity=".55" stroke="#DBC9A8" stroke-width=".65"><rect x="${x-18}" y="${top}" width="8" height="${bottom-top}"/><rect x="${x+10}" y="${top}" width="8" height="${bottom-top}"/></g><g class="well-casing" opacity="${opacity(mode,'casing')}" fill="#62665C" stroke="#F4F0E6" stroke-width=".65"><rect x="${x-10}" y="${top}" width="4" height="${bottom-top}"/><rect x="${x+6}" y="${top}" width="4" height="${bottom-top}"/></g><rect x="${x-6}" y="${top}" width="12" height="${bottom-top}" fill="#242822"/></g>`;
  }
  function channels(x,y,count,length,spacing=12){return Array.from({length:count},(_,i)=>{const side=i%2?1:-1,yy=y+i*spacing,start=x+side*6,tip=x+side*(18+length);return `<path d="M${start} ${yy-.65}L${tip} ${yy}L${start} ${yy+.65}" fill="#A9432D" stroke="#DBC9A8" stroke-width=".45"/>`}).join('')}
  function perforations(mode='all'){return `<g class="target-well thumb-channels" opacity="${opacity(mode,'channel')}" data-density="${current.d}" data-penetration="${current.l}">${channels(812,337,current.d,current.l/10,64/(current.d-1))}</g>`}
  function flow(){return Array.from({length:24},(_,i)=>{const side=i<12?-1:1,j=i%12,sy=318+j*8,sx=812+side*(90+(j%4)*20),ty=341+j*5;return `<path d="M${sx} ${sy}C${812+side*62} ${sy} ${812+side*38} ${ty} ${812+side*7} ${ty}" fill="none" stroke="#DBC9A8" stroke-width=".8" stroke-dasharray="2 12" opacity=".75"/>`}).join('')}
  function map(mode='all'){
    return `<svg viewBox="0 0 1440 496" role="img" aria-label="油田作业工程剖面：连续地层、井身、射孔与生产设施" shape-rendering="geometricPrecision"><rect width="1440" height="496" fill="#242822"/>
      <g class="geology" opacity="${opacity(mode,'reservoir')}"><path d="${band(300,406)}" fill="#245B50" fill-opacity=".44"/>
      ${[142,220,300,406].map((y,i)=>`<path d="${pathAt(y)}" stroke="${i===0?'#F4F0E6':'#A88B65'}" stroke-width="${i===0?1.25:.8}" fill="none" opacity="${i===0?.8:.75}"/>`).join('')}
      ${Array.from({length:25},(_,i)=>`<path d="${pathAt(155+i*12)}" stroke="#DBC9A8" stroke-width=".35" fill="none" opacity=".13"/>`).join('')}
      ${Array.from({length:23},(_,i)=>{const x=36+i*64;return `<path d="M${x} ${boundary(x,155)}L${x+23} ${boundary(x+23,440)}" stroke="#DBC9A8" stroke-width=".35" opacity=".11"/>`}).join('')}</g>
      <g class="facilities" fill="none" stroke="#DBC9A8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M286 146L304 38H312L331 146M293 111H324M298 84H319M302 60H315M290 132L326 107M295 105L322 82M300 80L317 60M308 38V145M278 146H338"/><path d="M1230 145V107Q1230 100 1237 100H1254Q1261 100 1261 107V145M1284 145V79H1316V145M1340 145V113Q1340 106 1348 106H1374V145M1296 79V52H1304M1261 123H1284M1316 123H1340"/><g class="pump"><path d="M921 145L940 99L954 145M927 126H947M895 99V145M914 145H976"/><g class="pump-beam"><path d="M896 88L970 95L968 101L901 96Q895 99 893 108L887 107Q889 92 896 88Z" fill="#62665C"/></g><circle cx="940" cy="99" r="2" fill="#DBC9A8"/></g></g>
      <g class="well-line" fill="none" stroke="#DBC9A8" stroke-width="5" stroke-linecap="round"><path d="M308 146V418Q308 440 335 440H470"/><path d="M308 146V418Q308 440 335 440H470" stroke="#242822" stroke-width="2.5"/>${wellCore(812,142,430,mode)}<path d="M895 145V355" stroke-width="3"/></g>
      <g class="pipes" fill="none" stroke="#DBC9A8" stroke-width="1.4"><path d="M812 142H880V131H1170V124H1230"/><path class="flow-dash" d="M812 142H880V131H1170V124H1230" stroke="#F4F0E6" stroke-dasharray="3 20"/></g>
      ${perforations(mode)}<g class="flow-field" aria-hidden="true">${flow()}</g>
      <path class="route-line" d="${positions.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')}" fill="none" stroke="#F4F0E6" stroke-opacity=".25" stroke-width=".7" stroke-dasharray="2 8"/>
      <g class="node-points">${positions.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="2" fill="${i===7?'#A9432D':'#F4F0E6'}"/>`).join('')}</g>
      <rect class="region-highlight" x="764" y="322" width="96" height="104" fill="none" stroke="#A9432D" stroke-width="1"/>
      <path class="intro-scan" d="M32 0V496" stroke="#DBC9A8" stroke-width="1"/>
      </svg>`;
  }
  function well(mode='all'){return map(mode).replace(/<path class="route-line"[^>]*\/>/,'').replace(/<g class="node-points">[\s\S]*?<\/g>/,'').replace(/<rect class="region-highlight"[^>]*\/>/,'').replace(/<path class="intro-scan"[^>]*\/>/,'').replace('viewBox="0 0 1440 496"','class="well-diagram technical" data-source="mother-scene" viewBox="724 288 176 144"')}
  function thumb(stage='perforation'){const a=anchors[stage]||anchors.perforation;return well().replace('724 288 176 144',stage==='perforation'?'724 288 176 144':`${Math.max(0,a.x-88)} ${Math.max(0,a.y-72)} 176 144`).replace('class="well-diagram technical"','class="archive-thumb technical"').replace('role="img"','aria-hidden="true"')}
  function layout(density,penetration){return `<svg class="well-layout technical" viewBox="0 0 200 140" role="img" aria-label="一米井段的孔密与穿深展开示意"><rect width="200" height="140" fill="#242822"/>${wellCore(100,0,140)}${channels(100,14,density,penetration/10,112/(density-1))}</svg>`}
  function configure(d,p,l){current={d,p,l}}
  return {stages,positions,anchors,map,well,thumb,layout,configure,perforations};
})();
