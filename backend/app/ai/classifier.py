import re
from typing import Optional, List, Tuple
from app.schemas.ai import AIClassifyResponse, VisionFeatureSummary
from app.ai.vision import analyze_image_base64

# ==========================================
# INDIAN CIVIC WASTE & PROBLEM TAXONOMY
# ==========================================

ISSUE_TAXONOMY = {
    "Waste Burning": {
        "keywords": [
            "burn", "burning", "burnt", "smoke", "fire", "toxic smoke",
            "plastic jalana", "jalana", "aag", "smouldering", "air pollution"
        ],
        "weight": 3.0,
        "base_priority": "High",
        "reason": "Air quality hazard and toxic emission risk (violates Clean Air regulations)"
    },
    "Blocked Drain": {
        "keywords": [
            "drain", "blocked drain", "sewage", "naali", "gutter", "waterlogging",
            "choked", "stagnant water", "overflowing drain", "nullah", "manhole"
        ],
        "weight": 2.8,
        "base_priority": "High",
        "reason": "Water stagnation hazard, disease vector breeding, and public health risk"
    },
    "Hazardous / Biomedical Waste": {
        "keywords": [
            "medical", "syringe", "hospital", "bandage", "needle", "vial",
            "blood", "chemical", "poison", "toxic", "dead animal", "carcass",
            "biohazard", "pharmacy waste", "expired medicine"
        ],
        "weight": 3.0,
        "base_priority": "High",
        "reason": "Direct biological/chemical infection risk to public and sanitation workers"
    },
    "Overflowing Bin": {
        "keywords": [
            "overflow", "overflowing", "dustbin full", "spilling", "dhalao",
            "bin filled", "spillover", "bin broken", "container overflowing"
        ],
        "weight": 2.2,
        "base_priority": "High",
        "reason": "Municipal bin capacity exceeded, causing street-level dispersal"
    },
    "Construction & Demolition (C&D)": {
        "keywords": [
            "debris", "malba", "concrete", "brick", "cement", "tiles",
            "plaster", "renovation waste", "rubble", "stone", "sand pile"
        ],
        "weight": 2.0,
        "base_priority": "Medium",
        "reason": "Obstructs public right of way; requires heavy machinery clearance"
    },
    "Illegal Dumping": {
        "keywords": [
            "dumping", "vacant plot", "dump yard", "corner dumping", "open plot",
            "heaped illegal", "night dumping", "unauthorized dump", "garbage mound"
        ],
        "weight": 2.2,
        "base_priority": "High",
        "reason": "Severe unauthorized open dumping causing neighborhood degradation"
    },
    "Missed Collection": {
        "keywords": [
            "not collected", "van did not come", "missed collection", "days without pickup",
            "garbage truck", "door to door", "tipper didn't visit", "uncollected bins"
        ],
        "weight": 1.8,
        "base_priority": "Medium",
        "reason": "Scheduled municipal service disruption reported by resident"
    },
    "E-Waste": {
        "keywords": [
            "electronic", "electronics", "e-waste", "battery", "batteries", "charger",
            "laptop", "mobile", "computer", "cable", "circuit", "tv", "tubelight", "bulb"
        ],
        "weight": 2.0,
        "base_priority": "Medium",
        "reason": "Heavy metals hazard requiring authorized e-waste dismantling channel"
    },
    "Roadside Litter": {
        "keywords": [
            "roadside", "pavement", "footpath", "street side", "divider",
            "curb", "sidewalk", "corner", "strewn litter"
        ],
        "weight": 1.5,
        "base_priority": "Medium",
        "reason": "Scattered solid waste in pedestrian and vehicular transit zone"
    }
}

# ==========================================
# MATERIAL SEGREGATION TAXONOMY (SWM 2016)
# ==========================================

MATERIAL_TAXONOMY = {
    "Plastic": [
        "plastic", "bottle", "bottles", "bag", "bags", "polythene", "wrapper",
        "wrappers", "packaging", "straw", "cup", "cups", "pouch", "chips packet",
        "container", "thermocol", "styrofoam"
    ],
    "Organic": [
        "food", "waste", "vegetable", "vegetables", "fruit", "fruits", "rotten",
        "kitchen", "compost", "leaf", "leaves", "grass", "garden", "organic",
        "animal feed", "flower", "peel"
    ],
    "Metal": [
        "can", "cans", "iron", "metal", "steel", "tin", "aluminum", "aluminium",
        "wire", "scrap", "pipe", "rod", "foil"
    ],
    "Electronic": [
        "mobile", "phone", "battery", "laptop", "charger", "cable", "e-waste",
        "bulb", "keyboard", "device", "printed circuit"
    ],
    "Paper & Cardboard": [
        "paper", "cardboard", "carton", "box", "boxes", "newspaper", "flyer",
        "magazine", "packaging box"
    ],
    "Debris / Inerts": [
        "malba", "debris", "brick", "cement", "concrete", "mortar", "rubble",
        "broken tile", "plaster", "sand"
    ],
    "Sanitary / Hazardous": [
        "diaper", "sanitary", "pad", "syringe", "medicine", "chemical", "bandage",
        "mask", "gloves", "biohazard"
    ]
}

