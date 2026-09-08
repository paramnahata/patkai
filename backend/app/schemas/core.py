from pydantic import BaseModel, EmailStr, Field
from typing import Any

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
class PredictionRequest(BaseModel):
    rainfall_1h: float = 0
    rainfall_3h: float = 0
    rainfall_6h: float = 0
    rainfall_24h: float = 0
    rainfall_72h: float = 0
    soil_moisture: float = 0
    slope_degree: float = 0
    elevation: float = 0
    terrain_ruggedness: float = 0
    historical_landslide_frequency: float = 0
    land_cover_factor: float = 0
    road_cutting_factor: float = 0
    distance_to_road: float = 0
    distance_to_river: float = 0
    satellite_change_index: float = 0
    temperature: float = 0
    humidity: float = 0
    recent_cracks: float = 0
    field_reports_count: float = 0
class ReportCreate(BaseModel):
    incident_type: str
    description: str = ""
    severity: str = "MODERATE"
    lat: float | None = None
    lon: float | None = None
    captured_at: str | None = None
    idempotency_key: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
class RoadStatusUpdate(BaseModel):
    status: str
class DemoScenarioRequest(BaseModel):
    zone_id: str | None = None
class AlertCreate(BaseModel):
    level: str
    title: str
    location: str
    reason: str
    action: str
