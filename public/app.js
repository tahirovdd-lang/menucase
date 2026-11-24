import {languages,sectionTranslations} from './languages.js';
import {flags} from './flags.js';
import {mohonSlug,mohonName,mohonSections} from './mohon-menu.js';

const $ = selector => document.querySelector(selector);
const controls = $('#controls');
const status = $('#status');
const [,route,segment,,restaurantDish] = location.pathname.split('/');
const slug = route === 'r' ? segment : '';
const dishId = route === 'dish' ? segment : restaurantDish;
const adminPage=route==='admin';
const menuUrl = slug ? '/r/'+slug : '/';
const sampleMenu=!slug && !adminPage;
const demoRestaurant=mohonName;
const categories = {food:true,drinks:true,alcohol:true};
const categoryPhotos={
  food:'/mohon-dolma.webp',
  drinks:'/mohon-ayran.webp',
  alcohol:'/mohon-wine-example.webp'
};
const selector = $('#language');
const languageKey = 'na-stole-language';
let languageCode = 'ru';
try {
  const stored = localStorage.getItem(languageKey);
  if (Object.hasOwn(languages,stored)) languageCode = stored;
} catch {}
const t = key => languages[languageCode].strings[key];
const sectionName=section=>sectionTranslations[languageCode]?.[section?.id] ?? section?.title;
const regions={en:'gb',ar:'sa',ja:'jp',ko:'kr',zh:'cn',hi:'in',uk:'ua',kk:'kz',ky:'kg',tg:'tj'};
const regionFor = code => regions[code] ?? code;
const emojiFlag = region => String.fromCodePoint(...[...region.toUpperCase()].map(letter=>127397+letter.charCodeAt(0)));
for (const [code,language] of Object.entries(languages)) {
  const option = document.createElement('option');
  option.value = code;
  option.lang = code;
  option.dir = language.direction;
  option.textContent = emojiFlag(regionFor(code))+' '+code.toUpperCase()+' · '+language.name;
  selector.append(option);
}
const menuParams=new URLSearchParams(location.search);
const requestedSection=menuParams.get('section');
let sampleSection=mohonSections.some(section=>section.id===requestedSection) ? requestedSection : null;
let items=[];
const selectedCategory=menuParams.get('category');
let category=Object.hasOwn(categories,selectedCategory) ? selectedCategory : (sampleMenu && !sampleSection ? null : 'food');
let index = 0;
let me;
let restaurant;

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(label,run,style) {
  const node = element('button',label,style);
  node.type = 'button';
  node.onclick = () => attempt(run);
  return node;
}
function link(label,url) {
  const node = element('a',label);
  node.href = url;
  return node;
}
async function request(path, options) {
  const response = await fetch(path,options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Запрос не выполнен.');
  return data;
}
async function attempt(run) {
  status.textContent = '';
  try { await run(); }
  catch (error) { status.textContent = error.message; }
}
const visibleItems = () => items.filter(item=>item.category===category &&
  (!sampleMenu || category!=='food' || item.section===sampleSection));
function updateSelection() {
  const list = visibleItems();
  [...$('#rail').children].forEach((node,i) => {
    const offset = i-index;
    node.style.setProperty('--offset',offset);
    node.style.setProperty('--distance',Math.abs(offset));
    node.style.setProperty('--opacity',offset===0?1:Math.abs(offset)===1?.62:0);
    node.toggleAttribute('inert',Math.abs(offset)>1);
    node.style.zIndex = String(list.length-Math.abs(offset));
    node.tabIndex = Math.abs(offset)>1 ? -1 : 0;
    if (i===index) node.setAttribute('aria-current','true');
    else node.removeAttribute('aria-current');
  });
  const item = list[index];
  $('#previous').hidden = index===0;
  $('#next').hidden = index>=list.length-1;
  const details = $('#details');
  details.replaceChildren(element('h2',item?.name ?? t('empty')));
  if (item) details.append(element('p',item.description),element('span',item.price,'price'));
}
function sampleMenuUrl(group,section) {
  return group==='food' && section ? '/?section='+section : '/?category='+group;
}

function draw() {
  const filters=$('#filters');
  filters.replaceChildren(...Object.keys(categories).map(key=>{
    const filter=button(t(key),()=>{
      if (key===category) return;
      category=key;
      sampleSection=null;
      index=0;
      if (sampleMenu) history.replaceState(null,'',sampleMenuUrl(key));
      draw();
      filters.querySelector('[aria-pressed=true]').focus({preventScroll:true});
    });
    filter.setAttribute('aria-pressed',String(key===category));
    if (sampleMenu) {
      filter.className='featured-category';
      const label=element('span',t(key),'featured-category-label');
      const circle=element('span','','featured-category-circle');
      const photo=element('img');
      photo.src=categoryPhotos[key];
      photo.alt='';
      photo.width=640;
      photo.height=640;
      circle.append(photo);
      filter.replaceChildren(label,circle);
    }
    return filter;
  }));
  if (sampleMenu) {
    const subcategories=$('#subcategories');
    subcategories.hidden=category!=='food';
    subcategories.replaceChildren(...(category==='food' ? mohonSections.map(section=>{
      const filter=button(sectionName(section),()=>{
        sampleSection=section.id;
        index=0;
        history.replaceState(null,'',sampleMenuUrl(category,section.id));
        draw();
        subcategories.querySelector('[aria-pressed=true]').focus({preventScroll:true});
      });
      filter.setAttribute('aria-pressed',String(sampleSection===section.id));
      return filter;
    }) : []));
    const showItems=Boolean(category && (category!=='food' || sampleSection));
    $('.stage').hidden=!showItems || !visibleItems().length;
    $('#details').hidden=!showItems;
  }
  $('#rail').replaceChildren(...visibleItems().map((item,i)=>{
    const card = link('',(slug ? menuUrl : '')+'/dish/'+item.id);
    card.className='card';
    card.setAttribute('aria-label',t('open')+' '+item.name);
    const visual=element('div','','card-visual');
    visual.append(element('span',item.name));
    if (item.photo) {
      const image = element('img');
      image.alt = '';
      image.onerror = () => image.remove();
      image.src = item.photo;
      visual.prepend(image);
    }
    card.append(visual);
    card.addEventListener('click',event=>{
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || swiped) return;
      visual.style.viewTransitionName='dish-photo';
    });
    return card;
  }));
  updateSelection();
}
function step(delta) {
  index = Math.max(0,Math.min(visibleItems().length-1,index+delta));
  updateSelection();
}
$('#previous').onclick = ()=>step(-1);
$('#next').onclick = ()=>step(1);
let swipe;
let swiped=false;
$('.stage').addEventListener('pointerdown',event=>{
  if (!event.isPrimary || event.button!==0 || event.target.closest('.step')) return;
  swiped=false;
  swipe={id:event.pointerId,x:event.clientX,y:event.clientY};
});
$('.stage').addEventListener('pointercancel',()=>swipe=null);
window.addEventListener('pointerup',event=>{
  if (!swipe || swipe.id!==event.pointerId) return;
  const dx=event.clientX-swipe.x;
  const dy=event.clientY-swipe.y;
  if (Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.3) {
    swiped=true;
    step(dx<0?1:-1);
    setTimeout(()=>swiped=false,160);
  }
  swipe=null;
});
$('.stage').addEventListener('click',event=>{if (swiped && event.target.closest('a')) event.preventDefault();});

