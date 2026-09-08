from datetime import datetime, timezone
class SatelliteDataProvider: 
    def current(self, lat, lon): raise NotImplementedError
class DemoSatelliteProvider(SatelliteDataProvider):
    def current(self, lat, lon): return {"ndvi_change_index":0.31,"surface_change_index":0.67,"land_cover":"Mountain forest / settlement edge","observed_at":datetime.now(timezone.utc).isoformat(),"source":"Synthetic / Demo Data"}
