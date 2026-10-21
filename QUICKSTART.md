# CleanTrack AI 2.0 — Quick Start

## ▶️ Run on any laptop (one command)

### Requirements
- Install **Docker Desktop**: https://www.docker.com/products/docker-desktop/
  - Windows / Mac / Linux all supported

### Start the App
```bash
# Clone the project
git clone https://github.com/chaitanya-mehrotra/cleantrack--ai.git
cd cleantrack--ai

# Run everything (first time builds images, ~3-5 mins)
docker-compose up --build

# Next time, just:
docker-compose up
```

### Open in browser
| Service  | URL |
|----------|-----|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8000 |
| 📖 API Docs | http://localhost:8000/docs |

### Stop the App
```bash
docker-compose down
```

### Reset everything (clear database)
```bash
docker-compose down -v
```

---
> Data is saved in Docker volumes — safe between restarts.
