'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {api,getToken} from '../lib/api';

type Props={mode?:'gov'|'citizen'};
const riskColors:any={SAFE:'#2e7d32',LOW:'#2e7d32',MODERATE:'#d69e00',HIGH:'#d97706',CRITICAL:'#b42318'};
const roadColors:any={OPEN:'#16803c',AT_RISK:'#d69e00',RESTRICTED:'#ea580c',BLOCKED:'#b42318'};
const placeLabels:any={SHELTER:'Shelter',HOSPITAL:'Hospital',POLICE:'Police',FIRE:'Fire',RELIEF:'Relief'};

export default function MapDemo({mode='gov'}:Props){
 const ref=useRef<HTMLDivElement>(null); const map=useRef<maplibregl.Map|null>(null);
 const [zones,setZones]=useState<any[]>([]),[roads,setRoads]=useState<any[]>([]),[places,setPlaces]=useState<any[]>([]),[reports,setReports]=useState<any[]>([]);
 const [selected,setSelected]=useState<any>(); const [layers,setLayers]=useState({risk:true,roads:true,places:true,reports:true});
 const [mapReady,setMapReady]=useState(false),[mapError,setMapError]=useState('');
 const load=async()=>{
   if(!getToken(mode==='gov'?'gov':'citizen')) return;
   try{const [z,r,p,rep]=await Promise.all([api('/api/v1/zones'),api('/api/v1/roads'),api('/api/v1/places'),api('/api/v1/reports')]);setZones(z);setRoads(r);setPlaces(p);setReports(rep.filter((x:any)=>x.lat!=null&&x.lon!=null));}catch{}
 };
 useEffect(()=>{const t=setInterval(load,15000);load();return()=>clearInterval(t)},[mode]);
 const roadGeo=useMemo(()=>({type:'FeatureCollection',features:roads.map((r:any)=>({type:'Feature',properties:r,geometry:{type:'LineString',coordinates:[[r.lon-.035,r.lat-.018],[r.lon,r.lat],[r.lon+.035,r.lat+.018]]}}))}),[roads]);
 const zoneGeo=useMemo(()=>({type:'FeatureCollection',features:zones.map((z:any)=>({type:'Feature',properties:z,geometry:{type:'Point',coordinates:[z.lon,z.lat]}}))}),[zones]);
 const placeGeo=useMemo(()=>({type:'FeatureCollection',features:places.map((p:any)=>({type:'Feature',properties:p,geometry:{type:'Point',coordinates:[p.lon,p.lat]}}))}),[places]);
 const reportGeo=useMemo(()=>({type:'FeatureCollection',features:reports.map((r:any)=>({type:'Feature',properties:r,geometry:{type:'Point',coordinates:[r.lon,r.lat]}}))}),[reports]);
 useEffect(()=>{
  if(!ref.current)return;
  const maptilerKey=process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();
  const style=maptilerKey
    ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(maptilerKey)}`
    : {version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-opacity':1}}]};
  const m=new maplibregl.Map({container:ref.current,style,center:[93.5,25.8],zoom:5.8,minZoom:4,maxZoom:18,attributionControl:false});
  map.current=m;m.addControl(new maplibregl.NavigationControl(),'top-right');m.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');m.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  const onLoad=()=>{setMapReady(true);m.addSource('risk',{type:'geojson',data:zoneGeo as any});m.addSource('roads',{type:'geojson',data:roadGeo as any});m.addSource('places',{type:'geojson',data:placeGeo as any});m.addSource('reports',{type:'geojson',data:reportGeo as any});
    m.addLayer({id:'road-lines',type:'line',source:'roads',paint:{'line-color':['match',['get','status'],'BLOCKED',roadColors.BLOCKED,'RESTRICTED',roadColors.RESTRICTED,'AT_RISK',roadColors.AT_RISK,roadColors.OPEN],'line-width':5,'line-opacity':.9}});
    m.addLayer({id:'risk-halos',type:'circle',source:'risk',paint:{'circle-radius':['interpolate',['linear'],['get','risk_score'],0,18,50,30,100,46],'circle-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-opacity':0.16,'circle-stroke-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-stroke-opacity':0.35,'circle-stroke-width':1}});m.addLayer({id:'risk-points',type:'circle',source:'risk',paint:{'circle-radius':['interpolate',['linear'],['get','risk_score'],0,6,50,9,100,14],'circle-color':['match',['get','risk_level'],'CRITICAL',riskColors.CRITICAL,'HIGH',riskColors.HIGH,'MODERATE',riskColors.MODERATE,'LOW',riskColors.LOW,riskColors.SAFE],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    m.addLayer({id:'place-points',type:'circle',source:'places',paint:{'circle-radius':6,'circle-color':['match',['get','kind'],'SHELTER','#1769aa','HOSPITAL','#7c3aed','POLICE','#334155','FIRE','#dc2626','#64748b'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    m.addLayer({id:'report-points',type:'circle',source:'reports',paint:{'circle-radius':7,'circle-color':['match',['get','verification_status'],'VERIFIED','#15803d','SUSPICIOUS','#b42318','#d97706'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    const click=(e:any)=>{const f=e.features?.[0];if(f)setSelected(f.properties)};
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('click',id,click));
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('mouseenter',id,()=>{m.getCanvas().style.cursor='pointer'}));
    ['risk-points','road-lines','place-points','report-points'].forEach(id=>m.on('mouseleave',id,()=>{m.getCanvas().style.cursor=''}));
  };
  m.on('error',(event:any)=>{
    const message=event?.error?.message||'';
    if(message && !mapError) setMapError('Map service could not load. Check the MapTiler key and allowed domain in Vercel.');
  });
  m.on('load',onLoad);return()=>{m.remove();map.current=null};
 },[mapError]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;const s:any=m.getSource('risk');if(s)s.setData(zoneGeo as any);const r:any=m.getSource('roads');if(r)r.setData(roadGeo as any);const p:any=m.getSource('places');if(p)p.setData(placeGeo as any);const rp:any=m.getSource('reports');if(rp)rp.setData(reportGeo as any)},[zoneGeo,roadGeo,placeGeo,reportGeo,mapReady]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;[['risk-halos',layers.risk],['risk-points',layers.risk],['road-lines',layers.roads],['place-points',layers.places],['report-points',layers.reports]].forEach(([id,v])=>m.setLayoutProperty(id as string,'visibility',v?'visible':'none'))},[layers,mapReady]);
 const fly=(lat:number,lon:number)=>map.current?.flyTo({center:[lon,lat],zoom:11,duration:700});
 return <div className="map-wrap"><div ref={ref} className="map-canvas"/>{mapError&&<div className="map-error">{mapError}</div>}
  <div className="map-panel map-panel-left"><b>{mode==='citizen'?'Nearby hazard map':'Operational GIS map'}</b><div className="muted">Real MapTiler basemap · PATKAI overlays refresh every 15s</div><div className="map-controls">{Object.entries(layers).map(([k,v])=><button key={k} className={`map-toggle ${v?'selected':''}`} onClick={()=>setLayers(x=>({...x,[k]:!v}))}>{k==='risk'?'Risk zones':k==='roads'?'Road status':k==='places'?'Shelters & services':'Reports'}</button>)}</div></div>
  <div className="map-legend"><b>Risk</b><span><i style={{background:riskColors.CRITICAL}}/>Critical</span><span><i style={{background:riskColors.HIGH}}/>High</span><span><i style={{background:riskColors.MODERATE}}/>Moderate</span><span><i style={{background:riskColors.LOW}}/>Low</span></div>
  {selected&&<div className="map-popup"><button className="popup-close" onClick={()=>setSelected(undefined)}>×</button>{selected.risk_score!==undefined?<><b>{selected.name}</b><div className="muted">{selected.district}, {selected.state}</div><div className="popup-risk">{selected.risk_score}<small>/100</small></div><span className={`badge badge-${String(selected.risk_level).toLowerCase()}`}>{selected.risk_level}</span><p>Confidence {Math.round(Number(selected.confidence)*100)}% · {selected.trend}</p><p>Population exposure: <b>{Number(selected.population_exposure||0).toLocaleString()}</b></p></>:selected.route_number?<><b>{selected.name}</b><p>{selected.route_number} · {selected.district}</p><span className="badge">{selected.status}</span><p>Risk {selected.risk}/100 · {selected.impact}</p></>:selected.kind?<><b>{selected.name}</b><p>{placeLabels[selected.kind]||selected.kind} · {selected.district}</p><p>Status: <b>{selected.status}</b></p>{selected.capacity&&<p>Capacity: {selected.capacity}</p>}<button className="btn btn-primary" onClick={()=>fly(Number(selected.lat),Number(selected.lon))}>Center map</button></>:<><b>Citizen / field report</b><p>{selected.incident_type} · {selected.severity}</p><p>{selected.description||'No description'}</p><span className="badge">{selected.verification_status}</span></>}</div>}
 </div>
}
