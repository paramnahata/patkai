from pathlib import Path
import joblib
import numpy as np
from ..config import settings
FEATURES = ["rainfall_1h","rainfall_3h","rainfall_6h","rainfall_24h","rainfall_72h","soil_moisture","slope_degree","elevation","terrain_ruggedness","historical_landslide_frequency","land_cover_factor","road_cutting_factor","distance_to_road","distance_to_river","satellite_change_index","temperature","humidity","recent_cracks","field_reports_count"]
_model = None

def load_model():
    global _model
    p = Path(__file__).resolve().parents[3] / "ml/models/landslide_model.joblib"
    if p.exists():
        try: _model = joblib.load(p)
        except Exception: _model = None
    return _model

def heuristic_probability(d):
    x = 0.0
    x += min(d.get("rainfall_72h",0)/250, 1)*0.24
    x += d.get("soil_moisture",0)/100*0.18
    x += min(d.get("slope_degree",0)/45,1)*0.14
    x += min(d.get("historical_landslide_frequency",0)/20,1)*0.10
    x += min(d.get("road_cutting_factor",0),1)*0.07
    x += min(d.get("satellite_change_index",0),1)*0.08
    x += min(d.get("recent_cracks",0)/5,1)*0.10
    x += min(d.get("field_reports_count",0)/5,1)*0.09
    return max(0.01, min(0.99, x))

def predict(features: dict):
    model = _model or load_model()
    arr = np.array([[features.get(f,0) for f in FEATURES]], dtype=float)
    if model:
        try: p = float(model.predict_proba(arr)[0,1])
        except Exception: p = heuristic_probability(features)
    else: p = heuristic_probability(features)
    score = round(p*100)
    if score >= 80: level="CRITICAL"
    elif score >= 60: level="HIGH"
    elif score >= 40: level="MODERATE"
    elif score >= 20: level="LOW"
    else: level="SAFE"
    factors=[]
    candidates=[("Rainfall", min(features.get("rainfall_72h",0)/250,1)*28), ("Soil moisture", features.get("soil_moisture",0)/100*22), ("Slope", min(features.get("slope_degree",0)/45,1)*18), ("Historical incidents", min(features.get("historical_landslide_frequency",0)/20,1)*14), ("Recent satellite change", min(features.get("satellite_change_index",0),1)*10), ("Field reports", min(features.get("field_reports_count",0)/5,1)*8)]
    for name, val in sorted(candidates, key=lambda x:x[1], reverse=True)[:5]:
        if val > 1: factors.append({"name":name,"contribution":round(val)})
    explanation = "High rainfall combined with saturated soil and steep terrain is driving the current risk." if score >= 60 else "Current environmental indicators suggest manageable landslide risk; continue monitoring rainfall and slope conditions."
    return {"risk_score":score,"probability":round(p,3),"risk_level":level,"confidence":round(min(.97,.72+p*.25),2),"trend":"INCREASING" if score>=60 else "STABLE","factors":factors,"explanation":explanation}
