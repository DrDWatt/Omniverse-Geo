# Omniverse-Geo

Omniverse-Geo is a fullstack geospatial intelligence platform for live satellite tracking. It replaces the original Apple Silicon Omniverse proof of concept with an NVIDIA DGX/CUDA-oriented FastAPI backend, MongoDB satellite cache, SGP4 orbital propagation, and a CesiumJS React frontend.

## Architecture

- `frontend/`: React, TailwindCSS, Lucide, shadcn-style components, and CesiumJS globe on port `19010`
- `backend/`: FastAPI, Space-Track ingestion, MongoDB repository, SGP4 propagation, and natural-language satellite query agent on port `19011`
- `mongo`: MongoDB satellite cache exposed on host port `19012`
- CUDA runtime images and compose GPU reservations are used for DGX/NVIDIA hosts

## Environment

Copy `.env.example` to `.env` and fill in credentials as needed. Do not commit `.env`.

```bash
cp .env.example .env
```

Required variables:

- `SPACETRACK_USER`: Space-Track.org username
- `SPACETRACK_PASS`: Space-Track.org password
- `MONGODB_DEV_DB`, `MONGODB_TEST_DB`, `MONGODB_PROD_DB`: separate database names per environment
- `VITE_CESIUM_ION_TOKEN`: optional Cesium ion token for production terrain/assets

## Run With Docker Compose

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:19010`
- Backend health: `http://localhost:19011/health`
- MongoDB: `mongodb://localhost:19012`

On NVIDIA hosts, install the NVIDIA Container Toolkit so Docker can satisfy the GPU reservation.

## Load Satellite Data

After setting Space-Track credentials, ingest active TLE data:

```bash
curl -X POST http://localhost:19011/satellites/ingest
```

Then use the app sidebar or query endpoint:

```bash
curl -X POST http://localhost:19011/satellites/agent \
  -H "Content-Type: application/json" \
  -d '{"query":"return altitude velocity and inclination for NORAD 25544"}'
```

## Local Backend Development

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
ENVIRONMENT=development MONGODB_URI=mongodb://localhost:19012 uvicorn main:app --reload --port 19011
```

## Local Frontend Development

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:19011 npm run dev
```

## Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```

Docker test profile:

```bash
docker compose --profile test up --build backend-test
```

## API Summary

- `GET /health`: service status
- `GET /satellites`: cached TLE records
- `POST /satellites/ingest`: authenticate with Space-Track and cache active TLE records
- `GET /satellites/{identifier}/position`: real-time SGP4 position for a NORAD ID or name
- `POST /satellites/agent`: natural-language lookup for satellite altitude, velocity, inclination, and map targeting
