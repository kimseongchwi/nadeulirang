const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const readBrand = () => vm.runInNewContext(fs.readFileSync(path.join(root,'brand.js'),'utf8')+';brandPalette');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
  if(pathname==='/brand.css'){
    const tokens=readBrand();
    res.writeHead(200,{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(':root{'+Object.entries(tokens).map(([key,value])=>'--'+key+':'+value).join(';')+'}');return;
  }
  if(pathname==='/assets/favicon-forest.svg'){
    const tokens=readBrand();const symbol=fs.readFileSync(path.join(root,'assets/icon-people-v3.png')).toString('base64');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="brand" color-interpolation-filters="sRGB"><feFlood flood-color="${tokens.brand}"/><feComposite in2="SourceAlpha" operator="in"/></filter><image href="data:image/png;base64,${symbol}" width="128" height="128" preserveAspectRatio="xMidYMid meet" filter="url(#brand)"/></svg>`;
    res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(svg);return;
  }
  if(pathname==='/guide'||pathname==='/guide/'){res.writeHead(302,{'Location':'/ui-design'}).end();return;}
  if(pathname==='/find'||pathname==='/find/'){res.writeHead(302,{'Location':'/search'+new URL(req.url,'http://localhost').search}).end();return;}
  const routes = /^\/(?:|ui-design|search|detail\/[a-z0-9-]+|policy\/(?:privacy|terms|about))\/?$/;
  const file = path.resolve(root, routes.test(pathname) ? 'index.html' : '.' + pathname);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end('찾을 수 없는 페이지');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(file).pipe(res);
}).listen(8916,'127.0.0.1',()=>console.log('검토 시안: http://127.0.0.1:8916/ui-design'));
