'use strict';
const main = document.querySelector('#main');
history.scrollRestoration='manual';
const kindNames = {FESTIVAL:'축제',EVENT:'행사',EXHIBITION:'전시',MUSEUM:'박물관',CULTURAL_SITE:'문화관광지'};
const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const snapshot = '2026-10-03';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => value ? value.replaceAll('-','.') : '날짜 선택';
const addDays = (date,days) => {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value&&value>=today;}
function normalizeQuery(){
  if(!['/','/search'].includes(location.pathname))return;
  const params=new URLSearchParams(location.search);let changed=false;
  if(params.has('date')||params.has('fee')){params.delete('date');params.delete('fee');changed=true;toast('방문일·요금 필터는 후속 검토로 보류했어요.');}
  if(params.has('scope')&&!['ongoing','upcoming','permanent'].includes(params.get('scope'))){params.delete('scope');changed=true;}
  if(params.has('kind')&&!Object.hasOwn(kindNames,params.get('kind'))){params.delete('kind');changed=true;}
  if(params.has('region')&&!publicItems().some(i=>i.region_name===params.get('region'))){params.delete('region');changed=true;}
  if(location.pathname==='/'){for(const key of ['q','scope'])if(params.has(key)){params.delete(key);changed=true;}}
  if(changed)history.replaceState(history.state,'',location.pathname+(params.size?'?'+params:'')+location.hash);
}
let data = [];
let renderedUrl = '';
const isEmbeddedPreview=window.self!==window.top;
let guidePreviewWidth=390;
let homeFilterQuery=sessionStorage.getItem('outing-review-home-filters')||'';
const homeUrl=()=>'/'+(homeFilterQuery?'?'+homeFilterQuery:'');
function homeFilters(){const params=new URLSearchParams(location.search);return {region:params.get('region')||'',kind:params.get('kind')||''};}
function homeSearchUrl(){return '/search'+(homeFilterQuery?'?'+homeFilterQuery:'');}
const palettes={forest:brandPalette};
const palette='forest';
function applyPalette(){const p=palettes[palette];for(const [key,value] of Object.entries(p))document.documentElement.style.setProperty('--'+key,value);document.body.dataset.palette=palette;updateFavicon();}
function updateFavicon(){
  const symbol=new Image();
  symbol.onload=()=>{
    const color=getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const context=canvas.getContext('2d');
    if(!context)return;
    const scale=Math.min(128/symbol.naturalWidth,128/symbol.naturalHeight);
    const width=symbol.naturalWidth*scale,height=symbol.naturalHeight*scale;
    context.drawImage(symbol,(128-width)/2,(128-height)/2,width,height);
    context.globalCompositeOperation='source-in';context.fillStyle=color;context.fillRect(0,0,128,128);
    const favicon=document.querySelector('#brandFavicon');favicon.type='image/png';favicon.href=canvas.toDataURL('image/png');favicon.dataset.brandColor=color;
    const preview=document.querySelector('#guideFavicon');if(preview)preview.src=favicon.href;
  };
  symbol.src='/assets/icon-people-v3.png';
}
let upcomingDays = Number((isEmbeddedPreview?new URLSearchParams(location.search).get('previewDays'):null)||sessionStorage.getItem('outing-review-days')) || 14;
if (![7,14,30].includes(upcomingDays)) upcomingDays=14;
let guideDate = '';
let toastTimer;
let calendarOrigin;
let calendarPending = '';
let calendarFocus = today;
let calendarMonth = today.slice(0,7);
const publicItems = () => data.filter(item=>item.lifecycle!=='ENDED' && item.lifecycle!=='CANCELLED' && (!item.event_end || item.event_end>=today));
const ongoing = item => item.event_start && item.event_end && item.event_start<=today && item.event_end>=today;
const upcoming = item => item.event_start && item.event_end && item.event_start>today && item.event_start<=addDays(today,upcomingDays);
const permanent = item => ['MUSEUM','CULTURAL_SITE'].includes(item.kind) && !item.event_start && !item.event_end;
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500);}
function icon(name){
  const paths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
    search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    filter:'<path d="M3 6h6m4 0h8M3 12h12m4 0h2M3 18h2m4 0h12"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
    back:'<path d="m15 6-6 6 6 6"/>',next:'<path d="m9 6 6 6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    guide:'<path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 12h8M8 16h8"/>',
    check:'<path d="m5 12 4 4 10-10"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
    spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>'
  };
  return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths[name]+'</svg>';
}
function route(url,{replace=false}={}){
  history.replaceState({...history.state,scroll:window.scrollY},'',location.href);
  if(replace)history.replaceState({app:true,scroll:0},'',url);else history.pushState({app:true,scroll:0},'',url);
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  render();window.scrollTo(0,0);main.focus({preventScroll:true});
}
function updateNavigation(){
  document.body.dataset.nav='combined';const current=location.pathname;
  document.querySelector('#headerSearch').href=current==='/'?homeSearchUrl():'/search';
  document.querySelector('#bottomNav').innerHTML=[[homeUrl(),'home','홈'],[homeSearchUrl(),'search','검색']].map(([url,name,label])=>`<a href="${url}" data-route ${current===url.split('?')[0]?'aria-current="page"':''}><span class="nav-icon">${icon(name)}</span>${label}</a>`).join('');
  document.querySelector('#menuLinks').innerHTML=[[homeUrl(),'home','홈'],[homeSearchUrl(),'search','검색']].map(([url,name,label])=>`<a href="${url}" data-route>${icon(name)}<span>${label}</span><span class="menu-chevron">${icon('next')}</span></a>`).join('');
}
const backHeading = title => `<div class="page-head"><button class="icon-button" data-back aria-label="이전 페이지로 돌아가기">${icon('back')}</button><h1>${title}</h1></div>`;
const scopeNote = () => `<p class="scope-note">확보 자료 · 일반 노출 ${new Set(publicItems().map(i=>i.region_name)).size}개 시도, ${publicItems().length}곳<br>${snapshot.replaceAll('-','.')} 수집·검토 자료 · 현재 운영을 보증하지 않아요.</p>`;
function period(item){return item.event_start && item.event_end ? `${dateLabel(item.event_start)} – ${dateLabel(item.event_end)}` : permanent(item)?'상설 시설':'일정 미확인';}
function badge(item){return item.lifecycle==='ENDED' || (item.event_end && item.event_end<today)?'<span class="badge neutral">종료</span>':ongoing(item)?'<span class="badge">행사 기간 진행 중</span>':upcoming(item)?'<span class="badge">곧 시작</span>':permanent(item)?'<span class="badge neutral">상설 시설</span>':'<span class="badge warning">일정 미확인</span>';}
function card(item,{sample=false}={}){
  const hasPhoto=item.id==='23e35bc8-99bf-4578-b13b-3f4ebee00d13';
  const photo=hasPhoto?'<span class="card-thumbnail"><img src="/assets/clayarch.jpg" alt="클레이아크 김해미술관 외관, 2015년 사진" width="64" height="64" loading="lazy"></span>':'';
  const credit=hasPhoto?'<p class="card-photo-credit"><a href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG" target="_blank" rel="noopener noreferrer">사진: HappyMidnight · 2015</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>':'';
  return `<article class="card" data-has-photo="${hasPhoto}"><div class="card-top">${photo}<div class="card-top-info"><div class="card-meta"><span>${esc(item.region_name)}</span><span>·</span><span>${kindNames[item.kind]}</span></div>${badge(item)}</div></div><a class="card-heading" href="/detail/${item.id}" data-route><h3>${esc(item.name)}</h3></a>${!permanent(item)?`<p class="small">${period(item)}</p>`:''}<p class="hint">당일 운영·일반 입장료 미확인</p>${credit}<div class="card-actions"><span class="tiny muted">원천 확인 ${snapshot.replaceAll('-','.')}</span><a class="button secondary" href="/detail/${item.id}" data-route>자세히 보기</a></div>${sample?'<p class="hint">실제 확보한 카드 · 추정한 요금·운영 정보 없음</p>':''}</article>`;
}
function sectionSearchUrl(scope){const params=new URLSearchParams(homeFilterQuery);params.set('scope',scope);return '/search?'+params;}
function stateArt(type){
  if(type==='loading')return '<span class="state-art walking-scene" aria-hidden="true"><span class="people-mask walking-mark"></span><span class="walking-shadow"></span></span>';
  const paths=type==='empty'?'<path d="M8 29c-1-12 6-19 21-20 1 15-6 22-18 20Z"/><path d="m8 33 14-14M14 27l-1-7m5 3 7 1"/><path d="M30 30h4m-2-2v4"/>':'<path d="M12 27a7 7 0 0 1-1-14 10 10 0 0 1 19 0 7 7 0 0 1-1 14"/><path d="M20 20v8m0 5h.01"/>';
  return '<span class="state-art state-'+type+'" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg></span>';
}
function loadingState(message='나들이를 불러오고 있어요…'){return '<div class="loading state-feedback" role="status" aria-live="polite" aria-atomic="true">'+stateArt('loading')+'<p class="state-title">'+esc(message)+'</p></div>';}
function emptyState(title,description,action=''){return '<div class="empty state-feedback">'+stateArt('empty')+'<strong class="state-title">'+esc(title)+'</strong><p>'+esc(description)+'</p>'+action+'</div>';}
function errorState(sample=false){return '<div class="feedback-error state-feedback" role="'+(sample?'group':'alert')+'">'+stateArt('error')+'<strong class="state-title">나들이를 불러오지 못했어요.</strong><p>잠시 후 다시 시도해 주세요.</p><button class="button secondary" '+(sample?'data-demo="다시 시도 버튼의 스타일 예시예요."':'data-retry')+'>다시 시도</button></div>';}

