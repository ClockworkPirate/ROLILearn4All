import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const files={'/':'index.html','/app.js':'app.js','/midi.js':'midi.js','/piano.js':'piano.js','/lights.js':'lights.js','/buttons.js':'buttons.js','/style.css':'style.css'};
const port=Number(process.env.PORT||8765);
const host=process.env.PORT?'0.0.0.0':'127.0.0.1';
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404).end();return;}try{const body=await readFile(fileURLToPath(new URL(file,import.meta.url)));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.end(body);}catch{res.writeHead(500).end();}}).listen(port,host,()=>console.log(`ROLI Practice listening on ${host}:${port}`));


