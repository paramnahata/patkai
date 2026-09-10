'use client';
import Link from 'next/link';import {useEffect,useState} from 'react';import OfflineBanner from './OfflineBanner';import {login} from '../lib/api';
export default function MobileShell({children,title='PATKAI Safety'}:{children:React.ReactNode,title?:string}){
 const [ready,setReady]=useState(false),[online,setOnline]=useState(true);
 useEffect(()=>{setOnline(navigator.onLine);const on=()=>setOnline(navigator.onLine);addEventListener('online',on);addEventListener('offline',on);return()=>{removeEventListener('online',on);removeEventListener('offline',on)}},[]);
 useEffect(()=>{(async()=>{if(localStorage.getItem('patkai_token')){setReady(true);return}try{const x=await login('citizen@patkai.demo','Patkai@2026');localStorage.setItem('patkai_token',x.access_token);localStorage.setItem('patkai_user',JSON.stringify(x.user))}catch{}setReady(true)})()},[]);
 return <div className="safety"><OfflineBanner/><header className="mobile-header"><div><b>PATKAI</b><div className="muted">Citizen safety & hazard reporting</div></div><span className="status">{online?'Demo environment':'OFFLINE'}</span></header><h1 className="title">{title}</h1>{ready?children:<div className="card loading-card">Preparing secure citizen session…</div>}<nav className="mobile-nav"><Link href="/app">Home</Link><Link href="/app/map">Map</Link><Link href="/app/report">Report</Link><Link href="/app/shelters">Shelters</Link><Link href="/app/settings">Settings</Link></nav></div>
}
