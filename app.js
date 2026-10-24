(() => {
const app=document.querySelector('#app'),nav=document.querySelector('#nav'),cfg=window.APP_CONFIG||{};let token='',user=null,activeLink=null,watchId=null,trackingId=null,seq=0,map=null,route=[];try{token=localStorage.getItem('ls_token')||'';user=JSON.parse(localStorage.getItem('ls_user')||'null')}catch(e){try{localStorage.removeItem('ls_token');localStorage.removeItem('ls_user')}catch(ignore){}}
window.addEventListener('error',()=>{if(app&&!app.innerHTML.trim())app.innerHTML='<section class="card"><h1>画面を読み込めませんでした</h1><p>ページを再読み込みしてください。続く場合は公開ファイルを更新してください。</p><a href="./">トップへ戻る</a></section>'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(action,data={}){const url=cfg.GAS_WEB_APP_URL;if(!url)throw Error('config.js にGASのWebアプリURLを設定してください。');const r=await fetch(url,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token,...data})});return await r.json();}
async function get(action,data={}){const u=new URL(cfg.GAS_WEB_APP_URL);u.searchParams.set('callback','lsCallback');u.searchParams.set('action',action);Object.entries(data).forEach(([k,v])=>u.searchParams.set(k,String(v??'')));return new Promise((resolve,reject)=>{const cb=window.lsCallback;window.lsCallback=x=>{window.lsCallback=cb;script.remove();resolve(x)};const script=document.createElement('script');script.src=u.href;script.onerror=()=>reject(Error('サーバーに接続できません。'));document.head.append(script);setTimeout(()=>{script.remove();reject(Error('応答がタイムアウトしました。'))},15000);});}
function shell(){
 nav.innerHTML=user?`<button class="secondary" id="home">ダッシュボード</button>${user.role==='admin'?'<button class="secondary" id="admin">管理者</button>':''}<button class="secondary" id="logout">ログアウト</button>`:`<a class="nav-link" href="?view=login">ログイン</a><a class="nav-link" href="?view=register">新規登録</a>`;
 document.querySelector('#home')?.addEventListener('click',dashboard);document.querySelector('#admin')?.addEventListener('click',adminPage);document.querySelector('#logout')?.addEventListener('click',logout);
}
function frame(html){shell();app.innerHTML=html;}
function loginPage(){frame(`<section class="card"><h1>ログイン</h1><form id="f"><label>メール<input name="email" type="email" required></label><label>パスワード<input name="password" type="password" required></label><button>ログイン</button><p id="msg"></p></form></section>`);document.querySelector('#f').onsubmit=async e=>{e.preventDefault();try{const x=await api('login',Object.fromEntries(new FormData(e.target)));if(!x.ok)throw Error(x.message);token=x.token;user=x.user;localStorage.setItem('ls_token',token);localStorage.setItem('ls_user',JSON.stringify(user));dashboard()}catch(x){document.querySelector('#msg').textContent=x.message}}}
function registerPage(){frame(`<section class="card"><h1>アカウント登録</h1><form id="f"><label>表示名<input name="displayName" maxlength="80"></label><label>メール<input name="email" type="email" required></label><label>パスワード（12文字以上）<input name="password" type="password" minlength="12" required></label><button>登録</button><p id="msg"></p></form></section>`);document.querySelector('#f').onsubmit=async e=>{e.preventDefault();try{const x=await api('register',Object.fromEntries(new FormData(e.target)));if(!x.ok)throw Error(x.message);document.querySelector('#msg').textContent=x.message+' ログインしてください。'}catch(x){document.querySelector('#msg').textContent=x.message}}}
async function logout(){try{await api('logout')}catch(e){}localStorage.removeItem('ls_token');localStorage.removeItem('ls_user');token='';user=null;home();}
function home(){
 const params=new URLSearchParams(location.search),t=params.get('t'),view=params.get('view');
 if(t){visitor(t);return}
 document.documentElement.classList.remove('visitor-mode');
 document.body.classList.remove('visitor-mode');
 if(view==='login'){loginPage();return}
 if(view==='register'){registerPage();return}
 if(view==='admin'){adminPage();return}
 if(user)dashboard();
 else{frame(`<section class="card"><h1>位置情報共有サービス</h1><p>共有URLを作成し、訪問者が許可した場合に位置情報を共有します。</p><p><a class="nav-link" href="?view=login">ログイン</a><a class="nav-link" href="?view=register">新規登録</a></p></section>`)}
}
async function dashboard(){if(!user)return loginPage();frame(`<h1>ダッシュボード</h1><button id="create">共有URLを作成</button><div id="list">読み込み中…</div>`);document.querySelector('#create').onclick=createPage;try{const x=await api('listLinks');if(!x.ok)throw Error(x.message);document.querySelector('#list').innerHTML=x.links.map(l=>`<article class="card"><h2>${esc(l.name)}</h2><p>${esc(l.mode)} ・ ${esc(l.status)} ・ 保存 ${esc(l.retentionDays)}日</p><p>アクセス ${l.stats.accessCount}件／保存成功 ${l.stats.locationSuccessCount}件／拒否 ${l.stats.deniedCount}件／失敗 ${l.stats.errorCount}件／継続 ${l.stats.trackingSessionCount}件</p><p><code>${esc(location.origin+location.pathname+'?t='+l.token)}</code></p><button data-id="${l.id}" class="detail">結果・統計</button><button data-id="${l.id}" class="edit secondary">編集</button><button class="secondary" data-copy="${esc(location.origin+location.pathname+'?t='+l.token)}">URLコピー</button><button class="secondary" data-toggle="${l.id}" data-status="${l.status==='active'?'paused':'active'}">${l.status==='active'?'停止':'再開'}</button><button class="danger" data-del="${l.id}">削除</button></article>`).join('')||'<p>URLはまだありません。</p>';document.querySelectorAll('.detail').forEach(b=>b.onclick=()=>detail(b.dataset.id));document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>editPage(b.dataset.id));document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy)}catch(e){prompt('このURLをコピーしてください',b.dataset.copy)}});document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const r=await api('setLinkStatus',{linkId:b.dataset.toggle,status:b.dataset.status});if(!r.ok)alert(r.message);dashboard()});document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('URLと関連する位置情報・継続取得・同意・アクセス履歴を削除しますか？')){const r=await api('deleteLink',{linkId:b.dataset.del});if(!r.ok)alert(r.message);dashboard()}})}catch(e){document.querySelector('#list').textContent=e.message}}
function linkForm(link={}){const value=(key,fallback='')=>esc(link[key]??fallback);const selected=(key,value)=>String(link[key]??'')===String(value)?' selected':'';const expires=link.expiresAt?new Date(link.expiresAt).toISOString().slice(0,16):'';return `<form id="linkForm"><label>URL名<input name="name" required maxlength="100" value="${value('name')}"></label><label>説明<textarea name="description">${value('description')}</textarea></label><label>訪問者への事前説明<textarea name="notice">${value('notice')}</textarea></label><label>利用目的<input name="purpose" required value="${value('purpose')}"></label><label>取得モード<select name="trackingMode"><option value="single"${selected('mode','single')}>単発</option><option value="continuous"${selected('mode','continuous')}>継続</option></select></label><div class="row"><label>成功後URL<input name="successUrl" type="text" value="${value('successUrl')}"></label><label>拒否時URL<input name="deniedUrl" type="text" value="${value('deniedUrl')}"></label><label>失敗時URL<input name="errorUrl" type="text" value="${value('errorUrl')}"></label></div><div class="row"><label>保存日数<input name="retentionDays" type="number" min="1" max="365" value="${value('retentionDays',30)}"></label><label>有効期限<input name="expiresAt" type="datetime-local" value="${esc(expires)}"></label><label>取得間隔<select name="interval"><option${selected('interval',5)}>5</option><option${selected('interval',15) || (!link.interval?' selected':'')}>15</option><option${selected('interval',60)}>60</option></select>秒</label><label>最大取得時間<select name="maxMinutes"><option${selected('maxMinutes',5)}>5</option><option${selected('maxMinutes',15) || (!link.maxMinutes?' selected':'')}>15</option><option${selected('maxMinutes',30)}>30</option><option${selected('maxMinutes',60)}>60</option></select>分</label></div><button>${link.id?'保存':'作成'}</button><button type="button" id="back" class="secondary">戻る</button><p id="msg" role="status"></p></form>`}
function createPage(){frame(`<section class="card"><h1>共有URL作成</h1>${linkForm()}</section>`);bindLinkForm('createLink')}
async function editPage(id){frame(`<section class="card"><h1>共有URL編集</h1><p>読み込み中…</p></section>`);try{const r=await api('getLink',{linkId:id});if(!r.ok)throw Error(r.message);frame(`<section class="card"><h1>共有URL編集</h1>${linkForm(r.link)}</section>`);bindLinkForm('updateLink',id)}catch(e){app.innerHTML=`<section class="card"><p>${esc(e.message)}</p></section>`}}
function bindLinkForm(action,linkId=''){document.querySelector('#back').onclick=dashboard;document.querySelector('#linkForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(data.expiresAt)data.expiresAt=new Date(data.expiresAt).toISOString();if(linkId)data.linkId=linkId;try{const r=await api(action,data);if(!r.ok)throw Error(r.message);dashboard()}catch(error){document.querySelector('#msg').textContent=error.message}}}
async function detail(id){activeLink=id;frame(`<h1>URL詳細</h1><section class="card"><button id="back" class="secondary">戻る</button><button id="csv">CSVダウンロード</button><div id="stats">読み込み中…</div><div id="map"></div><button id="play">ルート再生</button><input id="time" type="range" min="0" value="0"><div id="rows">読み込み中…</div></section>`);document.querySelector('#back').onclick=dashboard;try{const [a,b,c]=await Promise.all([api('getResults',{linkId:id}),api('getPoints',{linkId:id}),api('getLinkStats',{linkId:id})]);if(!a.ok||!b.ok||!c.ok)throw Error(a.message||b.message||c.message);const results=a.results||[],points=b.points||[],stats=c.stats;document.querySelector('#stats').innerHTML=`<h2>アクセス統計</h2><p>アクセス ${stats.accessCount}件／保存成功 ${stats.locationSuccessCount}件／拒否 ${stats.deniedCount}件／失敗 ${stats.errorCount}件／継続セッション ${stats.trackingSessionCount}件／継続地点 ${stats.pointCount}点</p>`;document.querySelector('#rows').innerHTML=`<h2>単発取得 ${results.length}件</h2>`+results.map(r=>`<p>${esc(r.captured_at)} — ${esc(r.latitude)}, ${esc(r.longitude)}（精度 ${esc(r.accuracy)}m）</p>`).join('')+`<h2>継続取得 ${points.length}点</h2>`;document.querySelector('#csv').onclick=async()=>{const csv=await api('exportCsv',{linkId:id});if(!csv.ok)return alert(csv.message);const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff'+csv.csv],{type:'text/csv'}));link.download='locations.csv';link.click();URL.revokeObjectURL(link.href)};route=points.map(p=>[Number(p.latitude),Number(p.longitude)]);initMap(results,points)}catch(e){document.querySelector('#rows').textContent=e.message}}
async function adminPage(){if(!user||user.role!=='admin')return dashboard();frame(`<h1>管理者画面</h1><section class="card"><p id="adminMsg">読み込み中…</p><div id="adminUsers"></div><div id="adminLinks"></div></section>`);try{const r=await api('adminOverview');if(!r.ok)throw Error(r.message);document.querySelector('#adminMsg').innerHTML=`<label><input type="checkbox" id="maintenance" ${r.maintenance?'checked':''}> メンテナンスモード</label>`;document.querySelector('#maintenance').onchange=async e=>{const result=await api('maintenance',{enabled:e.target.checked});if(!result.ok){alert(result.message);e.target.checked=!e.target.checked}};document.querySelector('#adminUsers').innerHTML=`<h2>ユーザー</h2>`+r.users.map(u=>`<article class="item"><b>${esc(u.name||u.email)}</b> ${esc(u.email)} — ${esc(u.status)} <button class="secondary user-status" data-id="${u.id}" data-status="${u.status==='active'?'suspended':'active'}">${u.status==='active'?'利用停止':'停止解除'}</button></article>`).join('');document.querySelector('#adminLinks').innerHTML=`<h2>共有URL</h2>`+r.links.map(l=>`<article class="item"><b>${esc(l.name)}</b> — ${esc(l.status)}／アクセス ${l.stats.accessCount}件／保存 ${l.stats.locationSuccessCount}件 <button class="secondary link-status" data-id="${l.id}" data-status="${l.status==='active'?'admin_stopped':'active'}">${l.status==='active'?'管理者停止':'停止解除'}</button></article>`).join('');document.querySelectorAll('.user-status').forEach(button=>button.onclick=async()=>{const result=await api('adminSetUserStatus',{userId:button.dataset.id,status:button.dataset.status});if(!result.ok)alert(result.message);else adminPage()});document.querySelectorAll('.link-status').forEach(button=>button.onclick=async()=>{const result=await api('adminSetLinkStatus',{linkId:button.dataset.id,status:button.dataset.status});if(!result.ok)alert(result.message);else adminPage()})}catch(e){document.querySelector('#adminMsg').textContent=e.message}}
function initMap(results,points){const box=document.querySelector('#map');if(!window.L){box.textContent='地図ライブラリを読み込めません。ネットワーク接続を確認してください。';return}map=L.map(box).setView([35.6812,139.7671],5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);const all=[...results.map(x=>[+x.latitude,+x.longitude]),...points.map(x=>[+x.latitude,+x.longitude])];all.forEach(p=>L.marker(p).addTo(map));[...results,...points].forEach(p=>{const lat=Number(p.latitude),lng=Number(p.longitude),acc=Math.max(0,Math.min(Number(p.accuracy)||0,5000));if(acc>0)L.circle([lat,lng],{radius:acc,color:acc>100?'#d92d20':'#155eef',weight:1,fillOpacity:.08}).addTo(map)});const routePoints=points.filter(p=>Number(p.accuracy)<=100);if(routePoints.length>1){const line=L.polyline(routePoints.map(x=>[+x.latitude,+x.longitude]),{color:'#155eef'}).addTo(map);map.fitBounds(line.getBounds())}document.querySelector('#time').max=Math.max(0,points.length-1);document.querySelector('#time').oninput=e=>{const p=points[+e.target.value];if(p)map.setView([+p.latitude,+p.longitude],16)};document.querySelector('#play').onclick=()=>{let i=0;const timer=setInterval(()=>{if(i>=points.length){clearInterval(timer);return}document.querySelector('#time').value=i++;document.querySelector('#time').dispatchEvent(new Event('input'))},700)}}
async function visitor(t){
 document.body.classList.add('visitor-mode');
 frame(`<p class="visitor-message">日本国内からのアクセスを想定しています</p><p id="status" class="visitor-status" role="status" aria-live="polite"></p>`);
 try{
  const x=await get('publicLink',{linkToken:t});
  if(!x.ok)throw Error('この共有URLは無効、停止中、または期限切れです。');
  if(x.link.mode==='continuous')startTrack(t,x.link);
  else getPosition(t,x.link);
 }catch(e){document.querySelector('#status').textContent=e.message}
}
async function publicEvent(t,event,link,errorCode=''){
 try{const result=await api('recordPublicEvent',{linkToken:t,event,errorCode});if(result.ok&&result.redirectUrl){location.assign(result.redirectUrl);return}}catch(e){}
 const fallback=event==='denied'?link.deniedUrl:link.errorUrl;if(fallback)location.assign(fallback);
}
function getPosition(t,link){
 const s=document.querySelector('#status');
 if(!navigator.geolocation){s.textContent='このブラウザは位置情報に対応していません。';publicEvent(t,'error',link,'UNSUPPORTED');return}
 s.textContent='高精度の位置を測定しています。屋外で数秒待つと精度が上がる場合があります。';
 let best=null, fixes=[], done=false, watch=null, timer=null;
 const finish=async p=>{
  if(done)return; done=true; if(watch!==null)navigator.geolocation.clearWatch(watch); clearTimeout(timer);
  if(!p){s.textContent='安定した位置を取得できませんでした。';publicEvent(t,'error',link,'UNSTABLE');return}
  s.textContent=`位置情報を送信しています（推定精度 約${Math.round(p.coords.accuracy)}m）…`;
  try{const x=await api('submitLocation',{linkToken:t,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:new Date(p.timestamp).toISOString()});if(!x.ok)throw Error(x.message);s.textContent=`保存しました（推定精度 約${Math.round(p.coords.accuracy)}m）。`;if(x.redirectUrl)location.assign(x.redirectUrl)}catch(e){s.textContent='保存結果を確認できません。';publicEvent(t,'error',link,'SAVE_FAILED')}
 };
 const success=p=>{
  if(done)return; const acc=p.coords.accuracy;
  if(!best||acc<best.coords.accuracy)best=p;
  if(acc<=100){fixes.push(p);fixes=fixes.slice(-3)}
  s.textContent=`位置情報を測定中です（現在の推定精度 約${Math.round(acc)}m）…`;
  if(fixes.length>=2){const a=fixes[fixes.length-2],b=fixes[fixes.length-1];const dist=distanceMeters(a.coords.latitude,a.coords.longitude,b.coords.latitude,b.coords.longitude);if(dist<=Math.max(25,a.coords.accuracy+b.coords.accuracy)){finish(b);return}}
  if(acc<=25)finish(p);
 };
 const failure=e=>{if(done)return;done=true;if(watch!==null)navigator.geolocation.clearWatch(watch);clearTimeout(timer);if(e.code===1){s.textContent='許可されませんでした。';publicEvent(t,'denied',link,'PERMISSION_DENIED')}else{s.textContent='位置情報を取得できませんでした。';publicEvent(t,'error',link,'POSITION_ERROR')}};
 watch=navigator.geolocation.watchPosition(success,failure,{enableHighAccuracy:true,timeout:30000,maximumAge:0});
 timer=setTimeout(()=>finish(best&&best.coords.accuracy<=250?best:null),30000);
}
function distanceMeters(lat1,lon1,lat2,lon2){const r=6371000,rad=x=>x*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
async function startTrack(t,l){
 if(!navigator.geolocation){document.querySelector('#status').textContent='このブラウザは位置情報に対応していません。';publicEvent(t,'error',l,'UNSUPPORTED');return}
 let initialized=false, sequence=0, startedAt=0, endTimer=null, starting=false;
 const status=document.querySelector('#status');
 status.textContent='';
 const fail=async(message,event,code)=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;if(endTimer)clearTimeout(endTimer);if(trackingId){try{await api('stopTracking',{trackingId,reason:'error'})}catch(e){}trackingId=null}status.textContent=message;await publicEvent(t,event,l,code)};
 watchId=navigator.geolocation.watchPosition(async p=>{
   if(initialized&&Date.now()-startedAt>Number(l.maxMinutes)*60000){await stopTrack('max_duration',l.successUrl);return}
  try{
   if(!initialized){if(starting)return;starting=true;const x=await api('startTracking',{linkToken:t,consent:true});if(!x.ok)throw Error(x.message);trackingId=x.trackingId;initialized=true;startedAt=Date.now();endTimer=setTimeout(()=>stopTrack('max_duration',l.successUrl),Number(l.maxMinutes)*60000)}
   const saved=await api('submitPoint',{linkToken:t,trackingId,sequence:sequence++,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:new Date(p.timestamp).toISOString()});if(!saved.ok)throw Error(saved.message);
   }catch(e){await fail('継続取得を続けられませんでした。','error','TRACKING_SAVE_FAILED')}
  },async e=>{if(e.code===1)await fail('位置情報の利用が許可されませんでした。','denied','PERMISSION_DENIED');else await fail('位置情報を取得できませんでした。','error','POSITION_ERROR')},{enableHighAccuracy:true,maximumAge:0,timeout:30000});
}
async function stopTrack(reason='visitor_stop',redirectUrl=''){
 if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;
 if(trackingId){try{await api('stopTracking',{trackingId,reason})}catch(e){}trackingId=null}
 if(redirectUrl)location.assign(redirectUrl);
}window.L=undefined;const leaflet=document.createElement('link');leaflet.rel='stylesheet';leaflet.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(leaflet);const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';document.head.append(js);home();
})();






