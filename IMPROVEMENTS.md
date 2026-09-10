# PATKAI Prototype Improvements

## GIS / Maps
- Replaced the placeholder blank map style with a real OpenStreetMap basemap through MapLibre GL JS.
- Added operational overlay layers for risk zones, monitored road corridors/status, shelters/services, and citizen/field reports.
- Added layer toggles, risk legend, clickable operational popups, map navigation and automatic 15-second data refresh.
- Kept map attribution visible and labelled PATKAI environmental/incident overlays as demo data where applicable.

## Citizen / Mobile PWA
- Improved the citizen home screen with location-aware nearest risk zone and shelter selection.
- Added prominent hazard reporting, map, shelter and emergency actions.
- Citizen demo session is created automatically for the prototype so the mobile experience can use protected APIs without requiring a government login flow.
- Improved report form for phone camera capture and evidence checks.
- Added offline report queueing with automatic synchronization when connectivity returns, including queued image blobs.
- Persisted language preference locally.

## Report Verification
- Added browser-side pre-upload checks for file type, size, EXIF GPS, capture time and device metadata.
- Expanded server-side image verification with SHA-256 hash, perceptual hash, EXIF GPS/time/device checks, reported-vs-EXIF location comparison, duplicate/similar-image detection and a trust score.
- Verification remains a human decision; metadata is treated as evidence, never as proof of authenticity.

## Data Sources
- Removed the misleading "IoT Sensor Stream" presentation from the government UI.
- Replaced it with a Data Sources & Processing view describing weather/rainfall, terrain/GIS, satellite indicators, historical inventory, and citizen/field reports.
- Explicitly states that the prototype does not assume physical IoT hardware.

## Reliability
- Made the service worker installation tolerant of unavailable routes so a single cache failure cannot break PWA installation.
- Normalized CORS origins in the backend so a configured trailing slash does not cause an exact-origin mismatch.

## Deployment
- No Docker installation is required on the developer machine for Render deployment.
- The existing Vercel/Render deployment structure is retained.

## Stability fixes in this revision
- Fixed citizen/government session collision by using separate role-scoped browser sessions.
- Added visible signed-in account and Log out controls.
- Fixed map data loading race caused by API requests firing before the citizen session existed.
- Kept a real OpenStreetMap basemap and added visible risk halos plus road/service/report overlays.
- Added stronger CORS defaults for the Vercel production frontend and explicit psycopg URL normalization.
- Fixed service-worker response cloning/cache race (`Response body is already used`).
- Fixed offline report upload compatibility with `captured_at` and citizen-scoped authorization.
- Citizen reports are now associated with the signed-in citizen and the My Reports view only exposes that user's reports.
