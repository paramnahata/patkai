from .db import Base, engine, SessionLocal
from .models import User, Zone, RiskHistory, Road, Place, Alert, Sensor
from .auth.security import hash_password
from .services.risk import predict
from datetime import datetime, timedelta

def seed():
    Base.metadata.create_all(engine); db=SessionLocal()
    try:
        if db.query(User).count(): return
        accounts=[("admin@patkai.demo","Government Admin","ADMIN",None),("district@patkai.demo","District Officer","DISTRICT_OFFICER","East Khasi Hills"),("field@patkai.demo","Field Officer","FIELD_OFFICER","East Khasi Hills"),("citizen@patkai.demo","Citizen","CITIZEN",None)]
        for email,_,role,district in accounts: db.add(User(email=email,password_hash=hash_password("Patkai@2026"),role=role,district=district))
        coords=[("Sohra Escarpment","Meghalaya","East Khasi Hills",25.27,91.73,82,8200,0.92,0.95),("Mawsynram Ridge","Meghalaya","East Khasi Hills",25.30,91.58,68,3900,0.72,0.70),("Tezpur Foothills","Assam","Sonitpur",26.63,92.80,47,2100,0.48,0.40),("Aizawl South Slope","Mizoram","Aizawl",23.70,92.72,76,5100,0.80,0.78),("Gangtok East Slope","Sikkim","Gangtok",27.33,88.62,63,3400,0.75,0.82),("Kohima Ridge","Nagaland","Kohima",25.67,94.11,58,2800,0.62,0.64),("Imphal Valley Edge","Manipur","Imphal West",24.80,93.90,39,1800,0.44,0.32),("Agartala Hill Fringe","Tripura","West Tripura",23.85,91.28,31,1200,0.36,0.25),("Tawang Approach","Arunachal Pradesh","Tawang",27.59,91.87,71,1700,0.83,0.88)]
        for name,state,district,lat,lon,risk,pop,inf,conn in coords:
            f={"rainfall_72h":236 if risk>70 else 160,"soil_moisture":88 if risk>70 else 70,"slope_degree":39 if risk>70 else 27,"historical_landslide_frequency":12 if risk>70 else 7,"satellite_change_index":.67 if risk>70 else .35,"recent_cracks":2 if risk>70 else 0,"field_reports_count":2 if risk>70 else 1}
            pr=predict(f); pr["risk_score"]=risk; pr["probability"]=risk/100; pr["risk_level"]="CRITICAL" if risk>=80 else "HIGH" if risk>=60 else "MODERATE" if risk>=40 else "LOW"; pr["confidence"]=.91 if risk>=70 else .82
            z=Zone(name=name,state=state,district=district,lat=lat,lon=lon,risk_score=risk,probability=risk/100,confidence=pr["confidence"],risk_level=pr["risk_level"],trend="RAPIDLY INCREASING" if risk>=80 else "INCREASING",population_exposure=pop,road_exposure=conn,infrastructure_exposure=inf,factors=pr["factors"]); db.add(z); db.flush()
            for h in range(6): db.add(RiskHistory(zone_id=z.id,risk_score=max(10,risk-18+h*3),probability=max(.1,(risk-18+h*3)/100),rainfall_24h=95+h*8,soil_moisture=68+h*3,event="Rainfall observation"))
        roads=[("NH-6 Shillong–Sohra","NH-6","East Khasi Hills","AT_RISK",72,25.25,91.74,"Mawmluh Bypass","Civil Hospital Sohra","Hospital access corridor"),("NH-10 Gangtok Link","NH-10","Gangtok","OPEN",31,27.33,88.62,"Rangpo route","STNM Hospital","Moderate exposure"),("Aizawl–Lunglei Road","NH-306","Aizawl","RESTRICTED",66,23.69,92.70,"North bypass","Civil Hospital Aizawl","Slope movement reported")]
        for x in roads: db.add(Road(name=x[0],route_number=x[1],district=x[2],status=x[3],risk=x[4],lat=x[5],lon=x[6],alternative_route=x[7],nearby_hospital=x[8],impact=x[9]))
        places=[("Sohra Community Shelter","SHELTER","East Khasi Hills",25.275,91.735,450,"OPEN","112"),("Civil Hospital Sohra","HOSPITAL","East Khasi Hills",25.270,91.735,None,"OPEN","108"),("Mawsynram Relief Centre","RELIEF","East Khasi Hills",25.299,91.582,180,"OPEN","112"),("Sohra Police Station","POLICE","East Khasi Hills",25.267,91.731,None,"OPEN","112"),("Sohra Fire & Emergency","FIRE","East Khasi Hills",25.271,91.728,None,"OPEN","101")]
        for name,kind,district,lat,lon,cap,status,contact in places: db.add(Place(name=name,kind=kind,district=district,lat=lat,lon=lon,capacity=cap,status=status,contact=contact))
        db.add(Alert(level="CRITICAL",title="Critical landslide risk",location="East Khasi Hills",reason="Heavy rainfall + saturated soil + slope instability detected.",action="Avoid exposed hill roads and follow local authority instructions.",expires_at=datetime.utcnow()+timedelta(hours=6)))
        for i,(typ,val) in enumerate([("Soil moisture",88), ("Rain gauge",42), ("Tilt",0.62)]): db.add(Sensor(sensor_type=typ,name=f"Sohra Sensor {i+1}",lat=25.27+i*.002,lon=91.73+i*.002,value=val,battery=92-i*8,status="ONLINE"))
        db.commit()
    finally: db.close()
if __name__ == "__main__": seed()
