# PATKAI

**AI-Powered Landslide Early Warning & Decision Support System for the North Eastern Region (NER)**

SIH 2026 prototype for PS SIH26001. PATKAI is a runnable end-to-end demonstration, not a static mockup.

## What is included
- Next.js + TypeScript government dashboard and mobile-first citizen/field PWA
- FastAPI REST backend with JWT/RBAC
- SQLAlchemy schema designed for PostgreSQL/PostGIS, with SQLite demo fallback
- 10,000-record synthetic ML training pipeline using Random Forest fallback
- Risk prediction, trend/history, explainable factor summaries and consequence-aware priority
- Demo weather/satellite/sensor providers with production adapter interfaces
- GeoJSON demo risk map, shelters, hospitals and roads
- Field/citizen reporting with idempotent offline sync queue
- Image EXIF/hash analysis and human verification workflow
- Alerts, road status, response workflow, analytics and audit log
- PWA service worker, IndexedDB offline report queue and cached safety routes
- Docker, Render and Vercel configuration

## Data honesty
All seeded environmental, sensor, risk and incident values are **Synthetic / Demo Data**. The prototype does not claim live IMD, ISRO/NRSC, GSI or government-certified predictions. Metadata analysis provides trust signals only; it cannot prove an image is authentic or fake.

## Local setup (no Docker required)
### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cd ..
python -m backend.app.seed
cd backend
uvicorn app.main:app --reload --port 8000
```
Swagger: http://localhost:8000/docs

### ML training
```bash
cd ml/scripts
python generate_training_data.py
python train_model.py
```
Metrics are written to `ml/models/metrics.json` and are synthetic-data validation only.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. Government login: `/gov/login`. Citizen app: `/app`. Field console: `/field`.

## Demo accounts
All demo accounts use password `Patkai@2026`:
- admin@patkai.demo
- district@patkai.demo
- field@patkai.demo
- citizen@patkai.demo

## Judge demo flow
1. Login as `admin@patkai.demo`.
2. Open Regional Dashboard and inspect the NER risk map.
3. Click a risk marker to inspect score, confidence, trend and exposure.
4. Click **Run Demo Scenario**. Risk increases, history updates and a critical alert is created.
5. Open Reports to inspect field/citizen verification workflows.
6. Open Roads, Response, Sensors, Analytics and Audit Log.
7. Open `/app`, `/app/map`, `/app/shelters`, `/app/report` and `/field` for the mobile safety/field experience.
8. To test offline reporting, disable browser network, submit a report, then open `/field/sync` and restore connectivity.

## Production integrations
- Weather: `WeatherProvider` → `IMDWeatherProvider` adapter
- Satellite: `SatelliteDataProvider` → future ISRO/NRSC/Sentinel adapter
- Storage: local adapter now; S3/R2/Supabase-compatible adapter boundary for production
- SMS/email: mock adapter now; provider credentials through environment variables
- Maps: demo GeoJSON now; production PMTiles/vector tile provider can replace the local package

## PostGIS
The ORM uses latitude/longitude fields for portable demo execution. The production schema is intended for PostGIS geometry columns and geospatial indexes; `docker-compose.yml` provides a PostGIS 16 service. Add `psycopg[binary]` and set `DATABASE_URL` to the PostGIS database for deployment.

## Deployment
### Vercel
Import the `frontend` directory as the project root and set `NEXT_PUBLIC_API_URL` to the deployed Render API URL.

### Render
Deploy the `backend` directory using the supplied Dockerfile. Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGINS`. Use Render PostgreSQL with PostGIS support where available or Supabase PostgreSQL for a production GIS database.

## Tests
```bash
cd backend
pytest
```

## Limitations
The prototype intentionally uses synthetic demo data and provider adapters where external credentials/services are unavailable. Disaster prediction is probabilistic and should not be treated as a certainty or official warning without authoritative operational data, validation and governance.
