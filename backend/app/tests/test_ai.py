import pytest
from app.ai.classifier import classify_text_and_vision
from app.ai.vision import analyze_image_base64

def test_waste_burning_classification():
    text = "Someone is burning plastic bags and garbage behind the school, severe toxic smoke"
    res = classify_text_and_vision(text)
    assert res.issue_category == "Waste Burning"
    assert res.suggested_priority == "High"
    assert "Plastic" in res.waste_categories
    assert res.confidence >= 70.0
    assert not (res.confidence % 1 != res.confidence % 1) # Valid float

def test_blocked_drain_classification():
    text = "The naali is choked with cups and polythene, overflowing dirty stagnant water"
    res = classify_text_and_vision(text)
    assert res.issue_category == "Blocked Drain"
    assert res.suggested_priority == "High"
    assert "Water stagnation hazard" in res.priority_reason

def test_construction_demolition_classification():
    text = "Large pile of concrete malba, broken bricks and plaster dumped on footpath"
    res = classify_text_and_vision(text)
    assert res.issue_category == "Construction & Demolition (C&D)"
    assert "Debris / Inerts" in res.waste_categories

def test_low_severity_modifier():
    text = "A single small plastic wrapper on the pavement"
    res = classify_text_and_vision(text)
    assert res.suggested_priority == "Low"
    assert "Plastic" in res.waste_categories

def test_confidence_calibration_is_deterministic():
    text = "Overflowing dustbin with rotting vegetable waste and flies"
    res1 = classify_text_and_vision(text)
    res2 = classify_text_and_vision(text)
    # Must be 100% deterministic, NO Math.random()!
    assert res1.confidence == res2.confidence
    assert res1.suggested_priority == res2.suggested_priority
