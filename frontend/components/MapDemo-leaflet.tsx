'use client';
import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {api,getToken} from '../lib/api';

type Props={mode?:'gov'|'citizen'};
const riskColors:any={SAFE:'#2e7d32',LOW:'#2e7d32',MODERATE:'#d69e00',HIGH:'#d97706',CRITICAL:'#b42318'};
const roadColors:any={OPEN:'#16803c',AT_RISK:'#d69e00',RESTRICTED:'#ea580c',BLOCKED:'#b42318'};
const placeColors:any={SHELTER:'#1769aa',HOSPITAL:'#7c3aed',POLICE:'#334155',FIRE:'#dc2626'};
const placeLabels:any={SHELTER:'Shelter',HOSPITAL:'Hospital',POLICE:'Police',FIRE:'Fire',RELIEF:'Relief'};

// Keyless demo data keeps the operational map useful even when the backend session
// or an external map provider is unavailable. These are explicitly synthetic values.
const DEMO_ZONES:any[]=[
 {id:'z1',name:'Sohra Escarpment',state:'Meghalaya',district:'East Khasi Hills',lat:25.27,lon:91.73,risk_score:82,risk_level:'CRITICAL',confidence:.91,trend:'RAPIDLY INCREASING',population_exposure:8200},
 {id:'z2',name:'Mawsynram Ridge',state:'Meghalaya',district:'East Khasi Hills',lat:25.30,lon:91.58,risk_score:68,risk_level:'HIGH',confidence:.86,trend:'INCREASING',population_exposure:5100},
 {id:'z3',name:'Aizawl South Slope',state:'Mizoram',district:'Aizawl',lat:23.70,lon:92.72,risk_score:76,risk_level:'HIGH',confidence:.88,trend:'INCREASING',population_exposure:6400},
 {id:'z4',name:'Gangtok East Slope',state:'Sikkim',district:'Gangtok',lat:27.33,lon:88.62,risk_score:63,risk_level:'HIGH',confidence:.83,trend:'STABLE',population_exposure:3900},
 {id:'z5',name:'Tawang Approach',state:'Arunachal Pradesh',district:'Tawang',lat:27.59,lon:91.87,risk_score:71,risk_level:'HIGH',confidence:.85,trend:'INCREASING',population_exposure:2800}
];
const DEMO_ROADS:any[]=[
 {id:'r1',name:'Shillong–Sohra Corridor',route_number:'NH-206',district:'East Khasi Hills',status:'AT_RISK',risk:72,lat:25.30,lon:91.70,impact:'High traffic corridor'},
 {id:'r2',name:'Mawsynram Access Road',route_number:'SH-5',district:'East Khasi Hills',status:'BLOCKED',risk:91,lat:25.28,lon:91.60,impact:'Slope debris reported'},
 {id:'r3',name:'Aizawl–Lunglei Road',route_number:'NH-306',district:'Aizawl',status:'RESTRICTED',risk:78,lat:23.73,lon:92.70,impact:'Single-lane movement'},
 {id:'r4',name:'Tawang–Bomdila Corridor',route_number:'NH-13',district:'Tawang',status:'OPEN',risk:42,lat:27.45,lon:91.78,impact:'Monitor rainfall'}
];
const DEMO_PLACES:any[]=[
 {id:'p1',kind:'SHELTER',name:'Sohra Community Shelter',district:'East Khasi Hills',lat:25.255,lon:91.735,capacity:500,status:'OPEN'},
 {id:'p2',kind:'HOSPITAL',name:'District Emergency Hospital',district:'East Khasi Hills',lat:25.285,lon:91.72,status:'READY'},
 {id:'p3',kind:'POLICE',name:'Sohra Police Response Point',district:'East Khasi Hills',lat:25.265,lon:91.715,status:'READY'},
 {id:'p4',kind:'RELIEF',name:'Mawsynram Relief Centre',district:'East Khasi Hills',lat:25.31,lon:91.59,status:'OPEN'},
 {id:'p5',kind:'SHELTER',name:'Aizawl Relief Shelter',district:'Aizawl',lat:23.715,lon:92.735,capacity:350,status:'OPEN'}
];

