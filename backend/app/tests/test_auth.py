import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.all_models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

@pytest.fixture
def auth_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_password_hashing_and_verification():
    pw = "SecretPassword123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    payload = {"sub": "42", "role": "admin"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["role"] == "admin"
    assert "exp" in decoded

def test_user_creation_in_db(auth_db):
    user = User(
        email="citizen@delhi.gov.in",
        display_name="Anjali Gupta",
        hashed_password=hash_password("mypassword"),
        role="citizen"
    )
    auth_db.add(user)
    auth_db.commit()
    auth_db.refresh(user)

    fetched = auth_db.query(User).filter(User.email == "citizen@delhi.gov.in").first()
    assert fetched is not None
    assert fetched.display_name == "Anjali Gupta"
    assert fetched.role == "citizen"