function section(title,description,items,scope,emptyText){return `<section><div class="section-head"><h2>${title}</h2><a class="more" href="${sectionSearchUrl(scope)}" data-route>더 보기 ${icon('next')}</a></div><p class="section-description">${description}</p>${items.length?items.slice(0,3).map(i=>card(i)).join(''):emptyState('확인한 항목이 아직 없어요.',emptyText,'<a href="/search" data-route class="button secondary">전체 검색</a>')}</section>`;}
function renderHome(){
  const filters=homeFilters();const params=new URLSearchParams();if(filters.region)params.set('region',filters.region);if(filters.kind)params.set('kind',filters.kind);homeFilterQuery=params.toString();if(!isEmbeddedPreview)sessionStorage.setItem('outing-review-home-filters',homeFilterQuery);
  const items=publicItems().filter(i=>(!filters.region||i.region_name===filters.region)&&(!filters.kind||i.kind===filters.kind));
  const inProgress=items.filter(ongoing).sort((a,b)=>a.event_end.localeCompare(b.event_end)||a.id.localeCompare(b.id));
  const coming=items.filter(upcoming).sort((a,b)=>a.event_start.localeCompare(b.event_start)||a.id.localeCompare(b.id));
  const facilities=items.filter(permanent).sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id));
  main.innerHTML=`<div class="hero"><span class="hero-mark people-mask" role="img" aria-label="함께 걷는 두 사람"></span><p class="eyebrow">가까운 하루, 새로운 발견</p><h1>오늘은 어디로<br>나들이 갈까요?</h1><p>지금 만날 전시, 곧 시작할 축제.<br>일상 가까이에서 새로운 하루를 찾아요.</p></div>${scopeNote()}<div class="home-filter-bar"><button id="homeFilterOpen" class="home-filter-trigger" aria-haspopup="dialog" aria-expanded="false">${icon('filter')}<span>${esc(filters.region||'전체 지역')} · ${kindNames[filters.kind]||'전체 종류'}</span>${icon('down')}</button>${homeFilterQuery?'<button id="homeFilterReset" class="text-button">초기화</button>':''}</div>${homeFilterQuery?`<p class="hint">선택한 조건의 나들이 ${items.length}곳</p>`:''}${section('지금 만나는 나들이','행사 기간 기준이에요. 당일 운영·예약은 별도로 확인해 주세요.',inProgress,'ongoing','확인한 진행 중 기간 행사가 아직 없어요.')}${section('곧 시작하는 나들이',`내일부터 ${upcomingDays}일 안에 시작해요.`,coming,'upcoming','이 기간에 시작하는 행사 자료가 아직 없어요.')}${section('언제든 떠올릴 나들이','상설 시설이에요. 휴관·운영 시간은 출발 전에 확인해 주세요.',facilities,'permanent','확인한 상설 시설 자료가 아직 없어요.')}`;
}
function dateField(value,context){return `<div><span class="field-label" id="${context}DateLabel">방문 날짜</span><div class="date-control"><button type="button" class="date-trigger" data-calendar="${context}" aria-labelledby="${context}DateLabel ${context}DateValue" aria-haspopup="dialog" aria-expanded="false"><span id="${context}DateValue">${dateLabel(value)}</span>${icon('calendar')}</button>${value?`<button type="button" class="icon-button date-clear" data-clear-date="${context}" aria-label="날짜 지우기">${icon('close')}</button>`:''}</div></div>`;}
function renderSearch(){
  const params=new URLSearchParams(location.search);const q=params.get('q')||'';const region=params.get('region')||'';const kind=params.get('kind')||'';const scope=params.get('scope')||'';
  const regions=[...new Set(publicItems().map(i=>i.region_name))].sort();const scopeTitles={ongoing:'기간 진행 중',upcoming:`${upcomingDays}일 안에 시작`,permanent:'상설 시설'};
  main.innerHTML=`<div class="intro"><h1>나들이 검색</h1><p class="small muted">축제·행사·전시·박물관·문화관광지를 찾아봐요.</p></div><form id="findForm" class="filters"><div class="full"><label for="keyword">이름으로 검색</label><input id="keyword" name="q" placeholder="행사 또는 시설 이름" value="${esc(q)}"></div><div><label for="region">지역</label><select id="region" name="region"><option value="">전체 지역</option>${regions.map(r=>`<option ${r===region?'selected':''}>${r}</option>`).join('')}</select></div><div><label for="kind">종류</label><select id="kind" name="kind"><option value="">전체 종류</option>${Object.entries(kindNames).map(([key,label])=>`<option value="${key}" ${key===kind?'selected':''}>${label}${!publicItems().some(i=>i.kind===key)?' · 후보 확보 중':''}</option>`).join('')}</select></div>${scope?`<input type="hidden" name="scope" value="${esc(scope)}"><div class="full callout">홈에서 선택한 조건: ${scopeTitles[scope]}<br><a href="/search" data-route>기간 조건 해제</a></div>`:''}<div class="full row"><button class="button primary" type="submit">검색</button><a href="/search" data-route class="button secondary">초기화</a></div></form><section id="findResults"></section>`;
  let items=publicItems().filter(i=>i.name.toLocaleLowerCase('ko').includes(q.trim().toLocaleLowerCase('ko'))&&(!region||i.region_name===region)&&(!kind||i.kind===kind));
  if(scope==='ongoing')items=items.filter(ongoing);if(scope==='upcoming')items=items.filter(upcoming);if(scope==='permanent')items=items.filter(permanent);
  items.sort((a,b)=>{const tier=i=>i.event_start?0:permanent(i)?1:2;return tier(a)-tier(b)||(tier(a)===0?a.event_start.localeCompare(b.event_start):a.name.localeCompare(b.name,'ko'))||a.id.localeCompare(b.id);});
  document.querySelector('#findResults').innerHTML=`<div class="section-head"><h2>검색 결과 ${items.length}곳</h2></div>${items.length?items.map(i=>card(i)).join(''):emptyState('조건에 맞는 곳이 없어요.','다른 이름·지역·종류로 찾아봐요.','<a href="/search" data-route class="button secondary">조건 초기화</a>')}${scopeNote()}`;
  document.querySelector('#findForm').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.currentTarget);const next=new URLSearchParams();for(const [key,value]of form)if(String(value).trim())next.set(key,String(value).trim());route('/search'+(next.size?'?'+next:''));});
}
function sourceLinks(item){return item.sources.map(s=>`<p class="small"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${s.source==='TOUR'?'한국관광공사 TourAPI 데이터 안내':'전국박물관미술관 표준데이터 안내'} ↗</a><br><span class="tiny muted">원천 확인 ${dateLabel(s.checked.slice(0,10))} · 수집 자료의 원천 안내</span></p>`).join('');}
function renderDetail(id){
  const item=data.find(i=>i.id===id);if(!item){main.innerHTML=backHeading('나들이 상세')+'<div class="empty"><h2>찾을 수 없는 나들이</h2><a href="/search" data-route class="button secondary">검색으로 돌아가기</a></div>';return;}
  main.innerHTML=`${backHeading('나들이 상세')}<div class="card-meta">${item.region_name} · ${kindNames[item.kind]}</div><h2 style="margin:12px 0">${esc(item.name)}</h2>${badge(item)}<dl class="info-list"><dt>기간·구분</dt><dd>${period(item)}</dd><dt>당일 운영</dt><dd>미확인</dd><dt>일반 입장료</dt><dd>미확인</dd><dt>추가 요금</dt><dd>미확인</dd><dt>할인 조건</dt><dd>미확인</dd><dt>예약 조건</dt><dd>미확인</dd></dl><div class="callout warning">행사 기간과 당일 운영은 달라요. 휴무·임시 휴관·예약 가능 여부는 출발 전에 공식 안내를 확인해 주세요.</div><section><h2>데이터 출처</h2><p class="section-description">원천 응답 확인은 현장 운영 확인과 구분해요.</p>${sourceLinks(item)}<p class="hint">자료 수집·검토: ${snapshot.replaceAll('-','.')} · 현재 시안은 저장 데이터의 일부 필드만 보여줍니다. 주소·운영 시간 등은 P12·P13에서 검토 후 연결합니다.</p></section>`;
}

