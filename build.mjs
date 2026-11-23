import {mohonSlug,mohonName,mohonSections,mohonItems} from './public/mohon-menu.js';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

const types = {'index.html':'text/html','style.css':'text/css','app.js':'text/javascript','languages.js':'text/javascript','flags.js':'text/javascript','mohon-menu.js':'text/javascript'};
const assets = {};
for (const [file,type] of Object.entries(types)) {
  assets['/'+file] = {type:type+'; charset=utf-8',body:await readFile(new URL('./public/'+file,import.meta.url),'utf8')};
}
for (const file of ['dark-slate.webp','the-mohon-logo.webp','mohon-dolma.webp','mohon-shakarob.webp','mohon-broth.webp','mohon-ayran.webp','mohon-wine-example.webp']) {
  assets['/'+file] = {
    type:'image/webp',
    base64:await readFile(new URL('./public/'+file,import.meta.url),'base64')
  };
}
const digest = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,12);
const revision = '?v='+digest;
assets['/index.html'].body = assets['/index.html'].body.replace(/"(\/(?:app\.js|style\.css))"/g, (_,path) => '"'+path+revision+'"');
assets['/app.js'].body = assets['/app.js'].body.replace(/from '(\.\/[^']+\.js)'/g, (_,path) => "from '"+path+revision+"'");

const source = await readFile(new URL('./server.mjs',import.meta.url),'utf8');
const dist = new URL('./dist/',import.meta.url);
await mkdir(new URL('server/',dist),{recursive:true});
await mkdir(new URL('.openai/',dist),{recursive:true});
await writeFile(new URL('server/index.js',dist),source.replace('export function app','function app')+'\nexport default app('+JSON.stringify(assets)+','+JSON.stringify({slug:mohonSlug,name:mohonName,sections:mohonSections,items:mohonItems})+');\n');
await copyFile(new URL('./.openai/hosting.json',import.meta.url),new URL('.openai/hosting.json',dist));
