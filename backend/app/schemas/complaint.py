from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    storage_path: str
    image_type: str
    visual_ai_verdict: Optional[str] = None
    created_at: datetime

class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    previous_status: str
    new_status: str
    reason: str
    changed_by_name: Optional[str] = None
    changed_at: datetime

class ComplaintBase(BaseModel):
    description: str = Field(..., min_length=4)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_accuracy: Optional[float] = 10.0
    location_description: Optional[str] = "Unspecified Location"

class ComplaintCreate(ComplaintBase):
    issue_category: Optional[str] = None
    waste_categories: Optional[List[str]] = None
    priority: Optional[str] = None
    priority_reason: Optional[str] = None
    classification_source: Optional[str] = "AI_MULTIMODAL"
    image_base64: Optional[str] = None  # Optional inline image data

class StatusChangeRequest(BaseModel):
    new_status: str = Field(..., pattern="^(Submitted|Assigned|In Progress|Cleanup Review|Resolved|Reopened|Rejected)$")
    reason: str = Field(..., min_length=3)

class PriorityOverrideRequest(BaseModel):
    new_priority: str = Field(..., pattern="^(High|Medium|Low)$")
    override_reason: str = Field(..., min_length=5)

class AssignmentCreate(BaseModel):
    worker_id: int
    notes: Optional[str] = None

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    worker_id: int
    worker_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    obstacle_reported: bool = False
    obstacle_notes: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None

class WorkerTaskUpdate(BaseModel):
    status: str = Field(..., pattern="^(Acknowledged|In Progress|Review Requested|Completed)$")
    notes: Optional[str] = None
    obstacle_reported: Optional[bool] = False
    obstacle_notes: Optional[str] = None
    after_image_base64: Optional[str] = None

class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    public_reference: str
    user_id: Optional[int] = None
    reporter_name: Optional[str] = None
    description: str
    issue_category: str
    waste_categories: List[str]
    latitude: float
    longitude: float
    location_accuracy: float
    location_description: str
    priority: str
    priority_reason: Optional[str] = None
    priority_overridden: bool = False
    priority_override_reason: Optional[str] = None
    classification_source: str
    ai_confidence: float
    status: str
    service_zone_name: Optional[str] = None
    support_count: int = 0
    has_user_supported: bool = False
    images: List[ImageResponse] = []
    assignments: List[AssignmentResponse] = []
    status_history: List[StatusHistoryResponse] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

class LegacyImportItem(BaseModel):
    id: Optional[str] = None
    description: str
    location: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LegacyImportRequest(BaseModel):
    reports: List[LegacyImportItem]
