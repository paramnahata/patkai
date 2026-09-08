import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..db import Base


def uid(): return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), index=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Zone(Base):
    __tablename__ = "zones"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160), index=True)
    state: Mapped[str] = mapped_column(String(80), index=True)
    district: Mapped[str] = mapped_column(String(120), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    probability: Mapped[float] = mapped_column(Float, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    risk_level: Mapped[str] = mapped_column(String(30), default="LOW")
    trend: Mapped[str] = mapped_column(String(40), default="STABLE")
    population_exposure: Mapped[int] = mapped_column(Integer, default=0)
    road_exposure: Mapped[float] = mapped_column(Float, default=0)
    infrastructure_exposure: Mapped[float] = mapped_column(Float, default=0)
    factors: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class RiskHistory(Base):
    __tablename__ = "risk_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    zone_id: Mapped[str] = mapped_column(String(36), ForeignKey("zones.id"), index=True)
    risk_score: Mapped[float] = mapped_column(Float)
    probability: Mapped[float] = mapped_column(Float)
    rainfall_24h: Mapped[float] = mapped_column(Float)
    soil_moisture: Mapped[float] = mapped_column(Float)
    event: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class FieldReport(Base):
    __tablename__ = "field_reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    incident_type: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(30), default="MODERATE")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="PENDING")
    trust_score: Mapped[int] = mapped_column(Integer, default=50)
    verification_status: Mapped[str] = mapped_column(String(40), default="NEEDS VERIFICATION")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    media_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Road(Base):
    __tablename__ = "roads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    route_number: Mapped[str] = mapped_column(String(60))
    district: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    risk: Mapped[int] = mapped_column(Integer, default=20)
    last_verified: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    alternative_route: Mapped[str] = mapped_column(String(160), default="—")
    nearby_hospital: Mapped[str] = mapped_column(String(160), default="—")
    impact: Mapped[str] = mapped_column(String(200), default="Low")
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)

class Place(Base):
    __tablename__ = "places"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    district: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    contact: Mapped[str] = mapped_column(String(80), default="112")

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    level: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(100), default="PATKAI Risk Engine")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    object_type: Mapped[str] = mapped_column(String(80))
    object_id: Mapped[str] = mapped_column(String(80))
    previous_state: Mapped[dict] = mapped_column(JSON, default=dict)
    new_state: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Sensor(Base):
    __tablename__ = "sensors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    sensor_type: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    value: Mapped[float] = mapped_column(Float)
    battery: Mapped[int] = mapped_column(Integer, default=90)
    status: Mapped[str] = mapped_column(String(30), default="ONLINE")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
