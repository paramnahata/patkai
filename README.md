# PATKAI — AI-Powered Landslide Early Warning & Decision Support System

**SIH 2026 · Problem Statement SIH26001 · North Eastern Region (NER)**

PATKAI is a software-first early warning and disaster decision-support platform designed to help authorities and communities understand landslide risk, monitor vulnerable locations, prioritize response and report hazards from the field.

## Problem Context

The North Eastern Region frequently faces landslides, flash floods, road blockages and slope failures because of heavy rainfall, fragile terrain and unplanned hill cutting. These incidents disrupt connectivity, damage infrastructure, delay emergency response and can isolate remote communities. Monitoring is often reactive and dependent on manual reporting. PATKAI addresses this gap with an AI-enabled platform for risk analysis, GIS visualization, citizen reporting, alerts and low-network operation.

## PATKAI Solution

PATKAI combines environmental, geospatial, historical and field/citizen information into a unified risk and response workflow. The platform is designed to ingest data from available external sources and process it centrally; the prototype does **not** require dedicated physical IoT hardware.

### Core capabilities

- **AI/ML risk assessment:** multi-factor landslide risk scoring, confidence, trends and explainable risk factors.
- **Real GIS map:** real geographic basemap with PATKAI overlays for risk zones, road corridors, public services and reported hazards.
- **Citizen safety application:** location-aware safety status, risk map, alerts, shelters, hazard reporting and profile/session controls.
- **Field reporting:** geo-tagged incident reports with photo/video upload and metadata/hash trust signals.
- **Media verification:** timestamp, location and file metadata are used as verification signals; metadata alone does not prove authenticity.
- **Government control room:** regional risk picture, incident review, roads, response prioritization, analytics and audit views.
- **Offline/low-network support:** cached safety routes, offline report queue and synchronization when connectivity returns.
- **Multilingual-ready architecture:** supports localized safety communication for communities across the NER.
- **External data integration:** provider boundaries are defined for weather, satellite/remote sensing, terrain/GIS, historical records and other approved data sources.

## How the System Works

```text
External Data Sources
  ├─ Weather / rainfall
  ├─ Terrain & GIS
  ├─ Satellite / remote sensing indicators
  ├─ Historical landslide records
  └─ Citizen / field observations
             │
             ▼
      PATKAI Data Layer
             │
             ▼
       AI/ML Risk Engine
   ┌─────────┼─────────┐
   │         │         │
 Risk     Trend     Confidence
   │         │         │
   └─────────┼─────────┘
             ▼
      Decision Support
   ┌─────────┼──────────────┐
   │         │              │
Citizen   Government     Alerts &
App       Control Room    Response
   │         │              │
   └─────────┼──────────────┘
             ▼
      GIS / Map Layer
       MapTiler + MapLibre
```

## Risk & Decision Support

PATKAI presents risk using operational levels such as **Low, Moderate/Watch, High, Alert and Critical**. The prototype combines risk with population exposure, infrastructure criticality, road connectivity and vulnerability to support prioritization. These outputs are decision-support signals and are not a substitute for an official disaster warning.

## GIS & Mapping

The deployed prototype uses **MapTiler with MapLibre GL JS** for the real geographic basemap. PATKAI overlays its demo/processed datasets on top of that map, including: 

- Landslide-risk locations
- Risk halos and severity levels
- Road status and exposed corridors
- Shelters and emergency services
- Citizen/field reports
- NER-wide geographic context

MapTiler documentation recommends protecting browser API keys with allowed HTTP origins. The PATKAI frontend therefore reads the key from the Vercel environment variable `NEXT_PUBLIC_MAPTILER_KEY` rather than storing the secret in source control.

## Data Sources & Hardware Positioning

PATKAI is intentionally **software based**. The platform processes data received from external providers instead of requiring the project team to deploy physical rain gauges, soil-moisture probes or tilt sensors. The architecture supports future integration of sensor-derived datasets where an authorized provider makes them available.

For the prototype, seeded environmental and incident values are explicitly marked as **Synthetic / Demo Data**. Production deployment should connect approved authoritative sources such as meteorological, satellite, terrain/GIS and government datasets.

## Technology Stack

| Layer | Technology |
|---|---|
| Citizen application | Next.js, React, TypeScript, mobile-first PWA |
| Government dashboard | Next.js, React, TypeScript |
| Backend | FastAPI, Python |
| Database | PostgreSQL / Supabase-compatible PostgreSQL |
| GIS | MapTiler + MapLibre GL JS |
| AI/ML | Python risk/ML pipeline |
| Authentication | JWT + role-based access control |
| Offline | Service Worker + IndexedDB |
| Media analysis | EXIF/file metadata and hash signals |
| Deployment | Vercel + Render |
| Source control | GitHub |

## User Roles

### Citizen

