/* 臺南遊：每個遊戲共用的程式（2026-10-19 從各遊戲搬出來）。
   遊戲檔要先定義：ICON、icon()、STOPS、buildMap()、decorate()、LV、MAPS、GAMES（start 和各關的小遊戲）、KEY；
   可以另外定義：ERA0（地圖一開始是 now 還是 past，預設 now）、LEARN（延伸閱讀的網址）、NOTE（完成頁的給大人和資料來源小字）。
   這支程式要放在遊戲自己的 <script> 後面載入。 */
var ERA0=typeof ERA0==='string'?ERA0:'now';
var LEARN=typeof LEARN==='string'?LEARN:'';
var NOTE=typeof NOTE==='string'?NOTE:'';
// 注音（ZY，工具/做注音.py 做的）和詞卡（WORDS：點粗體字看小圖），遊戲沒有就不出現（2026-10-26）
var ZY=typeof ZY==='object'?ZY:null,WORDS=typeof WORDS==='object'?WORDS:null;

/* ---------- 狀態 ---------- */
var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
// 每次打開都從頭開始，不記錄玩到哪裡（使用者 2026-10-17 要求）；順便清掉以前存的進度
var st={far:0,done:{0:1},name:''};store.set=function(){};try{localStorage.removeItem(KEY)}catch(e){}
function save(){store.set(KEY,JSON.stringify(st))}
function nStamps(){var n=0;LV.forEach(function(l,i){if(l.stamp&&st.done[i])n++});return n}
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 地圖操作 ---------- */
var map=document.getElementById('map');map.innerHTML=buildMap();decorate();
var pinEl=document.getElementById('pin');
var vb=[0,0,800,600],camRaf=0;
function cam(t){
  cancelAnimationFrame(camRaf);var from=vb.slice(),t0=performance.now(),D=reduce?1:900;
  (function step(now){var q=Math.max(0,Math.min(1,(now-t0)/D)),e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;vb=from.map(function(v,k){return v+(t[k]-v)*e});map.setAttribute('viewBox',vb.join(' '));if(q<1)camRaf=requestAnimationFrame(step)})(t0);
}
function setEra(e){
  map.classList.toggle('now',e==='now');
  document.querySelectorAll('.era button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.era===e)});
}
document.querySelectorAll('.era button').forEach(function(b){b.addEventListener('click',function(){setEra(b.dataset.era)})});
map.querySelectorAll('.stop').forEach(function(g){g.addEventListener('click',function(){var lv=+g.dataset.lv;if(lv<=st.far)go(lv)})});

/* ---------- 上方舞台：地圖或小遊戲畫面 ---------- */
var sceneEl=document.getElementById('scene'),peek=document.getElementById('peek'),eraBox=document.querySelector('.era'),sceneTimer=0;
var stage=document.getElementById('stage'),loops=[];
function stopLoops(){loops.forEach(function(f){f()});loops=[]}
// 寬螢幕（左右兩欄）時舞台填滿左欄；手機直拿時舞台縮到剛好放得下遊戲圖
var wide=window.matchMedia?matchMedia('(min-width:700px) and (min-aspect-ratio:5/4)'):{matches:false};
// 手機上捲動時，網址列會縮起來、畫面變高；圓的大小只在轉方向（寬度變了）時才重算，免得文字和按鈕跟著跳（2026-10-25）
var baseW=innerWidth,baseH=innerHeight;
function fitStage(){
  // 圓的大小：手機上幾乎滿版寬、最多六成高（2026-10-25 放大）；寬螢幕填滿左欄
  var svg=sceneEl.hidden?null:sceneEl.querySelector('svg'),disc=stage.querySelector('.disc'),W=stage.clientWidth,D;
  if(wide.matches){stage.style.height='';D=Math.min(W,stage.clientHeight)-36}
  else{if(innerWidth!==baseW){baseW=innerWidth;baseH=innerHeight}D=Math.min(W-10,Math.round(baseH*.6));stage.style.height=(D+32)+'px'}
  D=Math.max(180,D);disc.style.width=disc.style.height=D+'px';stage.style.setProperty('--d',D+'px');
  if(!svg)return;
  // 長方形的遊戲圖剛好放進圓裡（四個角都不被切掉）
  var vb=svg.viewBox.baseVal,a=vb.height/vb.width,sw=D*Math.min(.93,Math.cos(Math.atan(a))*1.06),sh=sw*a,k=sw/vb.width,top=(D-sh)/2,g=null,gy=-1;
  svg.style.width=sw+'px';svg.style.height=sh+'px';
  // 遊戲圖最下面那條地面或水面，往下延伸到圓的底部（viewBox 可以不從 0 0 開始，用來把圖放大）
  [].forEach.call(svg.children,function(r){if(r.tagName!=='rect')return;var x=+r.getAttribute('x')||0,w=+r.getAttribute('width')||0,y=+r.getAttribute('y')||0,h=+r.getAttribute('height')||0;if(x<=vb.x&&x+w>=vb.x+vb.width&&y>vb.y&&y+h>=vb.y+vb.height-1&&y>gy){g=r;gy=y}});
  var sky=svg.style.background||'#DFF3F8';
  sceneEl.style.background=g?'linear-gradient('+sky+' '+(top+(gy-vb.y)*k)+'px,'+g.getAttribute('fill')+' 0)':sky;
}
new MutationObserver(function(){if(!sceneEl.hidden)fitStage()}).observe(sceneEl,{childList:true});
addEventListener('resize',fitStage);
function showMap(){sceneEl.hidden=true;eraBox.hidden=false;peek.className='back';peek.textContent='ゲームにもどる';peek.hidden=!sceneEl.firstChild;fitStage()}
function showGame(){if(!sceneEl.firstChild)return;sceneEl.hidden=false;eraBox.hidden=true;peek.className='';peek.textContent='ここはどこ？';peek.hidden=false;fitStage()}
function setScene(html,delay){
  clearTimeout(sceneTimer);sceneEl.innerHTML=html;var svg=sceneEl.querySelector('svg');
  if(svg){svg.setAttribute('preserveAspectRatio','xMidYMax meet');sceneEl.style.background=svg.style.background||'#DFF3F8'}
  if(delay&&!reduce){showMap();peek.hidden=true;sceneTimer=setTimeout(showGame,delay)}else showGame();
  return sceneEl;
}
function clearScene(){clearTimeout(sceneTimer);stopLoops();sceneEl.innerHTML='';showMap()}
peek.addEventListener('click',function(){if(sceneEl.hidden)showGame();else showMap()});

/* ---------- 卡片 ---------- */
var card=document.getElementById('card'),cur=0;
card.addEventListener('click',function(e){if(e.target.closest('.big')&&sceneEl.hidden)showGame()});
function chips(pop){
  var h='';LV.forEach(function(l,i){if(l.stamp)h+='<i class="'+(st.done[i]?'on':'')+(pop===i?' pop':'')+'">'+(st.done[i]?icon(l.stamp[0]):'')+'</i>'});
  document.getElementById('chips').innerHTML=h;
}
function el(html){var d=document.createElement('div');d.innerHTML=html;return d}
function say(box,text,again){box.hidden=false;box.className='say'+(again?' again':'');box.innerHTML=text}
function later(fn,ms){var t=setTimeout(fn,reduce?0:ms);loops.push(function(){clearTimeout(t)})}
// 捲到看得到 node：手機上圓黏在畫面上方、上一關／下一關黏在下面，要捲到兩個中間，不能躲在圓的後面（2026-10-25：選項的上半被圓蓋住，按不到）
function into(node){setTimeout(function(){var bh=reduce?'auto':'smooth';
  if(getComputedStyle(stage).position!=='sticky'){node.scrollIntoView({block:'nearest',behavior:bh});return}
  // 圓黏住以後的下緣＝圓的高度；捲完還沒黏住的話，圓會跟著往上，不會蓋到
  var r=node.getBoundingClientRect(),ft=document.querySelector('.foot'),H=stage.offsetHeight+12,bot=(ft?ft.getBoundingClientRect().top:innerHeight)-10,
    nat=document.getElementById('top').getBoundingClientRect().bottom,d=Math.max(0,r.bottom-bot);
  if(nat-d<=0&&r.top-d<H)d=r.top-H;
  if(Math.abs(d)>1)window.scrollBy({top:d,behavior:bh})},50)}
// 按鈕：手指放開就算（手機上 click 有時候會被吃掉，要按很用力才有反應）；滑動捲頁不算
function tap(b,fn){var id=null,sx=0,sy=0,t=0;
  b.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;id=e.pointerId;sx=e.clientX;sy=e.clientY});
  b.addEventListener('pointerup',function(e){if(e.pointerId!==id)return;id=null;if(!b.disabled&&Math.hypot(e.clientX-sx,e.clientY-sy)<16){t=Date.now();fn()}});
  b.addEventListener('pointercancel',function(){id=null});
  b.addEventListener('click',function(){if(Date.now()-t<700||b.disabled)return;fn()})}
