const encoder = new TextEncoder();
const gmail = value => {
  const email = String(value ?? '').toLowerCase().trim();
  return /^[a-z0-9]+(?:\.[a-z0-9]+)*@gmail\.com$/.test(email) ? email.split('@')[0].replaceAll('.', '')+'@gmail.com' : '';
};
const slugValid = slug => /^[a-z0-9][a-z0-9-]{0,47}$/.test(slug);
const json = (value, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
const error = (message, status = 400) => json({error:message}, status);
const cookieValue = (request, name) => request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(name+'='))?.slice(name.length+1);
const read = async (bucket, key) => (await bucket.get(key))?.json();
const write = (bucket, key, data) => bucket.put(key, JSON.stringify(data));
const random = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(n => n.toString(16).padStart(2,'0')).join('');
const sessionKey = async token => 'session/' + await hash(token);
const idValid = value => /^[a-f0-9-]{36}$/.test(value);

async function all(bucket, prefix) {
  const results = [];
  let cursor;
  do {
    const page = await bucket.list({prefix,cursor});
    results.push(...await Promise.all(page.objects.map(({key}) => read(bucket,key))));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return results.filter(Boolean);
}

function redirect(url, values = []) {
  const headers = new Headers({Location:url,'Cache-Control':'no-store'});
  for (const value of values) headers.append('Set-Cookie',value);
  return new Response(null,{status:303,headers});
}

function cookie(url, name, value, age) {
  return name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+age+(url.protocol === 'https:' ? '; Secure' : '');
}

const ownerAddress = env => (env.SITES_OWNER_EMAIL || env.OWNER_GMAIL)?.trim().toLowerCase();
const googleConfigured = env => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

async function google(request, url, env) {
  const callback = url.origin+'/auth/google/callback';
  if (!googleConfigured(env)) {
    return error('Вход через Google ещё не настроен.',503);
  }
  if (url.pathname === '/auth/google') {
    const state = random();
    const params = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:callback,response_type:'code',scope:'openid email',state,prompt:'select_account'});
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?'+params,[cookie(url,'menu_oauth',state,600)]);
  }
  const state = cookieValue(request,'menu_oauth');
  const clear = cookie(url,'menu_oauth','',0);
  if (!state || url.searchParams.get('state') !== state || !url.searchParams.get('code')) return redirect('/admin?login=failed',[clear]);
  const exchange = await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({
    code:url.searchParams.get('code'),client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:callback,grant_type:'authorization_code'
  })});
  if (!exchange.ok) return redirect('/admin?login=failed',[clear]);
  const {access_token} = await exchange.json();
  const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+access_token}});
  if (!profile.ok) return redirect('/admin?login=failed',[clear]);
  const user = await profile.json();
  const email = user.email_verified === true && gmail(user.email);
  if (!email) return redirect('/admin?login=gmail',[clear]);
  const token = random();
  await write(env.BUCKET,await sessionKey(token),{email,address:user.email.trim().toLowerCase(),expires:Date.now()+43200000});
  return redirect('/admin?login=ok',[clear,cookie(url,'menu_session',token,43200)]);
}

