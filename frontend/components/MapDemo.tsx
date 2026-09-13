"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {api,getToken,getUser} from "../lib/api";

type Props={mode?:"gov"|"citizen"};
type AnyRow=Record<string,any>;
const riskColors:any={SAFE:"#2e7d32",LOW:"#2e7d32",MODERATE:"#d69e00",HIGH:"#d97706",CRITICAL:"#b42318"};
const roadColors:any={OPEN:"#16803c",AT_RISK:"#d69e00",RESTRICTED:"#ea580c",BLOCKED:"#b42318"};
const placeLabels:any={SHELTER:"Shelter",HOSPITAL:"Hospital",POLICE:"Police",FIRE:"Fire",RELIEF:"Relief"};

// Built-in demo GIS data guarantees a useful map even when the API or tile service is unavailable.
const DEMO_ZONES:AnyRow[]=[
 {id:"z-sohra",name:"Sohra Escarpment",state:"Meghalaya",district:"East Khasi Hills",lat:25.27,lon:91.73,risk_score:82,risk_level:"CRITICAL",confidence:.91,trend:"RAPIDLY INCREASING",population_exposure:8200},
 {id:"z-mawsynram",name:"Mawsynram Ridge",state:"Meghalaya",district:"East Khasi Hills",lat:25.30,lon:91.58,risk_score:68,risk_level:"HIGH",confidence:.82,trend:"INCREASING",population_exposure:3900},
 {id:"z-aizawl",name:"Aizawl South Slope",state:"Mizoram",district:"Aizawl",lat:23.70,lon:92.72,risk_score:76,risk_level:"HIGH",confidence:.91,trend:"INCREASING",population_exposure:5100},
 {id:"z-gangtok",name:"Gangtok East Slope",state:"Sikkim",district:"Gangtok",lat:27.33,lon:88.62,risk_score:63,risk_level:"HIGH",confidence:.82,trend:"INCREASING",population_exposure:3400},
 {id:"z-kohima",name:"Kohima Ridge",state:"Nagaland",district:"Kohima",lat:25.67,lon:94.11,risk_score:58,risk_level:"MODERATE",confidence:.82,trend:"INCREASING",population_exposure:2800},
 {id:"z-imphal",name:"Imphal Valley Edge",state:"Manipur",district:"Imphal West",lat:24.80,lon:93.90,risk_score:39,risk_level:"LOW",confidence:.82,trend:"STABLE",population_exposure:1800},
 {id:"z-tawang",name:"Tawang Approach",state:"Arunachal Pradesh",district:"Tawang",lat:27.59,lon:91.87,risk_score:71,risk_level:"HIGH",confidence:.91,trend:"INCREASING",population_exposure:1700}
];
const DEMO_ROADS:AnyRow[]=[
 {id:"r-nh6",name:"NH-6 Shillong–Sohra",route_number:"NH-6",district:"East Khasi Hills",status:"AT_RISK",risk:72,lat:25.25,lon:91.74,impact:"Hospital access corridor"},
 {id:"r-nh10",name:"NH-10 Gangtok Link",route_number:"NH-10",district:"Gangtok",status:"OPEN",risk:31,lat:27.33,lon:88.62,impact:"Moderate exposure"},
 {id:"r-nh306",name:"Aizawl–Lunglei Road",route_number:"NH-306",district:"Aizawl",status:"RESTRICTED",risk:66,lat:23.69,lon:92.70,impact:"Slope movement reported"},
 {id:"r-nh715",name:"NH-715 Hill Corridor",route_number:"NH-715",district:"East Khasi Hills",status:"BLOCKED",risk:91,lat:25.36,lon:91.79,impact:"Landslide blockage"}
];
const DEMO_PLACES:AnyRow[]=[
 {id:"p-shelter",name:"Sohra Community Shelter",kind:"SHELTER",district:"East Khasi Hills",lat:25.275,lon:91.735,capacity:450,status:"OPEN"},
 {id:"p-hospital",name:"Civil Hospital Sohra",kind:"HOSPITAL",district:"East Khasi Hills",lat:25.270,lon:91.735,status:"OPEN"},
 {id:"p-relief",name:"Mawsynram Relief Centre",kind:"RELIEF",district:"East Khasi Hills",lat:25.299,lon:91.582,capacity:180,status:"OPEN"},
 {id:"p-police",name:"Sohra Police Station",kind:"POLICE",district:"East Khasi Hills",lat:25.267,lon:91.731,status:"OPEN"},
 {id:"p-fire",name:"Sohra Fire & Emergency",kind:"FIRE",district:"East Khasi Hills",lat:25.271,lon:91.728,status:"OPEN"}
];
const DEMO_REPORTS:AnyRow[]=[
 {id:"rep-1",incident_type:"LANDSLIDE",severity:"HIGH",lat:25.31,lon:91.76,description:"Fresh slope debris reported near road corridor",verification_status:"VERIFIED"},
 {id:"rep-2",incident_type:"CRACK",severity:"MODERATE",lat:25.285,lon:91.70,description:"Surface cracks observed on hillside",verification_status:"NEEDS VERIFICATION"}
];

