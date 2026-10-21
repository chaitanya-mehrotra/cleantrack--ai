import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.all_models import User, Organization, ServiceZone, Complaint, StatusHistory, ComplaintImage, Assignment
from app.api.auth import router as auth_router
from app.api.complaints import router as complaints_router
from app.api.assignments import router as assignments_router
from app.api.admin import router as admin_router
from app.api.ai import router as ai_router
from app.api.migration import router as migration_router
from app.api.notifications import router as notif_router

def seed_initial_data():
    """
    Seeds initial municipal organization, wards, demo accounts,
    and realistic Indian civic complaints for immediate testing and demonstration.
    """
    db = SessionLocal()
    try:
        # 1. Check or create Organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(
                name="Municipal Corporation of Delhi (MCD)",
                type="municipal_corporation",
                verification_status="verified"
            )
            db.add(org)
            db.flush()

        # 2. Check or create Wards
        if db.query(ServiceZone).count() == 0:
            wards_data = [
                ("Ward 101 - Connaught Place & Barakhamba", "101", 28.6315, 77.2167),
                ("Ward 102 - Karol Bagh Central", "102", 28.6514, 77.1907),
                ("Ward 103 - South Extension & AIIMS", "103", 28.5672, 77.2100),
                ("Ward 104 - Lajpat Nagar & Defense Colony", "104", 28.5700, 77.2400),
                ("Ward 105 - Rohini Sector 9", "105", 28.7150, 77.1180),
                ("Ward 106 - Dwarka Sector 12", "106", 28.5921, 77.0460),
            ]
            for name, num, lat, lng in wards_data:
                ward = ServiceZone(
                    organization_id=org.id,
                    name=name,
                    ward_number=num,
                    lat_center=lat,
                    lng_center=lng,
                    radius_km=3.0
                )
                db.add(ward)
            db.flush()

        # 3. Check or create Default Accounts
        # Admin
        admin = db.query(User).filter(User.email == "admin@cleantrack.gov.in").first()
        if not admin:
            admin = User(
                email="admin@cleantrack.gov.in",
                display_name="Municipal Commissioner Sharma (Admin)",
                phone_optional="+91 98110 24890",
                hashed_password=hash_password("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)

        # Worker
        worker = db.query(User).filter(User.email == "worker@cleantrack.gov.in").first()
        if not worker:
            worker = User(
                email="worker@cleantrack.gov.in",
                display_name="Ramesh Kumar (Ward 101 Lead)",
                phone_optional="+91 98765 43210",
                hashed_password=hash_password("worker123"),
                role="worker",
                is_active=True
            )
            db.add(worker)

        # Citizen
        citizen = db.query(User).filter(User.email == "citizen@cleantrack.gov.in").first()
        if not citizen:
            citizen = User(
                email="citizen@cleantrack.gov.in",
                display_name="Pooja Verma (Resident)",
                phone_optional="+91 98220 11223",
                hashed_password=hash_password("citizen123"),
                role="citizen",
                is_active=True
            )
            db.add(citizen)
        db.flush()

        # 4. Seed Realistic Indian Civic Complaints only if explicitly requested
        seed_samples = os.getenv("SEED_DEMO_COMPLAINTS", "false").lower() in ("true", "1")
        if seed_samples and db.query(Complaint).count() == 0:
            sample_complaints = [
                {
                    "ref": "CT-2026-00101",
                    "desc": "Massive plastic bottles and unsegregated packaging waste overflowing from dhalao into main market road. Heavy stench and flies.",
                    "issue": "Overflowing Bin",
                    "materials": "Plastic,Organic",
                    "priority": "High",
                    "lat": 28.6325, "lng": 77.2185,
                    "loc_desc": "Inner Circle, Block C Market, Connaught Place",
                    "status": "In Progress",
                    "conf": 94.5,
                    "ward_idx": 0
                },
                {
                    "ref": "CT-2026-00102",
                    "desc": "Open burning of leaves and plastic garbage behind government school. Severe toxic smoke entering classrooms.",
                    "issue": "Waste Burning",
                    "materials": "Plastic,Organic",
                    "priority": "High",
                    "lat": 28.6530, "lng": 77.1920,
                    "loc_desc": "Near MCD Primary School, Arya Samaj Road, Karol Bagh",
                    "status": "Submitted",
                    "conf": 96.0,
                    "ward_idx": 1
                },
                {
                    "ref": "CT-2026-00103",
                    "desc": "Deep naali completely choked with single-use polythene bags and plastic cups. Foul stagnant water flooding pedestrian pavement.",
                    "issue": "Blocked Drain",
                    "materials": "Plastic",
                    "priority": "High",
                    "lat": 28.5680, "lng": 77.2115,
                    "loc_desc": "Ring Road Service Lane, South Extension Part 1",
                    "status": "Cleanup Review",
                    "conf": 92.0,
                    "ward_idx": 2
                },
                {
                    "ref": "CT-2026-00104",
                    "desc": "Large pile of construction malba, broken tiles and concrete dumped overnight on the sidewalk corner.",
                    "issue": "Construction & Demolition (C&D)",
                    "materials": "Debris / Inerts",
                    "priority": "Medium",
                    "lat": 28.5715, "lng": 77.2390,
                    "loc_desc": "Near Central Market Metro Gate 3, Lajpat Nagar",
                    "status": "Resolved",
                    "conf": 89.0,
                    "ward_idx": 3
                },
                {
                    "ref": "CT-2026-00105",
                    "desc": "Old television chassis, rusted wires and battery packs discarded near park perimeter fence.",
                    "issue": "E-Waste",
                    "materials": "Electronic,Metal",
                    "priority": "Medium",
                    "lat": 28.7160, "lng": 77.1195,
                    "loc_desc": "Sector 9 District Park Boundary, Rohini",
                    "status": "Assigned",
                    "conf": 91.5,
                    "ward_idx": 4
                },
                {
                    "ref": "CT-2026-00106",
                    "desc": "Garbage tipper van has not arrived for door-to-door morning collection for three consecutive days.",
                    "issue": "Missed Collection",
                    "materials": "Mixed Waste",
                    "priority": "Medium",
                    "lat": 28.5930, "lng": 77.0475,
                    "loc_desc": "Pocket 4, Sector 12, Dwarka",
                    "status": "Submitted",
                    "conf": 85.0,
                    "ward_idx": 5
                },
                {
                    "ref": "CT-2026-00107",
                    "desc": "Discarded medical syringes, saline tubes, and cotton packaging found in open municipal container.",
                    "issue": "Hazardous / Biomedical Waste",
                    "materials": "Sanitary / Hazardous,Plastic",
                    "priority": "High",
                    "lat": 28.5660, "lng": 77.2085,
                    "loc_desc": "Opposite Trauma Centre Gate, Ring Road",
                    "status": "In Progress",
                    "conf": 97.0,
                    "ward_idx": 2
                }
            ]

            wards_list = db.query(ServiceZone).all()
            for item in sample_complaints:
                ward = wards_list[item["ward_idx"] % len(wards_list)] if wards_list else None
                c = Complaint(
                    public_reference=item["ref"],
                    user_id=citizen.id,
                    organization_id=org.id,
                    service_zone_id=ward.id if ward else None,
                    description=item["desc"],
                    issue_category=item["issue"],
                    waste_categories=item["materials"],
                    latitude=item["lat"],
                    longitude=item["lng"],
                    location_accuracy=5.0,
                    location_description=item["loc_desc"],
                    priority=item["priority"],
                    priority_reason="Diagnostic pattern matched in civic taxonomy",
                    classification_source="AI_MULTIMODAL",
                    ai_confidence=item["conf"],
                    status=item["status"]
                )
                db.add(c)
                db.flush()

                # Status History
                h = StatusHistory(
                    complaint_id=c.id,
                    previous_status="None",
                    new_status=item["status"],
                    changed_by=admin.id,
                    reason="Initial test record initialized for smart city operations"
                )
                db.add(h)

                # Assign In Progress / Review complaints to worker
                if item["status"] in ["Assigned", "In Progress", "Cleanup Review"]:
                    asgn = Assignment(
                        complaint_id=c.id,
                        worker_id=worker.id,
                        assigned_by=admin.id,
                        status=item["status"],
                        notes="Urgent sanitation clearance assignment by Municipal Control Room"
                    )
                    db.add(asgn)

        db.commit()
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CleanTrack AI 2.0 — Smart Waste Management & Civic Intelligence Platform for Indian Cities",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files statically
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(assignments_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(migration_router, prefix=settings.API_V1_STR)
app.include_router(notif_router, prefix=settings.API_V1_STR)

from fastapi.responses import FileResponse

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "FastAPI + SQLAlchemy + SQLite/PostGIS",
        "ai_classifier": "Multimodal Civic Taxonomy Active"
    }

# Serve compiled frontend from dist/
DIST_DIR = settings.UPLOAD_DIR.parent.parent / "dist"
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Exclude API and docs routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return {"error": "Endpoint not found"}
        
    file_path = DIST_DIR / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(DIST_DIR / "index.html")

