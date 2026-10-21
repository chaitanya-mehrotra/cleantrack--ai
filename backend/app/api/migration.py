import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.all_models import Complaint, AuditLog, User
from app.schemas.complaint import LegacyImportRequest
from app.api.deps import get_db, get_optional_current_user
from app.services.complaint_service import generate_public_reference
from app.services.geo_service import find_nearest_service_zone

router = APIRouter(prefix="/migration", tags=["Data Migration"])

# Default coordinates for legacy reports without GPS (New Delhi municipal region center)
DEFAULT_INDIAN_COORDINATES = [
    (28.6139, 77.2090),  # Central Delhi
    (28.6289, 77.2065),  # Connaught Place
    (28.5672, 77.2100),  # AIIMS / South Delhi
    (28.6506, 77.2303),  # Old Delhi
    (28.5355, 77.2610),  # Nehru Place
    (28.6304, 77.2177),  # Barakhamba
]

@router.post("/import-legacy")
def import_legacy_reports(
    req: LegacyImportRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Safely migrates v1.0 localStorage reports into CleanTrack AI 2.0 persistent schema,
    assigning collision-resistant reference IDs and geo-coordinates while preserving historical data.
    """
    imported_count = 0
    errors = []

    for idx, item in enumerate(req.reports):
        try:
            # Check if description exists
            if not item.description or len(item.description.strip()) < 3:
                continue

            ref_id = generate_public_reference(db)

            # Assign coordinates if missing
            if item.latitude is not None and item.longitude is not None:
                lat, lng = item.latitude, item.longitude
            else:
                base_lat, base_lng = DEFAULT_INDIAN_COORDINATES[idx % len(DEFAULT_INDIAN_COORDINATES)]
                # Add small jitter so markers don't stack directly on top of each other
                lat = base_lat + random.uniform(-0.008, 0.008)
                lng = base_lng + random.uniform(-0.008, 0.008)

            service_zone = find_nearest_service_zone(db, lat, lng)

            # Map legacy status safely
            mapped_status = "Submitted"
            if item.status:
                s_lower = item.status.lower()
                if "resolved" in s_lower:
                    mapped_status = "Resolved"
                elif "progress" in s_lower:
                    mapped_status = "In Progress"
                elif "escalated" in s_lower:
                    mapped_status = "Assigned"

            # Map legacy priority safely
            mapped_priority = "Medium"
            if item.priority:
                p_lower = item.priority.lower()
                if "high" in p_lower:
                    mapped_priority = "High"
                elif "low" in p_lower:
                    mapped_priority = "Low"

            complaint = Complaint(
                public_reference=ref_id,
                user_id=current_user.id if current_user else None,
                service_zone_id=service_zone.id if service_zone else None,
                description=item.description,
                issue_category="General / Mixed Waste" if not item.type else f"{item.type} Waste Issue",
                waste_categories=item.type or "Mixed Waste",
                latitude=round(lat, 6),
                longitude=round(lng, 6),
                location_accuracy=25.0,
                location_description=item.location or "Imported from CleanTrack v1.0",
                priority=mapped_priority,
                priority_reason="Preserved from CleanTrack AI 1.0 client storage",
                classification_source="LEGACY_IMPORT",
                ai_confidence=80.0,
                status=mapped_status
            )
            db.add(complaint)
            imported_count += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    if imported_count > 0:
        audit = AuditLog(
            actor_id=current_user.id if current_user else None,
            action="IMPORT_LEGACY",
            entity_type="SYSTEM",
            entity_id=f"BATCH_{imported_count}",
            details=f"Successfully imported {imported_count} legacy reports from browser local storage."
        )
        db.add(audit)
        db.commit()

    return {
        "success": True,
        "imported_count": imported_count,
        "errors": errors,
        "message": f"Successfully imported {imported_count} legacy reports into CleanTrack AI 2.0."
    }
