/* 射孔段纵向展开与方位示意。几何长度只用于解释参数。 */
window.SectionView = params => {
  const {density:d,penetration:l,phasing:p}=params;
  const left=276,right=324,top=176,bottom=420,len=35+l*.16;
  const shots=Array.from({length:Math.max(0,Math.round(d))},(_,i)=>{
    const y=top+(i+.5)*(bottom-top)/d,side=i%2?1:-1,root=side<0?left:right,tip=root+side*len;
    return `<path d="M${root} ${y-2}L${tip} ${y-1}L${tip} ${y+1}L${root} ${y+2}Z" fill="#c65d3b"/><circle cx="${tip}" cy="${y}" r="2" fill="#e29b73"/>`;
  }).join('');
  const arrows=d?[220,300,380].map(y=>`<path d="M${left-len-24} ${y}H286M${right+len+24} ${y}H314"/>`).join(''):'';
  const rays=d?Array.from({length:Math.ceil(360/p)},(_,i)=>{
    const a=(i*p-90)*Math.PI/180;
    return `<path d="M${112+Math.cos(a)*20} ${535+Math.sin(a)*20}L${112+Math.cos(a)*56} ${535+Math.sin(a)*56}" stroke="#c65d3b" stroke-width="4"/>`;
  }).join(''):'';
  return `<svg viewBox="0 0 620 640" role="img" aria-label="射孔纵向展开示意：${d}孔每米、穿深${l}毫米；下方为相位${p}度的俯视示意">
  <defs><marker id="section-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#9fbaaa"/></marker><pattern id="section-hatch" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L10 0" stroke="#5c5d4e" stroke-width=".7"/></pattern></defs>
  <g class="section-title"><text x="40" y="35">射孔如何连接储层与井筒</text><text class="section-sub" x="40" y="62">纵向展开看孔密与穿深 · 俯视看相位</text></g>
  <g class="geology"><rect x="40" y="94" width="540" height="75" fill="#1d2226"/><rect x="40" y="169" width="540" height="264" fill="#1c3028"/><rect x="40" y="433" width="540" height="35" fill="#1d2226"/><path d="M40 169H580M40 433H580" stroke="#52695a"/><text x="62" y="127">非目标地层</text><text x="62" y="198">含油储层</text></g>
  <g class="well-line"><rect x="264" y="94" width="72" height="374" fill="url(#section-hatch)" stroke="#827b64"/><rect x="276" y="94" width="48" height="374" fill="#abb5b8"/><rect x="286" y="94" width="28" height="374" fill="#101512"/><path d="M300 401V239" stroke="#c6d2c5" stroke-width="1.5" marker-end="url(#section-arrow)"/><text x="306" y="157" transform="rotate(90 306 157)" class="section-inner-label">井筒内流动通道</text></g>
  <g class="target-well" data-density="${d}" data-penetration="${l}" data-phase="${p}">${shots}</g>
  <g class="flow-field section-flow" fill="none" stroke="#9fbaaa" stroke-width="1.2" stroke-dasharray="5 5" marker-end="url(#section-arrow)">${arrows}</g>
  <g class="section-callouts"><path d="M276 111L233 80H180M331 139L390 105H431"/><text x="110" y="80">金属套管</text><text x="434" y="105">水泥环</text><path d="M336 350H500"/><text x="434" y="377">孔道穿过封隔层</text></g>
  <g class="section-dimensions"><path d="M238 ${top}H226V${bottom}H238M226 ${top}H217M226 ${bottom}H217"/><text x="207" y="300" transform="rotate(-90 207 300)">1 m 示意段 · ${d} 个孔眼</text>${d?`<path d="M${right} 451V485H${right+len}V451"/><text x="${right+10}" y="508">穿深 ${l} mm</text>`:''}</g>
  <g class="phase-plan"><circle cx="112" cy="535" r="40" fill="#79735e"/><circle cx="112" cy="535" r="30" fill="#abb5b8"/><circle cx="112" cy="535" r="20" fill="#101512"/>${rays}<text x="47" y="611">相位 ${p}° · 俯视</text><text x="205" y="555">相邻孔眼绕井筒错开排列</text><text x="205" y="584" class="section-sub">纵向图左右交错为展开示意，不表示真实方位</text></g>
  <text class="section-footnote" x="40" y="638">结构与尺寸非比例；流路仅解释连通关系，不是流体模拟。</text>
  </svg>`;
};