async function photoInfo(file) {
  const head = new Uint8Array(await file.slice(0,16).arrayBuffer());
  if (head[0] === 255 && head[1] === 216 && head[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((byte,i)=>head[i]===byte)) return 'image/png';
  if (String.fromCharCode(...head.slice(0,4))==='RIFF' && String.fromCharCode(...head.slice(8,12))==='WEBP') return 'image/webp';
  return '';
}

async function menuItems(bucket,prefix,sample) {
  const saved=await all(bucket,prefix);
  if (!sample) return saved.sort((a,b)=>a.created-b.created);
  const combined=new Map(sample.entries);
  for (const item of saved) {
    if (item.deleted) combined.delete(item.id);
    else combined.set(item.id,item);
  }
  return [...combined.values()].sort((a,b)=>a.created-b.created);
}

function menuLogo(slug,uploaded,sample) {
  return uploaded ? '/api/restaurants/'+slug+'/logo' : (sample ? '/the-mohon-logo.webp' : '');
}

const monthValid = value => typeof value==='string' && /^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(value);
const noticeKey = slug => 'registration-notice/'+slug;

function registrationMessage(venue) {
  const contact=venue.registrationContact;
  return [
    'Новая регистрация · MenuCase',
    'Ресторан: '+venue.name,
    'Адрес меню: /r/'+venue.slug,
    ...(contact ? ['Фамилия: '+contact.lastName,'Имя: '+contact.firstName,'Телефон: '+contact.phone] : []),
    'Почта: '+(contact?.email ?? venue.registeredBy)
  ].join('\n');
}

async function registrationBot(request,env) {
  if (request.method!=='POST') return error('Действие не поддерживается.',405);
  const publicKey=env.REGISTRATION_BOT_PUBLIC_KEY?.trim();
  const chatId=env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!publicKey || !chatId) return error('Бот уведомлений ещё не подключён.',503);
  const timestamp=request.headers.get('X-MenuCase-Time') ?? '';
  const signature=request.headers.get('X-MenuCase-Signature') ?? '';
  const length=Number(request.headers.get('Content-Length'));
  if (!/^[0-9]{10}$/.test(timestamp) || Math.abs(Date.now()/1000-Number(timestamp))>60 ||
      !/^[A-Za-z0-9+/]{86}==$/.test(signature) || length<2 || length>8192) return error('Доступ запрещён.',403);
  const raw=await request.text();
  if (encoder.encode(raw).length!==length) return error('Некорректный запрос.');
  const decode=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',decode(publicKey),'Ed25519',false,['verify']);
  const valid=await crypto.subtle.verify('Ed25519',key,decode(signature),
    encoder.encode('MenuCase registration v1\n'+timestamp+'\n'+raw));
  if (!valid) return error('Доступ запрещён.',403);
  const body=JSON.parse(raw);
  const bucket=env.BUCKET;

  if (body.action==='ack') {
    if (!slugValid(body.slug ?? '') || !['sent','failed'].includes(body.status)) return error('Некорректный запрос.');
    const id=noticeKey(body.slug);
    const stored=await bucket.get(id);
    const state=stored && await stored.json();
    if (!state?.lease || state.lease!==body.lease) return error('Заявка уже обработана.',409);
    if (state.status===body.status) return json({status:state.status});
    if (state.status!=='sending') return error('Заявка уже обработана.',409);
    const result=await bucket.put(id,JSON.stringify({
      status:body.status,lease:body.lease,until:Date.now()+60000
    }),{onlyIf:{etagMatches:stored.etag}});
    return result ? json({status:body.status}) : error('Заявка уже обработана.',409);
  }

  if (body.action!=='poll' || (body.cursor!=null && typeof body.cursor!=='string')) return error('Некорректный запрос.');
  const page=await bucket.list({prefix:'restaurant/',limit:16,cursor:body.cursor ?? undefined});
  for (const {key:recordKey} of page.objects) {
    const venue=await read(bucket,recordKey);
    if (!venue?.registeredBy) continue;
    const id=noticeKey(venue.slug);
    const stored=await bucket.get(id);
    const state=stored && await stored.json();
    if (state?.status==='sent' || state?.until>Date.now()) continue;
    const lease=random();
    const onlyIf=stored ? {etagMatches:stored.etag} : {etagDoesNotMatch:'*'};
    const claimed=await bucket.put(id,JSON.stringify({status:'sending',lease,until:Date.now()+120000}),{onlyIf});
    if (claimed) return json({notice:{slug:venue.slug,lease,chatId,text:registrationMessage(venue)},cursor:body.cursor ?? null});
  }
  return json({notice:null,cursor:page.truncated ? page.cursor : null});
}