function addIngredientMarkers(frame,crop,markers) {
  const svg = tag => document.createElementNS('http://www.w3.org/2000/svg',tag);
  const overlay=svg('svg');
  overlay.classList.add('ingredient-guides');
  overlay.setAttribute('aria-hidden','true');

  const left=element('div','','ingredient-edge ingredient-edge-left');
  const right=element('div','','ingredient-edge ingredient-edge-right');
  left.setAttribute('aria-hidden','true');
  right.setAttribute('aria-hidden','true');
  const byX=[...markers].sort((a,b)=>a.x-b.x);
  const split=byX.length===1 ? Number(byX[0].x<=50) : Math.ceil(byX.length/2);
  const guides=[];

  for (const [column,entries] of [[left,byX.slice(0,split)],[right,byX.slice(split)]]) {
    for (const marker of entries.sort((a,b)=>a.y-b.y)) {
      const label=element('span',marker.name,'ingredient-marker');
      const line=svg('line');
      const dot=svg('circle');
      dot.setAttribute('r',3);
      const guide=svg('g');
      guide.classList.add('ingredient-guide');
      guide.style.setProperty('--marker-delay',guides.length*85+'ms');
      label.style.setProperty('--marker-delay',guides.length*85+'ms');
      guide.append(line,dot);
      overlay.append(guide);
      column.append(label);
      guides.push({marker,label,line,dot,onLeft:column===left});
    }
  }
  frame.classList.add('dish-figure-marked');
  frame.append(left,right,overlay);

  const observer=new ResizeObserver(()=>{
    for (const {marker,label,line,dot,onLeft} of guides) {
      const x=crop.offsetLeft+crop.offsetWidth*marker.x/100;
      const y=crop.offsetTop+crop.offsetHeight*marker.y/100;
      line.setAttribute('x1',label.offsetLeft+(onLeft ? label.offsetWidth : 0));
      line.setAttribute('y1',label.offsetTop+label.offsetHeight/2);
      line.setAttribute('x2',x);
      line.setAttribute('y2',y);
      dot.setAttribute('cx',x);
      dot.setAttribute('cy',y);
    }
  });
  observer.observe(frame);
  observer.observe(crop);
  for (const {label} of guides) observer.observe(label);
  return observer;
}

