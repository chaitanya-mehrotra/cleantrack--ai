import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.all_models import Assignment, Complaint, ComplaintImage, User, StatusHistory, AuditLog
from app.schemas.complaint import AssignmentCreate, AssignmentResponse, WorkerTaskUpdate, ComplaintResponse
from app.api.deps import get_db, get_current_user, get_current_admin, get_current_worker
from app.services.complaint_service import save_image_file, transition_complaint_status
from app.api.complaints import format_complaint_response

router = APIRouter(prefix="/assignments", tags=["Assignments & Sanitation Worker"])

@router.get("/my-tasks")
def get_my_assigned_tasks(
    db: Session = Depends(get_db),
    current_worker: User = Depends(get_current_worker)
):
    """
    Returns active complaints assigned to the logged-in sanitation worker,
    formatted with navigation coordinates, instructions, and status.
    """
    assignments = db.query(Assignment).filter(
        Assignment.worker_id == current_worker.id
    ).order_by(Assignment.assigned_at.desc()).all()

    tasks = []
    for a in assignments:
        c = a.complaint
        tasks.append({
            "assignment_id": a.id,
            "complaint_id": c.id,
            "public_reference": c.public_reference,
            "description": c.description,
            "issue_category": c.issue_category,
            "priority": c.priority,
            "status": c.status,
            "assignment_status": a.status,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "location_description": c.location_description,
            "notes": a.notes,
            "obstacle_reported": a.obstacle_reported,
            "obstacle_notes": a.obstacle_notes,
            "before_images": [img.storage_path for img in c.images if img.image_type == "BEFORE_CLEANUP"],
            "after_images": [img.storage_path for img in c.images if img.image_type == "AFTER_CLEANUP"],
            "assigned_at": a.assigned_at,
            "navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={c.latitude},{c.longitude}"
        })
    return tasks

@router.post("", response_model=AssignmentResponse)
def create_assignment(
    req: AssignmentCreate,
    complaint_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    """
    Admin assigns a complaint to a sanitation worker.
    """
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    worker = db.query(User).filter(User.id == req.worker_id, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=400, detail="Worker ID must belong to an active worker account")

    assignment = Assignment(
        complaint_id=c.id,
        worker_id=worker.id,
        assigned_by=admin_user.id,
        status="Assigned",
        notes=req.notes
    )
    db.add(assignment)

    # Transition complaint status to 'Assigned' if currently 'Submitted' or 'Reopened'
    if c.status in ["Submitted", "Reopened"]:
        transition_complaint_status(
            db, c, "Assigned",
            f"Assigned to worker {worker.display_name} by admin {admin_user.display_name}",
            admin_user
        )

    db.commit()
    db.refresh(assignment)

    return AssignmentResponse(
        id=assignment.id,
        complaint_id=assignment.complaint_id,
        worker_id=assignment.worker_id,
        worker_name=worker.display_name,
        status=assignment.status,
        notes=assignment.notes,
        obstacle_reported=assignment.obstacle_reported,
        obstacle_notes=assignment.obstacle_notes,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at
    )

@router.post("/{assignment_id}/progress")
def update_worker_progress(
    assignment_id: int,
    update: WorkerTaskUpdate,
    db: Session = Depends(get_db),
    current_worker: User = Depends(get_current_worker)
):
    """
    Worker acknowledges, starts work, or submits completion with an after-cleanup photograph.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_worker.role != "admin" and assignment.worker_id != current_worker.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")

    c = assignment.complaint
    assignment.status = update.status
    if update.notes:
        assignment.notes = update.notes

    if update.status == "In Progress":
        if c.status in ["Submitted", "Assigned"]:
            transition_complaint_status(
                db, c, "In Progress",
                f"Worker {current_worker.display_name} has begun on-site cleanup",
                current_worker
            )

    elif update.status in ["Review Requested", "Completed"]:
        # Save proof photo if provided
        if update.after_image_base64 and len(update.after_image_base64) > 100:
            rel_path, file_size = save_image_file(update.after_image_base64, c.public_reference, "AFTER")
            proof_img = ComplaintImage(
                complaint_id=c.id,
                storage_path=rel_path,
                uploaded_by=current_worker.id,
                image_type="AFTER_CLEANUP",
                file_size_bytes=file_size,
                visual_ai_verdict="Post-cleanup verification evidence uploaded by sanitation worker"
            )
            db.add(proof_img)

        assignment.completed_at = datetime.datetime.now(datetime.timezone.utc)
        transition_complaint_status(
            db, c, "Cleanup Review",
            f"Worker completed cleanup; photo evidence submitted for review. Notes: {update.notes or 'None'}",
            current_worker
        )

    db.commit()
    db.refresh(assignment)
    return {"message": f"Task progress updated to {update.status}", "assignment_id": assignment.id}

@router.post("/{assignment_id}/obstacle")
def report_obstacle(
    assignment_id: int,
    obstacle_notes: str,
    db: Session = Depends(get_db),
    current_worker: User = Depends(get_current_worker)
):
    """
    Worker reports an obstacle (locked gate, road blocked, hazardous condition).
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_worker.role != "admin" and assignment.worker_id != current_worker.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")

    assignment.obstacle_reported = True
    assignment.obstacle_notes = obstacle_notes
    c = assignment.complaint

    audit = AuditLog(
        actor_id=current_worker.id,
        action="OBSTACLE_REPORTED",
        entity_type="ASSIGNMENT",
        entity_id=str(assignment.id),
        details=f"Obstacle reported for {c.public_reference}: {obstacle_notes}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Obstacle flagged to municipal administrators", "obstacle_notes": obstacle_notes}
