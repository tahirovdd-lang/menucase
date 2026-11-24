import {languages,nutritionLabels,sectionTranslations} from './languages.js';
import {flags} from './flags.js';
import {qrMatrix} from './qr-encoder.js';

const $ = selector => document.querySelector(selector);
const projectUrl = new URL('../',import.meta.url);
const menuParams = new URLSearchParams(location.search);
const slug = menuParams.get('restaurant');
const dishId = menuParams.get('dish');
const menuUrl = new URL(projectUrl);
if (slug) menuUrl.searchParams.set('restaurant',slug);
const categories = {food:true,drinks:true,alcohol:true};
const foodSections=Object.keys(sectionTranslations.ru);
const selector = $('#language');
const directoryEmptyMessages={
  ru:"Рестораны пока не добавлены.",
  uz:"Hozircha restoranlar qoʻshilmagan.",
  en:"No restaurants have been added yet.",
  it:"Non sono ancora stati aggiunti ristoranti.",
  es:"Aún no se han añadido restaurantes.",
  fr:"Aucun restaurant n’a encore été ajouté.",
  de:"Es wurden noch keine Restaurants hinzugefügt.",
  pt:"Ainda não foram adicionados restaurantes.",
  tr:"Henüz restoran eklenmedi.",
  kk:"Әзірге мейрамханалар қосылған жоқ.",
  ky:"Азырынча ресторандар кошула элек.",
  tg:"Ҳоло ягон тарабхона илова нашудааст.",
  az:"Hələ restoran əlavə edilməyib.",
  ar:"لم تُضَف أي مطاعم بعد.",
  zh:"尚未添加餐厅。",
  ja:"レストランはまだ登録されていません。",
  ko:"아직 등록된 레스토랑이 없습니다.",
  hi:"अभी तक कोई रेस्तराँ नहीं जोड़ा गया है।",
  uk:"Ресторани ще не додано.",
  pl:"Nie dodano jeszcze żadnych restauracji."
};
const languageKey = 'na-stole-language';
let languageCode = 'ru';
try {
  const stored = localStorage.getItem(languageKey);
  if (Object.hasOwn(languages,stored)) languageCode = stored;
} catch {}
const t = key => languages[languageCode].strings[key];
const sectionName=section=>sectionTranslations[languageCode]?.[section] ?? sectionTranslations.ru[section];
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
const requestedSection=menuParams.get('section');
let foodSection=foodSections.includes(requestedSection) ? requestedSection : null;
let items=[];
const selectedCategory=menuParams.get('category');
let category=Object.hasOwn(categories,selectedCategory) ? selectedCategory : 'food';
let index = 0;
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
  node.onclick = run;
  return node;
}
function link(label,url) {
  const node = element('a',label);
  node.href = url;
  return node;
}
const visibleItems = () => items.filter(item=>item.category===category &&
  (category!=='food' || !foodSection || item.section===foodSection));
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
  details.hidden=false;
  details.replaceChildren(element('h2',item?.name ?? t('empty')));
  if (item) details.append(element('p',item.description),element('span',item.price,'price'));
}
function categoryUrl(group,section) {
  const url=new URL(menuUrl);
  url.searchParams.set(group==='food' && section ? 'section' : 'category',group==='food' && section ? section : group);
  return url;
}