let ingredientObserver;

function addTilt(figure) {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  figure.addEventListener('pointermove',event=>{
    if (event.pointerType!=='mouse' || reducedMotion.matches) return;
    const rect=figure.getBoundingClientRect();
    figure.style.setProperty('--tilt-y',((event.clientX-rect.left)/rect.width-.5)*10+'deg');
    figure.style.setProperty('--tilt-x',((event.clientY-rect.top)/rect.height-.5)*-8+'deg');
  });
  figure.addEventListener('pointerleave',()=>{
    figure.style.removeProperty('--tilt-x');
    figure.style.removeProperty('--tilt-y');
  });
}

function showDish(item) {
  ingredientObserver?.disconnect();
  ingredientObserver=null;
  const main=$('main');
  const page=element('article','','dish-page');
  const backUrl=item ? (sampleMenu ? sampleMenuUrl(item.category,item.section) : menuUrl+'?category='+item.category) : menuUrl;
  page.append(link(t('back'),backUrl));
  if (!item) {
    page.append(element('h1',t('notFound')));
    main.replaceChildren(page);
    return;
  }
  document.title=item.name+' · На столе';
  const layout=element('div','','dish-layout');
  const copy=element('div','','dish-copy');
  const categoryName=sampleMenu && item.category==='food' ? sectionName(mohonSections.find(section=>section.id===item.section)) : t(item.category);
  copy.append(element('p',categoryName,'eyebrow'),element('h1',item.name));
  if (item.description) copy.append(element('p',item.description));
  copy.append(element('span',item.price,'price'));
  if (item.illustration) copy.append(element('p','Фото для примера','sample-photo-note'));
  const markers=item.markers ?? [];
  if (markers.length) {
    copy.append(element('h2',t('ingredients')));
    const list=element('ul','','ingredient-list');
    for (const marker of markers) list.append(element('li',marker.name));
    copy.append(list);
  }
  if (item.photo) {
    const frame=element('figure','','dish-figure');
    frame.setAttribute('aria-label',t('photo'));
    const crop=element('div','','dish-photo');
    const photo=element('img');
    photo.src=item.photo;
    photo.alt=item.name;
    crop.append(photo);
    frame.append(crop);
    addTilt(frame);
    if (markers.length) ingredientObserver=addIngredientMarkers(frame,crop,markers);
    layout.append(frame);
  }
  layout.append(copy);
  page.append(layout);
  main.replaceChildren(page);
}
$('.stage').addEventListener('keydown',event=>{
  if (event.key==='ArrowLeft' || event.key==='ArrowRight') {
    event.preventDefault();
    step(event.key==='ArrowRight'?1:-1);
    $('#rail').children[index]?.focus();
  }
});

function field(text,name,{type='text',value='',required=true,maxlength,placeholder}={}) {
  const label = element('label',text);
  const control = element(type==='textarea'?'textarea':'input');
  if (type!=='textarea') control.type=type;
  control.name=name;
  if (type!=='file') control.value=value;
  else control.accept='image/jpeg,image/png,image/webp';
  control.required=required;
  if (maxlength) control.maxLength=maxlength;
  if (placeholder) control.placeholder=placeholder;
  label.append(control);
  return label;
}
function form(label,fields,submit) {
  const node = element('form');
  const save = element('button',label);
  node.append(...fields,save);
  node.onsubmit = async event=>{
    event.preventDefault();
    save.disabled=true;
    await attempt(()=>submit(new FormData(node)));
    save.disabled=false;
  };
  return node;
}
function row(...nodes) {
  const node=element('div','','row');
  node.append(...nodes);
  return node;
}
const adminParams=new URLSearchParams(location.search);
const adminSections={menu:'Меню',appearance:'Оформление',access:'Доступ'};

function cabinetUrl(venue,section='menu') {
  return venue ? '/admin?'+new URLSearchParams({venue:venue.slug,section}) : '/admin';
}

