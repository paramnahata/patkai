from abc import ABC, abstractmethod
from datetime import datetime, timezone
class WeatherProvider(ABC):
    @abstractmethod
    def current(self, lat: float, lon: float): ...
class DemoWeatherProvider(WeatherProvider):
    def current(self, lat, lon):
        return {"rainfall_1h":18,"rainfall_3h":44,"rainfall_6h":76,"rainfall_24h":142,"rainfall_72h":236,"temperature":23.5,"humidity":92,"wind_kph":19,"forecast":[{"hours":6,"rainfall":38},{"hours":12,"rainfall":62},{"hours":24,"rainfall":98},{"hours":72,"rainfall":168}],"observed_at":datetime.now(timezone.utc).isoformat(),"source":"Synthetic / Demo Data"}
class IMDWeatherProvider(WeatherProvider):
    def __init__(self, api_url=""): self.api_url=api_url
    def current(self, lat, lon): raise RuntimeError("IMD provider is configured as an integration adapter; no endpoint/credentials supplied.")
