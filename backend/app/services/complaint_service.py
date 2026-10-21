import os
import uuid
import base64
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.all_models import (
    Complaint, ComplaintImage, StatusHistory, AuditLog, Notification,
    User, Assignment, ServiceZone
)
from app.schemas.complaint import ComplaintCreate
from app.ai.classifier import classify_text_and_vision
from app.services.geo_service import find_nearest_service_zone

# Permitted state transitions
VALID_TRANSITIONS = {
    "Submitted": ["Assigned", "Rejected", "In Progress"],
    "Assigned": ["In Progress", "Submitted", "Rejected"],
    "In Progress": ["Cleanup Review", "Assigned", "Rejected"],
    "Cleanup Review": ["Resolved", "Reopened", "In Progress"],
    "Resolved": ["Reopened"],
    "Reopened": ["Assigned", "In Progress", "Rejected"],
    "Rejected": ["Submitted"]
}

def generate_public_reference(db: Session) -> str:
    """
    Generates collision-resistant reference IDs such as CT-2026-00421.
    Unlike v1.0 array-length indexing, this guarantees uniqueness even after deletions.
    """
    current_year = datetime.datetime.now().year
    prefix = f"CT-{current_year}-"
    
    # Find highest current ID in database
    latest = db.query(Complaint).filter(Complaint.public_reference.like(f"{prefix}%")).order_by(desc(Complaint.id)).first()
    if latest:
        try:
            latest_num = int(latest.public_reference.split("-")[-1])
            next_num = latest_num + 1
        except Exception:
            next_num = latest.id + 1
    else:
        next_num = 1
        
    candidate = f"{prefix}{str(next_num).zfill(5)}"
    
    # Fallback collision check
    if db.query(Complaint).filter(Complaint.public_reference == candidate).first():
        candidate = f"{prefix}{uuid.uuid4().hex[:6].upper()}"
        
    return candidate

def save_image_file(image_base64: str, complaint_ref: str, img_type: str = "BEFORE") -> tuple[str, int]:
    """
    Saves a base64 image to the upload storage directory and returns (relative_path, file_size).
    """
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
        
    img_data = base64.b64decode(image_base64)
    filename = f"{complaint_ref}_{img_type}_{uuid.uuid4().hex[:8]}.jpg"
    full_path = settings.UPLOAD_DIR / filename
    with open(full_path, "wb") as f:
        f.write(img_data)
        
    return f"/uploads/{filename}", len(img_data)

def create_complaint(
    db: Session,
    data: ComplaintCreate,
    current_user: Optional[User] = None
) -> Complaint:
    """
    Creates a new complaint, applies AI multimodal classification if not provided,
    determines nearest service zone, stores images, and writes initial audit log.
    """
    public_ref = generate_public_reference(db)
    
    # Run AI Classification
    ai_result = classify_text_and_vision(
        text=data.description,
        image_base64=data.image_base64,
        lat=data.latitude,
        lng=data.longitude
    )
    
    # Determine Issue and Materials
    issue_cat = data.issue_category or ai_result.issue_category
    materials = data.waste_categories or ai_result.waste_categories
    priority = data.priority or ai_result.suggested_priority
    priority_reason = data.priority_reason or ai_result.priority_reason
    
    # Find Ward / Service Zone
    service_zone = find_nearest_service_zone(db, data.latitude, data.longitude)
    service_zone_id = service_zone.id if service_zone else None
    
    complaint = Complaint(
        public_reference=public_ref,
        user_id=current_user.id if current_user else None,
        service_zone_id=service_zone_id,
        description=data.description,
        issue_category=issue_cat,
        waste_categories=",".join(materials),
        latitude=data.latitude,
        longitude=data.longitude,
        location_accuracy=data.location_accuracy or 10.0,
        location_description=data.location_description or "Unspecified Location",
        priority=priority,
        priority_reason=priority_reason,
        classification_source=data.classification_source or "AI_MULTIMODAL",
        ai_confidence=ai_result.confidence,
        status="Submitted"
    )
    db.add(complaint)
    db.flush()
    
    # Store initial image if present
    if data.image_base64 and len(data.image_base64) > 100:
        try:
            rel_path, file_size = save_image_file(data.image_base64, public_ref, "BEFORE")
            verdict = ai_result.vision_analysis.verdict if ai_result.vision_analysis else None
            img_rec = ComplaintImage(
                complaint_id=complaint.id,
                storage_path=rel_path,
                uploaded_by=current_user.id if current_user else None,
                image_type="BEFORE_CLEANUP",
                file_size_bytes=file_size,
                visual_ai_verdict=verdict
            )
            db.add(img_rec)
        except Exception as e:
            print(f"Image storage error: {e}")
            
    # Record initial Status History
    status_entry = StatusHistory(
        complaint_id=complaint.id,
        previous_status="None",
        new_status="Submitted",
        changed_by=current_user.id if current_user else None,
        reason="Report submitted by citizen" if current_user else "Report submitted (anonymous/legacy)"
    )
    db.add(status_entry)
    
    # Record Audit Log
    audit = AuditLog(
        actor_id=current_user.id if current_user else None,
        action="CREATE_COMPLAINT",
        entity_type="COMPLAINT",
        entity_id=public_ref,
        details=f"Complaint created with category '{issue_cat}' and priority '{priority}'"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(complaint)
    return complaint

def transition_complaint_status(
    db: Session,
    complaint: Complaint,
    new_status: str,
    reason: str,
    actor: Optional[User] = None
) -> Complaint:
    """
    Enforces state machine transitions, records history and audit logs.
    """
    current_status = complaint.status
    allowed = VALID_TRANSITIONS.get(current_status, [])
    
    if new_status not in allowed:
        raise ValueError(
            f"Invalid status transition from '{current_status}' to '{new_status}'. Allowed: {', '.join(allowed)}"
        )
        
    complaint.status = new_status
    if new_status == "Resolved":
        complaint.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    elif current_status == "Resolved" and new_status == "Reopened":
        complaint.resolved_at = None
        
    complaint.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    # Status History
    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=current_status,
        new_status=new_status,
        changed_by=actor.id if actor else None,
        reason=reason
    )
    db.add(history)
    
    # Audit Log
    audit = AuditLog(
        actor_id=actor.id if actor else None,
        action="UPDATE_STATUS",
        entity_type="COMPLAINT",
        entity_id=complaint.public_reference,
        details=f"Status changed from '{current_status}' to '{new_status}'. Reason: {reason}"
    )
    db.add(audit)
    
    # Notify reporter if registered
    if complaint.user_id:
        notif = Notification(
            user_id=complaint.user_id,
            complaint_id=complaint.id,
            event_type="STATUS_CHANGE",
            title=f"Complaint {complaint.public_reference} Updated",
            message=f"Status updated to '{new_status}': {reason}"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(complaint)
    return complaint

def override_priority(
    db: Session,
    complaint: Complaint,
    new_priority: str,
    override_reason: str,
    admin_user: User
) -> Complaint:
    """
    Allows authorized administrators to modify priority with mandatory reasoning and audit logging.
    """
    old_priority = complaint.priority
    complaint.priority = new_priority
    complaint.priority_overridden = True
    complaint.priority_override_reason = override_reason
    complaint.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    audit = AuditLog(
        actor_id=admin_user.id,
        action="CHANGE_PRIORITY",
        entity_type="COMPLAINT",
        entity_id=complaint.public_reference,
        details=f"Priority changed from '{old_priority}' to '{new_priority}'. Reason: {override_reason}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(complaint)
    return complaint