HIGH_SEVERITY_MODIFIERS = [
    "urgent", "emergency", "massive", "huge", "danger", "hazardous", "school",
    "hospital", "stinking", "maggots", "flies", "blocked", "heavy", "terrible",
    "choking", "mountain", "children playing"
]

LOW_SEVERITY_MODIFIERS = [
    "small", "minor", "single", "little", "few", "one cup", "two wrappers", "scant"
]


def classify_text_and_vision(
    text: str,
    image_base64: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None
) -> AIClassifyResponse:
    """
    Performs calibrated multimodal civic waste classification combining
    lexical analysis, Indian civic problem taxonomy, material segregation,
    and optional computer vision analysis.
    """
    normalized_text = text.lower().strip()
    words = re.findall(r'\b\w+\b', normalized_text)
    
    # 1. Match Issue Category
    best_issue = "General / Mixed Waste"
    best_issue_score = 0.0
    issue_reason = "Standard municipal solid waste accumulation reported"
    
    for issue_name, data in ISSUE_TAXONOMY.items():
        score = 0
        for kw in data["keywords"]:
            if kw in normalized_text:
                score += 1
        weighted_score = score * data["weight"]
        if weighted_score > best_issue_score:
            best_issue_score = weighted_score
            best_issue = issue_name
            issue_reason = data["reason"]

    # 2. Material Categories (multi-label detection)
    detected_materials = []
    for material_name, keywords in MATERIAL_TAXONOMY.items():
        hits = sum(1 for kw in keywords if kw in normalized_text)
        if hits > 0:
            detected_materials.append(material_name)
            
    if not detected_materials:
        detected_materials = ["Mixed Waste"]
        
    # 3. Vision Analysis
    vision_result: Optional[VisionFeatureSummary] = None
    if image_base64 and len(image_base64) > 100:
        vision_result = analyze_image_base64(image_base64)
        
    # 4. Priority Calculation
    high_mod_hits = sum(1 for mod in HIGH_SEVERITY_MODIFIERS if mod in normalized_text)
    low_mod_hits = sum(1 for mod in LOW_SEVERITY_MODIFIERS if mod in normalized_text)
    
    base_priority = "Medium"
    if best_issue in ISSUE_TAXONOMY:
        base_priority = ISSUE_TAXONOMY[best_issue]["base_priority"]
        
    final_priority = base_priority
    priority_notes = [issue_reason]
    
    if high_mod_hits > 0:
        final_priority = "High"
        priority_notes.append("High severity environmental/civic modifiers detected in resident description")
    elif low_mod_hits > 0 and base_priority != "High":
        final_priority = "Low"
        priority_notes.append("Low volume or localized single-item report")
        
    if vision_result and vision_result.is_valid_image:
        if vision_result.clutter_anomaly_score >= 0.70 and final_priority == "Low":
            final_priority = "Medium"
            priority_notes.append("Elevated visual clutter score indicates substantial accumulation")

    # 5. Calibrated Confidence Calculation
    # Combines word count, lexical match density, and vision concordance.
    # Deterministic and calibrated without Math.random()!
    base_confidence = 65.0
    text_signal = min(20.0, best_issue_score * 4.0)
    material_signal = min(10.0, len(detected_materials) * 3.5)
    
    vision_signal = 0.0
    if vision_result and vision_result.is_valid_image:
        vision_signal = 5.0 + (vision_result.clutter_anomaly_score * 5.0)
        
    calibrated_confidence = round(min(98.0, base_confidence + text_signal + material_signal + vision_signal), 1)
    
    explanation_parts = [
        f"Classified as '{best_issue}' due to diagnostic patterns matching civic waste taxonomy.",
        f"Material segregation suggests: {', '.join(detected_materials)}.",
        f"Assigned Priority: {final_priority} ({' · '.join(priority_notes)})."
    ]
    if vision_result and vision_result.is_valid_image:
        explanation_parts.append(f"Visual AI Analysis: {vision_result.verdict} (Clutter index: {vision_result.clutter_anomaly_score}).")
        
    requires_review = (calibrated_confidence < 72.0 or best_issue == "Hazardous / Biomedical Waste")

    return AIClassifyResponse(
        issue_category=best_issue,
        waste_categories=detected_materials,
        suggested_priority=final_priority,
        priority_reason=" · ".join(priority_notes),
        confidence=calibrated_confidence,
        human_readable_explanation=" ".join(explanation_parts),
        requires_manual_review=requires_review,
        vision_analysis=vision_result
    )
