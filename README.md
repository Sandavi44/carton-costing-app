# 🏭 Corrugated Carton Costing System

An industrial-grade full-stack cost estimation and quotation web platform built for corrugated carton manufacturing — powered by **Flask (Python)**, **React 19 (Vite)**, **PostgreSQL**, and **Tailwind CSS v4**.

🔗 **Live Deployment:** [carton-costing-app-1.onrender.com](https://carton-costing-app-1.onrender.com/)

---

## 🚀 Quick Start — Docker Compose (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Run the entire app with one command

```bash
docker-compose up --build
```

Then open your browser: **http://localhost**

> The first build takes ~2–3 minutes to download images and install dependencies.
> Subsequent starts use cached layers and launch in seconds.

### Default Login Credentials
| Role | Username | Password | Access Privileges |
|------|----------|----------|-------------------|
| **Admin** | `Admin` | `Costing@1970` | Full administrative control, system parameters, bulk delete, customer editing |
| **Estimator** | `Manoj` | `Mano@789` | Standard carton costing calculation, quotation saving, and PDF generation |
| **Estimator** | `Kaushalya` | `Kaushi@789` | Standard carton costing calculation, quotation saving, and PDF generation |

*(User passwords can be redefined inside the application via the Change Password modal).*

---

## 💾 Data Persistence
- **Local Dev / Docker:** SQLite database is stored in a **named Docker volume** (`db_data`), surviving container restarts and upgrades.
- **Production (Render):** Fully managed **PostgreSQL** database configured via environment variables (`DATABASE_URL`).

To reset the local Docker database completely:
```bash
docker-compose down -v   # removes the volume and resets data
docker-compose up --build
```

---

## 🛠️ Local Development (without Docker)

### Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app_production.py
# Runs on http://localhost:5000
```

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
# API calls are automatically proxied to http://localhost:5000
```

---

## 🏗️ Architecture

```
costing application/
├── backend/          # Flask REST API & Mathematical Calculation Engine
│   ├── app_production.py      # Production app routing, RBAC, and database models
│   ├── calculation_engine.py  # Core manufacturing pricing and optimization algorithms
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Container definition for Python backend
│   └── entrypoint.sh          # Database migration & Gunicorn startup
├── frontend/         # React 19 + Vite + Tailwind CSS v4
│   ├── src/                   # React components, state hooks, and UI views
│   ├── Dockerfile             # Multi-stage build (Node builder → Nginx runtime)
│   └── nginx.conf             # Reverse proxy config for static files & /api routes
├── docker-compose.yml         # Container orchestration for local dev
├── render.yaml                # Production deployment blueprint for Render PaaS
└── README.md
```

### Docker Services
| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `backend` | `carton_costing_backend` | Internal `:5000` | Flask/Gunicorn API |
| `frontend` | `carton_costing_frontend` | **`80 → public`** | Nginx serving React SPA & reverse-proxying `/api` |

Nginx proxies all `/api/*` requests directly to the backend container — eliminating CORS issues with clean architectural isolation.

---

## ✨ Features
- 📐 **Mathematical Calculation Engine:** Computes board dimensions, deckle trim waste, and optimal paper reel widths across up to 7 paperboard plies and dual flutes (B, C, E).
- 📊 **Multi-Variable Industrial Costing:** Models raw material consumption, corrugation overheads, joining (stitching/gluing), printing, transport, and commission structures.
- 🛡️ **Dual-Tier Tax Guardrails:** Strict mathematical separation between in-house production (VAT / Non-VAT) and outsource workflows.
- 📜 **Historical Quote Management:** Full quotation history with auto-generated codes (`QT-XXXXX`), keyword search, and working sheet workspace reloads.
- 📄 **Quotation Working Sheet & PDF Export:** Detailed calculation breakdowns for estimators and client-ready printable quotation PDF generation.
- 👥 **Role-Based Access Control (RBAC):** Admin permissions (system parameters, bulk quote deletion, customer name normalization) alongside Estimator roles.
- 🎨 **Adaptive Factory UI Themes:** Includes Pastel Mint Green (default), Warm Sand Kraft, and Obsidian Dark themes.
- 🐳 **Production & Container Parity:** Containerized with Docker and deployed live on Render with automated database column management.
