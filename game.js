// Huerto de Memoria
const VERSION='0.1.1';
const $=id=>document.getElementById(id),app=$('app');
const KEY='huertoMemoria.v1';
const SIZES=[[3,3],[3,4],[4,4],[4,5]]; // columnas × filas
const SEEDS={'🥕':{n:'zanahorias',p:0},'🥬':{n:'lechugas',p:0},'🍅':{n:'tomates',p:8},'🌽':{n:'choclos',p:12},'🍓':{n:'frutillas',p:15},'🎃':{n:'zapallos',p:20},'🌻':{n:'girasoles',p:10}};
const PESTS={'🐌':'caracoles','🐛':'gusanos','🐞':'mariquitas','🦗':'saltamontes'};
let S=load(),ses=null,tok=0;
function def(){return{tut:false,off:0,played:[],coins:0,size:0,seeds:['🥕','🥬'],pozo:false,treeOwned:false,tree:null,tomorrow:null,lvl:2,hist:[],flowers:0,instSeen:false,total:0};}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}return Object.assign(def(),s||{});}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function dstr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function today(){const d=new Date();d.setDate(d.getDate()+S.off);return dstr(d);}
const rnd=n=>(Math.random()*n)|0,pick=a=>a[rnd(a.length)],shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const wait=(ms,t)=>new Promise(r=>setTimeout(()=>r(t===tok),ms));
function el(h){app.innerHTML='<div class="wrap">'+h+'</div><div class="ver" id="ver">v'+VERSION+'</div>';app.scrollTop=0;bindVer();}
// dificultad adaptativa: nivel 0..12 → semillas, tiempo de vista y parcelas activas
function diff(){const L=S.lvl,[c,r]=SIZES[S.size];return{n:Math.min(2+Math.floor(L/2),c*r-2),view:Math.max(1600,4200-(L%2)*700-Math.floor(L/4)*300)+(S.pozo?500:0)};}
function adapt(acc){S.hist.push(acc);if(S.hist.length>4)S.hist.shift();const m=S.hist.reduce((a,b)=>a+b,0)/S.hist.length;
 if(S.hist.length>=2){if(m>0.85){S.lvl=Math.min(12,S.lvl+1);S.hist=[];}else if(m<0.75){S.lvl=Math.max(0,S.lvl-1);S.hist=[];}}save();}
const elapsed=()=>ses?Date.now()-ses.t0+ses.skip:0;
// ---- cuadrícula ----
function grid(cols,rows,id='g'){let h='<div class="grid" id="'+id+'" style="grid-template-columns:repeat('+cols+',1fr)">';for(let i=0;i<cols*rows;i++)h+='<button class="plot" data-i="'+i+'"></button>';return h+'</div>';}
const plots=()=>[...document.querySelectorAll('.plot')];
function setPlant(p,ic){p.innerHTML=ic?'<span class="p">'+ic+'</span>':'';}
function topBar(){return '<div class="top"><span class="pill">🧺 '+S.coins+'</span><span class="pill" id="clock">⏱ '+Math.floor(elapsed()/60000)+' min</span><button class="pill" id="stop" style="border:0;font:inherit;font-weight:bold">🌙 Terminar</button></div>';}
function bindTop(){$('stop')&&($('stop').onclick=()=>closing());}

