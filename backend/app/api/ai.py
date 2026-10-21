from fastapi import APIRouter
from app.schemas.ai import AIClassifyRequest, AIClassifyResponse
from app.ai.classifier import classify_text_and_vision

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])

@router.post("/classify", response_model=AIClassifyResponse)
def classify_complaint_input(req: AIClassifyRequest):
    return classify_text_and_vision(
        text=req.description,
        image_base64=req.image_base64,
        lat=req.latitude,
        lng=req.longitude
    )