function onKey(node,fn){node.addEventListener('click',fn);node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})}
// 按鈕手指一放開就送出 click（遊戲自己綁的 click 照常會收到），之後瀏覽器自己的 click 不再重複
function fastClick(b){var id=null,sx=0,sy=0,t=0;
  b.addEventListener('click',function(e){if(e._fast)return;if(Date.now()-t<700){e.stopImmediatePropagation();e.preventDefault()}},true);
  b.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;id=e.pointerId;sx=e.clientX;sy=e.clientY});
  b.addEventListener('pointerup',function(e){if(e.pointerId!==id)return;id=null;if(b.disabled||Math.hypot(e.clientX-sx,e.clientY-sy)>=16)return;t=Date.now();var ev=new MouseEvent('click',{bubbles:true,cancelable:true});ev._fast=1;b.dispatchEvent(ev)});
  b.addEventListener('pointercancel',function(){id=null});return b}
function bigBtn(area,text,blue){var b=el('<button class="big'+(blue?' blue':'')+'" type="button">'+text+'</button>').firstChild;fastClick(b);area.appendChild(b);into(b);return b}

function whyHTML(l){return l.why?'<details class="why"><summary>'+l.why[0]+'</summary><p>'+l.why[1]+'</p></details>':''}
function win(i){
  if(st.done[i])return;st.done[i]=1;st.far=Math.max(st.far,i+1);save();chips(i);paint();
  var l=LV[i],box=el('<div class="got"><span class="seal'+(reduce?'':' pop')+'">'+icon(l.stamp[0])+'</span><p>スタンプ：'+l.stamp[1]+'！<br>「つぎへ」をおしてね。</p></div>'+whyHTML(l));
  var nb=card.querySelector('.redo')||card.querySelector('.notes');if(nb)card.insertBefore(box,nb);else card.appendChild(box);into(box);
}
function render(i){
  var l=LV[i];
  var top=document.getElementById('top');top.innerHTML='<p class="kick">'+l.kick+'</p><h2>'+l.h+'</h2>';
  card.innerHTML=l.html+(l.task?'<p class="task">'+l.task+'</p>':'');
  if(WORDS&&l.game==='start')card.insertAdjacentHTML('beforeend','<p class="whint">ヒント：下に<b class="w demo">点々</b>がある言葉をタップすると、絵が見られます。</p>');
  [top,card].forEach(function(n){n.classList.remove('enter');void n.offsetWidth;n.classList.add('enter')});
  card.scrollTop=0;if(!wide.matches)window.scrollTo(0,0);
  var area=document.createElement('div');card.appendChild(area);
  // 提醒、給大人：全部移到卡片最下面
  var ns=card.querySelectorAll(':scope>p.note');if(ns.length){var nb=document.createElement('div');nb.className='notes';
    [].forEach.call(ns,function(n){if(!/^\s*おうちの方へ/.test(n.textContent))n.insertAdjacentHTML('afterbegin','<b>ちゅうい</b>　');nb.appendChild(n)});card.appendChild(nb)}
  // 去現場看看：Google 地圖連結放在卡片最下面的小字（完成頁列出全部）
  var mp=MAPS[i];if(l.game==='end'){var seen={};mp=[];Object.keys(MAPS).forEach(function(k){MAPS[k].forEach(function(m){if(!seen[m[0]]){seen[m[0]]=1;mp.push(m)}})})}
  if(mp&&mp.length){var nb2=card.querySelector(':scope>.notes');if(!nb2){nb2=document.createElement('div');nb2.className='notes';card.appendChild(nb2)}
    nb2.insertAdjacentHTML('beforeend','<p class="note maps">行ってみよう（Google マップ）：'+mp.map(function(m){return '<a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(m[1])+'" target="_blank" rel="noopener">'+m[0]+'</a>'}).join('、')+'</p>')}
  // 延伸閱讀：每一關卡片最下面的小字（另開分頁，遊戲不會中斷）；完成頁另有按鈕
  if(LEARN&&l.game!=='end'){var nb3=card.querySelector(':scope>.notes');if(!nb3){nb3=document.createElement('div');nb3.className='notes';card.appendChild(nb3)}
    nb3.insertAdjacentHTML('beforeend','<p class="note maps">おうちの方へ：<a href="'+LEARN+'" target="_blank" rel="noopener">もっと詳しく</a>（背景、現地での楽しみ方、出典）</p>')}
  if(st.done[i]&&l.stamp){
    area.innerHTML=(l.win?'<p class="say">'+l.win+'</p>':'')+(l.q?'<p class="say">'+l.q.e+'</p>':'')+whyHTML(l)+'<div class="got"><span class="seal">'+icon(l.stamp[0])+'</span><p>スタンプずみ：'+l.stamp[1]+'</p></div><button class="again-btn" type="button">このステージをもういちど</button>';
    tap(area.querySelector('.again-btn'),function(){restart(i)});
    return;
  }
  GAMES[l.game](area,i,l);
  // 每一關都可以重來（2026-10-25 使用者反映：玩壞了只能從第 1 關重玩）
  if(l.game!=='start'&&l.game!=='end'){var rb=el('<button class="again-btn redo" type="button">このステージをはじめから</button>').firstChild;card.insertBefore(rb,area.nextSibling);
    tap(rb,function(){restart(i)})}
  // 開場「出發」旁邊：延伸閱讀的小圓按鈕（玩過的人不用再玩一次就能看；另開分頁）
  if(l.game==='start'&&LEARN){var b0=area.querySelector('.big');if(b0){var row=document.createElement('div');row.className='go-row';b0.parentNode.insertBefore(row,b0);row.appendChild(b0);row.insertAdjacentHTML('beforeend','<a class="learn-round" href="'+LEARN+'" target="_blank" rel="noopener">もっと<br>知る</a>')}}
}
var replay=-1;
// 同一關重新玩：停掉動畫，遊戲從頭開始（玩過的關卡，章還是留著）
function restart(i){stopLoops();var keep=st.done[i];delete st.done[i];render(i);if(keep)st.done[i]=keep;replay=keep?i:-1;paint();if(!wide.matches)window.scrollTo(0,0)}
function finish(i){if(replay===i){replay=-1;render(i);return}win(i)}

function quiz(area,l,done){
  var q=l.q,box=el('<p class="kick" style="margin-top:6px">'+(q.field?'現地でさがそう':'考えてみよう')+'</p><p>'+q.t+'</p>');
  var opts=document.createElement('div');
  q.o.forEach(function(t,j){
    var b=document.createElement('button');b.type='button';b.className='opt';b.textContent=t;
    tap(b,function(){if(b.disabled)return;
      if(j===q.a){opts.querySelectorAll('.opt').forEach(function(x){x.disabled=true});b.classList.add('yes');say(msg,q.e);if(sk)sk.remove();done()}
      else{b.classList.add('no');b.disabled=true;say(msg,q.hint,1)}
    });opts.appendChild(b)});
  box.appendChild(opts);var msg=document.createElement('p');msg.hidden=true;box.appendChild(msg);
  var sk=null;if(q.field){sk=el('<button class="skip" type="button">いまは現地にいないので、とばす</button>').firstChild;tap(sk,function(){opts.querySelectorAll('.opt').forEach(function(x){x.disabled=true});say(msg,'とばしました。'+q.e);sk.remove();done()});box.appendChild(sk)}
  area.appendChild(box);into(box);
}
// 把螢幕上的點換成插圖裡的座標
function toSvg(svg,e){var m=svg.getScreenCTM();if(!m)return {x:-999,y:-999};var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(m.inverse())}
// 在插圖上拖手指：down、move、up 都換成插圖座標
function drag(svg,fn){
  var on=false;svg.style.touchAction='none';
  svg.addEventListener('pointerdown',function(e){on=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}fn('down',toSvg(svg,e),e)});
  svg.addEventListener('pointermove',function(e){if(on||e.pointerType==='mouse')fn(on?'move':'hover',toSvg(svg,e),e)});
  ['pointerup','pointercancel'].forEach(function(t){svg.addEventListener(t,function(e){if(on){on=false;fn('up',toSvg(svg,e),e)}})});
}

GAMES.end=function(area,i,l){
    // 回顧：每一段把鏡頭飛到那一關的地點，下面講那一關做了什麼
    var steps=[];LV.forEach(function(v,k){if(v.stamp&&k>0)steps.push(k)});
    var n=-1,firstTime=nStamps()===steps.length;
    area.innerHTML='<div class="recap" aria-live="polite"></div><button class="big" type="button">ふり<br>かえる</button><p class="rn"></p>'+(LEARN?'<p class="learn"><a class="learn-btn" href="'+LEARN+'" target="_blank" rel="noopener">おうちの方へ：もっと詳しく</a></p>':'')+'<p><button class="again-btn" type="button">さいしょからあそぶ</button></p><p class="note" style="margin-top:20px">'+NOTE+'</p>';
    var box=area.querySelector('.recap'),btn=area.querySelector('.big'),cnt=area.querySelector('.rn');
    function stopOf(k){var s=null;STOPS.forEach(function(t){if(t.lv===k)s=t});if(!s&&LV[k].pin!==undefined)s=STOPS[LV[k].pin];return s}
    function show(){
      box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');
      if(n<0){cam(camFor(i,l));setEra(ERA0);pinEl.style.display='none';box.innerHTML='';btn.innerHTML='ふり<br>かえる';cnt.textContent='';return}
      var k=steps[n],v=LV[k],s=stopOf(k);
      cam(camFor(k,v));setEra(v.era||ERA0);
      if(s){pinEl.style.display='';pinEl.setAttribute('transform','translate('+s.x+' '+(s.y-18)+')')}else pinEl.style.display='none';
      var txt=v.win||(v.q&&v.q.e)||(v.why&&v.why[1])||'';
      box.innerHTML='<div class="rc"><span class="seal'+(st.done[k]?'':' empty')+'">'+(st.done[k]?icon(v.stamp[0]):'')+'</span><div><p class="rk">'+v.kick+'</p><p class="rh">'+v.h+'</p><p>'+txt+'</p></div></div>';
      btn.innerHTML=n<steps.length-1?'つぎ':'もう<br>いちど';
      cnt.textContent=(n+1)+' / '+steps.length;
    }
    btn.addEventListener('click',function(){n=n<steps.length-1?n+1:-1;show();into(btn)});
    area.querySelector('.again-btn').addEventListener('click',function(){st={far:0,done:{0:1},name:''};save();chips();setEra(ERA0);go(0)});
    show();
    if(!reduce&&firstTime)confetti();
};

function confetti(){var cs=['#E2574C','#F5A623','#7BC47F','#6EC3DD','#F7A8C4'];for(var k=0;k<36;k++){var c=document.createElement('i');c.className='conf';c.style.left=(Math.random()*100)+'vw';c.style.background=cs[k%5];c.style.animationDelay=(Math.random()*.8)+'s';document.body.appendChild(c);setTimeout(function(x){return function(){x.remove()}}(c),3600)}}

/* ---------- 詞卡和關鍵字注音（2026-10-26 朋友試玩的建議） ---------- */
// 注音：只加在關鍵字上（詞卡的字，直排在字的右邊），不是整篇都加（使用者 2026-10-26 定的）；讀音在 ZY，一個詞一筆
var HANRE=/[㐀-䶿一-鿿豈-﫿]/;
function plainTxt(n){return n.textContent.replace(/[ㄅ-ㄯˊˇˋ˙]/g,'').trim()}
function zyChar(ch,r){
  var m=r.match(/[ˊˇˋ˙]$/),tone=m?m[0]:'';if(tone)r=r.slice(0,-1);
  return '<span class="zy">'+ch+'<i class="bp" aria-hidden="true">'+(tone==='˙'?'<u class="lt">˙</u>':'')+r.split('').map(function(c){return '<s>'+c+'</s>'}).join('')+(tone&&tone!=='˙'?'<u>'+tone+'</u>':'')+'</i></span>';
}
function zyApply(n){
  if(n._zy||!ZY)return;var t=plainTxt(n),r=ZY[t];if(!r)return;r=r.split(' ');
  var hans=t.match(/[㐀-䶿一-鿿豈-﫿]/g);if(!hans||hans.length!==r.length)return;
  var k=0,w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),list=[];while(w.nextNode())list.push(w.currentNode);
  list.forEach(function(tn){var h='',any=false;
    Array.from(tn.nodeValue).forEach(function(c){if(HANRE.test(c)){h+=zyChar(c,r[k++]);any=true}else h+=c.replace(/&/g,'&amp;').replace(/</g,'&lt;')});
    if(any){var tp=document.createElement('template');tp.innerHTML=h;tn.parentNode.replaceChild(tp.content,tn)}});
  n._zy=1;n.classList.add('has-zy');
}
// 詞卡：關鍵字（粗體）旁邊有注音、下面有點點；點了跳出一個小圓圖、這個詞和一句解釋
var wpop=null;
function wordScan(){if(WORDS)document.querySelectorAll('#top b,#card b').forEach(function(b){
  if(b._w||b.closest('.notes'))return;b._w=1;var k=plainTxt(b);if(!WORDS[k]&&!b.classList.contains('demo'))return;
  b.classList.add('w');if(b.classList.contains('demo'))return;b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-label',k+'、タップすると絵が見られます');zyApply(b)})}
// WORDS 的圖：['解釋', 圖] 圖的範圍是 -50 -50 100 100；['解釋', 圖, 底色] 圖畫在哪裡、多大都可以，會自動放大縮小到圓的中間
function wordSvg(w){return '<svg viewBox="-50 -50 100 100" aria-hidden="true">'+(w[2]?'<rect x="-50" y="-50" width="100" height="100" fill="'+w[2]+'"/><g class="wa">'+w[1]+'</g>':w[1])+'</svg>'}
function fitWord(root){root.querySelectorAll('.wa').forEach(function(g){var b=g.getBBox();if(!b.width)return;var k=Math.min(8,78/Math.hypot(b.width,b.height));
  var r=function(v){return Math.round(v*10)/10};g.setAttribute('transform','scale('+r(k)+') translate('+r(-b.x-b.width/2)+' '+r(-b.y-b.height/2)+')')})}
function closeWord(){if(wpop){wpop.remove();wpop=null}}
function openWord(b){
  var k=plainTxt(b),w=WORDS[k];closeWord();if(!w)return;
  wpop=el('<div class="wpop" role="dialog" aria-label="'+k+'"><span class="wpic">'+wordSvg(w)+'</span><div class="wtx"><p class="wt">'+k+'</p><p>'+w[0]+'</p></div><button class="wx" type="button" aria-label="とじる">×</button></div>').firstChild;
  document.body.appendChild(wpop);fitWord(wpop);wpop._y=scrollY;var wt=wpop.querySelector('.wt');zyApply(wt);
  // 放在詞的下面；下面放不下（會被上一關／下一關擋到）就放上面
  var r=b.getClientRects()[0]||b.getBoundingClientRect(),W=wpop.offsetWidth,H=wpop.offsetHeight,ft=document.querySelector('.foot'),bot=ft?ft.getBoundingClientRect().top:innerHeight;
  var x=Math.max(12,Math.min(innerWidth-W-12,r.left+r.width/2-W/2)),below=r.bottom+H+16<bot||r.top-H-16<0;
  wpop.style.left=x+'px';wpop.style.top=(below?r.bottom+12:r.top-H-12)+'px';wpop.classList.add(below?'below':'above');
  wpop.style.setProperty('--ax',Math.max(22,Math.min(W-22,r.left+r.width/2-x))+'px');
  tap(wpop.querySelector('.wx'),closeWord);
}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('b.w');
  if(b&&!b.classList.contains('demo')){openWord(b);return}if(wpop&&!e.target.closest('.wpop'))closeWord()});
document.addEventListener('keydown',function(e){var b=e.target.closest&&e.target.closest('b.w');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openWord(b)}else if(e.key==='Escape')closeWord()});
// 捲動超過一點點才關（手機網址列縮放、捲動的尾巴也會送出捲動，不能一捲就關）
addEventListener('scroll',function(){if(wpop&&Math.abs(scrollY-wpop._y)>60)closeWord()},{passive:true});
if(WORDS){var zyObs=new MutationObserver(wordScan);
  zyObs.observe(document.getElementById('top'),{childList:true,subtree:true});zyObs.observe(card,{childList:true,subtree:true})}

/* ---------- 換關 ---------- */
var pv=document.getElementById('pv'),nx=document.getElementById('nx');
function paint(){
  nx.disabled=cur===LV.length-1||!st.done[cur];nx.textContent=st.done[cur]||cur===LV.length-1?'つぎへ ›':'クリアしてね';
  pv.disabled=cur===0;nx.style.visibility=cur===LV.length-1?'hidden':'';document.getElementById('pos').textContent=cur===0?'スタート':(cur===LV.length-1?'クリア':'ステージ '+cur+' / 6');
  map.querySelectorAll('.stop').forEach(function(g){g.classList.toggle('lock',+g.dataset.lv>st.far)});
}
// 鏡頭：每一關都把那一關的地點放在圓的正中間；全景（正方形鏡頭）照原樣
function camFor(i,l){var c=l.cam;if(c[2]===c[3])return c;var s=null;STOPS.forEach(function(t){if(t.lv===i)s=t});if(!s&&l.pin!==undefined)s=STOPS[l.pin];
  var z=c[3]*1.05,cx=s?s.x:c[0]+c[2]/2,cy=s?s.y-6:c[1]+c[3]/2;return [cx-z/2,cy-z/2,z,z]}
function go(i){
  cur=i;if(i>st.far){st.far=i;save()}replay=-1;var l=LV[i];clearScene();
  cam(camFor(i,l));setEra(l.era||ERA0);
  if(l.pin!==undefined){var s=STOPS[l.pin];pinEl.style.display='';pinEl.setAttribute('transform','translate('+s.x+' '+(s.y-18)+')')}else pinEl.style.display='none';
  render(i);paint();
}
pv.addEventListener('click',function(){if(cur>0)go(cur-1)});
nx.addEventListener('click',function(){if(st.done[cur]&&cur<LV.length-1)go(cur+1)});
var sheet=document.getElementById('sheet');
document.getElementById('chips').addEventListener('click',function(){if(st.far>=LV.length-1)go(LV.length-1)});
function closeSheet(){sheet.hidden=true;document.getElementById('chips').focus()}
document.getElementById('sheetX').addEventListener('click',closeSheet);
sheet.addEventListener('click',function(e){if(e.target===sheet)closeSheet()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!sheet.hidden)closeSheet()});
chips();go(Math.min(st.far,LV.length-1));