// ---- inicio ----
function title(){
 const t=S.tree,yest=S.tomorrow&&S.tomorrow.date!==today();
 const gard=Array.from('🌷🌼🌻🌸🌹🌺');let g='';for(let i=0;i<Math.min(30,S.flowers);i++)g+=gard[i%gard.length];
 el('<h1>Huerto de Memoria</h1><p class="sub">Siembra, recuerda y cosecha, un ratito cada día</p>'+
 '<div class="card center"><div class="garden">'+(g||'🌱')+'</div><p class="small" style="margin:8px 0 0">'+(S.flowers?'Tu huerto ha florecido '+S.flowers+' veces':'Tu huerto te espera')+(t?' · 🌳 árbol: '+(t.care>=3?'¡con frutos!':t.care+' de 3 días de cuidado'):'')+'</p></div>'+
 '<div class="card center"><p style="margin:0 0 12px">'+(yest?'Ayer sembraste algo… ¿recuerdas dónde? 💧':S.tomorrow?'Ya sembraste lo de mañana. ¡Puedes seguir cultivando!':'Hoy es un buen día para sembrar ☀️')+'</p><button class="btn big" id="go">🌱 Ir al huerto</button></div>'+
 '<div class="top"><span class="pill">🧺 '+S.coins+' cosechas</span><span class="pill">🗓️ '+S.played.length+' días</span></div>');
 $('go').onclick=()=>S.tut?start():tutorial();
}
// ---- tutorial sin palabras: no se puede perder ----
async function tutorial(){const t=++tok;
 el('<div style="height:30px"></div>'+grid(2,2)+'<div style="height:16px"></div>');
 const ps=plots(),k=rnd(4);setPlant(ps[k],'🌱');if(!await wait(1800,t))return;
 ps.forEach(p=>{setPlant(p,'');p.classList.add('cov');});
 const hand=document.createElement('div');hand.className='hand';hand.textContent='👆';ps[k].appendChild(hand);
 ps.forEach((p,i)=>p.onclick=async()=>{if(i!==k){p.classList.add('shake');setTimeout(()=>p.classList.remove('shake'),400);ps[k].classList.add('glow');return;}
  p.classList.remove('cov','glow');p.classList.add('ok');setPlant(p,'💧');await wait(500,t);setPlant(p,'🌻');await wait(900,t);
  el('<div class="center" style="font-size:90px">🌻💛</div><button class="btn big" id="t3">▶</button>');$('t3').onclick=()=>{S.tut=true;save();start();};});
}
// ---- sesión ----
function start(){ses={t0:Date.now(),skip:0,round:0,breaks:0,warned60:false,earn:0,ok:0,tot:0};
 const d=today();if(!S.played.includes(d)){S.played.push(d);save();}
 if(S.tomorrow&&S.tomorrow.date!==d)recall();else nextRound();}
function score(ok){ses.tot++;if(ok)ses.ok++;}
// 1. Recordar lo de ayer
async function recall(){const t=++tok,L=S.tomorrow,items=shuffle(L.items.map(x=>({...x})));
 let found=0,first=0,gain=0;
 el(topBar()+'<div class="prompt" id="pr"></div>'+grid(L.cols,L.rows)+'<p class="sub small">Toca dónde sembraste cada planta para regarla 💧</p>');bindTop();
 const ps=plots();ps.forEach(p=>p.classList.add('cov'));
 for(const it0 of items){if(it0.done)continue;const it=it0;let tries=0;
  $('pr').innerHTML='<span class="ic">'+it.s+'</span> ¿Dónde sembraste '+(it.s==='🌳'?'tu árbol':SEEDS[it.s].n)+'?';
  await new Promise(res=>{ps.forEach((p,i)=>p.onclick=()=>{if(t!==tok)return;
   const m=items.find(x=>!x.done&&x.s===it.s&&x.i===i);
   if(m){m.done=1;if(m!==it){const j=m.i;m.i=it.i;it.i=j;m.done=0;it.done=1;}p.classList.remove('cov','glow');p.classList.add('ok');setPlant(p,it.s==='🌳'?(S.tree&&S.tree.care>=2?'🍎':'🌳'):it.s);
    const d=document.createElement('span');d.className='drop';d.textContent='💧';p.appendChild(d);
    if(tries===0){first++;if(it.s==='🌳'&&S.tree){S.tree.care++;}}
    gain+=tries===0?(S.pozo?3:2):1;score(tries===0);ps.forEach(q=>q.onclick=null);setTimeout(res,700);}
   else if(!p.classList.contains('ok')){tries++;p.classList.add('shake');setTimeout(()=>p.classList.remove('shake'),400);if(tries>=2)items.filter(x=>!x.done&&x.s===it.s).forEach(x=>ps[x.i].classList.add('glow'));}});});
  found++;}
 let fruit='';if(S.tree&&S.tree.care>=3){gain+=5;fruit='<p>🍎 ¡Tu árbol dio frutos! +5</p>';}
 S.coins+=gain;ses.earn+=gain;S.tomorrow=null;adapt(first/items.length);save();
 el(topBar()+'<div class="card center banner"><div style="font-size:70px">💧🌿</div><h2>¡Regaste lo de ayer!</h2><p>Recordaste '+first+' de '+items.length+' a la primera. Lo demás solo creció un poquito más lento.</p>'+fruit+'<p><b>+'+gain+' 🧺</b></p></div><button class="btn big" id="nx">Seguir cultivando</button>');bindTop();$('nx').onclick=nextRound;}
// 2/3. Rondas encadenadas
function nextRound(){if(!ses)return;ses.round++;
 const m=elapsed();
 if(m>=60*60000&&!ses.warned60){ses.warned60=true;return hourCard();}
 if(Math.floor(m/(20*60000))>ses.breaks&&m<60*60000){ses.breaks=Math.floor(m/(20*60000));return breakCard();}
 if(ses.round>1&&ses.round%4===0)return market(true);
 if(ses.round%3===0)pests();else cultivate();}
