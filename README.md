# 🏭 Corrugated Carton Costing System

A full-stack luxury costing tool for corrugated carton manufacturing — built with **Flask**, **React (Vite)**, and **Tailwind CSS v4**.

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
> Subsequent starts use the cache and are much faster.

### Default Login Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user` | `user123` |

---

## 💾 Data Persistence
The SQLite database is stored in a **named Docker volume** (`db_data`).  
Your data survives container restarts and upgrades.

To reset the database completely:
```bash
docker-compose down -v   # removes the volume too
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
# API calls are proxied to http://localhost:5000 automatically
```

---

## 🏗️ Architecture

```
costing application/
├── backend/          # Flask API (Python 3.11, Gunicorn in prod)
│   ├── app_production.py
│   ├── calculation_engine.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/         # React 19 + Vite + Tailwind CSS v4
│   ├── src/
│   ├── Dockerfile    (multi-stage: Node build → Nginx serve)
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

### Docker Services
| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `backend` | `carton_costing_backend` | Internal :5000 | Flask/Gunicorn API |
| `frontend` | `carton_costing_frontend` | **80 → public** | Nginx serving React SPA |

Nginx proxies `/api/*` requests to the backend container — no CORS issues, clean architecture.

---

## ✨ Features
- 📊 Multi-step carton costing calculator (RM cost, overhead, commissions, tax)
- 🏆 Luxury light/dark theme (champagne ivory & imperial obsidian gold)
- 📜 Quote history with search/filter and workspace reload
- 💾 Auto-generated order codes (QT-XXXXX)
- 👤 JWT authentication with admin/user roles
- 🐳 Fully Dockerized for easy deployment
