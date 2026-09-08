from pathlib import Path
import json, joblib, pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score,precision_score,recall_score,f1_score,roc_auc_score,confusion_matrix
FEATURES=["rainfall_1h","rainfall_3h","rainfall_6h","rainfall_24h","rainfall_72h","soil_moisture","slope_degree","elevation","terrain_ruggedness","historical_landslide_frequency","land_cover_factor","road_cutting_factor","distance_to_road","distance_to_river","satellite_change_index","temperature","humidity","recent_cracks","field_reports_count"]
root=Path(__file__).parents[1]; data=root/'data/synthetic_landslide_training.csv'
if not data.exists(): raise SystemExit('Run generate_training_data.py first')
df=pd.read_csv(data); X=df[FEATURES]; y=df.landslide_probability
Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,stratify=y,random_state=42)
model=RandomForestClassifier(n_estimators=220,max_depth=12,min_samples_leaf=3,class_weight='balanced',random_state=42,n_jobs=-1); model.fit(Xtr,ytr); pred=model.predict(Xte); proba=model.predict_proba(Xte)[:,1]
metrics={"dataset":"Synthetic-data validation","n_records":len(df),"accuracy":accuracy_score(yte,pred),"precision":precision_score(yte,pred,zero_division=0),"recall":recall_score(yte,pred,zero_division=0),"f1":f1_score(yte,pred,zero_division=0),"roc_auc":roc_auc_score(yte,proba),"confusion_matrix":confusion_matrix(yte,pred).tolist()}
(root/'models').mkdir(exist_ok=True); joblib.dump(model,root/'models/landslide_model.joblib'); (root/'models/metrics.json').write_text(json.dumps(metrics,indent=2)); print(json.dumps(metrics,indent=2))