function districtFilter(rows:AnyRow[],user:AnyRow|null){
 if(!user || user.role==="ADMIN" || user.role==="CITIZEN") return rows;
 return user.district ? rows.filter(x=>!x.district || x.district===user.district) : rows;
}
function InlineFallbackMap({zones,roads,places,reports,onSelect}:{zones:AnyRow[],roads:AnyRow[],places:AnyRow[],reports:AnyRow[],onSelect:(x:AnyRow)=>void}){
 const bounds={minLon:87.8,maxLon:95.3,minLat:21.8,maxLat:29.3};
 const xy=(lon:number,lat:number)=>({left:`${((lon-bounds.minLon)/(bounds.maxLon-bounds.minLon))*100}%`,top:`${(1-(lat-bounds.minLat)/(bounds.maxLat-bounds.minLat))*100}%`});
 const roadPath=(r:AnyRow)=>{const a=xy(r.lon-.32,r.lat-.18),b=xy(r.lon,r.lat),c=xy(r.lon+.32,r.lat+.18);return `M ${parseFloat(a.left)} ${100-parseFloat(a.top)} L ${parseFloat(b.left)} ${100-parseFloat(b.top)} L ${parseFloat(c.left)} ${100-parseFloat(c.top)}`};
 return <div className="fallback-map" aria-label="PATKAI offline GIS map">
   <div className="fallback-map-title"><b>NORTH EASTERN REGION</b><span>Offline / demo GIS view</span></div>
   <div className="fallback-grid"/>
   <svg className="fallback-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path className="fallback-region" d="M6 72 L9 54 L16 43 L25 37 L34 29 L45 24 L56 13 L69 17 L79 9 L91 18 L95 34 L90 47 L94 61 L85 74 L72 81 L59 75 L49 84 L35 78 L23 86 L12 81 Z"/><path className="fallback-river" d="M8 67 C25 57, 27 44, 42 50 S64 67, 94 39"/>{roads.map(r=><path key={r.id} d={roadPath(r)} className="fallback-road" stroke={roadColors[r.status]||roadColors.OPEN}/>)}</svg>
   {zones.map(z=>{const p=xy(z.lon,z.lat);return <button key={z.id} className="fallback-pin fallback-risk-pin" style={p} title={`${z.name} · ${z.risk_level} ${z.risk_score}`} onClick={()=>onSelect(z)}><span style={{background:riskColors[z.risk_level]||riskColors.LOW}}/></button>})}
   {places.map(x=>{const p=xy(x.lon,x.lat);return <button key={x.id} className="fallback-pin fallback-place-pin" style={p} title={x.name} onClick={()=>onSelect(x)}>+</button>})}
   {reports.map(x=>{const p=xy(x.lon,x.lat);return <button key={x.id} className="fallback-pin fallback-report-pin" style={p} title={x.incident_type} onClick={()=>onSelect(x)}>!</button>})}
   <div className="fallback-label label-meghalaya">MEGHALAYA</div><div className="fallback-label label-mizoram">MIZORAM</div><div className="fallback-label label-sikkim">SIKKIM</div><div className="fallback-label label-nagaland">NAGALAND</div><div className="fallback-label label-arunachal">ARUNACHAL PRADESH</div>
   <div className="fallback-scale">100 km</div>
 </div>
}