async function cabinet() {
  me=await request('/api/me');
  const account=$('#admin-account');
  account.replaceChildren();
  controls.replaceChildren();
  if (!me.email) {
    $('#admin-title').textContent='Вход в кабинет';
    const card=element('section','','admin-card');
    card.append(element('p','Чтобы открыть кабинет, войдите с адресом @gmail.com.'));
    const signIn=link('Войти через Google','/auth/google');
    signIn.className='admin-primary';
    signIn.target='_top';
    card.append(signIn);
    if (!me.configured) {
      signIn.removeAttribute('href');
      signIn.setAttribute('aria-disabled','true');
      card.append(element('p','Вход через Google станет доступен после настройки подключения.','admin-muted'));
    }
    controls.append(card);
    return;
  }
  account.append(element('span',me.email,'admin-muted'),button(t('signOut'),async()=>{
    await request('/api/logout',{method:'POST'});
    location.assign(cabinetUrl());
  },'quiet'));

  const venue=me.restaurants.find(entry=>entry.slug===adminParams.get('venue'));
  if (venue) {
    const requested=adminParams.get('section');
    const section=Object.hasOwn(adminSections,requested) || me.owner && requested==='billing' ? requested : 'menu';
    await manage(venue,section);
    return;
  }

  $('#admin-title').textContent=me.owner ? 'Управление ресторанами' : 'Рестораны';
  const venues=element('section','','admin-card');
  venues.append(element('h2',me.owner ? 'Все рестораны' : 'Ваши рестораны'));
  if (!me.restaurants.length) venues.append(element('p',me.owner?'Создайте первый ресторан.':'Этому адресу пока не выдан доступ к ресторану.','admin-muted'));
  const venueRows=element('div');
  const search=element('input');
  search.type='search';
  search.placeholder='Название или адрес меню';
  search.setAttribute('aria-label','Поиск ресторанов');
  const filter=element('select');
  filter.setAttribute('aria-label','Статус меню');
  for (const [value,label] of [['all','Все статусы'],['active','Меню включено'],['inactive','Меню выключено']]) {
    const option=element('option',label);
    option.value=value;
    filter.append(option);
  }
  const count=element('p','','admin-muted');
  count.setAttribute('aria-live','polite');
  const rows=[];
  function filterVenues() {
    const query=search.value.trim().toLocaleLowerCase();
    let matching=0;
    for (const {entry,line} of rows) {
      const matchesStatus=filter.value==='all' ||
        (filter.value==='active' ? entry.enabled!==false : entry.enabled===false);
      line.hidden=!(matchesStatus && (entry.name+' '+entry.slug).toLocaleLowerCase().includes(query));
      if (!line.hidden) matching++;
    }
    count.textContent=matching ? 'Показано '+matching+' из '+rows.length : 'Рестораны не найдены.';
  }
  if (me.owner && me.restaurants.length) {
    const filters=element('div','','admin-toolbar');
    filters.append(search,filter);
    venues.append(filters,count);
    search.oninput=filterVenues;
    filter.onchange=filterVenues;
  }
  venues.append(venueRows);
  for (const entry of me.restaurants) {
    const summary=element('div','','admin-item-copy');
    summary.append(element('strong',entry.name));
    const state=element('span',entry.enabled===false ? 'Меню выключено' : 'Меню включено','admin-muted');
    if (me.owner) {
      const menuPath=entry.sample ? '/' : '/r/'+entry.slug;
      summary.append(element('span',menuPath,'admin-muted'));
    }
    summary.append(state);
    const actions=element('div','','actions');
    if (me.owner && !entry.sample) {
      const control=element('input');
      control.type='checkbox';
      control.setAttribute('role','switch');
      control.checked=entry.enabled!==false;
      const toggle=element('label','Меню активно','restaurant-switch');
      control.setAttribute('aria-label','Меню активно · '+entry.name);
      toggle.prepend(control);
      control.onchange=async()=>{
        control.disabled=true;
        await attempt(async()=>{
          const {enabled}=await admin('status',{slug:entry.slug,enabled:control.checked});
          entry.enabled=enabled;
          state.textContent=enabled ? 'Меню включено' : 'Меню выключено';
          status.textContent=entry.name+' · '+state.textContent;
          filterVenues();
        });
        control.checked=entry.enabled!==false;
        control.disabled=false;
      };
      actions.append(toggle);
    }
    if (me.owner) actions.append(link('Оплаты',cabinetUrl(entry,'billing')));
    actions.append(link('Открыть кабинет',cabinetUrl(entry)));
    const line=row(summary,actions);
    line.classList.add('venue-row');
    rows.push({entry,line});
    venueRows.append(line);
  }
  if (me.owner && rows.length) filterVenues();
  controls.append(venues);
  const registration=element('section','','admin-card');
  registration.append(element('h2','Подключить ресторан'),
    element('p','После регистрации можно заполнить меню. Системный администратор включит его для гостей.','admin-muted'),
    form('Зарегистрировать ресторан',[
      field('Название ресторана','name',{maxlength:100}),
      field('Адрес меню','slug',{maxlength:48,placeholder:'например, basil-kitchen'})
    ],async data=>{
      const {restaurant:entry}=await request('/api/register',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(data))
      });
      location.assign(cabinetUrl(entry));
    }));
  if (!me.owner) controls.append(registration);
  if (me.owner) {
    const create=element('section','','admin-card');
    create.append(element('h2','Новый ресторан'),form('Создать ресторан',[
      field('Название','name',{maxlength:100}),
      field('Адрес ресторана','slug',{maxlength:48,placeholder:'например, basil-kitchen'}),
      field('Gmail администратора','email',{type:'email'})
    ],async data=>{
      const details=Object.fromEntries(data);
      await admin('create',details);
      location.assign(cabinetUrl(details));
    }));
    controls.append(create);
  }
}

