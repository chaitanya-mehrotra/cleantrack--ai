from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.all_models import (
    Complaint, ComplaintSupport, ComplaintImage, Assignment, StatusHistory, User
)
from app.schemas.complaint import (
    ComplaintCreate, ComplaintResponse, StatusChangeRequest, PriorityOverrideRequest,
    ImageResponse, AssignmentResponse, StatusHistoryResponse
)
from app.api.deps import (
    get_db, get_current_user, get_optional_current_user, get_current_admin
)
from app.services.complaint_service import (
    create_complaint, transition_complaint_status, override_priority
)
from app.services.geo_service import haversine_distance_km, check_possible_duplicates

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def format_complaint_response(c: Complaint, current_user_id: Optional[int] = None) -> ComplaintResponse:
    # Support count and check
    support_cnt = len(c.support_votes) if c.support_votes else 0
    has_supported = False
    if current_user_id and c.support_votes:
        has_supported = any(v.user_id == current_user_id for v in c.support_votes)
        
    imgs = [
        ImageResponse(
            id=img.id,
            storage_path=img.storage_path,
            image_type=img.image_type,
            visual_ai_verdict=img.visual_ai_verdict,
            created_at=img.created_at
        )
        for img in c.images
    ] if c.images else []

    assignments_resp = [
        AssignmentResponse(
            id=a.id,
            complaint_id=a.complaint_id,
            worker_id=a.worker_id,
            worker_name=a.worker.display_name if a.worker else "Worker",
            status=a.status,
            notes=a.notes,
            obstacle_reported=a.obstacle_reported,
            obstacle_notes=a.obstacle_notes,
            assigned_at=a.assigned_at,
            completed_at=a.completed_at
        )
        for a in c.assignments
    ] if c.assignments else []

    history_resp = [
        StatusHistoryResponse(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            reason=h.reason,
            changed_by_name=f"User #{h.changed_by}" if h.changed_by else "System/Citizen",
            changed_at=h.changed_at
        )
        for h in c.status_history
    ] if c.status_history else []

    materials = [m.strip() for m in c.waste_categories.split(",") if m.strip()]

    return ComplaintResponse(
        id=c.id,
        public_reference=c.public_reference,
        user_id=c.user_id,
        reporter_name=c.reporter.display_name if c.reporter else "Anonymous Citizen",
        description=c.description,
        issue_category=c.issue_category,
        waste_categories=materials,
        latitude=c.latitude,
        longitude=c.longitude,
        location_accuracy=c.location_accuracy,
        location_description=c.location_description,
        priority=c.priority,
        priority_reason=c.priority_reason,
        priority_overridden=c.priority_overridden,
        priority_override_reason=c.priority_override_reason,
        classification_source=c.classification_source,
        ai_confidence=c.ai_confidence,
        status=c.status,
        service_zone_name=c.service_zone.name if c.service_zone else None,
        support_count=support_cnt,
        has_user_supported=has_supported,
        images=imgs,
        assignments=assignments_resp,
        status_history=history_resp,
        created_at=c.created_at,
        updated_at=c.updated_at,
        resolved_at=c.resolved_at
    )

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    complaint = create_complaint(db, data, current_user)
    return format_complaint_response(complaint, current_user.id if current_user else None)

