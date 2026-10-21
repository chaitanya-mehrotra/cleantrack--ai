from typing import List, Optional
from pydantic import BaseModel

class AIClassifyRequest(BaseModel):
    description: str
    image_base64: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class VisionFeatureSummary(BaseModel):
    is_valid_image: bool
    brightness_score: float
    contrast_score: float
    edge_density: float
    clutter_anomaly_score: float
    detected_visual_clues: List[str]
    verdict: str

class AIClassifyResponse(BaseModel):
    issue_category: str
    waste_categories: List[str]
    suggested_priority: str
    priority_reason: str
    confidence: float
    human_readable_explanation: str
    requires_manual_review: bool
    vision_analysis: Optional[VisionFeatureSummary] = None