function draw() {
  const filters=$('#filters');
  filters.replaceChildren(...Object.keys(categories).map(key=>{
    const filter=button(t(key),()=>{
      if (key===category) return;
      category=key;
      foodSection=null;
      index=0;
      history.replaceState(null,'',categoryUrl(key));
      draw();
      filters.querySelector('[aria-pressed=true]').focus({preventScroll:true});
    });
    filter.setAttribute('aria-pressed',String(key===category));
    filter.className='featured-category';
    filter.replaceChildren(element('span',t(key),'featured-category-label'));
    const preview=items.find(item=>item.category===key && item.photo);
    if (preview) {
      const circle=element('span','','featured-category-circle');
      const photo=element('img');
      photo.src=preview.photo;
      photo.alt='';
      photo.onerror=()=>circle.remove();
      circle.append(photo);
      filter.append(circle);
    }
    return filter;
  }));
  const subcategories=$('#subcategories');
  const sections=category==='food' ? foodSections.filter(section=>items.some(item=>item.category==='food' && item.section===section)) : [];
  subcategories.hidden=!sections.length;
  subcategories.replaceChildren(...sections.map(section=>{
    const filter=button(sectionName(section),()=>{
      foodSection=section===foodSection ? null : section;
      index=0;
      history.replaceState(null,'',categoryUrl(category,foodSection));
      draw();
      subcategories.children[sections.indexOf(section)]?.focus({preventScroll:true});
    });
    filter.setAttribute('aria-pressed',String(foodSection===section));
    return filter;
  }));
  const visible=visibleItems();
  $('.stage').hidden=!visible.length;
  $('#rail').replaceChildren(...visible.map(item=>{
    const url=new URL(menuUrl);
    url.searchParams.set('dish',item.id);
    const card = link('',url);
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

const nutrients=['calories','protein','fat','carbs'];

function dishNutrition(nutrition) {
  const values=nutrients.filter(key=>Number.isFinite(nutrition?.[key]));
  if (!values.length) return null;
  const [title,...labels]=nutritionLabels[languageCode];
  const grams=new Intl.NumberFormat(languageCode,{style:'unit',unit:'gram'});
  const number=new Intl.NumberFormat(languageCode);
  const section=element('section');
  section.append(element('h2',title+' · '+grams.format(100)));
  const list=element('dl','','nutrition-values');
  for (const key of values) {
    const row=element('div');
    const value=nutrition[key];
    row.append(element('dt',labels[nutrients.indexOf(key)]),
      element('dd',key==='calories' ? number.format(value)+' '+labels[4] : grams.format(value)));
    list.append(row);
  }
  section.append(list);
  return section;
}

function showDish(item) {
  ingredientObserver?.disconnect();
  ingredientObserver=null;
  const main=$('main');
  const page=element('article','','dish-page');
  const backUrl=item ? categoryUrl(item.category,item.section) : menuUrl;
  page.append(link(t('back'),backUrl));
  if (!item) {
    page.append(element('h1',t('notFound')));
    main.replaceChildren(page);
    return;
  }
  document.title=item.name+' · На столе';
  const layout=element('div','','dish-layout');
  const copy=element('div','','dish-copy');
  const categoryName=sectionName(item.section) ?? t(item.category);
  copy.append(element('p',categoryName,'eyebrow'),element('h1',item.name));
  if (item.description) copy.append(element('p',item.description));
  copy.append(element('span',item.price,'price'));
  const nutrition=dishNutrition(item.nutrition);
  if (nutrition) copy.append(nutrition);
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

function menuQrCard(venue) {
  const url=menuUrl.href;
  const matrix=qrMatrix(url);
  const margin=4;
  const scale=12;
  const canvas=element('canvas');
  canvas.width=canvas.height=(matrix.length+2*margin)*scale;
  const context=canvas.getContext('2d');
  context.fillStyle='#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#000';
  matrix.forEach((line,y)=>line.forEach((dark,x)=>{
    if (dark) context.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);
  }));
  const image=element('img');
  image.alt='QR-код меню '+venue.name;
  image.src=canvas.toDataURL('image/png');
  const download=link('Скачать QR-код',image.src);
  download.download=venue.slug+'-menu-qr.png';
  download.className='admin-primary';
  const description=element('div','','admin-menu-qr-copy');
  description.append(element('h3','QR-код меню'),link(url,url));
  description.append(download);
  const card=element('section','','admin-menu-qr');
  card.append(image,description);
  return card;
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
    image.src=restaurant.logo;
    brand.append(image);
  }
}
function applyLanguage() {
  const selected=languages[languageCode];
  document.documentElement.lang=languageCode;
  document.documentElement.dir=selected.direction;
  selector.value=languageCode;
  $('#language-code').textContent=languageCode.toUpperCase();
  $('#language-flag').src=flags[regionFor(languageCode)];
  selector.setAttribute('aria-label',t('language'));
  if (slug===null) {
    const empty=$('#directory-empty');
    if (empty) empty.textContent=directoryEmptyMessages[languageCode];
    return;
  }
  if (restaurant) $('.brand').setAttribute('aria-label',restaurant.name+' · '+t('openMenu'));
  if (dishId) {
    if (restaurant) showDish(items.find(item=>item.id===dishId));
    return;
  }
  const headline=$('#menu-title');
  if (!headline) return;
  const space=['zh','ja'].includes(languageCode)?'':' ';
  headline.textContent=t('titleA')+space+t('titleB');
  if (restaurant) document.title=restaurant.name+' · '+headline.textContent;
  $('#filters').setAttribute('aria-label',t('sections'));
  $('.stage').setAttribute('aria-label',t('display'));
  $('#previous').setAttribute('aria-label',t('previous'));
  $('#next').setAttribute('aria-label',t('next'));
  if (restaurant) draw();
}
selector.onchange=()=>{
  if (!Object.hasOwn(languages,selector.value)) return;
  languageCode=selector.value;
  try {localStorage.setItem(languageKey,languageCode);} catch {}
  applyLanguage();
};

const validSlug = value => typeof value==='string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(value);

async function menuData(path) {
  const response=await fetch(new URL(path,projectUrl));
  if (!response.ok) {
    throw new Error(response.status===404 ? 'Меню не найдено.' : 'Не удалось загрузить меню.');
  }
  return response.json();
}

function publicImage(path) {
  if (!path || typeof path!=='string') return '';
  const url=new URL(path,projectUrl);
  return ['https:','http:'].includes(url.protocol) ? url.href : '';
}

async function loadMenu() {
  if (!validSlug(slug)) throw new Error('Меню не найдено.');
  const data=await menuData('menus/'+slug+'.json');
  restaurant={name:data.restaurant.name,slug,logo:publicImage(data.restaurant.logo)};
  items=data.items.map(item=>({...item,photo:publicImage(item.photo)}));
  updateBrand();
  $('#restaurant').textContent=restaurant.name;
  applyLanguage();
  if (!dishId && items.length) $('#menu-qr').append(menuQrCard(restaurant));
}

async function loadDirectory() {
  const data=await menuData('menus.json');
  const directory=$('#directory');
  directory.hidden=false;
  const entries=data.filter(restaurant=>validSlug(restaurant.slug));
  if (!entries.length) {
    const empty=element('p',directoryEmptyMessages[languageCode]);
    empty.id='directory-empty';
    directory.append(empty);
    return;
  }
  const list=element('ul');
  for (const restaurant of entries) {
    const url=new URL(projectUrl);
    url.searchParams.set('restaurant',restaurant.slug);
    const row=element('li');
    row.append(link(restaurant.name,url));
    list.append(row);
  }
  directory.append(list);
}

if (slug!==null) document.documentElement.classList.add('restaurant-menu');
applyLanguage();
try {
  await (slug===null ? loadDirectory() : loadMenu());
} catch (error) {
  $('main').replaceChildren(element('section','','dish-page'));
  $('.dish-page').append(element('h1',error.message),link('Все рестораны',projectUrl));
}
