from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_normalize_exact_skill_match():
    # 1. Exact skill match
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["Tractor Repair"]})
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] == "Tractor Repair"
    assert skills[0]["normalization_status"] == "matched"

def test_normalize_alias_match():
    # 2. Alias match
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["tractor repairing"]})
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] == "Tractor Repair"

def test_normalize_hindi_alias():
    # 3. Hindi alias
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["खेती करना"]})
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] == "Agriculture"

def test_normalize_hinglish_alias():
    # 4. Hinglish alias
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["kheti"]})
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] == "Agriculture"

def test_normalize_bhojpuri_hinglish():
    # 5. Bhojpuri/Hinglish example
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["tractor theek karta hoon"]})
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] == "Tractor Repair"

def test_normalize_unknown_skill():
    # 6. Unknown skill
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["some unknown skill"]})
    skills = resp.json()["skills"]
    assert skills[0]["canonical_name"] is None
    assert skills[0]["normalization_status"] == "unmatched"

def test_normalize_duplicate_skills():
    # 7. Duplicate skills
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["kheti", "kheti"]})
    skills = resp.json()["skills"]
    assert len(skills) == 1

def test_normalize_source_traceability():
    # 8. Source traceability
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["tractor theek karta hoon"]})
    skills = resp.json()["skills"]
    assert skills[0]["raw_skill"] == "tractor theek karta hoon"
    assert skills[0]["normalization_method"] == "alias_match"

def test_normalize_tractor_repair():
    # 9. Tractor Repair normalization
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["tractor thik karta hoon"]})
    assert resp.json()["skills"][0]["canonical_name"] == "Tractor Repair"

def test_normalize_agriculture():
    # 10. Agriculture normalization
    resp = client.post("/api/skills/normalize", json={"request_id": "1", "skills": ["farming"]})
    assert resp.json()["skills"][0]["canonical_name"] == "Agriculture"

def test_gap_all_skills_matched():
    # 11. Skill gap with all skills matched
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "tractor_mechanic_demo", "skills": ["Tractor Repair", "Electrical Repair"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["match_percentage"] == 100.0
    assert len(data["missing_skills"]) == 0

def test_gap_partial_match():
    # 12. Skill gap with partial match
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "tractor_mechanic_demo", "skills": ["Tractor Repair"]})
    data = resp.json()
    assert data["match_percentage"] == 50.0
    assert "Electrical Repair" in data["missing_skills"]

def test_gap_zero_match():
    # 13. Skill gap with zero match
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "tractor_mechanic_demo", "skills": ["Welding"]})
    data = resp.json()
    assert data["match_percentage"] == 0.0
    assert len(data["matched_skills"]) == 0

def test_gap_correct_match_percentage():
    # 14. Correct match percentage
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "tractor_mechanic_demo", "skills": ["Tractor Repair"]})
    assert resp.json()["match_percentage"] == 50.0

def test_gap_empty_required_skills():
    # 15. Empty required skills
    # Let's add a dummy role dynamically for this test, or we can mock it
    from app.services.skills.catalog import DEVELOPMENT_ROLE_CATALOG, SkillRequirement
    DEVELOPMENT_ROLE_CATALOG["empty_role"] = SkillRequirement(role_id="empty", role_name="Empty", required_skills=[])
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "empty_role", "skills": ["Some"]})
    assert resp.json()["match_percentage"] == 100.0

def test_gap_invalid_role():
    # 16. Invalid role
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "nonexistent", "skills": []})
    assert resp.status_code == 404

def test_gap_development_qualification_status():
    # 17. Development qualification status
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "farmer_demo", "skills": []})
    assert resp.json()["data_status"] == "development"

def test_gap_nsqf_fields_null():
    # 18. NSQF fields remain null without verified data
    resp = client.post("/api/skills/gap", json={"request_id": "1", "target_role_id": "farmer_demo", "skills": []})
    qual = resp.json()["qualification"]
    assert qual["qualification_id"] is None
    assert qual["qualification_name"] is None
    assert qual["nsqf_level"] is None
    assert qual["source"] == "unverified/development"