export default function MapDemo({mode="gov"}:Props){
 const ref=useRef<HTMLDivElement>(null);const map=useRef<maplibregl.Map|null>(null);
 const [zones,setZones]=useState<AnyRow[]>([]),[roads,setRoads]=useState<AnyRow[]>([]),[places,setPlaces]=useState<AnyRow[]>([]),[reports,setReports]=useState<AnyRow[]>([]);
 const [selected,setSelected]=useState<AnyRow>();const [layers,setLayers]=useState({risk:true,roads:true,places:true,reports:true});
 const [mapReady,setMapReady]=useState(false),[basemapFailed,setBasemapFailed]=useState(false),[usingDemo,setUsingDemo]=useState(true);
 const user=useMemo(()=>getUser(mode==="gov"?"gov":"citizen"),[mode]);
 const applyData=(z:AnyRow[],r:AnyRow[],p:AnyRow[],rep:AnyRow[])=>{const zz=districtFilter(z,user),rr=districtFilter(r,user),pp=districtFilter(p,user);setZones(zz);setRoads(rr);setPlaces(pp);setReports(rep);setUsingDemo(false)};
 const load=async()=>{
   if(!getToken(mode==="gov"?"gov":"citizen")){setZones(districtFilter(DEMO_ZONES,user));setRoads(districtFilter(DEMO_ROADS,user));setPlaces(districtFilter(DEMO_PLACES,user));setReports(DEMO_REPORTS);return}
   try{const [z,r,p,rep]=await Promise.all([api("/api/v1/zones"),api("/api/v1/roads"),api("/api/v1/places"),api("/api/v1/reports")]);applyData(z,r,p,rep.filter((x:any)=>x.lat!=null&&x.lon!=null))}catch{setZones(districtFilter(DEMO_ZONES,user));setRoads(districtFilter(DEMO_ROADS,user));setPlaces(districtFilter(DEMO_PLACES,user));setReports(DEMO_REPORTS);setUsingDemo(true)}
 };
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[mode]);
 const roadGeo=useMemo(()=>({type:"FeatureCollection",features:roads.map(r=>({type:"Feature",properties:r,geometry:{type:"LineString",coordinates:[[r.lon-.035,r.lat-.018],[r.lon,r.lat],[r.lon+.035,r.lat+.018]]}}))}),[roads]);
 const zoneGeo=useMemo(()=>({type:"FeatureCollection",features:zones.map(z=>({type:"Feature",properties:z,geometry:{type:"Point",coordinates:[z.lon,z.lat]}}))}),[zones]);
 const placeGeo=useMemo(()=>({type:"FeatureCollection",features:places.map(p=>({type:"Feature",properties:p,geometry:{type:"Point",coordinates:[p.lon,p.lat]}}))}),[places]);
 const reportGeo=useMemo(()=>({type:"FeatureCollection",features:reports.map(r=>({type:"Feature",properties:r,geometry:{type:"Point",coordinates:[r.lon,r.lat]}}))}),[reports]);
 useEffect(()=>{
  if(!ref.current)return;
  const style:any={version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,maxzoom:19,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm",paint:{"raster-opacity":1}}]};
  const m=new maplibregl.Map({container:ref.current,style,center:[93.5,25.8],zoom:5.8,minZoom:4,maxZoom:18,attributionControl:false});map.current=m;
  m.addControl(new maplibregl.NavigationControl(),"top-right");m.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");m.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
  const onLoad=()=>{setMapReady(true);setBasemapFailed(false);m.addSource("risk",{type:"geojson",data:zoneGeo as any});m.addSource("roads",{type:"geojson",data:roadGeo as any});m.addSource("places",{type:"geojson",data:placeGeo as any});m.addSource("reports",{type:"geojson",data:reportGeo as any});
    m.addLayer({id:"road-lines",type:"line",source:"roads",paint:{"line-color":["match",["get","status"],"BLOCKED",roadColors.BLOCKED,"RESTRICTED",roadColors.RESTRICTED,"AT_RISK",roadColors.AT_RISK,roadColors.OPEN],"line-width":5,"line-opacity":.9}});
    m.addLayer({id:"risk-halos",type:"circle",source:"risk",paint:{"circle-radius":["interpolate",["linear"],["get","risk_score"],0,18,50,30,100,46],"circle-color":["match",["get","risk_level"],"CRITICAL",riskColors.CRITICAL,"HIGH",riskColors.HIGH,"MODERATE",riskColors.MODERATE,"LOW",riskColors.LOW,riskColors.SAFE],"circle-opacity":.16,"circle-stroke-color":["match",["get","risk_level"],"CRITICAL",riskColors.CRITICAL,"HIGH",riskColors.HIGH,"MODERATE",riskColors.MODERATE,"LOW",riskColors.LOW,riskColors.SAFE],"circle-stroke-opacity":.35,"circle-stroke-width":1}});
    m.addLayer({id:"risk-points",type:"circle",source:"risk",paint:{"circle-radius":["interpolate",["linear"],["get","risk_score"],0,6,50,9,100,14],"circle-color":["match",["get","risk_level"],"CRITICAL",riskColors.CRITICAL,"HIGH",riskColors.HIGH,"MODERATE",riskColors.MODERATE,"LOW",riskColors.LOW,riskColors.SAFE],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    m.addLayer({id:"place-points",type:"circle",source:"places",paint:{"circle-radius":6,"circle-color":["match",["get","kind"],"SHELTER","#1769aa","HOSPITAL","#7c3aed","POLICE","#334155","FIRE","#dc2626","#64748b"],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    m.addLayer({id:"report-points",type:"circle",source:"reports",paint:{"circle-radius":7,"circle-color":["match",["get","verification_status"],"VERIFIED","#15803d","SUSPICIOUS","#b42318","#d97706"],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    const click=(e:any)=>{const f=e.features?.[0];if(f)setSelected(f.properties)};["risk-points","road-lines","place-points","report-points"].forEach(id=>m.on("click",id,click));
    ["risk-points","road-lines","place-points","report-points"].forEach(id=>m.on("mouseenter",id,()=>{m.getCanvas().style.cursor="pointer"}));["risk-points","road-lines","place-points","report-points"].forEach(id=>m.on("mouseleave",id,()=>{m.getCanvas().style.cursor=""}));
  };
  m.on("load",onLoad);m.on("error",(e:any)=>{if(e?.sourceId==="osm"||String(e?.error?.message||"").toLowerCase().includes("tile"))setBasemapFailed(true)});
  return()=>{m.remove();map.current=null};
 },[]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;const s:any=m.getSource("risk");if(s)s.setData(zoneGeo as any);const r:any=m.getSource("roads");if(r)r.setData(roadGeo as any);const p:any=m.getSource("places");if(p)p.setData(placeGeo as any);const rp:any=m.getSource("reports");if(rp)rp.setData(reportGeo as any)},[zoneGeo,roadGeo,placeGeo,reportGeo,mapReady]);
 useEffect(()=>{const m=map.current;if(!m||!mapReady)return;[["risk-halos",layers.risk],["risk-points",layers.risk],["road-lines",layers.roads],["place-points",layers.places],["report-points",layers.reports]].forEach(([id,v])=>m.setLayoutProperty(id as string,"visibility",v?"visible":"none"))},[layers,mapReady]);
 const fly=(lat:number,lon:number)=>map.current?.flyTo({center:[lon,lat],zoom:11,duration:700});
 const fallbackVisible=basemapFailed||!mapReady;
 return <div className="map-wrap">
   {fallbackVisible&&<InlineFallbackMap zones={zones.length?zones:districtFilter(DEMO_ZONES,user)} roads={roads.length?roads:districtFilter(DEMO_ROADS,user)} places={places.length?places:districtFilter(DEMO_PLACES,user)} reports={reports.length?reports:DEMO_REPORTS} onSelect={setSelected}/>} 
   <div ref={ref} className="map-canvas" style={{visibility:fallbackVisible?"hidden":"visible"}}/>
   <div className="map-panel map-panel-left"><b>{mode==="citizen"?"Nearby hazard map":"Operational GIS map"}</b><div className="muted">{fallbackVisible?"Keyless offline GIS fallback · PATKAI overlays":"Live OpenStreetMap basemap · PATKAI overlays"}{usingDemo?" · demo data":" · API data"}</div><div className="map-controls">{Object.entries(layers).map(([k,v])=><button key={k} className={`map-toggle ${v?"selected":""}`} onClick={()=>setLayers(x=>({...x,[k]:!v}))}>{k==="risk"?"Risk zones":k==="roads"?"Road status":k==="places"?"Shelters & services":"Reports"}</button>)}<button className="map-toggle" onClick={()=>map.current?.fitBounds([[88,22],[95,29.5]],{padding:45,duration:600})}>Fit NER</button></div></div>
   {fallbackVisible&&<div className="map-fallback-badge">{basemapFailed?"Basemap unavailable — showing PATKAI offline map":"Loading geographic basemap…"}</div>}
   <div className="map-legend"><b>Risk</b><span><i style={{background:riskColors.CRITICAL}}/>Critical</span><span><i style={{background:riskColors.HIGH}}/>High</span><span><i style={{background:riskColors.MODERATE}}/>Moderate</span><span><i style={{background:riskColors.LOW}}/>Low</span></div>
   {selected&&<div className="map-popup"><button className="popup-close" onClick={()=>setSelected(undefined)}>×</button>{selected.risk_score!==undefined?<><b>{selected.name}</b><div className="muted">{selected.district}, {selected.state}</div><div className="popup-risk">{selected.risk_score}<small>/100</small></div><span className={`badge badge-${String(selected.risk_level).toLowerCase()}`}>{selected.risk_level}</span><p>Confidence {Math.round(Number(selected.confidence||.82)*100)}% · {selected.trend}</p><p>Population exposure: <b>{Number(selected.population_exposure||0).toLocaleString()}</b></p></>:selected.route_number?<><b>{selected.name}</b><p>{selected.route_number} · {selected.district}</p><span className="badge">{selected.status}</span><p>Risk {selected.risk||"—"}/100 · {selected.impact}</p></>:selected.kind?<><b>{selected.name}</b><p>{placeLabels[selected.kind]||selected.kind} · {selected.district}</p><p>Status: <b>{selected.status}</b></p>{selected.capacity&&<p>Capacity: {selected.capacity}</p>}<button className="btn btn-primary" onClick={()=>fly(Number(selected.lat),Number(selected.lon))}>Center map</button></>:<><b>Citizen / field report</b><p>{selected.incident_type} · {selected.severity}</p><p>{selected.description||"No description"}</p><span className="badge">{selected.verification_status}</span></>}</div>}
 </div>
}
