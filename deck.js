/* SupContent motion deck. Buildless, source-preserving, video-on-demand. */
(() => {
  'use strict';
  const root = document.getElementById('deck-root');
  if (!root) return;
  const deckId = document.body.dataset.deck === 'bp' ? 'bp' : 'tiktok';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 820px)');
  const state = { data: null, index: 0, mode: mobile.matches ? 'read' : 'present', motion: !reduced.matches, drawer: null, observer: null, rendered: [], focusBeforeDrawer: null };
  const bpProfiles = {pLY:'cover',pLe:'contents',pLE:'chapter',pLO:'row-cards',pLX:'chapter',pLM:'service-columns',pLv:'target-metrics',pLU:'target-years',pLg:'organization',pLZ:'chapter',pLL:'row-cards',pLs:'flow-columns',pLS:'flow-columns',pLQ:'flow-columns',pLB:'case-media',pLb:'case-media',pLy:'case-media',pLG:'chapter',pLh:'flow-rows',pLF:'flow-columns',pLc:'chapter',pLw:'pricing-dual',pLd:'pricing-tiers',pLm:'service-columns',pLx:'chapter',pLK:'flow-rows',pLJ:'preparation',pLi:'row-cards',pLI:'cta'};
  function bpProfile(slide){if(deckId!=='bp')return '';if(bpProfiles[slide.id])return bpProfiles[slide.id];const title=plain(slide.title);if(/增长来自更多客户/.test(title))return 'target-years';if(/组织目标.*POD/.test(title))return 'organization';if(/经营目标/.test(title))return 'target-metrics';if(/三档意向入口/.test(title))return 'pricing-tiers';if(/从客户素材到下一批排产|先选一个小项目/.test(title))return 'flow-rows';if(/启动前.*四件事/.test(title))return 'preparation';if(/内容需求持续增加|识别客户任务.*服务范围|用交付.*成本/.test(title))return 'row-cards';if(/电商素材补充|六国持续供给|当地表达.*真实版本/.test(title))return 'case-media';if((slide.items||[]).some(i=>/^\d{2}$/.test(plain(i.text).trim())&&num(i.effectiveSize??i.size)>=60))return 'chapter';return '';}
  const icons = {
    left: [['path', {d:'M14 5 7 12l7 7'}]], right: [['path',{d:'m10 5 7 7-7 7'}]],
    menu: [['path',{d:'M4 6h16M4 12h16M4 18h16'}]], close: [['path',{d:'m6 6 12 12M18 6 6 18'}]],
    expand: [['path',{d:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'}]],
    play: [['path',{d:'m9 5 11 7-11 7Z'}]], motion: [['path',{d:'M4 8c4-7 12 7 16 0M4 16c4-7 12 7 16 0'}]],
    read: [['path',{d:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4ZM20 4h-5a2 2 0 0 0-2 2v15a4 4 0 0 1 4-3h3Z'}]]
  };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = String(text); return n; };
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const plain = v => v === undefined || v === null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(plain).join('\n') : typeof v === 'object' ? plain(v.text ?? v.value ?? '') : String(v);
  function urlSafe(value, link = false) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const normalized = /^(?:assets|data)\//.test(value) ? `/tezign-tiktok-motion-deck/${value}` : value; const u = new URL(normalized, window.location.href); return (link ? ['http:','https:','mailto:','tel:'] : ['http:','https:']).includes(u.protocol) ? u.href : null; } catch { return null; }
  }
  function icon(name) { const s = document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('aria-hidden','true'); (icons[name] || icons.menu).forEach(([tag,attrs]) => { const p = document.createElementNS(s.namespaceURI,tag); Object.entries(attrs).forEach(([k,v]) => p.setAttribute(k,v)); s.append(p); }); return s; }
  function button(label, iconName, cls, action) { const b = el('button',`ui-button ${cls || ''}`); b.type = 'button'; b.setAttribute('aria-label',label); if (iconName) b.append(icon(iconName)); b.append(el('span','button-label',label)); if (action) b.addEventListener('click',action); return b; }
  function mark(n, key, text) { n.dataset.sourceKey = key; if (text !== undefined) n.dataset.sourceText = text; return n; }
  function itemKey(si,ii) { return `${si}:item:${ii}`; }
  function cellKey(si,ti,ri,ci) { return `${si}:table:${ti}:${ri}:${ci}`; }
  function sourceText(n, text, numeric = false) {
    const t = plain(text);
    if (!numeric) { n.textContent = t; return; }
    let cursor = 0;
    const regex = /\d[\d,]*(?:\.\d+)?(?:\s*(?:万|亿|%|家|年|倍|元))?/g;
    for (const match of t.matchAll(regex)) { n.append(document.createTextNode(t.slice(cursor,match.index))); n.append(el('span','numeric-highlight',match[0])); cursor = match.index + match[0].length; }
    n.append(document.createTextNode(t.slice(cursor)));
  }
  function itemNode(item, si, ii, kind, numeric) {
    const raw = plain(item.text); const n = el(kind === 'title' ? 'h1' : kind === 'kicker' ? 'h3' : 'p', kind === 'title' ? 'slide-heading' : kind === 'kicker' ? 'item-kicker' : 'item-copy');
    mark(n,itemKey(si,ii),raw);
    if(item.id!==undefined)n.dataset.sourceId=String(item.id);
    if (item.bold) n.classList.add('is-bold');
    if (kind === 'compact') n.classList.add('is-compact');
    if(kind !== 'title' && num(item.effectiveSize ?? item.size) >= 31 && /^\s*(?:\d|[¥￥$])/.test(raw))n.classList.add('item-metric');
    const safe = urlSafe(item.href,true);
    if (safe) { const a = el('a'); a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer'; sourceText(a,raw,numeric); n.append(a); } else sourceText(n,raw,numeric);
    return n;
  }
  function slideParts(slide) {
    const items = (slide.items || []).map((item,index) => ({...item,_index:index,_size:num(item.effectiveSize ?? item.size,16)}));
    const height = num(state.data.height,405), width = num(state.data.width,720);
    const candidates = items.filter(i => plain(i.text).trim() && num(i.y) >= height*.06 && num(i.y) < height*.36);
    let title = items.find(i => plain(i.text).trim() === plain(slide.title).trim() && !/^\d+$/.test(plain(i.text).trim()));
    if(!title)title = candidates.find(i => num(i.y) >= height*.085 && num(i.y) <= height*.16 && i._size >= 17);
    if (!title) title = [...candidates].sort((a,b) => b._size-a._size || num(a.y)-num(b.y))[0];
    if (!title && items.length) title = [...items].filter(i => plain(i.text).trim()).sort((a,b) => b._size-a._size || num(a.y)-num(b.y))[0];
    const header = [], footer = [], body = [];
    for (const item of items) {
      if (item === title) continue;
      if (num(item.y) < height*.06 && item._size <= 17) header.push(item);
      else if (num(item.y) >= height*.89 && item._size <= 15) footer.push(item);
      else body.push(item);
    }
    return {title,header,footer,body,width,height};
  }
  function bodyGroups(items, width) {
    if (!items.length) return {intro:[],outro:[],groups:[]};
    const wide = [], narrow = [];
    items.forEach(i => { if (num(i.w) > width*.75) wide.push(i); else narrow.push(i); });
    if (!narrow.length) return {intro:wide.sort((a,b)=>num(a.y)-num(b.y)),outro:[],groups:[]};
    const firstY=Math.min(...narrow.map(i=>num(i.y))),intro=wide.filter(i=>num(i.y)<firstY),outro=wide.filter(i=>num(i.y)>=firstY);
    const xs = [...narrow].sort((a,b) => num(a.x)-num(b.x));
    const groups = [];
    for (const item of xs) { const last = groups.at(-1); if (!last || num(item.x)-last.anchor > width*.18) groups.push({anchor:num(item.x),items:[item]}); else last.items.push(item); }
    if (groups.length > 4) {
      const merged = Array.from({length:3},()=>({items:[]}));
      for (const item of narrow) merged[Math.min(2,Math.max(0,Math.floor(num(item.x)/(width/3))))].items.push(item);
      return {intro:intro.sort((a,b)=>num(a.y)-num(b.y)),outro:outro.sort((a,b)=>num(a.y)-num(b.y)),groups:merged.filter(g=>g.items.length).map(g=>g.items.sort((a,b)=>num(a.y)-num(b.y)||num(a.x)-num(b.x)))};
    }
    return {intro:intro.sort((a,b)=>num(a.y)-num(b.y)),outro:outro.sort((a,b)=>num(a.y)-num(b.y)),groups:groups.map(g=>g.items.sort((a,b)=>num(a.y)-num(b.y)||num(a.x)-num(b.x)))};
  }
  function kindOf(item, list) {
    const median = [...list].map(i=>i._size).sort((a,b)=>a-b)[Math.floor(list.length/2)] || 16;
    const raw = plain(item.text);
    if ((item._size >= Math.max(20,median*1.2) || (item.bold && raw.length < 48)) && raw.trim()) return 'kicker';
    if (item._size < 11 && raw.length > 55) return 'compact';
    return 'copy';
  }
  function addBody(container, parts, slide, si) {
    const profile=bpProfile(slide);
    if(profile==='organization'&&!parts._orgLayer){const statistics=parts.body.filter(i=>num(i.y)<310),roles=parts.body.filter(i=>num(i.y)>=310);const statsLayer=el('div','organization-statistics'),roleLayer=el('div','organization-roles');const flags=addBody(statsLayer,{...parts,body:statistics,_orgLayer:true},slide,si);addBody(roleLayer,{...parts,body:roles,_orgLayer:true},slide,si);container.append(statsLayer,roleLayer);return flags;}
    const groups = bodyGroups(parts.body,parts.width);
    const splits=deckId==='tiktok'&&si===2?[256]:profile==='preparation'?[320]:profile==='contents'?[260,355]:null;
    if(splits){const output=[];groups.groups.forEach(group=>{let bands=Array.from({length:splits.length+1},()=>[]);group.forEach(i=>bands[splits.filter(y=>num(i.y)>=y).length].push(i));bands.filter(b=>b.length).forEach(b=>output.push(b));});groups.groups=output.sort((a,b)=>num(a[0].y)-num(b[0].y)||num(a[0].x)-num(b[0].x));}
    const isTarget = deckId === 'bp' && (['target-metrics','target-years','organization'].includes(profile) || /经营目标|组织目标|增长/.test(plain(slide.title)));
    const isFlow = (deckId==='tiktok'&&si===8)||['flow-columns','flow-rows'].includes(profile)||/SOP|流程|链路|工作流|实现路径|实现链路|交付机制/.test(plain(slide.title) + plain(parts.title?.text));
    const shapeTables=['row-cards','target-years','flow-rows'].includes(profile);
    if(shapeTables){renderShapeRows(container,parts,slide,si,isTarget,isFlow);return {isTarget,isFlow,bodyHandled:true};}
    if (groups.intro.length) { const intro = el('div','intro-stack'); groups.intro.forEach(i=>intro.append(itemNode(i,si,i._index,kindOf(i,groups.intro),isTarget))); container.append(intro); }
    if (groups.groups.length) {
      const grid = el('div',`content-grid cols-${groups.groups.length}${groups.groups.length === 1 ? ' single-column' : ''}`); grid.style.setProperty('--cols',Math.min(4,groups.groups.length));
      groups.groups.forEach((group,gi) => { const card = el('div','section-card'); card.dataset.groupIndex = gi; group.forEach(i=>card.append(itemNode(i,si,i._index,kindOf(i,group),isTarget))); grid.append(card); });
      if(profile==='pricing-tiers'){grid.classList.add('pricing-shape');[...grid.children].forEach((card,ci)=>{card.classList.add('tier-selectable');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-pressed',String(ci===0));card.setAttribute('aria-label',`选择 ${plain(groups.groups[ci][0]?.text)}`);const first=card.firstElementChild;if(first){first.classList.add('tier-eyebrow');first.replaceChildren();sourceText(first,plain(groups.groups[ci][0]?.text),true);}const select=()=>[...grid.children].forEach(c=>c.setAttribute('aria-pressed',String(c===card)));card.addEventListener('click',select);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});}
      if (isFlow && groups.groups.length > 1) installFlow(grid,container);
      container.append(grid);
    }
    if(groups.outro.length){const outro=el('div','intro-stack outro-stack');groups.outro.forEach(i=>outro.append(itemNode(i,si,i._index,kindOf(i,groups.outro),isTarget)));container.append(outro);}
    return {isTarget,isFlow};
  }
  function renderShapeRows(container,parts,slide,si,isTarget,isFlow){
    const narrow=parts.body.filter(i=>num(i.w)<parts.width*.75),wide=parts.body.filter(i=>num(i.w)>=parts.width*.75);
    if(!narrow.length){parts.body.forEach(i=>container.append(itemNode(i,si,i._index,kindOf(i,parts.body),isTarget)));return;}
    const ys=[];narrow.forEach(i=>{let row=ys.find(r=>Math.abs(r.y-num(i.y))<8);if(!row){row={y:num(i.y),items:[]};ys.push(row);}row.items.push(i);});ys.sort((a,b)=>a.y-b.y);ys.forEach(r=>r.items.sort((a,b)=>num(a.x)-num(b.x)));
    const header=ys.shift();wide.filter(i=>num(i.y)<header.y).sort((a,b)=>num(a.y)-num(b.y)).forEach(i=>container.append(itemNode(i,si,i._index,kindOf(i,wide),isTarget)));const head=el('div','shape-head-values');header.items.forEach(i=>head.append(itemNode(i,si,i._index,'copy',isTarget)));container.append(head);
    const grid=el('div',`content-grid shape-row-grid cols-${Math.min(4,ys.length)}`);grid.style.setProperty('--cols',Math.min(4,ys.length));
    ys.forEach((row,ri)=>{const card=el('article','section-card');row.items.forEach((item,ci)=>{if(ci===0)card.append(itemNode(item,si,item._index,'kicker',isTarget));else{const fact=el('div',`shape-fact shape-column-${ci}`);fact.dataset.shapeColumn=ci;fact.append(el('span','matrix-label',plain(header.items[ci]?.text)));fact.append(itemNode(item,si,item._index,'copy',isTarget));card.append(fact);}});grid.append(card);});
    if(isTarget&&bpProfile(slide)==='target-years'){const controls=el('div','year-controls');controls.append(el('span','year-label','目标年份'));header.items.slice(1).forEach((year,idx)=>{const b=button(plain(year.text),null,'',()=>setYear(idx+1));controls.append(b);});const setYear=index=>{[...controls.querySelectorAll('button')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===index)));grid.querySelectorAll('[data-shape-column]').forEach(n=>n.classList.toggle('is-year-active',num(n.dataset.shapeColumn)===index));};container.append(controls);setYear(1);}
    if(isFlow&&ys.length>1)installFlow(grid,container);container.append(grid);wide.filter(i=>num(i.y)>=header.y).sort((a,b)=>num(a.y)-num(b.y)).forEach(i=>container.append(itemNode(i,si,i._index,kindOf(i,wide),isTarget)));
  }
  function installFlow(grid,container) {
    grid.classList.add('flow-stepper'); const cards = [...grid.children]; let active = 0;
    const controls = el('div','flow-controls'); const prev = button('上一步','left','',()=>set(active-1)); const next = button('下一步','right','',()=>set(active+1)); const caption = el('span','flow-caption');
    function set(index) { active = Math.min(cards.length-1,Math.max(0,index)); cards.forEach((card,i)=>{ card.classList.toggle('is-active',i===active); card.setAttribute('aria-pressed',String(i===active)); }); caption.textContent = `流程演示 ${String(active+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`; prev.disabled=active===0; next.disabled=active===cards.length-1; }
    cards.forEach((card,i)=>{ card.tabIndex=0; card.setAttribute('role','button'); card.setAttribute('aria-label',`高亮第 ${i+1} 步`); card.addEventListener('click',()=>set(i)); card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();set(i);}}); });
    controls.append(prev,next,caption);container.append(controls);set(0);
  }
  function cellText(cell) { return plain(cell); }
  function cellNode(tag, cls, value, si,ti,ri,ci) { const raw=cellText(value);return mark(el(tag,cls,raw),cellKey(si,ti,ri,ci),raw); }
  function normalizedRows(table) { return (table.rows || []).map(row=>Array.isArray(row)?row:Object.values(row || {})); }
  function renderTierTable(table,si,ti) {
    const rows=normalizedRows(table);const out=el('div','table-block pricing-block'); if(!rows.length)return out;
    const width=Math.max(...rows.map(r=>r.length));
    if(rows[1]&&/^[\s¥￥$]*\d/.test(cellText(rows[1][0]))){const grid=el('div','matrix-grid');grid.style.setProperty('--matrix-cols',width);for(let ci=0;ci<width;ci++){const card=el('article','matrix-card tier-selectable');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-pressed',String(ci===0));card.setAttribute('aria-label',`选择 ${cellText(rows[0][ci])}`);const select=()=>{[...grid.children].forEach(c=>c.setAttribute('aria-pressed',String(c===card)));};card.addEventListener('click',select);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});rows.forEach((row,ri)=>{if(row[ci]===undefined)return;const node=cellNode(ri===0?'h3':'p',ri===0?'matrix-title':ri===1?'matrix-value is-price':'matrix-value tier-conditions',row[ci],si,ti,ri,ci);card.append(node);});grid.append(card);}out.append(grid);return out;}
    if(rows[0][0]!==undefined)out.append(cellNode('p','matrix-corner',rows[0][0],si,ti,0,0));
    const labels=el('div','matrix-labels');rows.slice(1).forEach((r,idx)=>{if(r[0]!==undefined)labels.append(cellNode('span','',r[0],si,ti,idx+1,0));});out.append(labels);
    const grid=el('div','matrix-grid');grid.style.setProperty('--matrix-cols',Math.min(3,width-1));
    for(let ci=1;ci<width;ci++) { const card=el('article','matrix-card');if(rows[0][ci]!==undefined)card.append(cellNode('h3','matrix-title',rows[0][ci],si,ti,0,ci));
      for(let ri=1;ri<rows.length;ri++){if(rows[ri][ci]===undefined)continue;const fact=el('div','matrix-fact');fact.append(el('span','matrix-label',cellText(rows[ri][0])));const value=cellNode('p','matrix-value',rows[ri][ci],si,ti,ri,ci);if(/价格|报价|收费|金额|费用/.test(cellText(rows[ri][0]))&&/\d/.test(cellText(rows[ri][ci])))value.classList.add('is-price');fact.append(value);card.append(fact);}grid.append(card); }
    out.append(grid);return out;
  }
  function renderRowsTable(table,si,ti) {
    const rows=normalizedRows(table);const out=el('div','table-block');if(!rows.length)return out;
    const head=el('div','table-head-values');rows[0].forEach((c,ci)=>head.append(cellNode('span','',c,si,ti,0,ci)));out.append(head);
    const list=el('div','row-card-list');list.style.setProperty('--row-cols',rows.length>3?2:1);
    for(let ri=1;ri<rows.length;ri++) { const card=el('article','row-card');if(rows[ri][0]!==undefined)card.append(cellNode('h3','row-card-title',rows[ri][0],si,ti,ri,0));const facts=el('dl');
      for(let ci=1;ci<rows[ri].length;ci++){const pair=el('div','row-fact');pair.append(el('dt','',cellText(rows[0][ci])));pair.append(cellNode('dd','',rows[ri][ci],si,ti,ri,ci));facts.append(pair);}card.append(facts);list.append(card); }
    out.append(list);return out;
  }
  function metricFrom(row) {
    for(let ci=row.length-1;ci>=1;ci--){const text=cellText(row[ci]);const m=text.match(/(?:[￥¥$€]|RMB\s*)?(\d[\d,]*(?:\.\d+)?)/);if(m){const value=Number(m[1].replaceAll(',',''));if(Number.isFinite(value)&&value>0)return value;}}return null;
  }
  function renderBarsTable(table,si,ti) {
    const rows=normalizedRows(table);const out=el('div','table-block');if(!rows.length)return out;
    const head=el('div','table-head-values');rows[0].forEach((c,ci)=>head.append(cellNode('span','',c,si,ti,0,ci)));out.append(head,el('p','bar-instruction','点选一行，展开对比光效'));
    const list=el('div','bar-list');
    if(rows[0].length===4&&cellText(rows[0][0])===cellText(rows[0][2])){const countries=[];for(let ri=1;ri<rows.length;ri++){for(let ci=0;ci<rows[ri].length;ci+=2)countries.push({ri,ci,name:rows[ri][ci],value:rows[ri][ci+1]});}const maximum=Math.max(...countries.map(c=>metricFrom([c.name,c.value])||0),1);countries.forEach((country,index)=>{const b=el('button','bar-row country-bar');b.type='button';b.setAttribute('aria-pressed',String(index===0));b.append(cellNode('span','bar-title',country.name,si,ti,country.ri,country.ci));const details=el('span','bar-details');details.style.setProperty('--bar-cols',1);details.append(cellNode('span','bar-value',country.value,si,ti,country.ri,country.ci+1));const track=el('span','bar-track'),fill=el('span','bar-fill');track.setAttribute('aria-hidden','true');track.style.setProperty('--bar-width',`${Math.max(5,(metricFrom([country.name,country.value])||0)/maximum*100)}%`);track.append(fill);details.append(track);b.append(details);b.addEventListener('click',()=>{for(const row of list.children)row.setAttribute('aria-pressed',String(row===b));});list.append(b);});out.append(list);return out;}
    const metrics=rows.slice(1).map(metricFrom),maximum=Math.max(...metrics.filter(v=>v!==null),1);
    for(let ri=1;ri<rows.length;ri++){const b=el('button','bar-row');b.type='button';b.setAttribute('aria-pressed',String(ri===1));if(rows[ri][0]!==undefined)b.append(cellNode('span','bar-title',rows[ri][0],si,ti,ri,0));
      const details=el('span','bar-details');details.style.setProperty('--bar-cols',Math.max(1,rows[ri].length-1));for(let ci=1;ci<rows[ri].length;ci++)details.append(cellNode('span','bar-value',rows[ri][ci],si,ti,ri,ci));
      const track=el('span','bar-track'),fill=el('span','bar-fill');track.setAttribute('aria-hidden','true');track.style.setProperty('--bar-width',`${metrics[ri-1]===null?75:Math.max(8,metrics[ri-1]/maximum*100)}%`);track.append(fill);details.append(track);b.append(details);b.addEventListener('click',()=>{for(const row of list.children)row.setAttribute('aria-pressed',String(row===b));});list.append(b); }
    out.append(list);return out;
  }
  function renderStandardTable(table,si,ti) {
    const rows=normalizedRows(table);const out=el('div','table-scroll');const t=el('table');const body=el('tbody');rows.forEach((row,ri)=>{const tr=el('tr');row.forEach((c,ci)=>tr.append(cellNode(ri===0?'th':'td','',c,si,ti,ri,ci)));body.append(tr);});t.append(body);out.append(t);out.setAttribute('tabindex','0');out.setAttribute('aria-label','原始数据表，可左右滚动');return out;
  }
  function addTables(container,slide,si) { (slide.tables||[]).forEach((table,ti)=>{const rows=normalizedRows(table);const title=plain(slide.title);let n;
    if(deckId==='tiktok'&&si===13&&rows[0]?.length>=3)n=renderTierTable(table,si,ti);
    else if(deckId==='tiktok'&&si===12)n=renderBarsTable(table,si,ti);
    else if((deckId==='tiktok'&&si===11)||/职责|分工|责任/.test(title))n=renderRowsTable(table,si,ti);
    else if(rows[0]?.length<=5&&rows.length>=2)n=renderRowsTable(table,si,ti);
    else n=renderStandardTable(table,si,ti);
    container.append(n);
  }); }
  function addImages(container,slide,si) {
    const images=slide.images||[];if(!images.length)return;
    const grid=el('div',`media-grid${images.length===1?' one-media':''}`);grid.style.setProperty('--media-cols',Math.min(3,images.length));
    images.forEach((picture,ii)=>{const fig=mark(el('figure',`source-image${num(picture.w)<150?' is-small':''}`),`${si}:image:${ii}`);const safe=urlSafe(picture.src);if(safe){const img=el('img');img.src=safe;img.alt=plain(picture.alt||`第 ${si+1} 页原始图片 ${ii+1}`);img.loading=si===state.index?'eager':'lazy';img.decoding='async';if(picture.width)img.width=num(picture.width);if(picture.height)img.height=num(picture.height);fig.append(img);}else fig.append(el('p','video-status','原始图片暂不可用'));if(picture.caption)fig.append(el('figcaption','',plain(picture.caption)));grid.append(fig);});container.append(grid);
  }
  function addVideos(container,slide,si) {
    const videos=slide.videos||[];if(!videos.length)return;
    const grid=el('div','video-grid');grid.style.setProperty('--video-cols',Math.min(2,videos.length));
    videos.forEach((media,vi)=>{const card=mark(el('div','video-card'),`${si}:video:${vi}`);const safe=urlSafe(media.src);const preview=el('button','video-preview');preview.type='button';preview.setAttribute('aria-label',`播放 ${plain(media.label||'案例视频')}`);const poster=urlSafe(media.poster);if(poster){const p=el('img');p.src=poster;p.alt='';p.loading='lazy';p.decoding='async';preview.append(p);}const play=el('span','video-play');play.append(icon('play'));preview.append(play,el('span','video-label',plain(media.label||'播放案例视频')));const status=el('div','video-status','点击播放时加载视频');
      preview.addEventListener('click',()=>{if(!safe){status.textContent='原始视频暂不可用';return;}const v=el('video');v.controls=true;v.playsInline=true;v.preload='none';if(poster)v.poster=poster;v.src=safe;card.replaceChildren(v,status);status.textContent=plain(media.label||'案例视频');v.addEventListener('error',()=>{status.textContent='此浏览器暂无法播放；';const a=el('a','','打开原始视频');a.href=safe;a.target='_blank';a.rel='noopener noreferrer';status.append(a);});const promise=v.play();if(promise)promise.catch(()=>{status.textContent='请点视频播放按钮继续';});});card.append(preview,status);grid.append(card);});container.append(grid);
  }
  function renderSlide(slide,si) {
    const parts=slideParts(slide),profile=bpProfile(slide);const section=el('section',`deck-slide slide-enter${si===0?' cover-slide':''}`);section.id=`slide-${si+1}`;section.dataset.slideIndex=si;section.dataset.layoutProfile=profile;section.setAttribute('aria-label',`第 ${si+1} 页：${plain(slide.title)}`);
    const top=el('div','slide-topline');const topMeta=el('div','original-meta');parts.header.forEach(i=>topMeta.append(itemNode(i,si,i._index,'compact',false)));top.append(topMeta,el('span','slide-index',`${String(si+1).padStart(2,'0')} / ${String(state.data.slides.length).padStart(2,'0')}`));section.append(top);
    const content=el('div',si===0?'cover-content':'');if(parts.title)content.append(itemNode(parts.title,si,parts.title._index,'title',false));else content.append(el('h1','slide-heading',plain(slide.title)));
    const body=el('div','slide-body');const firstTableY=slide.tables?.length?Math.min(...slide.tables.map(t=>num(t.y,Infinity))):Infinity;const afterTableItems=parts.body.filter(i=>num(i.y)>=firstTableY);const flags=addBody(body,{...parts,body:parts.body.filter(i=>!afterTableItems.includes(i))},slide,si);if(flags.isTarget)section.classList.add('target-slide');if(flags.isFlow)section.classList.add('flow-slide');addTables(body,slide,si);if(afterTableItems.length){const after=el('div','intro-stack after-table-stack');afterTableItems.sort((a,b)=>num(a.y)-num(b.y)).forEach(i=>after.append(itemNode(i,si,i._index,kindOf(i,afterTableItems),flags.isTarget)));body.append(after);}addImages(body,slide,si);addVideos(body,slide,si);
    if(deckId==='tiktok'&&si===4)section.classList.add('media-case-slide');
    if(deckId==='tiktok'&&(si===5||si===6)){const cards=[...body.querySelectorAll('.content-grid > .section-card')];const media=[...body.querySelectorAll(si===5?'.source-image':'.video-card')];media.forEach((node,index)=>{if(cards[index])cards[index].prepend(node);});body.querySelectorAll('.media-grid,.video-grid').forEach(grid=>{if(!grid.childNodes.length)grid.remove();});section.classList.add(si===5?'hook-slide':'source-variants');}
    if(profile==='case-media'){section.classList.add('case-media-slide');const cards=[...body.querySelectorAll('.content-grid > .section-card')];const images=[...body.querySelectorAll('.source-image')];if(cards[0])images.forEach(image=>cards[0].prepend(image));if(cards[1]){cards[1].classList.add('case-detail-card');[...cards[1].children].forEach((n,index)=>n.classList.add(index%2===0?'case-field-label':'case-field-value'));}body.querySelectorAll('.media-grid').forEach(grid=>{if(!grid.childNodes.length)grid.remove();});}
    if(deckId==='tiktok'&&si===10){section.classList.add('concentration-slide');const chart=el('div','concentration-chart');chart.setAttribute('aria-hidden','true');const portion=el('span','concentration-portion');portion.style.width='90.69%';chart.append(portion);const grid=body.querySelector('.content-grid');if(grid)grid.after(chart);else body.append(chart);}
    if(profile==='chapter'){section.classList.add('chapter-slide');const code=parts.body.find(i=>/^\d+$/.test(plain(i.text).trim()));if(code){const node=body.querySelector(`[data-source-key="${itemKey(si,code._index)}"]`);if(node){const parent=node.parentElement;node.classList.add('chapter-code');section.append(node);if(parent.classList.contains('section-card')&&!parent.childNodes.length){const grid=parent.parentElement;parent.remove();if(!grid.childNodes.length)grid.remove();}}}}
    if(si===state.data.slides.length-1)section.classList.add('cta-slide');
    content.append(body);
    if(si===0){const cover=el('div','cover-layout');cover.append(content);const hero=el('div','hero-art');hero.setAttribute('aria-hidden','true');const picture=el('picture');const src=el('source');src.media='(max-width: 820px)';src.srcset=`/tezign-tiktok-motion-deck/assets/hero-${deckId}-mobile.webp`;const img=el('img');img.src=`/tezign-tiktok-motion-deck/assets/hero-${deckId}.webp`;img.alt='';img.decoding='async';img.addEventListener('error',()=>hero.hidden=true);picture.append(src,img);hero.append(picture);cover.append(hero);section.append(cover);}else section.append(content);
    const foot=el('footer','slide-footer');parts.footer.forEach(i=>{const wrap=el('div',`original-meta${plain(i.text).length>45?' business-caveat':''}`);wrap.append(itemNode(i,si,i._index,'compact',false));foot.append(wrap);});const source=urlSafe(slide.sourceUrl||state.data.sourceUrl);if(source){const link=el('a','source-link','原始内容 ↗');link.href=source;link.target='_blank';link.rel='noopener noreferrer';foot.append(link);}if(foot.childNodes.length)section.append(foot);
    const notes=plain(slide.notes);if(notes.trim()){const details=el('details','slide-notes');details.append(el('summary','','演讲备注'),mark(el('div','notes-content',notes),`${si}:notes`,notes));section.append(details);}
    return section;
  }
  let shell,stage,prevButton,nextButton,pageLabel,progress,modeButton,motionButton,navCaption;
  function setStatus(){
    document.body.classList.toggle('motion-off',!state.motion);shell.classList.toggle('mode-present',state.mode==='present');shell.classList.toggle('mode-read',state.mode==='read');
    modeButton.setAttribute('aria-pressed',String(state.mode==='read'));modeButton.setAttribute('aria-label',state.mode==='read'?'切换演示模式':'切换阅读模式');modeButton.querySelector('.button-label').textContent=state.mode==='read'?'演示模式':'阅读模式';
    motionButton.setAttribute('aria-pressed',String(state.motion));motionButton.setAttribute('aria-label',state.motion?'关闭动效':'开启动效');motionButton.querySelector('.button-label').textContent=state.motion?'动效已开':'动效已关';
    state.rendered.forEach(s=>s.classList.toggle('is-current-slide',num(s.dataset.slideIndex)===state.index));
    pageLabel.replaceChildren(el('strong','',String(state.index+1).padStart(2,'0')),document.createTextNode(` / ${String(state.data.slides.length).padStart(2,'0')}`));progress.style.width=`${(state.index+1)/state.data.slides.length*100}%`;prevButton.disabled=state.index===0;nextButton.disabled=state.index===state.data.slides.length-1;navCaption.textContent=plain(state.data.slides[state.index].title);document.title=`SUPERCONTENT · ${deckId==='tiktok'?'内容赛马驱动 DTC 出海':'内容工厂 BP'} · ${state.index+1}/${state.data.slides.length}`;
  }
  function updateHash(){try{history.replaceState(null,'',`#slide-${state.index+1}`);}catch{}}
  function observeReading(){if(state.observer)state.observer.disconnect();state.observer=new IntersectionObserver(entries=>{if(state.mode!=='read')return;const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);if(!visible.length)return;const index=num(visible[0].target.dataset.slideIndex);if(index!==state.index){state.index=index;setStatus();updateHash();}},{rootMargin:'-80px 0px -35% 0px',threshold:[0,.15,.3,.5,.7]});for(const s of state.rendered)state.observer.observe(s);}
  function render(){
    if(state.observer)state.observer.disconnect();for(const v of stage.querySelectorAll('video'))v.pause();stage.replaceChildren();
    state.rendered=state.mode==='present'?[renderSlide(state.data.slides[state.index],state.index)]:state.data.slides.map(renderSlide);stage.append(...state.rendered);setStatus();
    if(state.mode==='read')observeReading();else stage.scrollTop=0;
    state.rendered.forEach(s=>s.classList.toggle('is-current-slide',num(s.dataset.slideIndex)===state.index));
  }
  function goTo(index,options={}){
    const next=Math.max(0,Math.min(state.data.slides.length-1,num(index)));state.index=next;
    if(state.mode==='present')render();else{setStatus();const target=document.getElementById(`slide-${next+1}`);target?.scrollIntoView({behavior:state.motion&&!options.instant?'smooth':'auto',block:'start'});}
    updateHash();if(state.drawer)closeDrawer();
  }
  function toggleMode(){state.mode=state.mode==='present'?'read':'present';const index=state.index;render();if(state.mode==='read')requestAnimationFrame(()=>goTo(index,{instant:true}));else window.scrollTo(0,0);}
  function closeDrawer(){if(!state.drawer)return;state.drawer.remove();state.drawer=null;document.body.style.overflow='';state.focusBeforeDrawer?.focus();}
  function openDrawer(){
    if(state.drawer)return;state.focusBeforeDrawer=document.activeElement;const scrim=el('div','drawer-scrim');const drawer=el('div','deck-drawer');drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','Deck目录');
    const header=el('div','drawer-header');header.append(el('h2','','目录'),button('关闭目录','close','',closeDrawer));const list=el('ol','drawer-list');state.data.slides.forEach((slide,si)=>{const li=el('li');const b=el('button','drawer-item');b.type='button';if(si===state.index)b.setAttribute('aria-current','page');b.append(el('span','drawer-number',String(si+1).padStart(2,'0')),el('span','drawer-title',plain(slide.title)));b.addEventListener('click',()=>goTo(si));li.append(b);list.append(li);});drawer.append(header,list);scrim.append(drawer);scrim.addEventListener('click',e=>{if(e.target===scrim)closeDrawer();});scrim.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeDrawer();}if(e.key==='Tab'){const nodes=[...drawer.querySelectorAll('button,a,[tabindex="0"]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.body.append(scrim);state.drawer=scrim;document.body.style.overflow='hidden';header.querySelector('button').focus();list.querySelector('[aria-current]')?.scrollIntoView({block:'nearest'});
  }
  async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}}
  function build(){
    shell=el('div','deck-shell');const toolbar=el('header','deck-toolbar');const brand=el('div','deck-wordmark');brand.title=plain(state.data.title);brand.append(el('span','brand-signal'),el('span','deck-name','SUPERCONTENT'),el('span','deck-context',deckId==='tiktok'?'内容赛马 · DTC出海':'CONTENT FACTORY BP'));const actions=el('div','toolbar-actions');modeButton=button('阅读模式','read','mode-button',toggleMode);motionButton=button('关闭动效','motion','',()=>{state.motion=!state.motion;setStatus();});const fullscreen=button('全屏演示','expand','fullscreen-button',toggleFullscreen);const menu=button('目录','menu','',openDrawer);actions.append(modeButton,motionButton,fullscreen,menu);toolbar.append(brand,actions);
    stage=el('main','deck-stage');stage.id='deck-stage';const nav=el('nav','deck-nav');nav.setAttribute('aria-label','幻灯片导航');const track=el('div','nav-progress');track.setAttribute('aria-hidden','true');progress=el('span');track.append(progress);prevButton=button('上一页','left','nav-button',()=>goTo(state.index-1));nextButton=button('下一页','right','nav-button',()=>goTo(state.index+1));pageLabel=el('div','nav-page');pageLabel.setAttribute('aria-live','polite');navCaption=el('span','nav-caption');nav.append(track,navCaption,prevButton,pageLabel,nextButton,el('span','nav-shortcuts','← → 翻页 · F 全屏 · P 阅读'));shell.append(toolbar,stage,nav);root.replaceChildren(shell);
    document.addEventListener('keydown',e=>{if(state.drawer)return;if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;const key=e.key.toLowerCase();if(state.mode==='present'&&['arrowright','pagedown','arrowleft','pageup','home','end'].includes(key)){e.preventDefault();goTo(key==='home'?0:key==='end'?state.data.slides.length-1:state.index+(['arrowright','pagedown'].includes(key)?1:-1));}else if(key==='p')toggleMode();else if(key==='f')toggleFullscreen();else if(key==='m'){state.motion=!state.motion;setStatus();}});
    let touch=null;stage.addEventListener('touchstart',e=>{if(state.mode!=='present'||e.touches.length!==1||e.target.closest('video,button,a,details,.table-scroll'))return;touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});stage.addEventListener('touchend',e=>{if(!touch||state.mode!=='present')return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.35)goTo(state.index+(dx<0?1:-1));},{passive:true});
    reduced.addEventListener?.('change',e=>{if(e.matches){state.motion=false;setStatus();}});render();if(state.index&&state.mode==='read')requestAnimationFrame(()=>goTo(state.index,{instant:true}));
  }
  function expectedKeys(){const keys=[];state.data.slides.forEach((s,si)=>{(s.items||[]).forEach((i,ii)=>keys.push({key:itemKey(si,ii),text:plain(i.text),type:'item'}));(s.tables||[]).forEach((t,ti)=>normalizedRows(t).forEach((r,ri)=>r.forEach((c,ci)=>keys.push({key:cellKey(si,ti,ri,ci),text:cellText(c),type:'cell'}))));(s.images||[]).forEach((i,ii)=>keys.push({key:`${si}:image:${ii}`,type:'image'}));(s.videos||[]).forEach((v,vi)=>keys.push({key:`${si}:video:${vi}`,type:'video'}));if(plain(s.notes).trim())keys.push({key:`${si}:notes`,text:plain(s.notes),type:'notes'});});return keys;}
  function auditCoverage(){const seen=new Map([...root.querySelectorAll('[data-source-key]')].map(n=>[n.dataset.sourceKey,n]));const expected=expectedKeys();const activeExpected=state.mode==='read'?expected:expected.filter(k=>k.key.startsWith(`${state.index}:`));const missing=[],changed=[];for(const entry of activeExpected){const node=seen.get(entry.key);if(!node)missing.push(entry.key);else if(entry.text!==undefined&&node.textContent!==entry.text)changed.push({key:entry.key,expected:entry.text,actual:node.textContent});}return {mode:state.mode,slides:state.mode==='read'?state.data.slides.length:1,expected:activeExpected.length,rendered:seen.size,missing,changed,pass:missing.length===0&&changed.length===0};}
  window.MotionDeck={version:'1.0.0',getState:()=>({deck:deckId,index:state.index,mode:state.mode,motion:state.motion,slides:state.data?.slides.length||0}),goTo,toggleMode,auditCoverage,renderAllForAudit:()=>{state.mode='read';render();return auditCoverage();},get data(){return state.data;}};
  root.replaceChildren(el('div','deck-loading','正在加载动态 Deck…'));
  fetch(`/tezign-tiktok-motion-deck/data/${deckId}.json`,{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}).then(data=>{if(!Array.isArray(data.slides)||!data.slides.length)throw new Error('Deck内容为空');state.data=data;const hash=window.location.hash.match(/^#slide-(\d+)$/);state.index=Math.min(data.slides.length-1,Math.max(0,hash?Number(hash[1])-1:0));build();}).catch(error=>{const box=el('div','deck-loading deck-error');box.append(el('div','','Deck暂时无法加载，请刷新重试。'));const a=el('a','','返回目录');a.href='/tezign-tiktok-motion-deck/';box.append(a);root.replaceChildren(box);console.error('MotionDeck load failed:',error);});
})();
