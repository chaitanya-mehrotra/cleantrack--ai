import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    phone_optional = Column(String(32), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), default="citizen", nullable=False)  # citizen, admin, worker
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="reporter", foreign_keys="Complaint.user_id")
    assignments = relationship("Assignment", back_populates="worker", foreign_keys="Assignment.worker_id")
    notifications = relationship("Notification", back_populates="user")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(64), default="municipal_corporation")  # municipal_corporation, rwa, panchayat
    verification_status = Column(String(32), default="verified")
    created_at = Column(DateTime, default=utcnow)

    service_zones = relationship("ServiceZone", back_populates="organization")


class ServiceZone(Base):
    __tablename__ = "service_zones"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    ward_number = Column(String(32), nullable=False)
    lat_center = Column(Float, nullable=False)
    lng_center = Column(Float, nullable=False)
    radius_km = Column(Float, default=2.5)

    organization = relationship("Organization", back_populates="service_zones")
    complaints = relationship("Complaint", back_populates="service_zone")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    public_reference = Column(String(32), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    service_zone_id = Column(Integer, ForeignKey("service_zones.id"), nullable=True)
    
    description = Column(Text, nullable=False)
    issue_category = Column(String(64), nullable=False)  # e.g. Overflowing Bin, Illegal Dumping
    waste_categories = Column(String(255), nullable=False)  # Comma-separated: Plastic, Organic, etc.
    
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    location_accuracy = Column(Float, default=10.0)
    location_description = Column(String(255), default="Unspecified Location")
    
    priority = Column(String(16), default="Medium")  # High, Medium, Low
    priority_reason = Column(String(255), nullable=True)
    priority_overridden = Column(Boolean, default=False)
    priority_override_reason = Column(String(255), nullable=True)
    
    classification_source = Column(String(32), default="AI_MULTIMODAL")
    ai_confidence = Column(Float, default=85.0)
    
    status = Column(String(32), default="Submitted", index=True)  # Submitted, Assigned, In Progress, Cleanup Review, Resolved, Reopened, Rejected
    
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    service_zone = relationship("ServiceZone", back_populates="complaints")
    images = relationship("ComplaintImage", back_populates="complaint", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    support_votes = relationship("ComplaintSupport", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintImage(Base):
    __tablename__ = "complaint_images"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    storage_path = Column(String(512), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_type = Column(String(32), default="BEFORE_CLEANUP")  # BEFORE_CLEANUP, AFTER_CLEANUP, OBSTACLE
    file_size_bytes = Column(Integer, default=0)
    visual_ai_verdict = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    complaint = relationship("Complaint", back_populates="images")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=utcnow)
    status = Column(String(32), default="Assigned")  # Assigned, In Progress, Review Requested, Completed
    notes = Column(Text, nullable=True)
    obstacle_reported = Column(Boolean, default=False)
    obstacle_notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="assignments")
    worker = relationship("User", back_populates="assignments", foreign_keys=[worker_id])


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    previous_status = Column(String(32), nullable=False)
    new_status = Column(String(32), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(String(512), nullable=False)
    changed_at = Column(DateTime, default=utcnow)

    complaint = relationship("Complaint", back_populates="status_history")


class ComplaintSupport(Base):
    __tablename__ = "complaint_support"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    complaint = relationship("Complaint", back_populates="support_votes")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    event_type = Column(String(32), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)
    entity_type = Column(String(32), nullable=False)
    entity_id = Column(String(64), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utcnow)
