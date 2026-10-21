import os
import sys
from pathlib import Path

# Force unbuffered stdout/stderr so logs appear immediately
os.environ["PYTHONUNBUFFERED"] = "1"

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

print("==================================================", flush=True)
print("[CleanTrack AI 2.0] Backend Bootstrapping...", flush=True)
print(f"Python: {sys.version}", flush=True)
print(f"Working Directory: {os.getcwd()}", flush=True)
print("==================================================", flush=True)

try:
    port = int(os.environ.get("PORT", 10000))
    print(f"Target Port: {port}", flush=True)
except Exception as err:
    port = 10000
    print(f"Defaulting to Port: 10000 ({err})", flush=True)

try:
    import uvicorn
    from app.main import app
    print("[CleanTrack AI 2.0] FastAPI application loaded successfully. Starting Uvicorn...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
except Exception as exc:
    import traceback
    print("[CleanTrack AI 2.0] FATAL STARTUP EXCEPTION OCCURRED:", file=sys.stderr, flush=True)
    traceback.print_exc()
    sys.exit(1)
