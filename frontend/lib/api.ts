const API=(process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000').replace(/\/$/,'');

type Scope='gov'|'citizen'|'field';
export function getScope():Scope{
  if(typeof window==='undefined') return 'gov';
  const p=window.location.pathname;
  if(p.startsWith('/app')) return 'citizen';
  if(p.startsWith('/field')) return 'field';
  return 'gov';
}
export function getToken(scope:Scope=getScope()){
  if(typeof window==='undefined')return '';
  return localStorage.getItem(`patkai_${scope}_token`)||localStorage.getItem('patkai_token')||'';
}
export function getUser(scope:Scope=getScope()):any|null{
  if(typeof window==='undefined')return null;
  try{return JSON.parse(localStorage.getItem(`patkai_${scope}_user`)||'null')}catch{return null}
}
export function saveSession(scope:Scope,data:any){
  localStorage.setItem(`patkai_${scope}_token`,data.access_token);
  localStorage.setItem(`patkai_${scope}_user`,JSON.stringify(data.user));
}
export function clearSession(scope:Scope=getScope()){
  localStorage.removeItem(`patkai_${scope}_token`);
  localStorage.removeItem(`patkai_${scope}_user`);
  if(scope==='gov'||scope==='citizen'||scope==='field'){
    // Remove the legacy shared session only when it belongs to this scope.
    localStorage.removeItem('patkai_token');
    localStorage.removeItem('patkai_user');
  }
}
export async function api(path:string,opts:RequestInit={},scope:Scope=getScope()){
  const headers=new Headers(opts.headers);
  if(!(opts.body instanceof FormData)) headers.set('Content-Type','application/json');
  const t=getToken(scope); if(t)headers.set('Authorization',`Bearer ${t}`);
  const r=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});
  if(!r.ok){
    let message='Request failed'; try{const j=await r.json();message=j.detail||JSON.stringify(j)}catch{message=await r.text()}
    throw new Error(message||`HTTP ${r.status}`)
  }
  return r.json()
}
export async function login(email:string,password:string){
  const r=await fetch(`${API}/api/v1/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  if(!r.ok){let message='Invalid credentials';try{const j=await r.json();message=j.detail||message}catch{}throw new Error(message)}
  return r.json()
}
export {API};