async function billing(request,bucket,slug,month) {
  if (!monthValid(month)) return error('Укажите месяц.',400);
  const key='billing/'+slug+'/'+month;
  const stored=await bucket.get(key);
  if (request.method==='GET') return json({days:stored ? await stored.json() : [],revision:stored?.etag ?? null});
  if (request.method!=='PUT') return error('Действие не поддерживается.',405);
  const {days,revision}=await request.json();
  const [year,monthNumber]=month.split('-').map(Number);
  const count=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  if (!Array.isArray(days) || days.length>count || days.some(day=>!Number.isInteger(day) || day<1 || day>count)) return error('Проверьте отмеченные дни.');
  if (revision!==(stored?.etag ?? null)) return error('Календарь уже изменился. Откройте его заново.',409);
  const paid=[...new Set(days)].sort((a,b)=>a-b);
  const onlyIf=stored ? {etagMatches:stored.etag} : {etagDoesNotMatch:'*'};
  const result=await bucket.put(key,JSON.stringify(paid),{onlyIf});
  return result ? json({days:paid,revision:result.etag}) : error('Календарь уже изменился. Откройте его заново.',409);
}

async function api(request, url, env, sample) {
  const bucket = env.BUCKET;
  const parts = url.pathname.split('/').slice(2);
  const [route, slug, action, id] = parts;
  const method = request.method;
  if (url.pathname==='/api/registration-bot') return registrationBot(request,env);
  const isSample=slug===sample.slug;
  const venueSample=isSample ? sample : null;
  const validVenue=isSample || slugValid(slug ?? '');
  const prefix='item/'+slug+'/';
  if (method !== 'GET' && request.headers.get('Origin') !== url.origin) return error('Запрос отклонён.',403);
  if (route === 'restaurants' && method === 'GET' && validVenue) {
    const restaurant = venueSample ?? await read(bucket,'restaurant/'+slug);
    if (!restaurant || restaurant.enabled===false) return error('Меню ресторана временно недоступно.',404);
    if (action === 'logo') {
      const object = await bucket.get('logo/'+slug);
      return object ? new Response(object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}}) : error('Логотип не найден.',404);
    }
    if (action === 'photo' && idValid(id ?? '')) {
      const object = await bucket.get('photo/'+slug+'/'+id);
      return object ? new Response(object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}}) : error('Фото не найдено.',404);
    }
    const items = await menuItems(bucket,prefix,venueSample);
    const logo = await (bucket.head ? bucket.head('logo/'+slug) : bucket.get('logo/'+slug));
    return json({restaurant:{name:restaurant.name,slug,logo:menuLogo(slug,logo,venueSample)},items});
  }
  const token = cookieValue(request,'menu_session');
  const session = token && /^[a-f0-9]{64}$/.test(token) && await read(bucket,await sessionKey(token));
  const email = session?.expires > Date.now() ? gmail(session.email) : '';
  const owner=Boolean(email && session.address===ownerAddress(env));
  if (route === 'logout' && method === 'POST') {
    if (session) await bucket.delete(await sessionKey(token));
    return new Response('{}',{headers:{'Set-Cookie':cookie(url,'menu_session','',0),'Content-Type':'application/json'}});
  }
  if (route === 'me' && method === 'GET') {
    const signed = Boolean(email);
    const restaurants = signed ? (await all(bucket,'restaurant/')).filter(r=>owner || r.admins.includes(email)) : [];
    if (owner) restaurants.unshift({name:sample.name,slug:sample.slug,sample:true});
    return json({email,verifiedEmail:email ? (session.address || email) : '',owner,configured:googleConfigured(env),restaurants:restaurants.map(r=>owner?r:{name:r.name,slug:r.slug,enabled:r.enabled!==false})});
  }
  if (!email) return error('Войдите с адресом @gmail.com.',401);
  if (route==='register' && method==='POST') {
    const body=await request.json();
    const name=String(body.name ?? '').trim();
    const slug=String(body.slug ?? '').trim().toLowerCase();
    if (!name || name.length>100) return error('Укажите название до 100 символов.');
    if (!slugValid(slug)) return error('Адрес должен содержать строчные латинские буквы, цифры и дефисы.');
    const firstName=typeof body.firstName==='string' ? body.firstName.trim() : '';
    const lastName=typeof body.lastName==='string' ? body.lastName.trim() : '';
    const validName=value=>value.length<=60 && /\p{L}/u.test(value) && !/[\p{Cc}\p{Cf}]/u.test(value);
    if (!validName(firstName) || !validName(lastName)) return error('Укажите имя и фамилию до 60 символов.');
    const phone=typeof body.phone==='string' ? body.phone.trim() : '';
    if (!/^\+998[0-9]{9}$/.test(phone)) return error('Укажите 9 цифр номера после +998.');
    const registrationContact={firstName,lastName,phone,email:session.address || email};
    const venue={name,slug,admins:[email],enabled:false,registeredBy:email,registrationContact};
    const created=await bucket.put('restaurant/'+slug,JSON.stringify(venue),{onlyIf:{etagDoesNotMatch:'*'}});
    if (!created) return error('Этот адрес уже занят.',409);
    return json({restaurant:{name,slug,enabled:false}},201);
  }
  if (route==='billing' && validVenue) {
    if (!owner && method!=='GET') return error('Отмечать оплату может только системный администратор.',403);
    const venue=venueSample ?? await read(bucket,'restaurant/'+slug);
    if (!owner && (isSample || !venue?.admins.includes(email))) return error('Нет доступа к этому ресторану.',403);
    if (!venue) return error('Ресторан не найден.',404);
    return billing(request,bucket,slug,action);
  }
  if (route === 'admin' && method === 'POST') {
    if (!owner) return error('Требуется доступ владельца платформы.',403);
    const body = await request.json();
    const key = 'restaurant/'+body.slug;
    if (!slugValid(body.slug ?? '')) return error('Адрес ресторана должен содержать латинские буквы, цифры и дефисы.');
    if (body.action==='status' || body.action==='notify') {
      const current=await bucket.get(key);
      if (!current) return error('Ресторан не найден.',404);
      const venue=await current.json();
      if (body.action==='notify') {
        if (!venue.registeredBy) return error('Этот ресторан создан вручную.',400);
        const notice=await bucket.get(noticeKey(venue.slug));
        const state=notice && await notice.json();
        if (state?.status==='sent') return json({status:'sent'});
        if (state?.status==='sending' && state.until>Date.now()) return json({status:'sending'});
        if (state) {
          const updated=await bucket.put(noticeKey(venue.slug),JSON.stringify({status:'pending'}),
            {onlyIf:{etagMatches:notice.etag}});
          if (!updated) return error('Статус уведомления изменился. Проверьте его ещё раз.',409);
        }
        return json({status:env.REGISTRATION_BOT_PUBLIC_KEY ? 'queued' : 'pending'});
      }
      if (typeof body.enabled!=='boolean') return error('Укажите состояние ресторана.');
      const updated=await bucket.put(key,JSON.stringify({...venue,enabled:body.enabled}),{onlyIf:{etagMatches:current.etag}});
      return updated ? json({enabled:body.enabled}) : error('Состояние изменилось. Обновите страницу.',409);
    }
    const admin = gmail(body.email);
    if (!admin) return error('Укажите адрес @gmail.com.');
    if (body.action === 'create') {
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 100) return error('Укажите название до 100 символов.');
      const created = await bucket.put(key,JSON.stringify({name,slug:body.slug,admins:[admin]}),{onlyIf:{etagDoesNotMatch:'*'}});
      return created ? json({ok:true},201) : error('Этот адрес уже занят.',409);
    }
    if (!['grant','revoke'].includes(body.action)) return error('Неизвестное действие.');
    const current = await bucket.get(key);
    if (!current) return error('Ресторан не найден.',404);
    const record = await current.json();
    record.admins = body.action === 'grant' ? [...new Set([...record.admins,admin])] : record.admins.filter(entry=>entry!==admin);
    const updated = await bucket.put(key,JSON.stringify(record),{onlyIf:{etagMatches:current.etag}});
    return updated ? json({ok:true}) : error('Доступы уже изменились. Повторите действие.',409);
  }
  if (route !== 'manage' || !validVenue) return error('Страница не найдена.',404);
  const venue = venueSample ?? await read(bucket,'restaurant/'+slug);
  if (!venue || (!owner && (isSample || !venue.admins.includes(email)))) return error('Нет доступа к этому ресторану.',403);
  if (method==='GET' && (action==='logo' || action==='photo' && idValid(id ?? ''))) {
    const asset=await bucket.get(action==='logo' ? 'logo/'+slug : 'photo/'+slug+'/'+id);
    return asset ? new Response(asset.body,{headers:{'Content-Type':asset.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}) : error('Изображение не найдено.',404);
  }
  if (method === 'POST' && action === 'logo') {
    const maxSize = 2097152;
    if (Number(request.headers.get('Content-Length')) > maxSize+4096) return error('Логотип должен весить до 2 МБ.',413);
    const file = (await request.formData()).get('logo');
    if (!(file instanceof File) || !file.size) return error('Выберите файл логотипа.');
    if (file.size > maxSize) return error('Логотип должен весить до 2 МБ.',413);
    const type = await photoInfo(file);
    if (!type) return error('Загрузите логотип в JPG, PNG или WebP.');
    await bucket.put('logo/'+slug,file.stream(),{httpMetadata:{contentType:type}});
    return json({logo:'/api/restaurants/'+slug+'/logo'});
  }
  if (method === 'DELETE' && action === 'logo') {
    await bucket.delete('logo/'+slug);
    return json({ok:true});
  }
  if (method === 'GET') {
    if (action==='appearance') {
      const logo=await (bucket.head ? bucket.head('logo/'+slug) : bucket.get('logo/'+slug));
      return json({restaurant:{logo:menuLogo(slug,logo,venueSample)}});
    }
    return json({items:await menuItems(bucket,prefix,venueSample)});
  }
  const existingId=idValid(action ?? '') || (isSample && sample.entries.has(action));
  if (method === 'POST' && (action === 'new' || existingId)) {
    if (Number(request.headers.get('Content-Length')) > 4400000) return error('Фото должно весить до 4 МБ.',413);
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const category = form.get('category');
    const section = isSample && category==='food' ? form.get('section') : '';
    if (isSample && category==='food' && !sample.sections.has(section)) return error('Выберите подкатегорию блюда.');
    const price = String(form.get('price') ?? '').trim();
    const markers = JSON.parse(String(form.get('markers') ?? '[]'));
    if (!Array.isArray(markers) || markers.length > 12 || markers.some(marker =>
      !marker || typeof marker.name !== 'string' || !marker.name.trim() || marker.name.length > 60 ||
      !Number.isFinite(marker.x) || marker.x < 0 || marker.x > 100 ||
      !Number.isFinite(marker.y) || marker.y < 0 || marker.y > 100
    )) return error('Проверьте названия и расположение ингредиентов.');
    if (!name || name.length > 100 || description.length > 500 || !['food','drinks','alcohol'].includes(category) || !price || price.length > 32) return error('Проверьте поля меню.');
    const itemId = action === 'new' ? crypto.randomUUID() : action;
    const key=prefix+itemId;
    const stored=action==='new' ? null : await bucket.get(key);
    const previous=stored ? await stored.json() : venueSample?.entries.get(itemId);
    if (action !== 'new' && (!previous || previous.deleted)) return error('Позиция не найдена.',404);
    const nutrition={...previous?.nutrition};
    for (const [nutrient,limit] of Object.entries({calories:1000,protein:100,fat:100,carbs:100})) {
      const raw=form.get('nutrition-'+nutrient);
      if (raw===null) continue;
      if (typeof raw!=='string') return error('Проверьте значения КБЖУ на 100 г.');
      const value=raw.trim();
      if (!value) {
        delete nutrition[nutrient];
        continue;
      }
      const amount=Number(value.replace(',','.'));
      if (!/^[0-9]{1,4}([.,][0-9]{1,2})?$/.test(value) || amount>limit) {
        return error('Укажите на 100 г от 0 до 1000 ккал и от 0 до 100 г для белков, жиров и углеводов.');
      }
      nutrition[nutrient]=amount;
    }
    const file = form.get('photo');
    let photoId = previous?.photoId ?? '';
    if (file instanceof File && file.size) {
      if (file.size > 4194304) return error('Фото должно весить до 4 МБ.',413);
      const type = await photoInfo(file);
      if (!type) return error('Загрузите фото в JPG, PNG или WebP.');
      photoId = crypto.randomUUID();
      await bucket.put('photo/'+slug+'/'+photoId,file.stream(),{httpMetadata:{contentType:type}});
    }
    const item = {id:itemId,name,description,category,price,markers,photoId,created:previous?.created ?? Date.now(),photo:photoId ? '/api/restaurants/'+slug+'/photo/'+photoId : (previous?.photo ?? '')};
    if (Object.keys(nutrition).length) item.nutrition=nutrition;
    if (isSample) {
      item.section=section;
      item.illustration=Boolean(!photoId && previous?.illustration);
    }
    try {
      const options=isSample ? {onlyIf:stored ? {etagMatches:stored.etag} : {etagDoesNotMatch:'*'}} : undefined;
      const result=await bucket.put(key,JSON.stringify(item),options);
      if (!result && isSample) {
        if (photoId && photoId !== previous?.photoId) await bucket.delete('photo/'+slug+'/'+photoId);
        return error('Позиция уже изменилась. Обновите страницу и повторите действие.',409);
      }
    } catch (issue) {
      if (photoId && photoId !== previous?.photoId) await bucket.delete('photo/'+slug+'/'+photoId);
      throw issue;
    }
    if (previous?.photoId && previous.photoId !== photoId) await bucket.delete('photo/'+slug+'/'+previous.photoId);
    return json({item},201);
  }
  if (method === 'DELETE' && existingId) {
    const key=prefix+action;
    const stored=await bucket.get(key);
    const item=stored ? await stored.json() : venueSample?.entries.get(action);
    if (isSample) {
      if (!item || item.deleted) return json({ok:true});
      const onlyIf=stored ? {etagMatches:stored.etag} : {etagDoesNotMatch:'*'};
      const result=await bucket.put(key,JSON.stringify({id:action,deleted:true}),{onlyIf});
      if (!result) return error('Позиция уже изменилась. Обновите страницу и повторите действие.',409);
    } else await bucket.delete(key);
    if (item?.photoId) await bucket.delete('photo/'+slug+'/'+item.photoId);
    return json({ok:true});
  }
  return error('Действие не поддерживается.',405);
}

