import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {mkdir,readFile,readdir,rename,rm,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import './build.mjs';

const {default:worker} = await import('./dist/server/index.js');
const directory=fileURLToPath(new URL('./.menu-data/',import.meta.url));
await mkdir(directory,{recursive:true});
const path=key=>join(directory,Buffer.from(key).toString('hex')+'.json');
const operations=new Map();

const bucket={
  async get(key) {
    try {
      const {content,type,etag}=JSON.parse(await readFile(path(key),'utf8'));
      const bytes=Buffer.from(content,'base64');
      return {body:bytes,httpMetadata:{contentType:type},etag,json:async()=>JSON.parse(bytes.toString('utf8'))};
    } catch (error) {
      if (error.code!=='ENOENT') throw error;
      return null;
    }
  },
  async put(key,value,{httpMetadata,onlyIf}={}) {
    const bytes=Buffer.from(await new Response(value).arrayBuffer());
    const previous=operations.get(key) ?? Promise.resolve();
    const operation=previous.catch(()=>{}).then(async()=>{
      const current=onlyIf && await this.get(key);
      if ((onlyIf?.etagDoesNotMatch==='*' && current) || (onlyIf?.etagMatches && current?.etag!==onlyIf.etagMatches)) return null;
      const etag=createHash('sha256').update(bytes).digest('hex');
      const temporary=path(key)+'.'+randomUUID();
      await writeFile(temporary,JSON.stringify({content:bytes.toString('base64'),type:httpMetadata?.contentType,etag}));
      await rename(temporary,path(key));
      return {etag};
    });
    operations.set(key,operation);
    try {return await operation;}
    finally {if (operations.get(key)===operation) operations.delete(key);}
  },
  async delete(key) {await rm(path(key),{force:true});},
  async list({prefix}) {
    const keys=(await readdir(directory)).filter(file=>/^[a-f0-9]+\.json$/.test(file))
      .map(file=>Buffer.from(file.slice(0,-5),'hex').toString('utf8'));
    return {objects:keys.filter(key=>key.startsWith(prefix)).map(key=>({key}))};
  }
};

const port=Number(process.env.MENU_PORT ?? 4173);
const origin='http://127.0.0.1:'+port;
createServer(async (incoming,outgoing)=>{
  try {
    const url=new URL(incoming.url,origin);
    if (url.origin!==origin) {outgoing.writeHead(400).end();return;}
    const init={method:incoming.method,headers:incoming.headers};
    if (!['GET','HEAD'].includes(incoming.method)) {
      init.body=Readable.toWeb(incoming);
      init.duplex='half';
    }
    const response=await worker.fetch(new Request(url,init),{...process.env,BUCKET:bucket});
    const headers=Object.fromEntries(response.headers);
    const cookies=response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie']=cookies;
    outgoing.writeHead(response.status,headers);
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    outgoing.writeHead(500).end();
  }
}).listen(port,'127.0.0.1',()=>console.log('На столе · '+origin));