Citizens can access their own safety experience, view nearby risk, receive alerts, find shelters, submit hazard reports and manage their session/profile. Citizen sessions are stored separately from government sessions.

### Field Officer

Field users can work with reports, maps and synchronization workflows designed for low-connectivity environments.

### Government / District Officer

Government users receive role-aware access to the control room, risk analysis, road status, reports, alerts, response workflows, analytics and audit information.

## Citizen Reporting & Verification

A citizen can report:

- Landslides
- Cracks
- Slope movement
- Water seepage
- Blocked roads

Reports may contain GPS coordinates, timestamp, description and photo/video. The verification pipeline extracts available media metadata and computes trust signals before the report is reviewed by authorized personnel.

## Offline & Remote-Region Design

Remote and low-network operation is a core design requirement. PATKAI provides:

- Cached application shell
- Offline report queue
- Automatic synchronization after connectivity returns
- Cached safety information
- Offline-map package workflow
- Critical-zone download concept

The offline layer is designed to reduce dependence on continuous connectivity while preserving the central cloud workflow when the network becomes available.

## Cloud Architecture

```text
                    Vercel
              Citizen + Gov UI
                     │
                     │ HTTPS
                     ▼
                    Render
              FastAPI Backend
                     │
             ┌───────┴───────┐
             ▼               ▼
        PostgreSQL        External APIs
        / Supabase        Weather / GIS /
                           Satellite etc.
```

## Live Demonstration

- **Citizen application:** https://patkai.vercel.app/
- **Government login:** https://patkai.vercel.app/gov/login
- **Backend API:** https://patkai.onrender.com/
- **Backend health:** https://patkai.onrender.com/health
- **GitHub repository:** https://github.com/paramnahata/patkai
- **Presentation:** https://docs.google.com/presentation/d/1PAGArtTtevi0axkLndcVVDDNaR_ZY-Qn/edit?usp=sharing&ouid=107684550483982278220&rtpof=true&sd=true
- **Vercel:** https://vercel.com/
- **Render:** https://render.com/
- **Supabase:** https://supabase.com/
- **MapTiler Cloud:** https://cloud.maptiler.com/

## Demo Accounts

The prototype includes demo identities for demonstration purposes.

- Government Admin: `admin@patkai.demo`
- District Officer: `district@patkai.demo`
- Field Officer: `field@patkai.demo`
- Citizen: `citizen@patkai.demo`
- Demo password: `Patkai@2026`

These accounts and all seeded environmental/incident observations are for prototype demonstration only.

## Deployment Configuration

### Vercel — Frontend

The Vercel project should use the `frontend` directory. Add these environment variables in **Vercel → Project → Settings → Environment Variables**:

```text
NEXT_PUBLIC_API_URL=https://patkai.onrender.com
NEXT_PUBLIC_MAPTILER_KEY=<your MapTiler API key>
```

`NEXT_PUBLIC_MAPTILER_KEY` is intentionally public because it is used by the browser map. Restrict the MapTiler key by allowed HTTP origins in MapTiler Cloud. Do not commit the real key to GitHub.

### Render — Backend

The Render service should use the `backend` directory/Dockerfile. Backend environment variables remain on Render, for example:

```text
DATABASE_URL=<Supabase or Render PostgreSQL connection string>
JWT_SECRET=<long random secret>
CORS_ORIGINS=https://patkai.vercel.app
STORAGE_DIR=./storage
MODEL_PATH=../ml/models/landslide_model.joblib
```

The MapTiler key is **not required on Render** because the browser loads the MapTiler basemap from the Vercel frontend.

## Prototype Data Honesty

The current prototype clearly distinguishes synthetic/demo observations from authoritative operational data. It does not claim live IMD, ISRO/NRSC, GSI or government-certified predictions. In a production rollout, the provider adapters should be connected to approved sources, validated against historical events and governed through an operational warning protocol.

## SIH Alignment

The solution directly addresses the stated requirements by combining:

- Real-time GIS visualization of vulnerable roads, villages and infrastructure
- AI/ML-based risk identification and prediction workflow
- Real-time alert and decision-support interfaces
- Citizen and field geo-tagged reporting
- Weather, terrain, historical and satellite-data integration boundaries
- Road connectivity and emergency prioritization
- Cloud deployment architecture
- Offline/low-network operation for remote communities
- Multilingual-ready communication architecture

## Important Limitation

PATKAI is a prototype decision-support system. Risk scores shown in the demonstration are synthetic/demo values unless an external source and timestamp are explicitly displayed. A production disaster-warning service would require authoritative data agreements, validation, monitoring, security review, model evaluation, false-alarm analysis and formal governance before operational use.

## References

- MapTiler MapLibre integration: https://docs.maptiler.com/react/maplibre-gl-js/get-started/
- MapTiler API-key security: https://docs.maptiler.com/cloud/api/authentication-key/
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