function renderGuide(){
  const realCard=publicItems().find(ongoing)||publicItems()[0];
  const photoCard=publicItems().find(item=>item.id==='23e35bc8-99bf-4578-b13b-3f4ebee00d13');
  main.innerHTML=`<header class="guide-masthead"><div class="guide-title"><span class="wordmark" role="img" aria-label="나들이랑"></span><div><p class="eyebrow">모바일 웹을 위한 디자인 기준</p><h1>UI 디자인 가이드</h1><p class="small muted">서비스 화면은 모바일 기준, 가이드는 넓은 화면에서 함께 검토합니다.</p></div></div><div class="row wrap"><span class="guide-review-label">검토 시안 · 로고·세부 배치 미확정</span><a href="${homeUrl()}" data-route class="button secondary">홈 열기 ${icon('next')}</a></div></header><nav class="guide-jump" aria-label="가이드 목차">${[['screens','화면'],['navigation','내비게이션'],['inputs','입력·선택'],['dates','달력'],['buttons','버튼·뒤로가기'],['cards','카드'],['states','로딩·빈 결과·오류'],['tokens','스타일 값'],['brand','로고'],['policies','정책·안내'],['featurePlan','기능 계획']].map(([id,label])=>`<a href="#${id}">${label}</a>`).join('')}</nav>
  <section id="screens" class="guide-screens"><div class="guide-section-head"><div><h2>01 · 모바일 화면 한눈에 보기</h2><p class="section-description">실제 시안을 같은 너비로 나란히 봅니다. 각 화면 안에서 스크롤·검색·필터를 직접 사용할 수 있어요.</p></div><div class="guide-width-control"><label for="previewWidth">미리보기 너비</label><select id="previewWidth"><option value="320">320px · 작은 화면</option><option value="390" selected>390px · 기본</option><option value="430">430px · 넓은 화면</option></select></div></div><div class="guide-screen-grid">${[['홈','/'],['검색','/search'],['상세','/detail/'+realCard.id]].map(([label,url])=>`<figure class="guide-screen"><figcaption><strong>${label}</strong><a href="${url}" data-route>화면 열기 ${icon('next')}</a></figcaption><div class="guide-preview-frame"><iframe src="${url}" title="모바일 ${label} 미리보기" loading="lazy"></iframe></div></figure>`).join('')}</div><details class="guide-home-notes"><summary>홈의 섹션·기간 제안</summary><p class="small">진행 중 → 곧 시작 → 상설 시설 순서. 각 섹션 최대 3곳, 더 보기는 조건을 유지한 검색으로 이동합니다. 진행 중은 종료일 순, 다가오는 것은 시작일 순, 상설은 이름순입니다.</p><label for="upcomingDays">다가오는 기간 비교</label><select id="upcomingDays">${[7,14,30].map(n=>`<option value="${n}" ${n===upcomingDays?'selected':''}>내일부터 ${n}일</option>`).join('')}</select><p class="hint">14일은 이번·다음 주 제안. 7일은 빠른 선택, 30일은 미리 계획하기에 유리합니다.</p></details></section>
  <section id="navigation"><h2>02 · 상단·하단 내비게이션</h2><p class="section-description">첨부 화면의 역할 분리를 나들이랑에 맞게 적용해요.</p><div class="sample"><h3>지금의 구성</h3><p class="small">상단: 로고 · 검색 · 햄버거 · 로그인 자리<br>하단: 홈 · 검색<br>햄버거에는 홈·검색만 둡니다. 홈 필터는 지역·종류를 바텀시트에서 선택해요. 정책·출처는 하단 안내와 PC 왼쪽에서 접근해요.</p></div><div class="sample"><h3>메뉴 구성 비교</h3><table class="comparison"><tbody><tr><th>하단 + 햄버거 · 우선안</th><td>홈·검색을 하단과 메뉴에서 이동. 정책·출처는 하단 안내. 주 기능이 눈에 보이지만 하단 안전 여백이 필요해요.</td></tr><tr><th>하단바만</th><td>이동은 간단하지만 정책·출처·후속 메뉴까지 늘면 좁아져요. 보조 링크를 본문 하단에 두어야 해요.</td></tr><tr><th>햄버거 중심</th><td>화면을 넓게 쓰지만 홈·검색까지 메뉴를 열어야 해요. 반복 이동에 한 단계가 더 들어갑니다.</td></tr></tbody></table><p class="hint">현재 두 주 기능에는 조합안을 제안합니다. 최종 구성은 사용자 검토 후 정해요.</p></div><div class="sample"><h3>후속 구성 예시 · 구현 보류</h3><div class="future-header"><span class="wordmark" role="img" aria-label="나들이랑"></span><span>${icon('search')}</span><span>${icon('menu')}</span><button class="button primary login-placeholder" disabled title="로그인 기능 준비 중">로그인</button></div><div class="future-nav">${[['home','홈'],['search','검색'],['bookmark','저장한 곳'],['spark','AI 추천']].map(([name,label])=>`<div>${icon(name)}<span>${label}</span></div>`).join('')}</div><p class="hint">로그인·저장한 곳·상황별 AI 추천의 자리만 보는 가이드 예시입니다. 로그인은 상단에 버튼만 표시하고 저장한 곳·AI 추천은 실제 메뉴에 추가하지 않았어요.</p></div><div class="sample"><h3>숲 초록 팔레트</h3><p class="small">숲 초록 #2F6B4F · 옅은 잎색 #EEF4EB · 따뜻한 흰 바탕 #FAFBF7</p><p class="hint">선택한 팔레트만 보여줍니다. 로고 원본의 모양은 유지하고 화면 색상은 CSS 마스크로 적용해요.</p></div><div class="sample"><h3>화면 폭·스크롤</h3><label for="serviceWidth">PC 서비스 화면 폭</label><select id="serviceWidth"><option value="480">480px · 기본 제안</option><option value="520">520px · 여유 있는 안</option></select><p class="hint">960px부터 왼쪽 안내 + 오른쪽 서비스. 모바일은 화면 너비를 사용해요.</p></div></section>
  <section id="inputs"><h2>03 · 인풋·셀렉트</h2><div class="sample stack"><div><label for="guideInput">기본 입력</label><input id="guideInput" placeholder="행사 또는 시설 이름"><p class="hint">16px 본문, 높이 44px 이상 · 터치 시 확대 방지</p></div><div><label for="guideSelect">지역 선택</label><select id="guideSelect"><option>전체 지역</option>${[...new Set(publicItems().map(i=>i.region_name))].map(r=>`<option>${r}</option>`).join('')}</select><p class="hint">입력 높이·여백·얇은 화살표를 통일합니다. 선택 목록은 OS·브라우저 입력을 유지해요.</p></div><div><label for="guideError">오류 상태 · 스타일 예시</label><input id="guideError" value="2026-02-30" aria-invalid="true" aria-describedby="guideErrorText"><p class="error-text" id="guideErrorText">올바른 날짜를 입력해 주세요.</p></div><div><label for="guideDisabled">비활성 상태 · 스타일 예시</label><input id="guideDisabled" placeholder="아직 선택할 수 없어요" disabled></div></div></section>
  <section id="dates"><h2>04 · 날짜 선택</h2><div class="sample">${dateField(guideDate,'guide')}<p class="hint">연도·월을 눌러 연도를 고릅니다. 오늘은 작은 점으로 표시하며 날짜를 눌러 선택해요.</p><p class="hint">지우기는 모달 하단 왼쪽, 취소·완료는 오른쪽에 둡니다. 선택 값이 있을 때 입력 옆의 ×로도 지울 수 있어요.</p></div><p class="hint">직접 제어 달력의 검토 시안입니다. 실기기·스크린리더·웹뷰 검증은 제품 적용 때 수행합니다.</p></section>
  <section id="buttons"><h2>05 · 버튼·뒤로가기</h2><div class="sample"><div class="row wrap"><button class="button primary" data-demo="기본 동작 버튼을 눌렀어요.">기본 동작</button><button class="button secondary" data-demo="보조 동작 버튼을 눌렀어요.">보조 동작</button><button class="button selected" aria-pressed="true" data-demo="선택 상태의 예시예요.">${icon('check')} 선택됨</button><button class="button secondary" disabled>비활성</button></div><div class="row wrap"><button class="icon-button" data-back aria-label="이전 페이지로 돌아가기">${icon('back')}</button><button class="back-label" data-back>${icon('back')}이전 화면</button><button class="icon-button" data-open-menu aria-label="보조 메뉴 열기">${icon('menu')}</button></div><p class="hint">뒤로 가기는 이전 화면·조건·스크롤로 복귀합니다. 직접 들어온 페이지는 검색으로 이동합니다. 최소 44px 터치 영역, 포커스 때 레이아웃 크기는 유지해요.</p></div></section>
  <section id="cards"><h2>06 · 카드·상태</h2><p class="section-description">왼쪽 위 썸네일 옆에 지역·종류·상태를 두고, 아래에 이름과 방문 정보를 읽어요. 확보한 사진이 없는 카드는 텍스트로 표시합니다.</p>${photoCard?card(photoCard,{sample:true}):''}${card(realCard,{sample:true})}<div class="sample"><div class="status-list"><span class="badge">행사 기간 진행 중</span><span class="badge warning">당일 운영 미확인</span><span class="badge neutral">종료</span><span class="badge error">조회 실패</span></div><p class="hint">색상과 상태 이름을 함께 표시해요.</p></div><div class="sample"><h3>무료·유료·미확인 · 스타일 예시</h3><p class="small muted">아래는 가이드 전용 상태이며 특정 시설의 요금 정보가 아닙니다.</p><dl class="info-list"><dt>무료 예시</dt><dd>일반 입장 무료 · 체험 별도</dd><dt>유료 예시</dt><dd>일반 성인 요금 확인 필요</dd><dt>미확인 예시</dt><dd>요금 미확인 · 0원으로 바꾸지 않음</dd></dl></div></section>
  <section id="states" class="guide-states"><h2>07 · 로딩·빈 결과·오류</h2><p class="section-description">같은 숲 초록 톤으로 상황을 구분합니다. 로딩에는 두 사람 심볼을 사용하고, 빈 결과와 실패에는 차분한 안내와 다음 동작을 둡니다.</p><div class="state-gallery"><article class="state-example"><h3>불러오는 중</h3>${loadingState()}<p class="hint">파비콘과 같은 심볼 · 걷는 듯한 작은 움직임</p></article><article class="state-example"><h3>아직 없는 결과</h3>${emptyState('조건에 맞는 곳이 없어요.','다른 지역이나 종류로 찾아볼까요?','<button class="button secondary" data-demo="조건 초기화 버튼의 스타일 예시예요.">조건 초기화</button>')}<p class="hint">결과 없음 · 조회 실패와 구분</p></article><article class="state-example"><h3>불러오기 실패</h3>${errorState(true)}<p class="hint">실패 안내 · 다시 시도할 수 있게</p></article></div><p class="hint">동작은 스타일 예시입니다. 기기의 움직임 줄이기 설정에서는 로딩 심볼을 고정해서 보여줍니다.</p></section>
  <section id="tokens"><h2>08 · 색상·글자·간격</h2><p class="section-description">숲 초록 팔레트는 사용자 선택을 반영했습니다. 글자·간격은 P07 기준을 이어가며 화면 폭은 검토 중입니다.</p><div class="token-grid">${[['동작',palettes[palette].action],['브랜드',palettes[palette].brand],['본문','#202832'],['보조 글자','#586574'],['주의','#805513'],['오류','#A92D3B'],['입력 경계','#7F8B99'],['구분선','#D6DDE5']].map(([name,color])=>`<div class="token"><span class="swatch" style="background:${color}"></span><span>${name}<br>${color}</span></div>`).join('')}</div><table class="guide-table"><tbody>${[['글꼴','맑은 고딕 / Apple SD Gothic Neo / sans-serif'],['제목','모바일 24px / PC 28px · 700'],['섹션·카드','20px / 18px · 700'],['본문·보조','16px / 14px · 줄높이 1.6'],['간격','4 · 8 · 12 · 16 · 24 · 32px'],['모서리','카드·버튼·입력 8px / 상태 3px · 검토안'],['포커스','입력 1px 링 · 버튼 2px 외곽선, 2px 간격'],['바탕 제안','따뜻한 흰색 #FAFBF7 · 표면 #FFFFFF · 옅은 잎색'],['레이아웃 제안','서비스 480/520px · 안내 320px · 간격 64px'],['하단 안전 영역','76px + safe-area-inset-bottom, 본문 끝 여백']].map(([name,value])=>`<tr><th>${name}</th><td>${value}</td></tr>`).join('')}</tbody></table></section>
  <section id="brand"><h2>09 · 현재 로고·심볼</h2><p class="section-description">현재 로고·심볼을 숲 초록으로 표시합니다. 모양의 최종 검토와 웹용 내보내기는 P25에서 이어갑니다.</p><div class="sample"><div class="brand-samples"><figure><span class="wordmark" role="img" aria-label="현재 한글 로고" style="width:112px"></span><figcaption>모바일 헤더 112px</figcaption></figure><figure><span class="wordmark" role="img" aria-label="PC 안내 로고" style="width:216px"></span><figcaption>PC 안내 216px</figcaption></figure></div><p class="hint">‘랑’ 옆점 없이 둥근 열린 받침 유지 · 색 변화와 가장자리 정리는 최종 검토 대상</p></div><div class="sample"><div class="brand-samples">${[16,32,48].map(size=>`<figure><span class="people-mask" role="img" aria-label="두 사람 심볼 ${size}px" style="display:block;width:${size}px;height:${size}px"></span><figcaption>${size}px</figcaption></figure>`).join('')}<figure><span class="symbol-preview"><span class="people-mask" role="img" aria-label="심볼 원형 미리보기"></span></span><figcaption>원형 미리보기</figcaption></figure><figure><img id="guideFavicon" src="/assets/favicon-forest.svg?v=6" width="32" height="32" alt="현재 탭 파비콘 32px"><figcaption>현재 파비콘 32px</figcaption></figure></div><p class="hint">로고·심볼·파비콘은 같은 브랜드색을 사용합니다. 스타일이 바뀌면 함께 갱신하며, 출시용 크기·여백의 최종 정리는 P25, 앱용 아이콘은 P23에서 이어갑니다.</p></div></section>
  <section id="policies"><h2>10 · 정책·하단 안내</h2><p class="small muted">정책·출처는 하단 안내와 PC 왼쪽에서 바텀시트로 열립니다. 뒤로 가기로 닫으면 보던 화면을 유지해요.</p><div class="row wrap" style="margin-top:16px"><a class="button secondary" href="/policy/privacy" data-route>개인정보처리방침</a><a class="button secondary" href="/policy/terms" data-route>이용약관</a><a class="button secondary" href="/policy/about" data-route>서비스·데이터 출처</a></div></section><section id="featurePlan"><h2>11 · 기능 계획 다시 보기</h2><p class="section-description">비교를 제외하고, 북마크·로그인·AI는 후속으로 보류합니다.</p><table class="comparison"><tbody><tr><th>첫 웹 공개 제안</th><td>실제 데이터의 발견 홈 · 이름/지역/종류 검색 · 상세/공식 출처 · 정책 · 검색 유입</td></tr><tr><th>추가 축소 제안 · P28 검토</th><td>현재 운영·요금 확인 자료가 부족해 방문일/요금 필터를 후속으로 분리. 정보와 미확인 표시는 상세에 유지</td></tr><tr><th>후속 보류</th><td>P29 북마크 · P30 로그인 · P31 상황별 AI 추천. 실제 메뉴에는 표시하지 않음</td></tr><tr><th>필요할 때 재검토</th><td>P32 날짜/요금 필터 · 비교 · 예상 합계. 과거 기준을 자동 재도입하지 않음</td></tr><tr><th>웹 완성 뒤</th><td>P23 같은 모바일 웹을 사용하는 웹뷰 앱, 확정 심볼의 앱용 아이콘</td></tr></tbody></table><p class="hint">P12 조회 API → P13 웹 화면 → P14 검색 유입·P15 운영 준비 순서. 현재 시안은 제품 구현이나 최종 범위 승인으로 취급하지 않습니다.</p></section>`;
  const board=document.createElement('div');board.className='guide-board';main.querySelectorAll(':scope > section').forEach(section=>board.append(section));const layout=document.createElement('div');layout.className='guide-layout';layout.append(main.querySelector('.guide-jump'),board);main.append(layout);
  document.querySelector('#previewWidth').value=String(guidePreviewWidth);
  document.querySelector('#previewWidth').addEventListener('change',event=>{guidePreviewWidth=Number(event.target.value);document.body.style.setProperty('--guide-preview-width',guidePreviewWidth+'px');});
  document.querySelector('#guideFavicon').src=document.querySelector('#brandFavicon').href;
  document.querySelector('#upcomingDays').addEventListener('change',event=>{upcomingDays=Number(event.target.value);sessionStorage.setItem('outing-review-days',upcomingDays);const preview=document.querySelector('iframe[title="모바일 홈 미리보기"]');preview.src='/?previewDays='+upcomingDays;toast(`홈의 다가오는 기간을 ${upcomingDays}일로 바꿨어요.`);});
  const width=sessionStorage.getItem('outing-review-width')||'480';document.querySelector('#serviceWidth').value=width;
  document.querySelector('#serviceWidth').addEventListener('change',event=>{const value=event.target.value;document.documentElement.style.setProperty('--service-width',value+'px');document.documentElement.style.setProperty('--shell-width',(384+Number(value))+'px');sessionStorage.setItem('outing-review-width',value);});
}
function policyData(type){
  const titles={privacy:'개인정보처리방침',terms:'이용약관',about:'서비스·데이터 출처'};
  const body=type==='about'?`<h2>나들이랑이 준비하는 것</h2><p>축제·행사·전시·박물관·문화관광지를 발견하고 상세·공식 출처에서 방문 정보를 확인하는 모바일 웹을 준비하고 있어요.</p><h2>실제 확보 자료</h2><p>${snapshot.replaceAll('-','.')} 수집 DB의 공개 후보 7곳 중 종료 2곳을 제외한 5곳을 홈·검색에 표시합니다. 전체 지역은 확보한 자료를 함께 본다는 뜻이며 전국 모든 시설을 확보했다는 의미가 아닙니다.</p><h2>데이터 출처</h2><p><a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noopener noreferrer">한국관광공사 TourAPI</a>와 <a href="https://www.data.go.kr/data/15017323/standard.do" target="_blank" rel="noopener noreferrer">전국박물관미술관 표준데이터</a>를 사용합니다. 원천별 출처와 확인일은 각 상세 화면에 표시합니다.</p><h2>정보를 읽는 기준</h2><p>행사 기간은 당일 운영·예약 가능을 보증하지 않습니다. 요금·운영·할인·예약의 미확인 정보는 추정하지 않으며 출발 전에 공식 기관 안내를 확인해야 합니다.</p><h2>시안의 로컬 저장</h2><p>이 브라우저 탭의 화면 폭·기간·홈 필터 설정을 sessionStorage에 보관합니다. 계정·예약·결제·광고·분석 도구는 이 시안에 연결하지 않았습니다.</p>`:type==='privacy'?`<h2>공개 정책 작성 전 확인할 항목</h2><ul><li>운영자와 개인정보 문의 연락처</li><li>운영 서버·호스팅의 접속 로그 항목과 보관 기간</li><li>쿠키·브라우저 저장 정보와 삭제 방법</li><li>광고·분석 도구의 실제 사용 여부와 처리 구조</li><li>위탁·국외 이전 여부, 권리 행사 절차와 시행일</li></ul><h2>현재 검토 시안의 동작</h2><p>로그인과 개인정보 입력 기능은 없습니다. 화면 폭·기간·홈 필터 설정은 이 탭의 sessionStorage에 저장됩니다. 공개 서비스의 수집·보관 범위는 아직 확정되지 않았습니다.</p>`:`<h2>공개 약관 작성 전 확인할 항목</h2><ul><li>실제 운영 주체·연락처와 적용 시점</li><li>서비스 이용 범위와 데이터 변경·갱신 안내</li><li>외부 공식 안내·예약 링크의 역할</li><li>서비스 변경·중단 및 문의 절차</li><li>자료 이용 권리와 이용자 권리·책임</li></ul><h2>현재 제공 범위</h2><p>이 페이지는 화면 검토 시안입니다. 직접 예약·결제·개인별 할인 판정과 요금 합계 기능은 제공하지 않습니다. 공개 운영 구성과 검토를 거쳐 실제 약관을 준비합니다.</p>`;
  return {title:titles[type]||'서비스 안내',body:`<div class="callout warning">공개 정책 확정 전 · 검토 안내<br>실제 운영 구성 확인 후 정책·약관을 준비합니다.</div><div class="policy-content">${body}</div>`};
}
function renderPolicy(type){const content=policyData(type);main.innerHTML=backHeading(content.title)+content.body;}
let policyOrigin;
const policyDialog=document.querySelector('#policyDialog');
const policyBody=document.querySelector('#policyBody');
policyBody.tabIndex=0;
policyBody.setAttribute('aria-label','정책 안내 내용');
policyDialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const targets=[...policyDialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];const first=targets[0],last=targets.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
function policyType(){return /^#policy-(privacy|terms|about)$/.exec(location.hash)?.[1];}
function positionSheet(dialog){const rect=document.querySelector('.service').getBoundingClientRect();const guide=document.body.classList.contains('guide-mode');const width=guide?Math.min(390,window.innerWidth-32):rect.width;dialog.style.left=(guide?(window.innerWidth-width)/2:rect.left)+'px';dialog.style.width=width+'px';}
function positionPolicy(){positionSheet(policyDialog);}
function syncPolicy(){
  const type=policyType();
  if(!type){if(policyDialog.open)policyDialog.close();return;}
  const content=policyData(type);document.querySelector('#policyTitle').textContent=content.title;document.querySelector('#policyBody').innerHTML=content.body;
  positionPolicy();if(!policyDialog.open){document.body.classList.add('policy-open');policyDialog.showModal();document.querySelector('#policyBody').scrollTop=0;document.querySelector('#policyClose').focus();}
}
function openPolicy(type,origin){
  policyOrigin=origin;document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  history.replaceState({...history.state,scroll:window.scrollY},'',location.href);
  history.pushState({...history.state,policySheet:true},'',location.pathname+location.search+'#policy-'+type);syncPolicy();
}
function closePolicy(){if(history.state?.policySheet)history.back();else{history.replaceState(history.state,'',location.pathname+location.search);syncPolicy();}}
document.querySelector('#policyClose').addEventListener('click',closePolicy);
policyDialog.addEventListener('cancel',event=>{event.preventDefault();closePolicy();});
policyDialog.addEventListener('click',event=>{const r=policyDialog.getBoundingClientRect();if(event.target===policyDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closePolicy();});
policyDialog.addEventListener('close',()=>{document.body.classList.remove('policy-open');const menu=document.querySelector('#menuDialog');(policyOrigin?.isConnected&&!menu.contains(policyOrigin)?policyOrigin:document.querySelector('#menuOpen')).focus({preventScroll:true});});
window.addEventListener('resize',()=>{if(policyDialog.open)positionPolicy();});
const filterDialog=document.querySelector('#homeFilterDialog');
let filterOrigin;
function syncHomeFilter(){
  const open=location.pathname==='/'&&location.hash==='#filters';
  if(!open){if(filterDialog.open)filterDialog.close();return;}
  if(filterDialog.open)return;
  const applied=homeFilters();const regions=[...new Set(publicItems().map(i=>i.region_name))].sort();
  document.querySelector('#homeFilterRegion').innerHTML='<option value="">전체 지역</option>'+regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
  document.querySelector('#homeFilterKind').innerHTML='<option value="">전체 종류</option>'+Object.entries(kindNames).map(([key,label])=>`<option value="${key}">${label}${publicItems().some(i=>i.kind===key)?'':' · 자료 확보 중'}</option>`).join('');
  document.querySelector('#homeFilterRegion').value=applied.region;document.querySelector('#homeFilterKind').value=applied.kind;
  const scroll=window.scrollY;
  positionSheet(filterDialog);document.body.classList.add('filter-open');document.querySelector('#homeFilterOpen')?.setAttribute('aria-expanded','true');filterDialog.showModal();document.querySelector('#homeFilterRegion').focus({preventScroll:true});window.scrollTo(0,scroll);requestAnimationFrame(()=>{if(filterDialog.open)window.scrollTo(0,scroll);});
}
function openHomeFilter(origin){filterOrigin=origin;history.replaceState({...history.state,scroll:window.scrollY},'',location.href);history.pushState({...history.state,homeFilterSheet:true},'',location.pathname+location.search+'#filters');syncHomeFilter();}
function closeHomeFilter(){if(history.state?.homeFilterSheet)history.back();else{history.replaceState(history.state,'',location.pathname+location.search);syncHomeFilter();}}
filterDialog.addEventListener('cancel',event=>{event.preventDefault();closeHomeFilter();});
filterDialog.addEventListener('close',()=>{document.body.classList.remove('filter-open');const origin=document.querySelector('#homeFilterOpen')||filterOrigin;if(origin?.isConnected){origin.setAttribute('aria-expanded','false');origin.focus({preventScroll:true});}});
filterDialog.addEventListener('click',event=>{const r=filterDialog.getBoundingClientRect();if(event.target===filterDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeHomeFilter();});
filterDialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const targets=[...filterDialog.querySelectorAll('button:not(:disabled),select')];const first=targets[0],last=targets.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
document.querySelector('#homeFilterClose').addEventListener('click',closeHomeFilter);document.querySelector('#homeFilterCancel').addEventListener('click',closeHomeFilter);
document.querySelector('#homeFilterClear').addEventListener('click',()=>{document.querySelector('#homeFilterRegion').value='';document.querySelector('#homeFilterKind').value='';});
document.querySelector('#homeFilterForm').addEventListener('submit',event=>{event.preventDefault();const params=new URLSearchParams();for(const [key,value]of new FormData(event.currentTarget))if(value)params.set(key,value);history.replaceState({app:true,scroll:0},'','/'+(params.size?'?'+params:''));filterDialog.close();render();window.scrollTo(0,0);document.querySelector('#homeFilterOpen').focus({preventScroll:true});});
window.addEventListener('resize',()=>{if(filterDialog.open)positionSheet(filterDialog);});
function render(){
document.body.classList.toggle('guide-mode',location.pathname==='/ui-design');normalizeQuery();renderedUrl=location.pathname+location.search;const pathname=location.pathname.replace(/\/$/,'')||'/';
if(pathname==='/')renderHome();else if(pathname==='/ui-design')renderGuide();else if(pathname==='/search')renderSearch();else if(pathname.startsWith('/detail/'))renderDetail(pathname.split('/')[2]);else if(pathname.startsWith('/policy/'))renderPolicy(pathname.split('/')[2]);else main.innerHTML=backHeading('페이지 안내')+'<div class="empty"><h2>현재 제공하지 않는 페이지예요.</h2><a class="button primary" href="/" data-route>홈으로</a></div>';
updateNavigation();
document.title=(pathname==='/ui-design'?'UI 디자인':pathname==='/search'?'검색':'나들이 발견')+' · 나들이랑 검토 시안';
}
document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-route]');if(link && !event.ctrlKey && !event.metaKey && !event.shiftKey){event.preventDefault();const target=link.getAttribute('href');const policy=/^\/policy\/(privacy|terms|about)$/.exec(target);if(policy)openPolicy(policy[1],link);else route(target);return;}
  const homeFilter=event.target.closest('#homeFilterOpen');if(homeFilter){openHomeFilter(homeFilter);return;}
  if(event.target.closest('#homeFilterReset')){route('/');return;}
  const back=event.target.closest('[data-back]');if(back){if(history.state?.app)history.back();else route('/search');return;}
  const date=event.target.closest('[data-calendar]');if(date){openCalendar(date);return;}
  const clear=event.target.closest('[data-clear-date]');if(clear){setDate(clear.dataset.clearDate,'');return;}
  if(event.target.closest('#menuOpen,[data-open-menu]')){document.querySelector('#menuDialog').showModal();return;}
  const close=event.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
  if(event.target.closest('[data-retry]')){location.reload();return;}
  const demo=event.target.closest('[data-demo]');if(demo)toast(demo.dataset.demo);
});
window.addEventListener('popstate',()=>{const wasPolicyOpen=policyDialog.open;const wasFilterOpen=filterDialog.open;syncPolicy();syncHomeFilter();if(renderedUrl===location.pathname+location.search){if((wasPolicyOpen||wasFilterOpen)&&!policyType()&&location.hash!=='#filters')requestAnimationFrame(()=>window.scrollTo(0,history.state?.scroll||0));return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();syncPolicy();syncHomeFilter();requestAnimationFrame(()=>{window.scrollTo(0,history.state?.scroll||0);if(!policyDialog.open&&!filterDialog.open)main.focus({preventScroll:true});});});
function setDate(context,value){if(context!=='guide')return;guideDate=value;const scroll=window.scrollY;renderGuide();window.scrollTo(0,scroll);document.querySelector('[data-calendar=guide]').focus({preventScroll:true});}
let calendarView='days';
let calendarYearStart=Number(today.slice(0,4));
const minimumYear=Number(today.slice(0,4));
function openCalendar(trigger){
  calendarOrigin=trigger;
  calendarPending=guideDate;
  calendarFocus=guideDate||today;
  calendarMonth=calendarFocus.slice(0,7);
  calendarView='days';
  renderCalendar();
  trigger.setAttribute('aria-expanded','true');
  document.querySelector('#calendarDialog').showModal();
  document.querySelector(`[data-day="${calendarFocus}"]`)?.focus();
}
function renderCalendar(){
  const year=Number(calendarMonth.slice(0,4));const month=Number(calendarMonth.slice(5));
  document.querySelector('#monthLabel').innerHTML=`<span>${year}년 ${month}월</span>${icon('down')}`;
  document.querySelector('#monthLabel').setAttribute('aria-label',`연도 선택, ${year}년 ${month}월`);
  document.querySelector('#monthLabel').setAttribute('aria-expanded',String(calendarView==='years'));
  document.querySelector('#calendarDaysPanel').hidden=calendarView!=='days';
  document.querySelector('#calendarYearsPanel').hidden=calendarView!=='years';
  document.querySelector('#monthNav').hidden=calendarView!=='days';
  const first=new Date(Date.UTC(year,month-1,1));const length=new Date(Date.UTC(year,month,0)).getUTCDate();
  const cells=[];
  for(let blank=0;blank<first.getUTCDay();blank++)cells.push('<span role="gridcell"></span>');
  for(let day=1;day<=length;day++){
    const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    cells.push(`<button type="button" role="gridcell" data-day="${key}" tabindex="${key===calendarFocus?'0':'-1'}" aria-label="${year}년 ${month}월 ${day}일${key===today?', 오늘':''}" ${key===today?'aria-current="date" class="today"':''} aria-selected="${key===calendarPending}" ${key<today?'disabled':''}><span class="day-number">${day}</span></button>`);
  }
  const rows=[];for(let start=0;start<cells.length;start+=7)rows.push(`<div role="row">${cells.slice(start,start+7).join('')}</div>`);
  document.querySelector('#calendarGrid').innerHTML=rows.join('');
  document.querySelector('#calendarSelection').textContent=calendarPending?dateLabel(calendarPending):'';
  document.querySelector('.calendar-status').hidden=!calendarPending;
  document.querySelector('#calendarApply').disabled=!calendarPending&&!guideDate;
  document.querySelector('#calendarClear').disabled=!calendarPending;
  document.querySelector('#prevMonth').disabled=calendarMonth<=today.slice(0,7);
  document.querySelector('#nextMonth').disabled=calendarMonth>='9999-12';
  if(calendarView==='years')renderYears();
}
function renderYears(){
  const end=Math.min(calendarYearStart+11,9999);
  const shownYear=Number(calendarMonth.slice(0,4));
  document.querySelector('#yearRange').textContent=`${calendarYearStart} – ${end}`;
  document.querySelector('#prevYears').disabled=calendarYearStart<=minimumYear;
  document.querySelector('#nextYears').disabled=end===9999;
  document.querySelector('#yearGrid').innerHTML=Array.from({length:end-calendarYearStart+1},(_,i)=>calendarYearStart+i).map(year=>`<button type="button" data-year="${year}" class="year-option" ${year===shownYear?'aria-current="true"':''}>${year}</button>`).join('');
}
function showYears(){
  calendarYearStart=minimumYear+Math.floor((Number(calendarMonth.slice(0,4))-minimumYear)/12)*12;
  calendarView='years';renderCalendar();
  document.querySelector(`[data-year="${calendarMonth.slice(0,4)}"]`)?.focus();
}
function setCalendarMonth(next,{focusGrid=false}={}){
  if(next<today.slice(0,7))next=today.slice(0,7);
  if(next>'9999-12')next='9999-12';
  const days=new Date(Date.UTC(Number(next.slice(0,4)),Number(next.slice(5)),0)).getUTCDate();
  const day=Math.min(Number(calendarFocus.slice(8)),days);
  calendarFocus=next+'-'+String(day).padStart(2,'0');
  if(calendarFocus<today)calendarFocus=today;
  calendarMonth=next;calendarView='days';renderCalendar();
  if(focusGrid)document.querySelector(`[data-day="${calendarFocus}"]`)?.focus();
}
function moveMonth(step,{focusGrid=false}={}){
  const d=new Date(calendarMonth+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+step);
  if(d.getUTCFullYear()>9999)return;
  const next=d.toISOString().slice(0,7);
  if(next<today.slice(0,7)||next>'9999-12')return;
  setCalendarMonth(next,{focusGrid});
}
document.querySelector('#monthLabel').addEventListener('click',showYears);
document.querySelector('#yearReturn').addEventListener('click',()=>{calendarView='days';renderCalendar();document.querySelector('#monthLabel').focus();});
document.querySelector('#prevYears').addEventListener('click',()=>{calendarYearStart=Math.max(minimumYear,calendarYearStart-12);renderYears();});
document.querySelector('#nextYears').addEventListener('click',()=>{calendarYearStart=Math.min(9999,calendarYearStart+12);renderYears();});
document.querySelector('#yearGrid').addEventListener('click',event=>{
  const button=event.target.closest('[data-year]');if(!button)return;
  setCalendarMonth(button.dataset.year+calendarMonth.slice(4),{focusGrid:true});
});
document.querySelector('#yearGrid').addEventListener('keydown',event=>{
  const button=event.target.closest('[data-year]');if(!button)return;
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3};
  if(!Object.hasOwn(offset,event.key))return;
  event.preventDefault();const year=Math.max(minimumYear,Math.min(9999,Number(button.dataset.year)+offset[event.key]));
  if(year<calendarYearStart||year>calendarYearStart+11){calendarYearStart=minimumYear+Math.floor((year-minimumYear)/12)*12;renderYears();}
  document.querySelector(`[data-year="${year}"]`)?.focus();
});
document.querySelector('#prevMonth').addEventListener('click',()=>moveMonth(-1));
document.querySelector('#nextMonth').addEventListener('click',()=>moveMonth(1));
document.querySelector('#calendarGrid').addEventListener('click',event=>{
  const button=event.target.closest('[data-day]');if(!button||button.disabled)return;
  calendarPending=calendarFocus=button.dataset.day;renderCalendar();document.querySelector(`[data-day="${calendarFocus}"]`).focus();
});
document.querySelector('#calendarGrid').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))return;
  event.preventDefault();let next=calendarFocus;
  if(event.key==='PageUp'||event.key==='PageDown'){moveMonth(event.key==='PageUp'?-1:1,{focusGrid:true});return;}
  const weekday=new Date(calendarFocus+'T12:00:00Z').getUTCDay();
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekday,End:6-weekday};
  next=addDays(calendarFocus,offset[event.key]);if(next<today)next=today;if(!/^\d{4}-/.test(next)||next>'9999-12-31')next='9999-12-31';
  calendarFocus=next;calendarMonth=next.slice(0,7);renderCalendar();document.querySelector(`[data-day="${next}"]`)?.focus();
});
document.querySelector('#calendarClear').addEventListener('click',()=>{calendarPending='';renderCalendar();});
document.querySelector('#calendarCancel').addEventListener('click',()=>document.querySelector('#calendarDialog').close());
document.querySelector('#calendarApply').addEventListener('click',()=>{
  if(calendarPending&&!validDate(calendarPending))return;
  document.querySelector('#calendarDialog').close();setDate(calendarOrigin.dataset.calendar,calendarPending);
});
document.querySelector('#calendarDialog').addEventListener('close',()=>{calendarOrigin?.setAttribute('aria-expanded','false');calendarOrigin?.focus({preventScroll:true});});

const width=sessionStorage.getItem('outing-review-width')||'480';document.documentElement.style.setProperty('--service-width',width+'px');document.documentElement.style.setProperty('--shell-width',(384+Number(width))+'px');
applyPalette();
document.querySelectorAll('.brand img').forEach(img=>{const mask=document.createElement('span');mask.className='wordmark';mask.setAttribute('role','img');mask.setAttribute('aria-label',img.alt);img.replaceWith(mask);});
document.querySelectorAll('[data-icon]').forEach(element=>element.innerHTML=icon(element.dataset.icon));
main.innerHTML=loadingState();
fetch('/data.json').then(response=>{if(!response.ok)throw new Error('조회 실패');return response.json();}).then(items=>{data=items;render();syncPolicy();syncHomeFilter();}).catch(()=>{updateNavigation();main.innerHTML=errorState();});
