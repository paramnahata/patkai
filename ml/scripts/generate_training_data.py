from pathlib import Path
import numpy as np, pandas as pd
rng=np.random.default_rng(42); n=10000
X=pd.DataFrame({
'rainfall_1h':rng.gamma(1.8,8,n),'rainfall_3h':rng.gamma(2,18,n),'rainfall_6h':rng.gamma(2.2,28,n),'rainfall_24h':rng.gamma(2.4,55,n),'rainfall_72h':rng.gamma(2.6,85,n),'soil_moisture':rng.uniform(15,100,n),'slope_degree':rng.uniform(2,48,n),'elevation':rng.uniform(50,2800,n),'terrain_ruggedness':rng.uniform(0,1,n),'historical_landslide_frequency':rng.poisson(5,n),'land_cover_factor':rng.uniform(0,1,n),'road_cutting_factor':rng.uniform(0,1,n),'distance_to_road':rng.uniform(0,8,n),'distance_to_river':rng.uniform(0,10,n),'satellite_change_index':rng.uniform(0,1,n),'temperature':rng.normal(24,6,n),'humidity':rng.uniform(45,100,n),'recent_cracks':rng.poisson(.8,n),'field_reports_count':rng.poisson(1.2,n)})
logit=(-5 + .006*X.rainfall_72h + .018*X.rainfall_24h + .035*X.soil_moisture + .055*X.slope_degree + .12*X.historical_landslide_frequency + .8*X.road_cutting_factor + .8*X.satellite_change_index + .45*X.recent_cracks + .35*X.field_reports_count + .7*X.terrain_ruggedness)
p=1/(1+np.exp(-logit)); y=(rng.random(n)<p).astype(int); X['landslide_probability']=y
out=Path(__file__).parents[1]/'data/synthetic_landslide_training.csv'; out.parent.mkdir(parents=True,exist_ok=True); X.to_csv(out,index=False); print(out)
