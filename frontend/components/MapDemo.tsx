'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {api,getToken} from '../lib/api';

type Props={mode?:'gov'|'citizen'};
const riskColors:any={SAFE:'#2e7d32',LOW:'#2e7d32',MODERATE:'#d69e00',HIGH:'#d97706',CRITICAL:'#b42318'};
const roadColors:any={OPEN:'#16803c',AT_RISK:'#d69e00',RESTRICTED:'#ea580c',BLOCKED:'#b42318'};
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

const OSM_STYLE:any={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-opacity':1}}]};

export default function MapDemo({mode='gov'}:Props){
 const ref=useRef<HTMLDivElement>(null); const map=useRef<maplibregl.Map|null>(null);
 const [zones,setZones]=useState<any[]>(DEMO_ZONES),[roads,setRoads]=useState<any[]>(DEMO_ROADS),[places,setPlaces]=useState<any[]>(DEMO_PLACES),[reports,setReports]=useState<any[]>([]);
 const [selected,setSelected]=useState<any>(); const [layers,setLayers]=useState({risk:true,roads:true,places:true,reports:true});
 const [mapReady,setMapReady]=useState(false),[mapError,setMapError]=useState('');
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
 const roadGeo=useMemo(()=>({type:'FeatureCollection',features:roads.map((r:any)=>({type:'Feature',properties:r,geometry:{type:'LineString',coordinates:[[r.lon-.035,r.lat-.018],[r.lon,r.lat],[r.lon+.035,r.lat+.018]]}}))}),[roads]);
 const zoneGeo=useMemo(()=>({type:'FeatureCollection',features:zones.map((z:any)=>({type:'Feature',properties:z,geometry:{type:'Point',coordinates:[z.lon,z.lat]}}))}),[zones]);
 const placeGeo=useMemo(()=>({type:'FeatureCollection',features:places.map((p:any)=>({type:'Feature',properties:p,geometry:{type:'Point',coordinates:[p.lon,p.lat]}}))}),[places]);
 const reportGeo=useMemo(()=>({type:'FeatureCollection',features:reports.map((r:any)=>({type:'Feature',properties:r,geometry:{type:'Point',coordinates:[r.lon,r.lat]}}))}),[reports]);
 useEffect(()=>{
  if(!ref.current)return;
   if(map.current){
    map.current.remove();
    map.current=null;
   }
   // Always use the keyless OpenStreetMap basemap.
   // MapTiler is intentionally not used so an invalid/restricted API key
   // can never make the dashboard map disappear.
   const m=new maplibregl.Map({
    container:ref.current,
    style:OSM_STYLE,
    center:[91.8,25.8],
    zoom:5.6,
    minZoom:4,
    maxZoom:18,
    attributionControl:false,
   });
  map.current=m;m.addControl(new maplibregl.NavigationControl(),'top-right');m.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');m.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  const onLoad=()=>{setMapReady(true);setMapError('');
     requestAnimationFrame(()=>m.resize());
    m.addSource('risk',{type:'geojson',data:zoneGeo as any});m.addSource('roads',{type:'geojson',data:roadGeo as any});m.addSource('places',{type:'geojson',data:placeGeo as any});m.addSource('reports',{type:'geojson',data:reportGeo as any});
    m.addLayer({id:'road-lines',type:'line',source:'roads',paint:{'line-color':['match',['get','status'],'BLOCKED',roadColors.BLOCKED,'RESTRICTED',roadColors.RESTRICTED,'AT_RISK',roadColors.AT_RISK,roadColors.OPEN],'line-width':5,'line-opacity':.9}} as any);
    m.addLayer({id:'risk-halos',type:'circle',source:'risk',paint:{'circle-radius':['interpolate',['linear'],['get','risk_score'],0,18,50,30,100,46],'circle-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-opacity':0.16,'circle-stroke-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-stroke-opacity':0.35,'circle-stroke-width':1}} as any);
    m.addLayer({id:'risk-points',type:'circle',source:'risk',paint:{'circle-radius':['interpolate',['linear'],['get','risk_score'],0,6,50,9,100,14],'circle-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-stroke-color':'#fff','circle-stroke-width':2}} as any);
    m.addLayer({id:'place-points',type:'circle',source:'places',paint:{'circle-radius':6,'circle-color':['match',['get','kind'],'SHELTER','#1769aa','HOSPITAL','#7c3aed','POLICE','#334155','FIRE','#dc2626','#64748b'],'circle-stroke-color':'#fff','circle-stroke-width':2}} as any);
    m.addLayer({id:'report-points',type:'circle',source:'reports',paint:{'circle-radius':7,'circle-color':['match',['get','verification_status'],'VERIFIED','#15803d','SUSPICIOUS','#b42318','#d97706'],'circle-stroke-color':'#fff','circle-stroke-width':2}} as any);
    const click=(e:any)=>{const f=e.features?.[0];if(f)setSelected(f.properties)};
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('click',id,click));
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('mouseenter',id,()=>{m.getCanvas().style.cursor='pointer'}));
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('mouseleave',id,()=>{m.getCanvas().style.cursor=''}));
    // Show the complete North-East region on first load.
    m.fitBounds([[88.0,21.8],[97.5,29.8]],{padding:35,duration:0});
  };
  m.on('error',(event:any)=>{
   const message=event?.error?.message||'';
   if(message)setMapError('OpenStreetMap tiles are temporarily unavailable. PATKAI demo overlays remain available.');
  });
  m.on('load',onLoad);return()=>{m.remove();map.current=null;setMapReady(false)};
 },[]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;const s:any=m.getSource('risk');if(s)s.setData(zoneGeo as any);const r:any=m.getSource('roads');if(r)r.setData(roadGeo as any);const p:any=m.getSource('places');if(p)p.setData(placeGeo as any);const rp:any=m.getSource('reports');if(rp)rp.setData(reportGeo as any)},[zoneGeo,roadGeo,placeGeo,reportGeo,mapReady]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;[['risk-halos',layers.risk],['risk-points',layers.risk],['road-lines',layers.roads],['place-points',layers.places],['report-points',layers.reports]].forEach(([id,v])=>m.setLayoutProperty(id as string,'visibility',v?'visible':'none'))},[layers,mapReady]);
 const fly=(lat:number,lon:number)=>map.current?.flyTo({center:[lon,lat],zoom:11,duration:700});
 return <div className="map-wrap"><div ref={ref} className="map-canvas"/>{mapError&&<div className="map-error">{mapError}</div>}
  <div className="map-panel map-panel-left"><b>{mode==='citizen'?'Nearby hazard map':'Operational GIS map'}</b><div className="muted">OpenStreetMap basemap · No API key required · PATKAI overlays refresh every 15s</div><div className="map-controls">{Object.entries(layers).map(([k,v])=><button key={k} className={`map-toggle ${v?'selected':''}`} onClick={()=>setLayers(x=>({...x,[k]:!v}))}>{k==='risk'?'Risk zones':k==='roads'?'Road status':k==='places'?'Shelters & services':'Reports'}</button>)}</div></div>
  <div className="map-legend"><b>Risk</b><span><i style={{background:riskColors.CRITICAL}}/>Critical</span><span><i style={{background:riskColors.HIGH}}/>High</span><span><i style={{background:riskColors.MODERATE}}/>Moderate</span><span><i style={{background:riskColors.LOW}}/>Low</span><br/><b>Roads</b><span>green open</span><span>orange risk</span><span>red blocked</span></div>
  {selected&&<div className="map-popup"><button className="popup-close" onClick={()=>setSelected(undefined)}>×</button>{selected.risk_score!==undefined?<><b>{selected.name}</b><div className="muted">{selected.district}, {selected.state}</div><div className="popup-risk">{selected.risk_score}<small>/100</small></div><span className={`badge badge-${String(selected.risk_level).toLowerCase()}`}>{selected.risk_level}</span><p>Confidence {Math.round(Number(selected.confidence)*100)}% · {selected.trend}</p><p>Population exposure: <b>{Number(selected.population_exposure||0).toLocaleString()}</b></p></>:selected.route_number?<><b>{selected.name}</b><p>{selected.route_number} · {selected.district}</p><span className="badge">{selected.status}</span><p>Risk {selected.risk}/100 · {selected.impact}</p></>:selected.kind?<><b>{selected.name}</b><p>{placeLabels[selected.kind]||selected.kind} · {selected.district}</p><p>Status: <b>{selected.status}</b></p>{selected.capacity&&<p>Capacity: {selected.capacity}</p>}<button className="btn btn-primary" onClick={()=>fly(Number(selected.lat),Number(selected.lon))}>Center map</button></>:<><b>Citizen / field report</b><p>{selected.incident_type} · {selected.severity}</p><p>{selected.description||'No description'}</p><span className="badge">{selected.verification_status}</span></>}</div>}
 </div>
}