export function app(assets,menu) {
  const sample={
    slug:menu.slug,
    name:menu.name,
    sections:new Set(menu.sections.map(section=>section.id)),
    entries:new Map(menu.items.map((item,created)=>[item.id,{...item,created}]))
  };
  return {async fetch(request,env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request,url,env,sample);
      if (request.method === 'GET' && ['/auth/google','/auth/google/callback'].includes(url.pathname)) return await google(request,url,env);
      const menuPage = /^\/r\/[a-z0-9-]+(?:\/dish\/[a-f0-9-]+)?\/?$|^\/dish\/[a-z0-9-]+\/?$/;
      const key = ['/', '/admin', '/admin/'].includes(url.pathname) || menuPage.test(url.pathname) ? '/index.html' : url.pathname;
      if (!Object.hasOwn(assets,key)) return new Response('Страница не найдена.',{status:404});
      const asset = assets[key];
      const body = asset.base64 ? Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0)) : asset.body;
      return new Response(body,{headers:{
        'Content-Type':asset.type,
        'Cache-Control':key === '/index.html' ? 'no-store' : 'no-cache',
        'X-Content-Type-Options':'nosniff',
        'Referrer-Policy':'same-origin'
      }});
    } catch (issue) {
      if (issue instanceof SyntaxError) return error('Некорректный запрос.');
      console.error(issue.name);
      return error('Ошибка сервера. Повторите попытку.',500);
    }
  }};
}
