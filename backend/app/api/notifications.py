from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.all_models import Notification, ServiceZone, User
from app.api.deps import get_db, get_current_user

router = APIRouter(tags=["Notifications & Wards"])

@router.get("/notifications")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()

    return [
        {
            "id": n.id,
            "complaint_id": n.complaint_id,
            "event_type": n.event_type,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at
        }
        for n in notifs
    ]

@router.post("/notifications/{id}/read")
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == id, Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"success": True}

@router.get("/wards")
def list_wards(db: Session = Depends(get_db)):
    wards = db.query(ServiceZone).all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "ward_number": w.ward_number,
            "lat_center": w.lat_center,
            "lng_center": w.lng_center,
            "radius_km": w.radius_km
        }
        for w in wards
    ]
