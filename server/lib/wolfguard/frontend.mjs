const headers = {
  'Cache-Control':'no-store, max-age=0',
  'Pragma':'no-cache',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet',
};
const missing = () => new Response(null,{status:404,headers:{...headers,'Content-Length':'0'}});
const assets = /^\/(?:browser|css|data|images|js|vendor)\//;

// Return null only for existing API/static-asset handling. Entry authorization
// is performed before sending any HTML, not by a script inside a 200 response.
export async function handleFrontend(request,env,html) {
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/') || assets.test(url.pathname) || ['/favicon.svg','/robots.txt'].includes(url.pathname))return null;
  if(!['GET','HEAD'].includes(request.method))return missing();
  if(/^\/downloads\/WolfGuard-Agent-Windows\.(?:exe|zip)$/.test(url.pathname)) {
    return new Response(null,{status:302,headers:{...headers,Location:'https://wolfguard.wavetools.fr'+url.pathname}});
  }
  if(url.pathname!=='/' || !/^\?access=[a-f0-9]{64}$/.test(url.search) || !/^[a-f0-9]{64}$/.test(env.ENTRY_LINK_HASH||''))return missing();
  const key=url.search.slice('?access='.length);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  let difference=0;
  for(let i=0;i<64;i++)difference|=hash.charCodeAt(i)^env.ENTRY_LINK_HASH.charCodeAt(i);
  if(difference)return missing();
  const policy=/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(html)?.[1];
  return new Response(request.method==='HEAD'?null:html,{status:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8',...(policy?{'Content-Security-Policy':policy+"; frame-ancestors 'none'"}:{})}});
}
