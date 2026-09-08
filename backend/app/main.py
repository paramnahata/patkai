from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from pathlib import Path
import uuid, json
from .config import settings
from .db import Base, engine, get_db
from .models import User, Zone, RiskHistory, Road, Place, Alert, Sensor, FieldReport, AuditLog
from .schemas import *
from .auth.security import verify_password, create_token, current_user, require_roles
from .services.risk import predict, FEATURES
from .services.priority import priority
from .services.metadata import analyze_image
from .providers.weather import DemoWeatherProvider
from .providers.satellite import DemoSatelliteProvider
from .seed import seed
from .services.report_export import incident_pdf
from fastapi.responses import StreamingResponse

app=FastAPI(title="PATKAI API",version="1.0.0",description="AI-powered landslide early warning and decision support prototype for NER")
origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins or ["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
Path(settings.storage_dir).mkdir(parents=True,exist_ok=True)
app.mount("/uploads",StaticFiles(directory=settings.storage_dir),name="uploads")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    seed()

@app.get("/health")
def health(): return {"status":"ok","mode":"demo","data_label":"Synthetic / Demo Data"}

@app.post("/api/v1/auth/login",response_model=TokenResponse)
def login(req: LoginRequest,db:Session=Depends(get_db)):
    u=db.query(User).filter(User.email==req.email).first()
    if not u or not verify_password(req.password,u.password_hash): raise HTTPException(401,"Invalid credentials")
    return {"access_token":create_token(u),"user":{"id":u.id,"email":u.email,"role":u.role,"district":u.district}}

@app.get("/api/v1/dashboard/summary")
def summary(db:Session=Depends(get_db),user=Depends(current_user)):
    zones=db.query(Zone).all(); roads=db.query(Road).all()
    return {"total_monitored_zones":len(zones),"critical_zones":sum(z.risk_level=="CRITICAL" for z in zones),"high_risk_zones":sum(z.risk_level=="HIGH" for z in zones),"active_incidents":db.query(FieldReport).filter(FieldReport.status!="RESOLVED").count(),"blocked_roads":sum(r.status=="BLOCKED" for r in roads),"people_exposed":sum(z.population_exposure for z in zones),"active_alerts":db.query(Alert).filter(Alert.active==True).count(),"field_teams_deployed":3,"last_updated":datetime.utcnow().isoformat(),"data_label":"Synthetic / Demo Data"}

@app.get("/api/v1/districts")
def districts(db:Session=Depends(get_db),user=Depends(current_user)):
    rows=db.query(Zone).all(); names=sorted({(z.state,z.district) for z in rows}); return [{"state":s,"district":d} for s,d in names]

@app.get("/api/v1/zones")
def zones(state:str|None=None,district:str|None=None,db:Session=Depends(get_db),user=Depends(current_user)):
    q=db.query(Zone)
    if state:q=q.filter(Zone.state==state)
    if district:q=q.filter(Zone.district==district)
    return [{"id":z.id,"name":z.name,"state":z.state,"district":z.district,"lat":z.lat,"lon":z.lon,"risk_score":z.risk_score,"probability":z.probability,"risk_level":z.risk_level,"confidence":z.confidence,"trend":z.trend,"population_exposure":z.population_exposure,"factors":z.factors,"updated_at":z.updated_at.isoformat()} for z in q.all()]

@app.get("/api/v1/zones/{zone_id}")
def zone_detail(zone_id:str,db:Session=Depends(get_db),user=Depends(current_user)):
    z=db.get(Zone,zone_id)
    if not z: raise HTTPException(404,"Zone not found")
    hist=db.query(RiskHistory).filter(RiskHistory.zone_id==zone_id).order_by(RiskHistory.created_at).all()
    score,plevel=priority(z.risk_score,z.population_exposure,z.infrastructure_exposure,z.road_exposure)
    return {"zone":z.__dict__|{"updated_at":z.updated_at.isoformat()},"history":[{"risk_score":h.risk_score,"rainfall_24h":h.rainfall_24h,"soil_moisture":h.soil_moisture,"event":h.event,"created_at":h.created_at.isoformat()} for h in hist],"priority":{"score":score,"level":plevel,"reason":"Priority reflects risk plus population, infrastructure and connectivity exposure."}}

@app.post("/api/v1/risk/predict")
def risk_predict(req:PredictionRequest,user=Depends(current_user)): return predict(req.model_dump())

@app.post("/api/v1/demo/scenario")
def demo_scenario(req:DemoScenarioRequest,db:Session=Depends(get_db),user=Depends(require_roles("ADMIN","DISTRICT_OFFICER"))):
    z=db.get(Zone,req.zone_id) if req.zone_id else db.query(Zone).filter(Zone.risk_level=="CRITICAL").first()
    if not z: raise HTTPException(404,"No scenario zone")
    previous=z.risk_score; z.risk_score=min(97,previous+8); z.probability=z.risk_score/100; z.risk_level="CRITICAL" if z.risk_score>=80 else "HIGH"; z.trend="RAPIDLY INCREASING"; z.updated_at=datetime.utcnow()
    db.add(RiskHistory(zone_id=z.id,risk_score=z.risk_score,probability=z.probability,rainfall_24h=176,soil_moisture=93,event="Demo scenario: rainfall + soil moisture + verified field report"))
    a=Alert(level="CRITICAL",title="Risk escalation detected",location=f"{z.name}, {z.district}",reason="Heavy rainfall and rising soil moisture have pushed the risk above the critical threshold.",action="Review exposed roads, verify field reports and issue local warning as appropriate.",source="PATKAI Demo Scenario")
    db.add(a); db.commit(); return {"message":"Demo scenario executed","previous":previous,"current":z.risk_score,"alert_id":a.id,"zone_id":z.id}

@app.get("/api/v1/roads")
def roads(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":r.id,"name":r.name,"route_number":r.route_number,"district":r.district,"status":r.status,"risk":r.risk,"last_verified":r.last_verified.isoformat(),"alternative_route":r.alternative_route,"nearby_hospital":r.nearby_hospital,"impact":r.impact,"lat":r.lat,"lon":r.lon} for r in db.query(Road).all()]

@app.patch("/api/v1/roads/{road_id}")
def road_status(road_id:str,req:RoadStatusUpdate,db:Session=Depends(get_db),user=Depends(require_roles("ADMIN","DISTRICT_OFFICER","FIELD_OFFICER"))):
    r=db.get(Road,road_id)
    if not r: raise HTTPException(404,"Road not found")
    old=r.status; r.status=req.status; r.last_verified=datetime.utcnow(); db.add(AuditLog(user_id=user.id,action="Road status changed",object_type="road",object_id=r.id,previous_state={"status":old},new_state={"status":r.status})); db.commit(); return {"status":r.status}

@app.get("/api/v1/places")
def places(kind:str|None=None,lat:float|None=None,lon:float|None=None,db:Session=Depends(get_db),user=Depends(current_user)):
    q=db.query(Place)
    if kind:q=q.filter(Place.kind==kind.upper())
    out=[]
    for p in q.all():
        d=((p.lat-(lat or p.lat))**2+(p.lon-(lon or p.lon))**2)**.5*111
        out.append({"id":p.id,"kind":p.kind,"name":p.name,"district":p.district,"lat":p.lat,"lon":p.lon,"capacity":p.capacity,"status":p.status,"contact":p.contact,"distance_km":round(d,2)})
    return sorted(out,key=lambda x:x["distance_km"])

@app.get("/api/v1/weather")
def weather(lat:float=25.27,lon:float=91.73,user=Depends(current_user)): return DemoWeatherProvider().current(lat,lon)
@app.get("/api/v1/satellite")
def satellite(lat:float=25.27,lon:float=91.73,user=Depends(current_user)): return DemoSatelliteProvider().current(lat,lon)
@app.get("/api/v1/sensors")
def sensors(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":s.id,"sensor_type":s.sensor_type,"name":s.name,"lat":s.lat,"lon":s.lon,"value":s.value,"battery":s.battery,"status":s.status,"timestamp":s.timestamp.isoformat()} for s in db.query(Sensor).all()]

@app.get("/api/v1/alerts")
def alerts(db:Session=Depends(get_db),user=Depends(current_user)): return [{"id":a.id,"level":a.level,"title":a.title,"location":a.location,"reason":a.reason,"action":a.action,"source":a.source,"created_at":a.created_at.isoformat(),"active":a.active} for a in db.query(Alert).order_by(desc(Alert.created_at)).limit(50).all()]

@app.post("/api/v1/reports")
def create_report(req:ReportCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    if req.idempotency_key:
        dup=db.query(FieldReport).filter(FieldReport.idempotency_key==req.idempotency_key).first()
        if dup:return {"status":"duplicate","id":dup.id}
    captured=None
    if req.captured_at:
        try: captured=datetime.fromisoformat(req.captured_at.replace("Z","+00:00")).replace(tzinfo=None)
        except: pass
    r=FieldReport(incident_type=req.incident_type,description=req.description,severity=req.severity,lat=req.lat,lon=req.lon,captured_at=captured,idempotency_key=req.idempotency_key,metadata_json=req.metadata,status="PENDING")
    db.add(r); db.commit(); return {"status":"accepted","id":r.id}

@app.post("/api/v1/reports/upload")
async def upload_report(background:BackgroundTasks,incident_type:str,description:str="",severity:str="MODERATE",lat:float|None=None,lon:float|None=None,idempotency_key:str|None=None,file:UploadFile|None=File(None),db:Session=Depends(get_db),user=Depends(current_user)):
    if idempotency_key and db.query(FieldReport).filter(FieldReport.idempotency_key==idempotency_key).first(): return {"status":"duplicate"}
    meta={}; media_path=None
    if file:
        if not file.content_type or not file.content_type.startswith("image/"): raise HTTPException(400,"Only image uploads are supported in demo")
        content=await file.read()
        if len(content)>8*1024*1024: raise HTTPException(413,"Image exceeds 8 MB limit")
        name=f"{uuid.uuid4()}_{Path(file.filename or 'report.jpg').name}"; path=Path(settings.storage_dir)/name; path.write_bytes(content); media_path=name
        meta=analyze_image(str(path),lat,lon)
    r=FieldReport(incident_type=incident_type,description=description,severity=severity,lat=lat,lon=lon,idempotency_key=idempotency_key,metadata_json=meta,media_path=media_path,trust_score=meta.get("trust_score",50),verification_status=meta.get("verification_status","NEEDS VERIFICATION"))
    db.add(r); db.commit(); return {"status":"accepted","id":r.id,"trust_score":r.trust_score,"verification_status":r.verification_status,"metadata":meta}

@app.get("/api/v1/reports/{report_id}/export.pdf")
def export_report(report_id:str,db:Session=Depends(get_db),user=Depends(require_roles("ADMIN","DISTRICT_OFFICER"))):
    r=db.get(FieldReport,report_id)
    if not r: raise HTTPException(404,"Report not found")
    return StreamingResponse(incident_pdf(r),media_type="application/pdf",headers={"Content-Disposition":f"inline; filename=patkai-{r.id}.pdf"})

@app.get("/api/v1/reports")
def reports(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":r.id,"incident_type":r.incident_type,"description":r.description,"severity":r.severity,"lat":r.lat,"lon":r.lon,"status":r.status,"trust_score":r.trust_score,"verification_status":r.verification_status,"metadata":r.metadata_json,"media_url":f"/uploads/{r.media_path}" if r.media_path else None,"created_at":r.created_at.isoformat()} for r in db.query(FieldReport).order_by(desc(FieldReport.created_at)).all()]

@app.patch("/api/v1/reports/{report_id}/verify")
def verify_report(report_id:str,action:str="verify",db:Session=Depends(get_db),user=Depends(require_roles("ADMIN","DISTRICT_OFFICER"))):
    r=db.get(FieldReport,report_id)
    if not r: raise HTTPException(404,"Report not found")
    old=r.verification_status
    mapping={"verify":"VERIFIED","reject":"SUSPICIOUS","request":"NEEDS VERIFICATION","duplicate":"SUSPICIOUS","escalate":"NEEDS VERIFICATION"}
    r.verification_status=mapping.get(action,"NEEDS VERIFICATION"); r.status="VERIFIED" if action=="verify" else r.status
    db.add(AuditLog(user_id=user.id,action=f"Report {action}",object_type="field_report",object_id=r.id,previous_state={"verification_status":old},new_state={"verification_status":r.verification_status})); db.commit(); return {"status":r.verification_status}

@app.post("/api/v1/sync")
def sync(payload:list[dict],db:Session=Depends(get_db),user=Depends(current_user)):
    results=[]
    for item in payload:
        key=item.get("idempotency_key")
        if key and db.query(FieldReport).filter(FieldReport.idempotency_key==key).first(): results.append({"idempotency_key":key,"status":"duplicate"}); continue
        try:
            r=FieldReport(incident_type=item.get("incident_type","Other"),description=item.get("description",""),severity=item.get("severity","MODERATE"),lat=item.get("lat"),lon=item.get("lon"),idempotency_key=key,status="PENDING",metadata_json=item.get("metadata",{})); db.add(r); results.append({"idempotency_key":key,"status":"accepted","id":r.id})
        except Exception: results.append({"idempotency_key":key,"status":"rejected"})
    db.commit(); return {"results":results}

@app.get("/api/v1/analytics")
def analytics(db:Session=Depends(get_db),user=Depends(current_user)):
    zones=db.query(Zone).all(); hist=db.query(RiskHistory).order_by(RiskHistory.created_at).all()
    return {"risk_trend":[{"time":h.created_at.strftime("%H:%M"),"risk":h.risk_score} for h in hist[-30:]],"districts":[{"district":d,"incidents":sum(z.risk_level in ("HIGH","CRITICAL") for z in zones if z.district==d)} for d in sorted(set(z.district for z in zones))],"road_disruptions":{"OPEN":sum(r.status=="OPEN" for r in db.query(Road).all()),"AT_RISK":sum(r.status=="AT_RISK" for r in db.query(Road).all()),"RESTRICTED":sum(r.status=="RESTRICTED" for r in db.query(Road).all()),"BLOCKED":sum(r.status=="BLOCKED" for r in db.query(Road).all())},"alerts":db.query(Alert).count(),"reports":db.query(FieldReport).count()}

@app.get("/api/v1/audit")
def audit(db:Session=Depends(get_db),user=Depends(require_roles("ADMIN","DISTRICT_OFFICER"))):
    return [{"id":a.id,"action":a.action,"object_type":a.object_type,"object_id":a.object_id,"timestamp":a.created_at.isoformat(),"previous_state":a.previous_state,"new_state":a.new_state} for a in db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(100).all()]
