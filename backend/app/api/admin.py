import csv
import io
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.all_models import Complaint, User, AuditLog, ServiceZone
from app.api.deps import get_db, get_current_admin, get_optional_current_user
from app.services.geo_service import compute_hotspots

router = APIRouter(prefix="/admin", tags=["Admin / Authority"])

@router.get("/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaints = db.query(Complaint).all()
    total = len(complaints)
    high_priority = sum(1 for c in complaints if c.priority == "High")
    resolved = sum(1 for c in complaints if c.status == "Resolved")
    in_progress = sum(1 for c in complaints if c.status == "In Progress")
    review_pending = sum(1 for c in complaints if c.status == "Cleanup Review")
    submitted = sum(1 for c in complaints if c.status == "Submitted")

    # Overdue count (> 48 hours without resolution)
    now = datetime.datetime.now(datetime.timezone.utc)
    two_days_ago = now - datetime.timedelta(hours=48)
    overdue = 0
    for c in complaints:
        if c.status not in ["Resolved", "Rejected"]:
            # Handle timezone-aware or naive datetimes safely
            c_created = c.created_at
            if c_created.tzinfo is None:
                c_created = c_created.replace(tzinfo=datetime.timezone.utc)
            if c_created < two_days_ago:
                overdue += 1

    # Issue breakdown
    issue_counts: Dict[str, int] = {}
    for c in complaints:
        issue_counts[c.issue_category] = issue_counts.get(c.issue_category, 0) + 1

    # Material breakdown
    material_counts: Dict[str, int] = {}
    for c in complaints:
        for m in c.waste_categories.split(","):
            m = m.strip()
            if m:
                material_counts[m] = material_counts.get(m, 0) + 1

    # Ward performance
    wards = db.query(ServiceZone).all()
    ward_stats = []
    for w in wards:
        w_complaints = [c for c in complaints if c.service_zone_id == w.id]
        w_total = len(w_complaints)
        w_resolved = sum(1 for c in w_complaints if c.status == "Resolved")
        ward_stats.append({
            "ward_id": w.id,
            "ward_name": w.name,
            "ward_number": w.ward_number,
            "total_complaints": w_total,
            "resolved_complaints": w_resolved,
            "resolution_rate": round((w_resolved / w_total * 100), 1) if w_total > 0 else 0.0
        })

    resolution_rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    return {
        "summary": {
            "total_reports": total,
            "high_priority": high_priority,
            "resolved": resolved,
            "in_progress": in_progress,
            "review_pending": review_pending,
            "pending_submitted": submitted,
            "overdue_unresolved": overdue,
            "resolution_rate_percent": resolution_rate
        },
        "issue_breakdown": [
            {"category": k, "count": v, "percentage": round((v / total * 100), 1) if total > 0 else 0}
            for k, v in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "material_breakdown": [
            {"material": k, "count": v}
            for k, v in sorted(material_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "ward_performance": ward_stats
    }

@router.get("/hotspots")
def get_hotspot_clusters(
    grid_km: float = Query(0.5, ge=0.1, le=5.0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Returns spatial density clusters for the garbage hotspot heatmap.
    """
    return compute_hotspots(db, grid_resolution_km=grid_km)

@router.get("/audit-logs")
def get_audit_trail(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "timestamp": log.timestamp
        }
        for log in logs
    ]

@router.get("/workers")
def list_sanitation_workers(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    workers = db.query(User).filter(User.role == "worker", User.is_active == True).all()
    return [
        {
            "id": w.id,
            "display_name": w.display_name,
            "email": w.email,
            "phone_optional": w.phone_optional,
            "active_tasks": sum(1 for a in w.assignments if a.status in ["Assigned", "In Progress"])
        }
        for w in workers
    ]

@router.get("/export-csv")
def export_complaints_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaints = db.query(Complaint).order_by(desc(Complaint.created_at)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Reference ID", "Description", "Issue Category", "Materials",
        "Priority", "Status", "Latitude", "Longitude", "Location Description",
        "Ward", "Confidence %", "Created At", "Resolved At"
    ])
    
    for c in complaints:
        writer.writerow([
            c.public_reference,
            c.description.replace("\n", " "),
            c.issue_category,
            c.waste_categories,
            c.priority,
            c.status,
            c.latitude,
            c.longitude,
            c.location_description,
            c.service_zone.name if c.service_zone else "Unassigned",
            c.ai_confidence,
            c.created_at.isoformat() if c.created_at else "",
            c.resolved_at.isoformat() if c.resolved_at else ""
        ])
        
    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cleantrack_complaints_{datetime.date.today()}.csv"}
    )
