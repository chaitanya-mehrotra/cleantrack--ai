import math
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.all_models import Complaint, ServiceZone

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two points on Earth in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_nearest_service_zone(db: Session, lat: float, lng: float) -> Optional[ServiceZone]:
    """
    Finds the municipal service zone or ward enclosing or closest to the coordinates.
    """
    zones = db.query(ServiceZone).all()
    if not zones:
        return None
        
    best_zone = None
    min_dist = float("inf")
    
    for zone in zones:
        dist = haversine_distance_km(lat, lng, zone.lat_center, zone.lng_center)
        if dist < min_dist:
            min_dist = dist
            best_zone = zone
            
    return best_zone

def check_possible_duplicates(
    db: Session,
    lat: float,
    lng: float,
    issue_category: str,
    radius_meters: float = 75.0
) -> List[Complaint]:
    """
    Detects active complaints within a small radius (default 75m) that may be duplicates.
    """
    radius_km = radius_meters / 1000.0
    active_statuses = ["Submitted", "Assigned", "In Progress", "Cleanup Review"]
    candidates = db.query(Complaint).filter(Complaint.status.in_(active_statuses)).all()
    
    duplicates = []
    for c in candidates:
        dist = haversine_distance_km(lat, lng, c.latitude, c.longitude)
        if dist <= radius_km:
            duplicates.append(c)
            
    return duplicates

def compute_hotspots(db: Session, grid_resolution_km: float = 0.5) -> List[Dict[str, Any]]:
    """
    Computes spatial density clusters for unresolved or recurring complaints
    to power the administrative heatmap.
    """
    complaints = db.query(Complaint).all()
    if not complaints:
        return []

    clusters: Dict[Tuple[float, float], Dict[str, Any]] = {}
    
    for c in complaints:
        # Snap to grid
        lat_grid = round(c.latitude / (grid_resolution_km / 111.0)) * (grid_resolution_km / 111.0)
        lng_grid = round(c.longitude / (grid_resolution_km / 111.0)) * (grid_resolution_km / 111.0)
        grid_key = (round(lat_grid, 4), round(lng_grid, 4))
        
        if grid_key not in clusters:
            clusters[grid_key] = {
                "latitude": grid_key[0],
                "longitude": grid_key[1],
                "count": 0,
                "high_priority_count": 0,
                "active_count": 0,
                "resolved_count": 0,
                "categories": {}
            }
            
        clusters[grid_key]["count"] += 1
        if c.priority == "High":
            clusters[grid_key]["high_priority_count"] += 1
        if c.status in ["Submitted", "Assigned", "In Progress", "Cleanup Review"]:
            clusters[grid_key]["active_count"] += 1
        elif c.status == "Resolved":
            clusters[grid_key]["resolved_count"] += 1
            
        cat = c.issue_category
        clusters[grid_key]["categories"][cat] = clusters[grid_key]["categories"].get(cat, 0) + 1

    result = list(clusters.values())
    result.sort(key=lambda x: x["count"], reverse=True)
    return result