export default function MapDemo({mode='gov'}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const map=useRef<L.Map|null>(null);
 // One persistent layer group per overlay category, so toggling and data refresh
 // just means "clear this group and re-add", instead of juggling GeoJSON sources.
 const groups=useRef<{risk:L.LayerGroup;roads:L.LayerGroup;places:L.LayerGroup;reports:L.LayerGroup}|null>(null);

 const [zones,setZones]=useState<any[]>(DEMO_ZONES),[roads,setRoads]=useState<any[]>(DEMO_ROADS),[places,setPlaces]=useState<any[]>(DEMO_PLACES),[reports,setReports]=useState<any[]>([]);
 const [selected,setSelected]=useState<any>();
 const [layers,setLayers]=useState({risk:true,roads:true,places:true,reports:true});
 const [mapError,setMapError]=useState('');

 const load=async()=>{
  const token=getToken(mode==='gov'?'gov':'citizen');
  if(!token) return;
  try{
   const [z,r,p,rep]=await Promise.all([api('/api/v1/zones'),api('/api/v1/roads'),api('/api/v1/places'),api('/api/v1/reports')]);
   if(Array.isArray(z)&&z.length)setZones(z);
   if(Array.isArray(r)&&r.length)setRoads(r);
   if(Array.isArray(p)&&p.length)setPlaces(p);
   if(Array.isArray(rep))setReports(rep.filter((x:any)=>x.lat!=null&&x.lon!=null));
  }catch{/* Keep the keyless synthetic map visible when the API session is unavailable. */}
 };
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[mode]);

 // Create the map once. Leaflet renders tiles as plain <img> tags and vectors as
 // SVG — no WebGL involved anywhere, so this can't be affected by Brave Shields,
 // disabled hardware acceleration, or any of the other WebGL-specific dead ends.
 useEffect(()=>{
  if(!ref.current||map.current)return;
  let m:L.Map;
  try{
   m=L.map(ref.current,{zoomControl:true,attributionControl:true}).setView([25.8,91.8],5.6);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(m);
  }catch(err:any){
   setMapError('Map failed to initialize: '+(err?.message||'unknown error'));
   return;
  }
  map.current=m;
  groups.current={risk:L.layerGroup().addTo(m),roads:L.layerGroup().addTo(m),places:L.layerGroup().addTo(m),reports:L.layerGroup().addTo(m)};
  m.fitBounds([[21.8,88.0],[29.8,97.5]],{padding:[35,35]});
  return()=>{m.remove();map.current=null;groups.current=null};
 },[]);

 // Redraw the risk-zone layer whenever the data changes.
 useEffect(()=>{
  const g=groups.current?.risk;if(!g)return;
  g.clearLayers();
  zones.forEach((z:any)=>{
   const color=riskColors[z.risk_level]||riskColors.SAFE;
   L.circle([z.lat,z.lon],{radius:9000+z.risk_score*220,color,fillColor:color,fillOpacity:.16,weight:1,opacity:.35}).addTo(g);
   L.circleMarker([z.lat,z.lon],{radius:6+z.risk_score/12,color:'#fff',weight:2,fillColor:color,fillOpacity:1})
    .on('click',()=>setSelected(z)).addTo(g);
  });
 },[zones]);

 // Redraw roads.
 useEffect(()=>{
  const g=groups.current?.roads;if(!g)return;
  g.clearLayers();
  roads.forEach((r:any)=>{
   const color=roadColors[r.status]||roadColors.OPEN;
   L.polyline([[r.lat-.018,r.lon-.035],[r.lat,r.lon],[r.lat+.018,r.lon+.035]],{color,weight:5,opacity:.9})
    .on('click',()=>setSelected(r)).addTo(g);
  });
 },[roads]);

 // Redraw shelters/services.
 useEffect(()=>{
  const g=groups.current?.places;if(!g)return;
  g.clearLayers();
  places.forEach((p:any)=>{
   const color=placeColors[p.kind]||'#64748b';
   L.circleMarker([p.lat,p.lon],{radius:6,color:'#fff',weight:2,fillColor:color,fillOpacity:1})
    .on('click',()=>setSelected(p)).addTo(g);
  });
 },[places]);

 // Redraw citizen/field reports.
 useEffect(()=>{
  const g=groups.current?.reports;if(!g)return;
  g.clearLayers();
  reports.forEach((r:any)=>{
   const color=r.verification_status==='VERIFIED'?'#15803d':r.verification_status==='SUSPICIOUS'?'#b42318':'#d97706';
   L.circleMarker([r.lat,r.lon],{radius:7,color:'#fff',weight:2,fillColor:color,fillOpacity:1})
    .on('click',()=>setSelected(r)).addTo(g);
  });
 },[reports]);

 // Show/hide overlay groups from the toggle buttons.
 useEffect(()=>{
  const m=map.current,g=groups.current;if(!m||!g)return;
  (Object.keys(g) as (keyof typeof g)[]).forEach(k=>{
   const has=m.hasLayer(g[k]);
   if(layers[k]&&!has)g[k].addTo(m);
   if(!layers[k]&&has)m.removeLayer(g[k]);
  });
 },[layers]);

 const fly=(lat:number,lon:number)=>map.current?.flyTo([lat,lon],11,{duration:.7});

 return <div className="map-wrap"><div ref={ref} className="map-canvas"/>{mapError&&<div className="map-error">{mapError}</div>}
  <div className="map-panel map-panel-left"><b>{mode==='citizen'?'Nearby hazard map':'Operational GIS map'}</b><div className="muted">Keyless OpenStreetMap basemap · PATKAI overlays refresh every 15s</div><div className="map-controls">{Object.entries(layers).map(([k,v])=><button key={k} className={`map-toggle ${v?'selected':''}`} onClick={()=>setLayers(x=>({...x,[k]:!v}))}>{k==='risk'?'Risk zones':k==='roads'?'Road status':k==='places'?'Shelters & services':'Reports'}</button>)}</div></div>
  <div className="map-legend"><b>Risk</b><span><i style={{background:riskColors.CRITICAL}}/>Critical</span><span><i style={{background:riskColors.HIGH}}/>High</span><span><i style={{background:riskColors.MODERATE}}/>Moderate</span><span><i style={{background:riskColors.LOW}}/>Low</span><br/><b>Roads</b><span>green open</span><span>orange risk</span><span>red blocked</span></div>
  {selected&&<div className="map-popup"><button className="popup-close" onClick={()=>setSelected(undefined)}>×</button>{selected.risk_score!==undefined?<><b>{selected.name}</b><div className="muted">{selected.district}, {selected.state}</div><div className="popup-risk">{selected.risk_score}<small>/100</small></div><span className={`badge badge-${String(selected.risk_level).toLowerCase()}`}>{selected.risk_level}</span><p>Confidence {Math.round(Number(selected.confidence)*100)}% · {selected.trend}</p><p>Population exposure: <b>{Number(selected.population_exposure||0).toLocaleString()}</b></p></>:selected.route_number?<><b>{selected.name}</b><p>{selected.route_number} · {selected.district}</p><span className="badge">{selected.status}</span><p>Risk {selected.risk}/100 · {selected.impact}</p></>:selected.kind?<><b>{selected.name}</b><p>{placeLabels[selected.kind]||selected.kind} · {selected.district}</p><p>Status: <b>{selected.status}</b></p>{selected.capacity&&<p>Capacity: {selected.capacity}</p>}<button className="btn btn-primary" onClick={()=>fly(Number(selected.lat),Number(selected.lon))}>Center map</button></>:<><b>Citizen / field report</b><p>{selected.incident_type} · {selected.severity}</p><p>{selected.description||'No description'}</p><span className="badge">{selected.verification_status}</span></>}</div>}
 </div>
}
