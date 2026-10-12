/* Conference deck. Buildless. Media loads only in the visible wall. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const narrow = window.matchMedia('(max-width:900px)');
  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  let index = 0, reading = narrow.matches, observer, wallVisible = false, wallTimer, rotation = 0;
  let assets = [], assetsPromise, wallBuilt = false, wallBusy = false, touchStart;
  const visibleSlides = new Map();
  const wall = document.querySelector('#video-wall');
  const single = document.querySelector('#single-video');
  const videoDialog = document.querySelector('#video-dialog');
  const resume = document.querySelector('#wall-resume');
  const tiles = [];
  const byId = id => document.getElementById(id);
  const clamp = n => Math.min(slides.length - 1, Math.max(0, n));
  const sourceURL = value => {
    const url = new URL(value, window.location.href);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('Invalid media URL');
    return url.href;
  };
  function updateControls() {
    if (!slides[index].classList.contains('character-comparison')) document.querySelectorAll('.comparison-gallery video').forEach(video => video.pause());
    byId('page-number').textContent = String(index + 1).padStart(2, '0');
    byId('control-title').textContent = slides[index].dataset.title;
    byId('deck-progress').style.width = `${(index + 1) / slides.length * 100}%`;
    byId('prev-button').disabled = index === 0;
    byId('next-button').disabled = index === slides.length - 1;
    byId('status').textContent = `第 ${index + 1} 页，共 ${slides.length} 页。${slides[index].dataset.title}`;
    byId('mode-button').textContent = reading ? '演示' : '阅读';
    document.body.classList.toggle('wall-active', index === 3);
    document.querySelectorAll('#contents-list button').forEach((b, i) => i === index ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  }
  function navigate(next, syncHash = true) {
    index = clamp(next);
    if (reading) slides[index].scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block:'start'});
    else {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        slide.inert = i !== index;
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      setWallVisible(index === 3);
    }
    if (syncHash) history.replaceState(null, '', `#p${index + 1}`);
    updateControls();
  }
  function setMode(next, scroll = true) {
    reading = next;
    document.body.classList.toggle('read-mode', reading);
    observer?.disconnect();
    visibleSlides.clear();
    if (reading) {
      slides.forEach(slide => {slide.inert = false; slide.removeAttribute('aria-hidden');});
      observer = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? visibleSlides.set(e.target,e) : visibleSlides.delete(e.target));
        const viewport = window.innerHeight;
        const visibility = slide => {const rect=slide.getBoundingClientRect();return Math.max(0,Math.min(rect.bottom,viewport)-Math.max(rect.top,0));};
        const visible = [...visibleSlides.keys()].sort((a,b) => visibility(b)-visibility(a))[0];
        if (visible) {index = slides.indexOf(visible);history.replaceState(null,'',`#p${index+1}`);updateControls();}
        setWallVisible(visibleSlides.has(slides[3]) && visibility(slides[3]) > viewport*.18);
      }, {threshold:[0,.2,.35,.5,.7], rootMargin:'0px 0px -5% 0px'});
      slides.forEach(slide => observer.observe(slide));
      if (scroll) slides[index].scrollIntoView({block:'start'});
    } else {window.scrollTo(0,0); navigate(index, false);}
    updateControls();
  }
  async function loadAssets() {
    if (assets.length) return assets;
    if (!assetsPromise) assetsPromise = (async () => {
      const response = await fetch('./data/wall.json', {cache:'no-cache'});
      if (!response.ok) throw new Error(`Media manifest ${response.status}`);
      const data = await response.json();
      const films = data.videos.filter(a => a.src && a.poster);
      if (films.length < 18) throw new Error('Insufficient independent overseas films');
      assets = films;
      return assets;
    })().catch(error => {assetsPromise = undefined; throw error;});
    return assetsPromise;
  }
  function caseCategory(asset) {
    const n = Number(asset.id.split('-')[1]);
    if (n <= 6) return '手机 · 本地化混剪';
    if (n <= 9) return '拉美电商 · 混剪';
    if (n <= 11) return 'AI 前贴 + 素材混剪';
    if (n <= 13) return n === 12 ? '纯 AI 动画 · 110 万播放*' : '纯 AI 创意动画';
    if (n <= 16) return '品牌社媒 · 混剪';
    if (n <= 18) return 'AI 原料 + 品牌素材';
    return n === 20 ? '纯 AI 家电 · 113.6 万曝光*' : '纯 AI 家电';
  }
  async function buildWall() {
    if (wallBuilt || wallBusy) return;
    wallBusy = true;
    try {
      await loadAssets();
      const count = Math.min(20, assets.length);
      for (let i = 0; i < count; i++) {
        const button = document.createElement('button'); button.className = 'wall-tile'; button.type = 'button';
        const img = document.createElement('img'); img.alt = ''; img.decoding = 'async';
        const video = document.createElement('video'); video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
        video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('autoplay','');
        const label = document.createElement('span');label.className = 'wall-tile-label';
        const tile = {button,img,video,label,assetIndex:i};
        video.addEventListener('playing', () => {button.classList.add('is-playing'); if (tiles.every(t => !t.video.paused)) resume.hidden = true;});
        video.addEventListener('error', () => {button.classList.remove('is-playing');resume.hidden = false;});
        video.addEventListener('loadedmetadata', () => {if (Number.isFinite(video.duration) && video.duration > 2) video.currentTime = (i * 1.7) % Math.max(1,video.duration - 1);});
        button.addEventListener('click', () => openFilm(tile.assetIndex));
        button.append(img,video,label); wall.append(button);tiles.push(tile);assignTile(tile,i,false);
      }
      wallBuilt = true;
      byId('wall-count').textContent = `${assets.length} FILMS / OVERSEAS WORKS`;
      if (wallVisible) startWall();
    } catch (error) {
      byId('wall-count').textContent = '海外案例暂未加载';
      resume.hidden = false;resume.textContent = '重新加载案例墙';
      console.error(error);
    } finally {wallBusy = false;}
  }
  function assignTile(tile, n, play = true) {
    tile.assetIndex = n;
    const asset = assets[n];
    tile.video.pause();tile.button.classList.remove('is-playing');
    tile.img.src = sourceURL(asset.poster);tile.video.poster = sourceURL(asset.poster);
    tile.button.setAttribute('aria-label', `${asset.label}，点击查看完整视频`);
    tile.label.textContent = caseCategory(asset);
    if (play) {tile.video.src = sourceURL(asset.src); playVideo(tile.video);}
  }
  function playVideo(video) {
    if (!wallVisible || document.hidden || videoDialog.open) return;
    const result = video.play();
    result?.catch(() => {resume.hidden = false;resume.textContent = '播放案例墙';});
  }
  function startWall() {
    if (!wallBuilt || !wallVisible || document.hidden || videoDialog.open) return;
    tiles.forEach(tile => {if (!tile.video.getAttribute('src')) tile.video.src = sourceURL(assets[tile.assetIndex].src);playVideo(tile.video);});
    clearInterval(wallTimer);
    if (assets.length > tiles.length) wallTimer = setInterval(() => {
      const occupied = new Set(tiles.map(t => t.assetIndex));
      const next = assets.findIndex((_,i) => !occupied.has(i));
      if (next >= 0) assignTile(tiles[rotation++ % tiles.length],next);
    }, 11000);
  }
  function pauseWall() {clearInterval(wallTimer);tiles.forEach(t => t.video.pause());}
  function setWallVisible(visible) {
    wallVisible = visible;
    if (visible) {if (!wallBuilt) buildWall(); else startWall();}
    else pauseWall();
  }
  function openFilm(n) {
    const asset = assets[n];if (!asset) return;
    pauseWall();single.pause();single.src = sourceURL(asset.src);single.poster = sourceURL(asset.poster);single.muted = false;single.loop = false;
    byId('film-label').textContent = asset.label;videoDialog.showModal();single.play()?.catch(() => {});
  }
  document.querySelectorAll('[data-case-film]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await loadAssets();
      const film = assets.findIndex(asset => asset.id === button.dataset.caseFilm);
      if (film < 0) throw new Error('Case film unavailable');
      openFilm(film);
    } catch (error) {
      byId('status').textContent = '案例视频暂未加载，请再次点击播放。';
      console.error(error);
    } finally {button.disabled = false;}
  }));
  videoDialog.addEventListener('close', () => {single.pause();single.removeAttribute('src');single.load();startWall();});
  resume.addEventListener('click', () => {if (!wallBuilt) buildWall();else startWall();});
  document.addEventListener('visibilitychange', () => document.hidden ? pauseWall() : startWall());
  const comparisonVideos = [...document.querySelectorAll('.comparison-gallery video')];
  comparisonVideos.forEach(video => video.addEventListener('play', () => {comparisonVideos.forEach(other => {if (other !== video) other.pause();});}));
  const pauseComparisons = () => comparisonVideos.forEach(video => video.pause());
  document.addEventListener('visibilitychange', () => {if (document.hidden) pauseComparisons();});
  byId('prev-button').addEventListener('click', () => navigate(index-1));
  byId('next-button').addEventListener('click', () => navigate(index+1));
  byId('mode-button').addEventListener('click', () => setMode(!reading));
  let motion = !reduced.matches;
  function setMotion(next) {
    motion = Boolean(next) && !reduced.matches;
    document.body.classList.toggle('motion-off', !motion);
    const control = byId('motion-button');
    control.textContent = motion ? '动效' : '静态';
    control.setAttribute('aria-pressed', String(motion));
    control.setAttribute('aria-label', motion ? '关闭动效' : '开启动效');
  }
  byId('motion-button').addEventListener('click', () => setMotion(!motion));
  reduced.addEventListener('change', () => setMotion(!reduced.matches));
  setMotion(motion);
  async function fullscreen() {
    try {if (document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch {byId('status').textContent = '当前浏览器未提供全屏，请使用浏览器的全屏功能。';}
  }
  byId('fullscreen-button').addEventListener('click',fullscreen);
  slides.forEach((slide,i) => {
    const li = document.createElement('li'), b = document.createElement('button'), number = document.createElement('span');
    b.type = 'button';number.textContent = String(i+1).padStart(2,'0');b.append(number,document.createTextNode(slide.dataset.title));
    b.addEventListener('click',() => {byId('contents-dialog').close();navigate(i);});li.append(b);byId('contents-list').append(li);
  });
  byId('contents-button').addEventListener('click',() => byId('contents-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click',() => byId(b.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click',e => {if (e.target === d) {const r = d.getBoundingClientRect();if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();}}));
  document.addEventListener('keydown',e => {
    if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End',' '].includes(e.key)) {
      if (reading && e.key === ' ') return;
      e.preventDefault();navigate(e.key === 'Home' ? 0 : e.key === 'End' ? slides.length-1 : index + (['ArrowRight','PageDown',' '].includes(e.key) ? 1 : -1));
    } else if (e.key.toLowerCase() === 'f') fullscreen(); else if (e.key.toLowerCase() === 'p') setMode(!reading); else if (e.key.toLowerCase() === 'm') setMotion(!motion);
  });
  document.addEventListener('touchstart',e => {touchStart = e.touches.length === 1 ? [e.touches[0].clientX,e.touches[0].clientY] : null;},{passive:true});
  document.addEventListener('touchend',e => {
    if (reading || !touchStart || document.querySelector('dialog[open]')) return;
    const dx=e.changedTouches[0].clientX-touchStart[0],dy=e.changedTouches[0].clientY-touchStart[1];
    if (Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.4) navigate(index+(dx<0?1:-1));touchStart=null;
  },{passive:true});
  const bars = document.querySelector('.signal-bars');
  if (bars) for(let i=0;i<30;i++){const b=document.createElement('i');b.style.height=`${15+((i*17)%41)}px`;b.style.animationDelay=`${i*.018}s`;bars.append(b);}
  const initial = /^#p(\d+)$/.exec(location.hash);if (initial) index=clamp(Number(initial[1])-1);
  window.addEventListener('hashchange',() => {const m=/^#p(\d+)$/.exec(location.hash);if(m)navigate(Number(m[1])-1,false);});
  narrow.addEventListener('change',() => setMode(narrow.matches));
  setMode(reading,false);navigate(index,false);
  window.ConferenceDeck = {navigate,setMode,setMotion,getState:() => ({index,reading,motion,slides:slides.length,wallVisible,films:assets.length,tiles:tiles.length,playing:tiles.filter(t => !t.video.paused).length}),version:'v1.4.0'};
})();