async function cultivate(){const t=++tok,[c,r]=SIZES[S.size],D=diff();let ok=0,bad=0;
 let weather='';if(Math.random()<0.25){weather=pick(['🌧️ Llovió anoche: ¡la tierra está feliz! +1 🧺','☀️ Día soleado: las semillas despiertan rápido','🌈 Salió el arcoíris sobre el huerto']);if(weather.includes('+1'))S.coins++;}
 el(topBar()+'<div class="prompt" id="pr">'+(weather||'👀 Mira dónde caen las semillas')+'</div><div class="bar"><i id="bar" style="width:0"></i></div>'+grid(c,r));bindTop();
 if(weather&&!await wait(1600,t))return;
 for(let rep=0;rep<3;rep++){
  const ps=plots(),idx=shuffle([...ps.keys()]).slice(0,D.n),seeds=idx.map(()=>pick(S.seeds));
  ps.forEach(p=>{p.className='plot';setPlant(p,'');p.onclick=null;});
  $('pr').innerHTML='👀 Mira dónde caen las semillas ('+(rep+1)+' de 3)';
  idx.forEach((i,k)=>setPlant(ps[i],seeds[k]));
  const b=$('bar');b.style.transition='none';b.style.width='100%';b.offsetWidth;b.style.transition='width '+D.view+'ms linear';b.style.width='0';
  if(!await wait(D.view,t))return;
  ps.forEach(p=>{setPlant(p,'');p.classList.add('cov');});
  $('pr').innerHTML='🌱 Toca donde estaban las '+D.n+' semillas';
  let left=D.n,errs=0;
  await new Promise(res=>{ps.forEach((p,i)=>p.onclick=()=>{if(t!==tok||p.classList.contains('ok'))return;
   const k=idx.indexOf(i);
   if(k>=0){p.classList.remove('cov','glow');p.classList.add('ok');setPlant(p,seeds[k]);ok++;score(true);left--;if(left===0){ps.forEach(q=>q.onclick=null);setTimeout(res,600);}}
   else{bad++;errs++;score(false);p.classList.add('shake');setTimeout(()=>p.classList.remove('shake'),400);
    if(errs>=3)idx.forEach(j=>{if(!ps[j].classList.contains('ok'))ps[j].classList.add('glow');});}});});
 }
 const acc=ok/(ok+bad||1),gain=3+Math.round(acc*4);S.coins+=gain;ses.earn+=gain;S.total++;adapt(acc);
 harvest('🧺','¡Buena cosecha!',acc>=0.85?'Recordaste casi todas las semillas.':acc>=0.6?'Tu huerto sigue creciendo.':'No pasa nada: el huerto crece igual, a su ritmo.',gain);}
async function pests(){const t=++tok,[c,r]=SIZES[S.size],types=Object.keys(PESTS);let target=pick(types),hit=0,bad=0;
 el(topBar()+'<div class="prompt" id="pr"></div><div class="bar"><i id="bar" style="width:100%"></i></div>'+grid(c,r)+'<p class="sub small">Las plantas están a salvo; solo ayuda a cuidarlas 🌿</p>');bindTop();
 const ps=plots();ps.forEach(p=>setPlant(p,pick(S.seeds)));
 const setRule=()=>{$('pr').innerHTML='Toca <b>solo</b> <span class="ic">'+target+'</span> '+PESTS[target];$('pr').classList.remove('banner');$('pr').offsetWidth;$('pr').classList.add('banner');};
 setRule();const dur=30000,T0=Date.now();const b=$('bar');b.style.transition='width '+dur+'ms linear';b.offsetWidth;b.style.width='0';
 const life=Math.max(1400,2600-S.lvl*80);
 while(Date.now()-T0<dur){if(t!==tok)return;
  const el2=Date.now()-T0;if(el2>10000&&el2<10800||el2>20000&&el2<20800){target=pick(types.filter(x=>x!==target));setRule();await wait(800,t);continue;}
  const i=rnd(ps.length),p=ps[i];if(p.dataset.pest){if(!await wait(150,t))return;continue;}
  const kind=Math.random()<0.45?target:pick(types);const s=document.createElement('span');s.className='pest';s.textContent=kind;s.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fffdf3aa;border-radius:18px';
  p.dataset.pest=kind;p.appendChild(s);
  p.onclick=()=>{if(!p.dataset.pest)return;if(p.dataset.pest===target){hit++;score(true);s.textContent='✨';}else{bad++;score(false);p.classList.add('shake');setTimeout(()=>p.classList.remove('shake'),400);return;}
   delete p.dataset.pest;setTimeout(()=>s.remove(),300);};
  const id=setTimeout(()=>{if(p.dataset.pest===kind&&s.parentNode){delete p.dataset.pest;s.remove();}},life);
  if(!await wait(Math.max(550,950-S.lvl*25),t)){clearTimeout(id);return;}}
 const acc=hit/(hit+bad||1),gain=2+Math.min(6,hit);S.coins+=gain;ses.earn+=gain;adapt(acc);
 harvest('🐌','¡Huerto protegido!','Espantaste '+hit+' bichitos. Las reglas cambian, ¡y tú también!',gain);}
