const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000';
export function getToken(){if(typeof window==='undefined')return '';return localStorage.getItem('patkai_token')||''}
export async function api(path:string,opts:RequestInit={}){const headers=new Headers(opts.headers);headers.set('Content-Type','application/json');const t=getToken();if(t)headers.set('Authorization',`Bearer ${t}`);const r=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function login(email:string,password:string){const r=await fetch(`${API}/api/v1/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)throw new Error('Invalid credentials');return r.json()}