function admin(action,data) {
  return request('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
}

function markerEditor(item,photoField) {
  const editor=element('section','','marker-editor');
  const frame=element('div','','marker-preview');
  const photo=element('img');
  photo.alt='Фото для размещения указателей';
  const name=field('Название ингредиента','marker-name',{required:false,maxlength:60});
  const nameInput=name.querySelector('input');
  const hidden=element('input');
  hidden.type='hidden';
  hidden.name='markers';
  const list=element('div');
  const hint=element('p','Введите название и нажмите на нужное место на фото.','marker-hint');
  let markers=[...(item?.markers ?? [])];
  let previewUrl;
  function update() {
    hidden.value=JSON.stringify(markers);
    frame.querySelectorAll('.editor-pin').forEach(pin=>pin.remove());
    list.replaceChildren();
    markers.forEach((marker,index)=>{
      const pin=element('span',String(index+1),'editor-pin');
      pin.style.left=marker.x+'%';
      pin.style.top=marker.y+'%';
      frame.append(pin);
      list.append(row(element('span',(index+1)+'. '+marker.name),button('Убрать',()=>{
        markers.splice(index,1);
        update();
      },'quiet')));
    });
  }
  if (item?.photo) photo.src=item.photo;
  frame.hidden=!item?.photo;
  photoField.querySelector('input').addEventListener('change',event=>{
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file=event.target.files[0];
    previewUrl=file ? URL.createObjectURL(file) : '';
    const source=previewUrl || item?.photo;
    frame.hidden=!source;
    if (source) photo.src=source;
    else photo.removeAttribute('src');
  });
  nameInput.addEventListener('keydown',event=>{if (event.key==='Enter') event.preventDefault();});
  frame.onclick=event=>{
    const value=nameInput.value.trim();
    if (!value) {nameInput.focus();return;}
    if (markers.length>=12) {status.textContent='Можно разместить до 12 указателей.';return;}
    const rect=frame.getBoundingClientRect();
    markers.push({name:value,x:Math.round((event.clientX-rect.left)/rect.width*1000)/10,y:Math.round((event.clientY-rect.top)/rect.height*1000)/10});
    nameInput.value='';
    update();
  };
  frame.append(photo);
  editor.append(element('h3','Указатели ингредиентов'),hint,name,frame,list,hidden);
  update();
  return editor;
}
async function manage(venue,section) {
  $('#admin-title').textContent=venue.name;
  document.title=venue.name+' · Кабинет администратора';
  const links=element('div','','admin-venue-links');
  links.append(link('Все рестораны',cabinetUrl()),link(t('openMenu'),venue.sample ? '/' : '/r/'+venue.slug));
  const nav=element('nav','','admin-nav');
  nav.setAttribute('aria-label','Разделы кабинета');
  const sections=me.owner ? {...adminSections,billing:'Оплаты'} : adminSections;
  for (const [key,label] of Object.entries(sections)) {
    const tab=link(label,cabinetUrl(venue,key));
    if (key===section) tab.setAttribute('aria-current','page');
    nav.append(tab);
  }
  const content=element('section','','admin-card');
  controls.replaceChildren(links,nav,content);
  if (section==='billing') await showBilling(venue,content);
  else if (section==='appearance') await editLogo(venue,content);
  else if (section==='access') showAccess(venue,content);
  else await manageMenu(venue,content);
}

async function showBilling(venue,content) {
  content.append(element('h2','Календарь оплат'),element('p','Отметьте оплаченные дни и сохраните изменения.','admin-muted'));
  const monthField=field('Месяц','billing-month',{type:'month'});
  const month=monthField.querySelector('input');
  const today=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit'}).formatToParts();
  month.value=today.find(part=>part.type==='year').value+'-'+today.find(part=>part.type==='month').value;
  const daysGrid=element('div','','billing-days');
  const save=button('Сохранить оплату',async()=>{
    const loaded=current;
    save.disabled=true;
    month.disabled=true;
    daysGrid.inert=true;
    try {
      const result=await request(loaded.path,{
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({days:[...loaded.days],revision:loaded.revision})
      });
      loaded.revision=result.revision;
      status.textContent='Оплаченные дни сохранены.';
    } finally {
      save.disabled=false;
      month.disabled=false;
      daysGrid.inert=false;
    }
  });
  let current;
  content.append(monthField,daysGrid,save);
  month.onchange=()=>attempt(loadMonth);
  await loadMonth();

  async function loadMonth() {
    daysGrid.replaceChildren();
    save.disabled=true;
    if (!month.value || !month.checkValidity()) return;
    const value=month.value;
    const path='/api/billing/'+venue.slug+'/'+value;
    const result=await request(path);
    if (month.value!==value) return;
    current={path,revision:result.revision,days:new Set(result.days)};
    const [year,monthNumber]=value.split('-').map(Number);
    const first=new Date(Date.UTC(year,monthNumber-1,1));
    const count=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
    for (const day of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']) daysGrid.append(element('span',day,'admin-muted'));
    for (let slot=0;slot<(first.getUTCDay()+6)%7;slot++) daysGrid.append(element('span'));
    for (let day=1;day<=count;day++) {
      const cell=button(String(day),()=>{
        if (current.days.has(day)) current.days.delete(day);
        else current.days.add(day);
        cell.setAttribute('aria-pressed',String(current.days.has(day)));
      },'quiet');
      cell.setAttribute('aria-label',value+'-'+String(day).padStart(2,'0'));
      cell.setAttribute('aria-pressed',String(current.days.has(day)));
      daysGrid.append(cell);
    }
    save.disabled=false;
  }
}

function showAccess(venue,content) {
  content.replaceChildren(element('h2','Доступ администраторов'));
  if (venue.sample || !me.owner) {
    content.append(element('p',venue.sample ? 'Меню The MOHON доступно для редактирования владельцу сайта.' : 'Доступом управляет владелец платформы.','admin-muted'));
    return;
  }
  if (venue.registeredBy) content.append(button('Повторить уведомление в Telegram',async()=>{
    const result=await admin('notify',{slug:venue.slug});
    const messages={sent:'Уведомление отправлено.',sending:'Уведомление отправляется.',failed:'Telegram вернул ошибку доставки.',pending:'Настройки Telegram ещё не подключены.'};
    status.textContent=messages[result.status];
  },'quiet'));
  for (const email of venue.admins) content.append(row(element('span',email),button('Отозвать',async()=>{
    if (!confirm('Отозвать доступ у '+email+'?')) return;
    await admin('revoke',{slug:venue.slug,email});
    venue.admins=venue.admins.filter(value=>value!==email);
    showAccess(venue,content);
    status.textContent='Доступ отозван.';
  },'quiet')));
  content.append(form('Выдать доступ',[field('Gmail администратора','email',{type:'email'})],async data=>{
    const address=String(data.get('email'));
    await admin('grant',{slug:venue.slug,email:address});
    const email=address.trim().toLowerCase().split('@')[0].replaceAll('.','')+'@gmail.com';
    venue.admins=[...new Set([...venue.admins,email])];
    showAccess(venue,content);
    status.textContent='Доступ выдан.';
  }));
}

function categorySelect() {
  const select=element('select');
  select.name='category';
  for (const key of Object.keys(categories)) {
    const option=element('option',t(key));
    option.value=key;
    select.append(option);
  }
  return select;
}

async function manageMenu(venue,content) {
  const endpoint='/api/manage/'+venue.slug;
  let {items:entries}=await request(endpoint);
  function prepareEntry(entry) {
    return entry.photoId ? {...entry,photo:endpoint+'/photo/'+entry.photoId} : entry;
  }
  entries=entries.map(prepareEntry);
  const list=element('ul','','admin-items');
  const editor=element('section','','admin-editor');
  editor.hidden=true;
  const toolbar=element('div','','admin-toolbar');
  const filter=categorySelect();
  const all=element('option','Все категории');
  all.value='';
  filter.prepend(all);
  filter.value='';
  filter.setAttribute('aria-label','Фильтр по категориям');
  const add=button('Добавить блюдо',()=>openEditor());
  const search=element('input');
  search.type='search';
  search.placeholder='Найти позицию';
  search.setAttribute('aria-label','Поиск по названиям позиций');
  toolbar.append(filter);
  if (venue.sample) toolbar.append(search);
  toolbar.append(add);
  content.append(element('h2','Меню'),toolbar,editor,list);
  filter.onchange=drawEntries;
  search.oninput=drawEntries;
  drawEntries();

  function closeEditor() {
    editor.hidden=true;
    editor.replaceChildren();
  }

  function openEditor(entry) {
    const categoryField=element('label','Категория');
    const select=categorySelect();
    select.value=entry?.category ?? (filter.value || 'food');
    categoryField.append(select);
    const sectionField=element('label','Подкатегория');
    const sectionSelect=element('select');
    sectionSelect.name='section';
    for (const section of mohonSections) {
      const option=element('option',sectionName(section));
      option.value=section.id;
      sectionSelect.append(option);
    }
    sectionField.append(sectionSelect);
    sectionSelect.value=entry?.category==='food' && entry.section ? entry.section : mohonSections[0].id;
    function updateSectionField() {
      sectionField.hidden=select.value!=='food';
      sectionSelect.disabled=sectionField.hidden;
    }
    updateSectionField();
    select.addEventListener('change',updateSectionField);
    const photoField=field('Фото · JPG, PNG или WebP до 4 МБ','photo',{type:'file',required:false});
    const fields=form('Сохранить',[
      field('Название','name',{value:entry?.name,maxlength:100}),
      categoryField,
      ...(venue.sample ? [sectionField] : []),
      field('Цена','price',{value:entry?.price,maxlength:32,placeholder:'45 000 сум'}),
      field('Описание','description',{type:'textarea',value:entry?.description,maxlength:500,required:false}),
      photoField,
      markerEditor(entry,photoField)
    ],async data=>{
      const result=await request(endpoint+'/'+(entry?.id ?? 'new'),{method:'POST',body:data});
      const item=prepareEntry(result.item);
      entries=entry ? entries.map(current=>current.id===item.id ? item : current) : [...entries,item];
      if (filter.value && filter.value!==item.category) filter.value=item.category;
      if (search.value && !item.name.toLowerCase().includes(search.value.trim().toLowerCase())) search.value='';
      closeEditor();
      drawEntries();
      add.focus();
      status.textContent='Позиция сохранена.';
    });
    editor.replaceChildren(element('h3',entry?'Редактирование позиции':'Новая позиция'),fields,button('Отмена',()=>{
      closeEditor();
      add.focus();
    },'quiet'));
    editor.hidden=false;
    fields.elements.namedItem('name').focus();
  }

  function drawEntries() {
    list.replaceChildren();
    const query=search.value.trim().toLowerCase();
    const visible=entries.filter(entry=>(!filter.value || entry.category===filter.value) && entry.name.toLowerCase().includes(query));
    if (!visible.length) list.append(element('li',query?'Позиции не найдены.':entries.length?'В этой категории пока нет позиций.':'Добавьте первую позицию в меню.','admin-muted'));
    for (const entry of visible) {
      const item=element('li','','admin-item');
      const thumb=element(entry.photo?'img':'span','','admin-thumb');
      if (entry.photo) {
        thumb.src=entry.photo;
        thumb.alt='';
        thumb.loading='lazy';
      } else thumb.setAttribute('aria-hidden','true');
      const copy=element('div','','admin-item-copy');
      const section=venue.sample && entry.category==='food' && mohonSections.find(value=>value.id===entry.section);
      copy.append(element('strong',entry.name),element('span',section ? sectionName(section) : t(entry.category),'admin-muted'));
      const actions=element('div','','actions');
      actions.append(button('Изменить',()=>openEditor(entry),'quiet'),button('Удалить',async()=>{
        if (!confirm('Удалить «'+entry.name+'» из меню?')) return;
        await request(endpoint+'/'+entry.id,{method:'DELETE'});
        entries=entries.filter(current=>current.id!==entry.id);
        closeEditor();
        drawEntries();
        add.focus();
        status.textContent='Позиция удалена.';
      },'quiet'));
      item.append(thumb,copy,element('strong',entry.price,'admin-item-price'),actions);
      list.append(item);
    }
  }
}

function updateHeaderAccess() {
  const access=me?.restaurants ?? [];
  const canManage=Boolean(restaurant && access.some(venue=>venue.slug===restaurant.slug));
  $('#account').hidden=!(sampleMenu || canManage);
}
function updateBrand() {
  const brand=$('.brand');
  const current=brand.querySelector('img');
  current?.remove();
  brand.classList.toggle('has-logo',Boolean(restaurant.logo));
  brand.href=menuUrl;
  brand.setAttribute('aria-label',restaurant.name+' · '+t('openMenu'));
  if (restaurant.logo) {
    const image=element('img');
    image.alt=restaurant.name;
    image.src=restaurant.logo+'?v='+Date.now();
    brand.append(image);
  }
  updateHeaderAccess();
}
async function editLogo(venue,content) {
  const manager='/api/manage/'+venue.slug;
  const {restaurant:details}=await request(manager+'/appearance');
  const endpoint=manager+'/logo';

  function render(logo) {
    content.replaceChildren(element('h2','Логотип'),element('p','Логотип будет виден гостям в шапке меню.','admin-muted'));
    if (logo) {
      const image=element('img','','logo-preview');
      image.alt=venue.name;
      image.src=(logo.startsWith('/api/restaurants/') ? endpoint : logo)+'?v='+Date.now();
      content.append(image);
    }
    content.append(form('Сохранить логотип',[field('Файл · JPG, PNG или WebP до 2 МБ','logo',{type:'file'})],async body=>{
      const result=await request(endpoint,{method:'POST',body});
      render(result.logo);
      status.textContent='Логотип сохранён.';
    }));
    if (logo && (!venue.sample || logo!== '/the-mohon-logo.webp')) content.append(button(venue.sample ? 'Вернуть исходный логотип' : 'Убрать логотип',async()=>{
      await request(endpoint,{method:'DELETE'});
      render(venue.sample ? '/the-mohon-logo.webp' : '');
      status.textContent=venue.sample ? 'Исходный логотип восстановлен.' : 'Логотип убран.';
    },'quiet'));
  }

  render(details.logo);
}
async function refreshMenu() {
  const data=await request('/api/restaurants/'+(sampleMenu ? mohonSlug : slug));
  restaurant=data.restaurant;
  updateBrand();
  items=data.items;
  if (dishId) {showDish(items.find(item=>item.id===dishId));return;}
  $('#restaurant').textContent=data.restaurant.name;
  document.title=data.restaurant.name+' · '+t('titleA')+' '+t('titleB');
  index=0;
  draw();
}
$('#account').onclick=()=>location.assign(cabinetUrl(restaurant));
function applyLanguage() {
  const selected=languages[languageCode];
  document.documentElement.lang=languageCode;
  document.documentElement.dir=selected.direction;
  selector.value=languageCode;
  $('#language-code').textContent=languageCode.toUpperCase();
  $('#language-flag').src=flags[regionFor(languageCode)];
  selector.setAttribute('aria-label',t('language'));
  $('#account').textContent=t('cabinet');
  if (adminPage) return;
  updateHeaderAccess();
  $('.brand').setAttribute('aria-label',(restaurant?.name ?? demoRestaurant)+' · '+t('openMenu'));
  if (dishId) {
    if (restaurant) showDish(items.find(item=>item.id===dishId));
    return;
  }
  const headline=$('#menu-title');
  if (!headline) return;
  const space=['zh','ja'].includes(languageCode)?'':' ';
  headline.textContent=t('titleA')+space+t('titleB');
  $('#restaurant').textContent=restaurant?.name ?? demoRestaurant;
  document.title=(restaurant?.name ?? demoRestaurant)+' · '+headline.textContent;
  $('#filters').setAttribute('aria-label',t('sections'));
  $('.stage').setAttribute('aria-label',t('display'));
  $('#previous').setAttribute('aria-label',t('previous'));
  $('#next').setAttribute('aria-label',t('next'));
  draw();
}
selector.onchange=()=>{
  if (!Object.hasOwn(languages,selector.value)) return;
  languageCode=selector.value;
  try {localStorage.setItem(languageKey,languageCode);} catch {}
  applyLanguage();
};
if (sampleMenu) {
  document.documentElement.classList.add('sample-menu');
  const brand=$('.brand');
  brand.classList.add('has-logo');
  const logo=element('img');
  logo.src='/the-mohon-logo.webp';
  logo.alt='';
  logo.width=512;
  logo.height=512;
  brand.append(logo);
}
applyLanguage();
if (adminPage) {
  document.title='Кабинет администратора · На столе';
  const page=$('#admin-page');
  page.hidden=false;
  $('main').replaceChildren(page);
  const login=adminParams.get('login');
  if (login) {
    adminParams.delete('login');
    history.replaceState(null,'','/admin'+(adminParams.size ? '?'+adminParams : ''));
  }
  await attempt(async()=>{
    await cabinet();
    if (login==='gmail') status.textContent='Выберите подтверждённый аккаунт @gmail.com.';
    if (login==='failed') status.textContent='Войти не удалось. Попробуйте ещё раз.';
  });
} else {
  refreshMenu().catch(error=>$('main').replaceChildren(element('h2',error.message)));
  request('/api/me').then(data=>{me=data;updateHeaderAccess();}).catch(()=>{});
}
