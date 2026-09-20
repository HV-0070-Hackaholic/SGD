# GovPulse AI — Smart Governance Command Center

**GovPulse** is an enterprise-grade, full-stack AI smart governance platform designed to triage citizen grievances, evaluate real-time urban infrastructure strain, route municipal dispatch teams, and simulate critical risks across city zones.

Built with a high-performance **Linear/Vercel-inspired dark-mode interface**, native **WebSocket telemetry streaming**, embedded **SQLite database persistence**, and a **Python FastAPI Machine Learning microservice**.

---

## 🏛️ System Architecture

```
                                  GovPulse Full-Stack
                                           │
  ┌────────────────────────────────────────┼────────────────────────────────────────┐
  │                                        │                                        │
  ▼                                        ▼                                        ▼
Frontend (React 18 + Vite)       Backend Gateway (Node.js 24)           ML Microservice (FastAPI)
- Tailwind CSS Dark System       - Express REST API Gateway             - NLP Complaint Categorization
- Leaflet Geospatial Dark Map    - Native WebSockets (ws://)            - Urgency & Sentiment Scoring
- Real-time Triage Queue         - SQLite Persistence (DatabaseSync)    - Urban Stress Regression Engine
- Multi-factor Risk Simulator    - Telemetry Aggregator & SLAs          - Auto Mitigation Advice Generator
- Port: 5173                     - Port: 5000                           - Port: 8000
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on v24.x)
- **Python**: 3.10+ (tested on 3.12.x)

### 1-Click Launch (Windows)
Double-click `start-all.bat` or run:
```powershell
.\start-all.ps1
```

### Manual Individual Startup

#### 1. ML Microservice (FastAPI)
```bash
cd ml-service
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000 (Swagger docs at /docs)
```

#### 2. Backend Gateway (Node.js & SQLite)
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000 (WebSocket on ws://localhost:5000)
```

#### 3. Frontend Dashboard (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 📡 API Endpoints

### Backend API Gateway (Port 5000)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check & microservice status |
| `GET` | `/api/incidents` | List all incidents (filters: `status`, `priority`, `category`, `zone_id`) |
| `POST` | `/api/incidents` | File new incident (NLP categorized by FastAPI, saved in SQLite, broadcasted via WS) |
| `PATCH` | `/api/incidents/:id` | Update incident triage status (`dispatched`, `in_progress`, `resolved`) |
| `GET` | `/api/zones` | Retrieve all municipal zones and live telemetry |
| `POST` | `/api/simulate-zone` | Run multi-factor risk regression simulation on a zone |
| `GET` | `/api/analytics` | Overview metrics, category breakdown, SLA compliance, recent logs |

### Python ML Microservice (Port 8000)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Diagnostic check |
| `POST` | `/predict/classify` | NLP intent classification, urgency score, SLA prediction, department routing |
| `POST` | `/predict/risk-score` | Regression-based urban risk index (heat, traffic, weather, base strain) |
| `GET` | `/zones/telemetry` | Baseline zone coordinates and thermal indices |

---

## 🗺️ Key Features

1. **Autonomous NLP Grievance Triage**:
   - Classifies civic text into 6 municipal departments (*Roads & Infrastructure*, *Water & Sewage*, *Electricity & Power*, *Public Safety & Fire*, *Sanitation & Waste*, *Public Health & Vector Control*).
   - Computes urgency score ($0.0 - 1.0$) and allocates SLA targets ($4h$ to $48h$).

2. **Embedded Database Persistence**:
   - Built-in zero-config SQLite database (`backend/data/govpulse.db`).
   - Transaction-safe, persistent across server restarts, auto-seeds with realistic urban incidents.

3. **Duplex WebSocket Synchronization**:
   - Zero-polling event broadcasting whenever incidents are created or updated.
   - Measures live socket roundtrip latency.

4. **Interactive Geospatial Command Map**:
   - CartoDB Dark Matter map tiles with responsive Leaflet integration.
   - Pulsing color-coded severity markers (Critical = Rose, High = Amber, Medium = Cyan, Resolved = Emerald).
   - Click-to-pin coordinate picker to file localized reports at exact map coordinates.

5. **Predictive Urban Risk Simulator**:
   - Dynamic real-time sliders for temperature (18°C–48°C), traffic density (10%–100%), and extreme weather.
   - SVG radial risk gauge, factor breakdown, and auto-generated municipal intervention actions.