@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    issue_category: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    service_zone_id: Optional[int] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    my_reports_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Complaint)

    if my_reports_only:
        if not current_user:
            raise HTTPException(status_code=401, detail="Must be logged in to view your reports")
        query = query.filter(Complaint.user_id == current_user.id)

    if status and status.lower() != "all":
        query = query.filter(Complaint.status == status)

    if priority and priority.lower() != "all":
        query = query.filter(Complaint.priority == priority)

    if issue_category and issue_category.lower() != "all":
        query = query.filter(Complaint.issue_category == issue_category)

    if material and material.lower() != "all":
        query = query.filter(Complaint.waste_categories.like(f"%{material}%"))

    if service_zone_id:
        query = query.filter(Complaint.service_zone_id == service_zone_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Complaint.description.ilike(s)) | (Complaint.location_description.ilike(s)) | (Complaint.public_reference.ilike(s)))

    complaints = query.order_by(desc(Complaint.created_at)).all()

    # Spatial radius filter if coordinates provided
    if lat is not None and lng is not None and radius_km is not None and radius_km > 0:
        filtered = []
        for c in complaints:
            if haversine_distance_km(lat, lng, c.latitude, c.longitude) <= radius_km:
                filtered.append(c)
        complaints = filtered

    user_id = current_user.id if current_user else None
    return [format_complaint_response(c, user_id) for c in complaints[offset:offset + limit]]

@router.get("/nearby-check")
def check_nearby_duplicates(
    lat: float = Query(...),
    lng: float = Query(...),
    issue_category: str = Query("General / Mixed Waste"),
    radius_meters: float = Query(75.0),
    db: Session = Depends(get_db)
):
    dups = check_possible_duplicates(db, lat, lng, issue_category, radius_meters)
    return {
        "has_possible_duplicates": len(dups) > 0,
        "duplicate_count": len(dups),
        "nearby_complaints": [
            {
                "id": d.id,
                "public_reference": d.public_reference,
                "issue_category": d.issue_category,
                "status": d.status,
                "priority": d.priority,
                "location_description": d.location_description,
                "distance_meters": round(haversine_distance_km(lat, lng, d.latitude, d.longitude) * 1000.0, 1),
                "created_at": d.created_at
            }
            for d in dups
        ]
    }

@router.get("/{id_or_ref}", response_model=ComplaintResponse)
def get_complaint_detail(
    id_or_ref: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if id_or_ref.isdigit():
        c = db.query(Complaint).filter(Complaint.id == int(id_or_ref)).first()
    else:
        c = db.query(Complaint).filter(Complaint.public_reference == id_or_ref).first()

    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    user_id = current_user.id if current_user else None
    return format_complaint_response(c, user_id)

@router.post("/{id}/support")
def support_complaint(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    existing = db.query(ComplaintSupport).filter(
        ComplaintSupport.complaint_id == id,
        ComplaintSupport.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"supported": False, "message": "Support vote removed"}
    else:
        vote = ComplaintSupport(complaint_id=id, user_id=current_user.id)
        db.add(vote)
        db.commit()
        return {"supported": True, "message": "Supported complaint! Increased civic visibility."}

@router.post("/{id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    id: int,
    req: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Access control: Citizens can only confirm resolution or reopen their own complaints
    if current_user.role == "citizen":
        if c.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Citizens can only update their own complaints")
        if req.new_status not in ["Resolved", "Reopened"]:
            raise HTTPException(status_code=403, detail="Citizens can only mark Resolved or Reopened")

    try:
        updated = transition_complaint_status(db, c, req.new_status, req.reason, current_user)
        return format_complaint_response(updated, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/priority", response_model=ComplaintResponse)
def change_complaint_priority(
    id: int,
    req: PriorityOverrideRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = override_priority(db, c, req.new_priority, req.override_reason, admin_user)
    return format_complaint_response(updated, admin_user.id)

@router.post("/{id}/reopen", response_model=ComplaintResponse)
def reopen_complaint(
    id: int,
    reason: str = Query(..., min_length=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role == "citizen" and c.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only reopen your own complaint")

    try:
        updated = transition_complaint_status(db, c, "Reopened", f"Reopened by citizen: {reason}", current_user)
        return format_complaint_response(updated, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/confirm-cleanup", response_model=ComplaintResponse)
def confirm_cleanup(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role == "citizen" and c.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only confirm cleanup on your own complaint")

    try:
        updated = transition_complaint_status(db, c, "Resolved", "Citizen confirmed satisfactory cleanup resolution", current_user)
        return format_complaint_response(updated, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
