/* 井场与地层剖面。几何用于说明作业位置，不代表实际比例。 */
(function () {
  'use strict';
  const STAGES = {
    geology: {no:'01', name:'地质', x:240, y:482},
    seismic: {no:'02', name:'地震', x:340, y:287},
    drilling: {no:'03', name:'钻井', x:550, y:235},
    mudlogging: {no:'04', name:'录井', x:438, y:338},
    welllog: {no:'05', name:'测井', x:550, y:442},
    cementing: {no:'06', name:'固井', x:536, y:495},
    completion: {no:'07', name:'完井', x:563, y:370},
    perforation: {no:'08', name:'射孔', x:605, y:588},
    production: {no:'09', name:'采油', x:902, y:322},
    workover: {no:'10', name:'修井', x:800, y:366},
    eor: {no:'11', name:'增采', x:982, y:605},
    transport: {no:'12', name:'运输', x:1040, y:373},
    refining: {no:'13', name:'加工', x:1198, y:275}
  };

  function renderSvg(options = {}) {
    const density = Math.max(0, Math.min(48, Math.round(options.density ?? 20)));
    const penetration = Math.max(0, Number(options.penetration ?? 400));
    const phasing = Number(options.phasing ?? 120);
    const length = Math.min(70, penetration * .12);
    const channels = Array.from({length:density}, (_,i) => {
      const y = 562 + i * 58 / Math.max(1,density-1);
      const side = Math.cos(i * phasing * Math.PI / 180) >= 0 ? 1 : -1;
      const start = side > 0 ? 556 : 544, tip = start + side * length;
      return `<path class="perf-channel" d="M${start} ${y}L${tip} ${y}" stroke="#E0BC7E" stroke-width="2.2"/><circle cx="${tip}" cy="${y}" r="1.6" fill="#E0BC7E"/>`;
    }).join('');
    const derrickBraces = [0,1,2,3].map(i => {
      const y=220+i*32, left=535-i*5, right=565+i*5;
      return `<path d="M${left} ${y}L${right+5} ${y+32}H${left-5}L${right} ${y}"/>`;
    }).join('');
    return `<svg class="field-model" viewBox="0 0 1440 840" width="1440" height="840" xmlns="http://www.w3.org/2000/svg">
      <title>井场与储层剖面</title>
      <desc>地表的钻井架、抽油机与集输设施通过井筒和管线连接。剖面中的砂岩储层由射孔孔道与井筒连通。结构示意，非比例绘图。</desc>
      <defs>
        <pattern id="field-sand" width="24" height="19" patternUnits="userSpaceOnUse"><path d="M3 5h2M16 13h2" stroke="#DBC99F" stroke-width="1.5" opacity=".23"/></pattern>
        <pattern id="field-shale" width="54" height="18" patternUnits="userSpaceOnUse"><path d="M2 8h22M32 13h13" stroke="#242D2B" stroke-width="1" opacity=".28"/></pattern>
        <clipPath id="field-front"><path d="M120 350L1110 410V760L120 700Z"/></clipPath>
        <marker id="field-flow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#EEE2BC"/></marker>
      </defs>

      <path d="M115 724L1109 786L1320 646L1294 628L1110 745L138 688Z" fill="#101716" opacity=".65"/>
      <g class="geology">
        <!-- 右侧切面与正面切面在同一层位相接。 -->
        <path d="M1110 410L1295 280V630L1110 760Z" fill="#343E39"/>
        <path d="M1110 410L1295 280V348L1110 478Z" fill="#626952"/>
        <path d="M1110 478L1295 348V423L1110 553Z" fill="#404B46"/>
        <path d="M1110 553L1295 423V482L1110 612Z" fill="#635D4C"/>
        <path d="M1110 612L1295 482V554L1110 684Z" fill="#887344"/>
        <path d="M1110 684L1295 554V630L1110 760Z" fill="#343E39"/>
        <g clip-path="url(#field-front)">
          <path d="M120 350L1110 410L1110 478C740 422 430 455 120 414Z" fill="#777B68"/>
          <path d="M120 414C430 455 740 422 1110 478L1110 553C740 500 430 535 120 483Z" fill="#4A5650"/>
          <path d="M120 414C430 455 740 422 1110 478L1110 553C740 500 430 535 120 483Z" fill="url(#field-shale)"/>
          <path d="M120 483C430 535 740 500 1110 553L1110 612C740 546 430 594 120 552Z" fill="#786F5D"/>
          <path d="M120 552C430 594 740 546 1110 612L1110 684C740 612 430 659 120 624Z" fill="#A58B58"/>
          <path d="M120 552C430 594 740 546 1110 612L1110 684C740 612 430 659 120 624Z" fill="url(#field-sand)"/>
          <path d="M120 624C430 659 740 612 1110 684L1110 760C740 741 430 720 120 700Z" fill="#46514C"/>
        </g>
        <path d="M120 350L305 220L1295 280L1110 410Z" fill="#777D6A"/>
        <path d="M151 350L322 237L1278 294" fill="none" stroke="#A4A58B" stroke-width="1" opacity=".4"/>
        <!-- 场内道路沿地表透视展开。 -->
        <path d="M295 244L245 283L1165 341L1227 295" fill="none" stroke="#8B8D79" stroke-width="27"/>
        <path d="M428 293L401 322L907 354L949 329" fill="none" stroke="#8B8D79" stroke-width="23"/>
        <path d="M120 350L1110 410L1295 280M1110 410V760M120 350V700L1110 760L1295 630V280" fill="none" stroke="#A8AB92" stroke-width="1.2" opacity=".55"/>
      </g>

      <g class="well-line">
        <path d="M550 368V671" stroke="#303A36" stroke-width="26"/>
        <path d="M550 368V671" stroke="#89948A" stroke-width="17"/>
        <path d="M550 368V671" stroke="#202D2A" stroke-width="10"/>
        <path d="M547 368V671" stroke="#D3D8C8" stroke-width="2"/>
        <path d="M554 368V671" stroke="#B4C0AE" stroke-width="2"/>
        <path d="M861 394V622Q861 643 890 644L992 651" fill="none" stroke="#2F3B36" stroke-width="13"/>
        <path d="M861 394V622Q861 643 890 644L992 651" fill="none" stroke="#B0B6A1" stroke-width="5"/>
        <path d="M861 394V622Q861 643 890 644L992 651" fill="none" stroke="#3B4940" stroke-width="2"/>
        <path d="M970 365V526Q970 564 998 581L1030 601" fill="none" stroke="#82969A" stroke-width="5" stroke-dasharray="6 4"/>
      </g>

      <g class="facilities" stroke-linejoin="round">
        <!-- 远处的处理塔与储罐。 -->
        <g class="processing">
          <path d="M1085 318L1150 275L1247 281L1182 326Z" fill="#5D6558"/>
          <path d="M1182 326V334L1247 289V281Z" fill="#3B4941"/>
          <path d="M1085 318V326L1182 334V326Z" fill="#4B574B"/>
          <path d="M1191 291V217Q1191 207 1203 207Q1215 207 1215 217V291Z" fill="#9AA394"/>
          <ellipse cx="1203" cy="217" rx="12" ry="6" fill="#CED0BA"/>
          <path d="M1209 218V290" stroke="#596A5D" stroke-width="5"/>
          <path d="M1230 281V242Q1230 236 1237 236Q1244 236 1244 242V281Z" fill="#B4BBA7"/>
          <path d="M1191 238H1215M1191 266H1215M1203 207V195" fill="none" stroke="#5B6D5C" stroke-width="2"/>
          <path d="M1101 282V310C1101 321 1163 324 1163 314V286Z" fill="#9DA88F"/>
          <ellipse cx="1132" cy="284" rx="31" ry="12" fill="#CED0B2"/>
          <path d="M1151 290V315" stroke="#7D8D75" stroke-width="14"/>
          <path d="M1101 302C1115 312 1148 314 1163 306" fill="none" stroke="#75846D"/>
          <path d="M1081 284V307Q1081 316 1122 318" fill="none" stroke="#B8BC9F" stroke-width="4"/>
        </g>

        <!-- 物探采集线：地面检波器与近旁采集车。 -->
        <g class="seismic-line">
          <path d="M233 318L376 245" fill="none" stroke="#B3B49A" stroke-width="2"/>
          ${[0,1,2,3,4].map(i=>`<path d="M${250+i*25} ${310-i*13}v-9m-3 0h6" fill="none" stroke="#D2C8A0" stroke-width="2"/>`).join('')}
          <path d="M302 270V248L347 251V274Z" fill="#B7B29A"/>
          <path d="M347 251L359 243V266L347 274Z" fill="#7F8A75"/>
          <path d="M302 248L314 240L359 243L347 251Z" fill="#CCC7AC"/>
          <path d="M311 269v6M339 272v6" stroke="#293B30" stroke-width="6"/>
        </g>

        <g class="rig">
          <path d="M490 368L532 338L610 343L568 374Z" fill="#5B6256"/>
          <path d="M490 368V377L568 383V374ZM568 374L610 343V352L568 383Z" fill="#3D4940"/>
          <path d="M531 343L548 198L565 199L591 348" fill="#687567" stroke="#9AA693" stroke-width="3"/>
          <path d="M514 360L535 210L565 212L586 365" fill="#47584C" stroke="#D3D4BB" stroke-width="4"/>
          <g fill="none" stroke="#B9C0A6" stroke-width="2">${derrickBraces}</g>
          <path d="M534 205L547 196L577 198L565 212Z" fill="#CCD0B5"/>
          <path d="M532 211H568V217H532Z" fill="#9DAA92"/>
          <path d="M550 218V353" stroke="#232F29" stroke-width="3"/>
          <path d="M547 331H554V357H547Z" fill="#C8BE8F"/>
          <path d="M503 357L517 347L588 352L574 362Z" fill="#BDC2A4"/>
          <path d="M503 357V365L574 370V362Z" fill="#8B9C80"/>
          <path d="M540 365H561V371H540Z" fill="#D5C298"/>
          <path d="M548 371V380M541 375H562" stroke="#A4B69C" stroke-width="4"/>
        </g>

        <g class="mudlogging-cabin">
          <path d="M395 329V300L449 304V333Z" fill="#9BA88C"/>
          <path d="M449 304L474 286V315L449 333Z" fill="#5E7561"/>
          <path d="M395 300L420 282L474 286L449 304Z" fill="#CBD0AF"/>
          <path d="M405 309L423 311V319L405 318ZM431 311L440 312V328L431 327Z" fill="#3E5547"/>
          <path d="M454 308L467 299V309L454 318Z" fill="#334F42"/>
        </g>

        <!-- 生产井与抽油机。 -->
        <g class="pump">
          <path d="M838 388L865 367L946 372L920 395Z" fill="#515F50"/>
          <path d="M838 388V395L920 402V395Z" fill="#344939"/>
          <path d="M881 387L899 332L913 388" fill="#7D9580" stroke="#B9C7A7" stroke-width="4"/>
          <path d="M891 363L908 364" stroke="#C2CCAD" stroke-width="3"/>
          <path class="pump-beam" d="M854 322L931 333L933 342L852 332Z" fill="#CFD2AF"/>
          <path d="M854 322C841 323 840 342 845 354L853 355L861 333Z" fill="#AFAF83"/>
          <path d="M849 353V389" stroke="#D6CFA4" stroke-width="2"/>
          <path d="M844 386H858V394H844Z" fill="#B6C5A4"/>
          <path d="M924 339L922 372" stroke="#C2C8A4" stroke-width="3"/>
          <ellipse cx="922" cy="373" rx="11" ry="14" fill="#8A987B" stroke="#C6CAAA" stroke-width="2"/>
          <path d="M929 380L942 371V387L929 395Z" fill="#556F54"/>
          <path d="M798 366V352H807V366" stroke="#A7B296" stroke-width="3" fill="none"/>
          <path d="M793 366H813V370H793Z" fill="#A7B296"/>
        </g>

        <g class="pipes" fill="none" stroke-linecap="square">
          <path d="M562 375L625 379L681 340L1034 362L1099 317" stroke="#303F35" stroke-width="7"/>
          <path d="M562 372L625 376L681 337L1034 359L1099 314" stroke="#C5BB8C" stroke-width="4"/>
          <path d="M853 394L964 402L1034 359M1215 292L1252 295L1273 281" stroke="#C5BB8C" stroke-width="4"/>
          <path d="M969 393V401M1034 354V364M675 335L686 339" stroke="#57684D" stroke-width="7"/>
        </g>
      </g>

      <g class="target-well thumb-channels" data-density="${density}" data-penetration="${penetration}" data-phasing="${phasing}">
        <path d="M544 557V626M556 557V626" stroke="#D7BA82" stroke-width="3"/>
        ${channels}
      </g>
      <g class="flow-field section-flow" stroke-dasharray="6 7" fill="none" stroke="#EEE2BC" stroke-width="1.7" marker-end="url(#field-flow-arrow)">
        <path d="M400 584Q468 565 534 581"/>
        <path d="M700 600Q635 573 568 588"/>
        <path d="M549 548V460"/>
        <path d="M882 642H966"/>
      </g>
      <g class="field-annotations" fill="none" stroke="#BAC1A9" stroke-width="1">
        <path d="M270 580L245 600H185"/>
        <path d="M704 431L732 451H800"/>
        <text x="182" y="621" stroke="none">含油砂岩</text>
        <text x="735" y="474" stroke="none">盖层</text>
      </g>
    </svg>`;
  }

  const atlas = window.AtlasScene = {STAGES, renderSvg};
  atlas.init = container => {
    if(window.oilfieldEngine)return window.oilfieldEngine;
    const host=document.createElement('div');host.className='section-drawing';container.append(host);
    let resizeFrame, cameraFrame;
    const nodes=[...container.querySelectorAll('.map-node')];
    const canMove=()=>!document.body.classList.contains('paused')&&!document.body.classList.contains('reduced')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden;
    const engine={
      params:{density:20,penetration:400,phasing:120},camera:{targetYaw:0,targetPitch:0,targetZoom:1},focus:'default',offset:0,magnification:1,_box:null,_key:'',_target:'',_manual:null,
      setFocusStage(stage){this.focus=STAGES[stage]||stage==='perforation'?stage:'default';container.dataset.activeStage=this.focus;this.offset=0;this.magnification=1;this._manual=null;this.draw(true);},
      adjust(key){if(this._manual){const b=this._manual;if(key==='ArrowLeft')b[0]-=40;if(key==='ArrowRight')b[0]+=40;if(key==='ArrowUp'||key==='ArrowDown'){const f=key==='ArrowUp'?.9:1.1;if(b[2]*f>=250&&b[2]*f<=1800){b[0]+=b[2]*(1-f)/2;b[1]+=b[3]*(1-f)/2;b[2]*=f;b[3]*=f;}}this.draw(true);return;}if(key==='ArrowLeft')this.offset=Math.max(-500,this.offset-40);if(key==='ArrowRight')this.offset=Math.min(500,this.offset+40);if(key==='ArrowUp')this.magnification=Math.min(2,this.magnification+.1);if(key==='ArrowDown')this.magnification=Math.max(.7,this.magnification-.1);this.draw(true);},
      panByPixels(dx,dy){if(!this._box)return;cancelAnimationFrame(cameraFrame);cameraFrame=null;const scale=Math.min(host.clientWidth/this._box[2],host.clientHeight/this._box[3]);if(!scale)return;this._box=[Math.max(-180,Math.min(1200,this._box[0]-dx/scale)),Math.max(-120,Math.min(700,this._box[1]-dy/scale)),this._box[2],this._box[3]];this._manual=this._box.slice();this._target=this._box.join(' ');this.place(this._box);},
      zoomAt(delta,clientX,clientY){
        if(!this._box)return;cancelAnimationFrame(cameraFrame);cameraFrame=null;
        const rect=host.getBoundingClientRect(),b=this._box,scale=Math.min(rect.width/b[2],rect.height/b[3]);
        const f=Math.max(.85,Math.min(1.18,Math.exp(delta*.0015))),width=Math.max(320,Math.min(1900,b[2]*f)),ratio=width/b[2];
        const px=(clientX-rect.left-(rect.width-b[2]*scale)/2)/scale,py=(clientY-rect.top-(rect.height-b[3]*scale)/2)/scale;
        this._manual=[b[0]+px*(1-ratio),b[1]+py*(1-ratio),width,b[3]*ratio];this.draw(false);
      },
      setParams(density,penetration,phasing){this.params={density,penetration,phasing};this.draw(true);},
      replaySplash(){this.setFocusStage(this.focus);host.classList.remove('scene-reveal');void host.offsetWidth;host.classList.add('scene-reveal');setTimeout(()=>host.classList.remove('scene-reveal'),2200);},
      place(box){
        const svg=host.querySelector('svg');if(!svg)return;
        svg.setAttribute('viewBox',box.join(' '));
        const scale=Math.min(host.clientWidth/box[2],host.clientHeight/box[3]);
        const dx=host.offsetLeft+(host.clientWidth-box[2]*scale)/2,dy=host.offsetTop+(host.clientHeight-box[3]*scale)/2;
        const mobile=window.innerWidth<=760,focus=false;
        nodes.forEach(node=>{const a=STAGES[node.dataset.stage],x=dx+(a.x-box[0])*scale,y=dy+(a.y-box[1])*scale;
          node.hidden=x<22||x>container.clientWidth-22||y<22||y>container.clientHeight-22;
          node.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        });
      },
      draw(animate=false){
        const focus=false,kind='field',priorKind=this._kind;
        const key=kind+JSON.stringify(this.params);
        if(key!==this._key){
          host.innerHTML=focus?window.SectionView(this.params):atlas.renderSvg(this.params);
          const svg=host.querySelector('svg');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('role','img');
          if(!focus)svg.setAttribute('aria-label','井场与储层剖面：地表作业、井筒和含油砂岩的空间联系');
          if(!this.params.density)svg.querySelector('.target-well')?.remove();
          this._key=key;this._kind=kind;
          if(priorKind&&priorKind!==kind){this._box=null;if(canMove()&&host.animate)host.animate([{opacity:.15},{opacity:1}],{duration:220,easing:'ease-out'});}
        }
        const mobile=window.innerWidth<=760,a=STAGES[this.focus];
        const box=this._manual?this._manual.slice():focus?[0,0,620,640]:a?[Math.max(0,Math.min(790,a.x-325)),Math.max(75,Math.min(320,a.y-190)),650,480]:mobile?[390,140,900,650]:[110,145,1200,620];
        if(!this._manual){box[0]+=this.offset;const width=box[2]/this.magnification,height=box[3]/this.magnification;box[0]+=(box[2]-width)/2;box[1]+=(box[3]-height)/2;box[2]=width;box[3]=height;}
        const target=box.join(' ');
        if(cameraFrame&&target===this._target&&canMove()){this.place(this._box);return;}
        cancelAnimationFrame(cameraFrame);cameraFrame=null;this._target=target;
        if(!animate||!this._box||!canMove()){this._box=box;this.place(box);return;}
        const from=this._box.slice(),start=performance.now();
        const step=now=>{if(!canMove()){this._box=box;this.place(box);cameraFrame=null;return;}const t=Math.min(1,(now-start)/420),ease=1-Math.pow(1-t,3);this._box=box.map((v,i)=>from[i]+(v-from[i])*ease);this.place(this._box);if(t<1)cameraFrame=requestAnimationFrame(step);else cameraFrame=null;};
        cameraFrame=requestAnimationFrame(step);
      }
    };
    new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>engine.draw(true));}).observe(host);
    window.oilfieldEngine=engine;engine.draw();return engine;
  };
})();