function harvest(ic,h,msg,gain){save();
 el(topBar()+'<div class="card center banner"><div style="font-size:70px">'+ic+'</div><h2>'+h+'</h2><p>'+msg+'</p><p><b>+'+gain+' 🧺</b></p></div><button class="btn big" id="nx">Seguir cultivando</button><button class="btn soft" id="mk">🏪 Ir al mercado</button><button class="btn soft" id="end">🌙 Sembrar lo de mañana y terminar</button>');
 bindTop();$('nx').onclick=nextRound;$('mk').onclick=()=>market(false);$('end').onclick=closing;}
// 4. Mercado
function market(auto){++tok;
 const items=[];
 if(S.size<SIZES.length-1)items.push({ic:'🟫',t:'Más parcelas ('+SIZES[S.size+1].join('×')+')',p:[10,20,35][S.size],buy:()=>S.size++});
 Object.keys(SEEDS).filter(k=>!S.seeds.includes(k)).forEach(k=>items.push({ic:k,t:'Semillas de '+SEEDS[k].n,p:SEEDS[k].p,buy:()=>S.seeds.push(k)}));
 if(!S.pozo)items.push({ic:'🪣',t:'Pozo de agua: más tiempo para mirar y mejor riego',p:15,buy:()=>S.pozo=true});
 if(!S.treeOwned)items.push({ic:'🌳',t:'Árbol frutal: cuídalo 3 días seguidos y da frutos',p:25,buy:()=>S.treeOwned=true});
 let h=topBar()+'<h2>🏪 Mercado del pueblo</h2><p class="sub">Cambia tu cosecha por cosas para el huerto</p>';
 items.forEach((it,k)=>h+='<div class="card shop"><div class="ic">'+it.ic+'</div><div class="t">'+it.t+'</div><button class="btn" data-k="'+k+'" '+(S.coins<it.p?'disabled':'')+'>🧺 '+it.p+'</button></div>');
 if(!items.length)h+='<div class="card center">¡Ya tienes todo lo del mercado! 🌟</div>';
 el(h+'<button class="btn big" id="nx">Volver al huerto</button>');bindTop();
 document.querySelectorAll('.shop .btn').forEach(b=>b.onclick=()=>{const it=items[b.dataset.k];if(S.coins<it.p)return;S.coins-=it.p;it.buy();save();market(auto);});
 $('nx').onclick=()=>{if(auto)cultivate();else nextRound();};}
// Pausas
function breakCard(){++tok;const tip=pick(['Estira los brazos hacia el cielo, como un girasol 🌻','Toma un vaso de agua 💧','Mira por la ventana unos segundos 🌤️','Gira los hombros despacito 🙆']);
 el(topBar()+'<div class="card center banner"><div style="font-size:70px">🍵</div><h2>¿Una pausa?</h2><p>Llevas '+Math.floor(elapsed()/60000)+' minutos en el huerto.</p><p><b>'+tip+'</b></p></div><button class="btn big" id="nx">Seguir cultivando</button>');bindTop();$('nx').onclick=nextRound;}
