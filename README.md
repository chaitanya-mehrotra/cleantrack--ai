# 🌿 CleanTrack AI 2.0 – Smart Civic Waste Intelligence

> **AI-Powered Civic Waste Management & Geospatial Intelligence Platform for Indian Municipalities**  
> Streamlining citizen garbage reporting, automated AI waste categorization, geospatial hotspot detection, sanitation worker dispatch, and before/after cleanup verification.

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Backend Status](https://img.shields.io/badge/Backend-Live%20on%20Render-brightgreen?logo=render&logoColor=white)](https://cleantrack-backend-zfae.onrender.com/api/health)
[![API Docs](https://img.shields.io/badge/API-Swagger%20Docs-blue?logo=fastapi&logoColor=white)](https://cleantrack-backend-zfae.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌐 Live Deployments

* **Live Backend API**: [https://cleantrack-backend-zfae.onrender.com](https://cleantrack-backend-zfae.onrender.com)
* **Interactive Swagger Docs**: [https://cleantrack-backend-zfae.onrender.com/docs](https://cleantrack-backend-zfae.onrender.com/docs)
* **System Health Check**: [https://cleantrack-backend-zfae.onrender.com/api/health](https://cleantrack-backend-zfae.onrender.com/api/health)

---

## 🌟 What's New in CleanTrack AI 2.0

CleanTrack AI 2.0 is a complete overhaul from the early single-page prototype into an enterprise-grade civic management system:

* **🚀 Full-Stack Architecture**: Modern React 18 + Vite + TypeScript frontend backed by a high-performance Python FastAPI server and SQLAlchemy database.
* **🗺️ 2-Tile Interactive Civic Map**: Seamless hot-swapping between **Dark Civic Map** and **High-Resolution Satellite Imagery** (Esri World Imagery) with GPS detection and Delhi landmark jump presets.
* **🤖 Multimodal AI Waste Classification**:
  * **NLP / Semantic Engine**: Mapped to the **Indian Solid Waste Management Rules (SWM 2016)** taxonomy with bilingual vocabulary (*malba, naali, dhalao, aag, polythene*).
  * **Computer Vision Engine**: Laplacian edge density and multi-chromatic color variance to calculate physical clutter and waste density scores deterministically.
* **📍 75-Meter Spatial Duplicate Detection**: Automatically alerts citizens if an issue was already reported nearby and lets them upvote/support instead of creating duplicate tickets.
* **👥 Role-Based Portals**:
  * **Citizen Portal**: Photo upload, GPS picker, duplicate check, and tracking with before/after cleanup confirmation.
  * **Sanitation Worker App**: Task list with Google Maps turn-by-turn navigation, status updates, and proof photo submission.
  * **Municipal Admin Console**: Ward-level analytics, AI triage oversight, worker dispatch, priority overrides, and hotspot detection.
* **📦 Zero-Disruption Legacy Migration**: Built-in importer allowing seamless migration of legacy v1 reports into the new database.

---

## 🏗️ System Architecture

```
                                  [ Citizen Mobile / Web App ]
                                                │
                                  POST /api/complaints + Photo
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FastAPI Backend Engine                                 │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    Spatial Engine        │     Multimodal AI Engine    │       Workflow Engine         │
│  - 75m Duplicate Check   │  - SWM 2016 Civic Taxonomy  │  - Status State Machine       │
│  - Haversine Distance    │  - Material Segregation     │  - Ward / Worker Assignment   │
│  - Ward Routing          │  - CV Clutter Score (PIL)   │  - Before/After Proof Review  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
                                                │
                                                ▼
                               [ SQLite / PostgreSQL Database ]
                                                │
                   ┌────────────────────────────┴────────────────────────────┐
                   ▼                                                         ▼
       [ Municipal Admin Console ]                               [ Sanitation Worker App ]
       - Ward Dispatch & Triage                                  - Turn-by-turn GPS Navigation
       - Live Geospatial Hotspots                                - After-Cleanup Proof Upload
```

---

## ⚙️ Tech Stack

### Frontend
* **Core**: React 18, TypeScript, Vite
* **Styling**: TailwindCSS, Lucide React icons, Custom CSS glassmorphic tokens
* **Maps**: Leaflet, React-Leaflet (OpenStreetMap Dark tiles & Esri World Imagery)
* **State & Data**: TanStack React Query v5, Context API

### Backend
* **API Framework**: FastAPI, Pydantic v2, Uvicorn
* **Database & ORM**: SQLAlchemy 2.0, SQLite (pluggable to PostgreSQL)
* **Image & AI Processing**: Pillow (PIL), NumPy, Regex lexical taxonomy
* **Security**: JWT authentication, bcrypt password hashing

---

## 📁 Project Structure

```
clean-track/
├── backend/                        # FastAPI Python Backend
│   ├── app/
│   │   ├── ai/                     # Multimodal AI Classifier & Computer Vision
│   │   │   ├── classifier.py       # SWM 2016 taxonomy & priority engine
│   │   │   └── vision.py           # Edge density & visual clutter analyzer
│   │   ├── api/                    # REST API Endpoints
│   │   │   ├── admin.py            # Ward admin & hotspot analytics
│   │   │   ├── assignments.py      # Worker dispatch & proof updates
│   │   │   ├── auth.py             # JWT login & registration
│   │   │   ├── complaints.py       # Complaint CRUD & duplicate check
│   │   │   └── migration.py        # Legacy v1 report migration
│   │   ├── core/                   # Config, Database, and Security
│   │   ├── models/                 # SQLAlchemy DB models
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── services/               # Complaint & Geospatial services
│   │   └── tests/                  # Pytest test suite
│   └── main.py                     # Backend application entry point
│
├── src/                            # React 18 + TypeScript Frontend
│   ├── components/                 # Reusable UI & Map Components
│   │   ├── MapComponent.tsx        # 2-tile Leaflet map with GPS & landmarks
│   │   ├── ComplaintModal.tsx      # Detailed complaint view & status flow
│   │   └── LegacyImportModal.tsx   # Legacy v1 report importer
│   ├── context/                    # Auth & Language Contexts
│   ├── layouts/                    # Navbar & Footer
│   ├── pages/                      # Page Views
│   │   ├── Home.tsx                # Landing page with live metrics
│   │   ├── ReportWaste.tsx         # Waste submission form with AI preview
│   │   ├── ExploreMap.tsx          # Full-screen live civic map
│   │   ├── CitizenDashboard.tsx    # Citizen's tracking portal
│   │   ├── WorkerPortal.tsx        # Field worker tasks & navigation
│   │   ├── AdminPortal.tsx         # Municipal operations console
│   │   └── Login.tsx               # Role-based authentication
│   └── styles/                     # TailwindCSS & dark civic design tokens
│
├── legacy/                         # Preserved v1 Prototype Files (for reference/import)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── index.html                      # Vite application entry HTML
├── package.json                    # Frontend dependencies & scripts
├── tailwind.config.js              # Tailwind styling configuration
└── vite.config.ts                  # Vite build configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18 or higher) & `npm`
* **Python** (v3.10 or higher)

---

### 1. Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic pillow python-multipart python-jose passlib bcrypt

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

Backend will be live at:
* **API Server**: [http://127.0.0.1:8080](http://127.0.0.1:8080)
* **Interactive Swagger Docs**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

---

### 2. Start the Frontend Application

```bash
# In the project root directory
npm install

# Start Vite development server
npm run dev
```

Frontend will be live at:
* **Web App**: [http://localhost:5173/](http://localhost:5173/)

---

## 🧪 Demo Accounts

The system comes pre-configured with demo accounts for testing all three roles:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@cleantrack.gov.in` | `citizen123` | Submit complaints, support nearby issues, confirm cleanup |
| **Worker** | `worker@cleantrack.gov.in` | `worker123` | View assigned tasks, GPS navigation, submit after-cleanup photo |
| **Admin** | `admin@cleantrack.gov.in` | `admin123` | Dispatch workers, override priorities, view hotspot analytics |

*(You can also register a brand new account with your own details from the [Sign In](http://localhost:5173/login) page).*

---

## 🧪 Running Tests

```bash
# Run backend test suite
cd backend
pytest

# Check frontend TypeScript compilation
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.
