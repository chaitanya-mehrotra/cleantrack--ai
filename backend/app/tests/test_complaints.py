import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.all_models import User, Organization, ServiceZone, Complaint
from app.schemas.complaint import ComplaintCreate
from app.services.complaint_service import create_complaint, transition_complaint_status, override_priority
from app.services.geo_service import haversine_distance_km, check_possible_duplicates

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed sample organization & ward
    org = Organization(name="Test Municipal Body")
    session.add(org)
    session.flush()

    ward = ServiceZone(
        organization_id=org.id,
        name="Ward 1 Test",
        ward_number="1",
        lat_center=28.6139,
        lng_center=77.2090
    )
    session.add(ward)

    # Seed citizen and admin
    admin = User(
        email="admin_test@cleantrack.in",
        display_name="Test Admin",
        hashed_password="pw",
        role="admin"
    )
    citizen = User(
        email="citizen_test@cleantrack.in",
        display_name="Test Citizen",
        hashed_password="pw",
        role="citizen"
    )
    session.add_all([admin, citizen])
    session.commit()

    yield session
    session.close()

def test_create_complaint_and_collision_free_ref(test_db):
    data1 = ComplaintCreate(
        description="Overflowing garbage bin near temple",
        latitude=28.6140,
        longitude=77.2095
    )
    c1 = create_complaint(test_db, data1)
    assert c1.public_reference.startswith("CT-")
    assert c1.status == "Submitted"
    assert c1.service_zone_id is not None

    data2 = ComplaintCreate(
        description="Another complaint nearby",
        latitude=28.6142,
        longitude=77.2097
    )
    c2 = create_complaint(test_db, data2)
    assert c2.public_reference != c1.public_reference

def test_valid_and_invalid_state_transitions(test_db):
    data = ComplaintCreate(
        description="Hazardous biomedical waste dumped in vacant lot",
        latitude=28.6140,
        longitude=77.2095
    )
    c = create_complaint(test_db, data)
    assert c.status == "Submitted"

    # Valid: Submitted -> Assigned
    c = transition_complaint_status(test_db, c, "Assigned", "Assigned to team 4")
    assert c.status == "Assigned"

    # Valid: Assigned -> In Progress
    c = transition_complaint_status(test_db, c, "In Progress", "Worker en route")
    assert c.status == "In Progress"

    # Valid: In Progress -> Cleanup Review
    c = transition_complaint_status(test_db, c, "Cleanup Review", "Cleanup completed, evidence uploaded")
    assert c.status == "Cleanup Review"

    # Valid: Cleanup Review -> Resolved
    c = transition_complaint_status(test_db, c, "Resolved", "Admin verified photos")
    assert c.status == "Resolved"
    assert c.resolved_at is not None

    # Invalid: Resolved -> In Progress directly should raise ValueError
    with pytest.raises(ValueError):
        transition_complaint_status(test_db, c, "In Progress", "Direct jump not allowed")

def test_duplicate_detection(test_db):
    data = ComplaintCreate(
        description="Open garbage dump on corner",
        latitude=28.6140,
        longitude=77.2095
    )
    c = create_complaint(test_db, data)

    # Search within 100m of same location
    duplicates = check_possible_duplicates(test_db, 28.6141, 77.2096, "General / Mixed Waste", radius_meters=100.0)
    assert len(duplicates) == 1
    assert duplicates[0].id == c.id

    # Search far away (5km)
    duplicates_far = check_possible_duplicates(test_db, 28.6900, 77.2095, "General / Mixed Waste", radius_meters=100.0)
    assert len(duplicates_far) == 0