function hourCard(){++tok;el(topBar()+'<div class="card center banner"><div style="font-size:70px">🌅</div><h2>Ya pasó una hora</h2><p>Tu huerto está precioso. Es un buen momento para descansar y volver mañana.</p></div><button class="btn big" id="end">🌙 Sembrar lo de mañana y terminar</button><button class="btn soft" id="nx">Una ronda más</button>');bindTop();$('end').onclick=closing;$('nx').onclick=nextRound;}
// 5. Cierre: sembrar lo de mañana
async function closing(){if(!ses)return title();const t=++tok,[c,r]=SIZES[S.size],D=diff();
 const k=Math.max(2,Math.min(5,1+Math.floor(S.lvl/3)));const todo=shuffle(S.seeds).concat(S.seeds).slice(0,k);
 const items=[];let tree=null;
 if(S.treeOwned){tree=S.tree&&S.tree.i<c*r?S.tree:{i:rnd(c*r),care:0};}
 el('<h2>🌙 Siembra lo de mañana</h2><div class="prompt" id="pr"></div>'+grid(c,r)+'<p class="sub small">Recuerda dónde las pones: mañana las regarás 💧</p>');
 const ps=plots();if(tree)setPlant(ps[tree.i],'🌳');
 for(const s of todo){$('pr').innerHTML='Toca una parcela para sembrar <span class="ic">'+s+'</span>';
  await new Promise(res=>ps.forEach((p,i)=>p.onclick=()=>{if(t!==tok||p.innerHTML)return;setPlant(p,s);items.push({i,s});ps.forEach(q=>q.onclick=null);setTimeout(res,350);}));}
 if(tree){items.push({i:tree.i,s:'🌳'});if(!S.tree)S.tree={i:tree.i,care:0};}
 S.tomorrow={date:today(),cols:c,rows:r,items};S.flowers++;save();
 $('pr').innerHTML='👀 Mira bien tu huerto…';await wait(2500,t);
 const mins=Math.max(1,Math.round(elapsed()/60000)),acc=ses.tot?Math.round(ses.ok/ses.tot*100):100;const earn=ses.earn;ses=null;
 el('<div class="card center banner"><div style="font-size:70px">🌻🌙</div><h2>¡Hasta mañana!</h2><p>Hoy cuidaste tu huerto unos '+mins+' min y cosechaste <b>'+earn+' 🧺</b>.</p><p>Mañana, lo primero será regar lo que acabas de sembrar.</p></div><button class="btn big" id="home">Volver al inicio</button>');
 $('home').onclick=title;}
// ---- modo de prueba: tocar la versión 5 veces ----
let vt=0,vtT=0;
function bindVer(){const v=$('ver');if(!v)return;v.onclick=()=>{const n=Date.now();vt=n-vtT<1500?vt+1:1;vtT=n;if(vt>=5){vt=0;devPanel();}};}
function devPanel(){const d=document.createElement('div');d.className='dev card';d.innerHTML='<b>Modo de prueba</b> · '+today()+' · nivel '+S.lvl+' · '+JSON.stringify(diff())+'<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px"><button class="btn" id="dNext">⏭ Simular día siguiente</button><button class="btn blue" id="dT20">⏩ +19 min de sesión</button><button class="btn blue" id="dT60">⏩ +59 min de sesión</button><button class="btn soft" id="dCoins">🧺 +50 cosechas</button><button class="btn soft" id="dReset">↺ Reiniciar progreso</button><button class="btn soft" id="dClose">Cerrar</button></div>';document.body.appendChild(d);
 $('dNext').onclick=()=>{S.off++;save();d.remove();++tok;ses=null;title();};
 $('dT20').onclick=()=>{if(ses)ses.skip+=19*60000;d.remove();};$('dT60').onclick=()=>{if(ses)ses.skip+=59*60000;d.remove();};
 $('dCoins').onclick=()=>{S.coins+=50;save();d.remove();};
 $('dReset').onclick=()=>{localStorage.removeItem(KEY);S=load();++tok;ses=null;d.remove();title();};$('dClose').onclick=()=>d.remove();}
setInterval(()=>{const c=$('clock');if(c&&ses)c.textContent='⏱ '+Math.floor(elapsed()/60000)+' min';},5000);

// ---- instalación (PWA) ----
let deferred=null;const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
function refreshInstall(){if(deferred){$('instBtn').classList.remove('hidden');$('instWait').classList.add('hidden');}if(isIOS){$('instIos').classList.remove('hidden');$('instWait').classList.add('hidden');}}
function maybeInstallCard(){if(S.instSeen||standalone())return;$('install').classList.remove('hidden');refreshInstall();}
function closeInstall(){S.instSeen=true;save();$('install').classList.add('hidden');}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;refreshInstall();});
addEventListener('appinstalled',closeInstall);
$('instX').onclick=closeInstall;
$('instBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();try{await deferred.userChoice;}catch(e){}deferred=null;closeInstall();};
function showUpdating(){const v=$('ver');if(v)v.textContent='Actualizando…';}
if('serviceWorker' in navigator){let rl=false;const had=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(rl||!had)return;rl=true;showUpdating();location.reload();});
 addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{reg.addEventListener('updatefound',()=>{if(navigator.serviceWorker.controller)showUpdating();});reg.update();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update();});}).catch(()=>{}));}

// ---- arranque ----
function boot(){try{title();}catch(e){console.error(e);}setTimeout(()=>{$('loading').classList.remove('show');maybeInstallCard();},700);}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot);else boot();
