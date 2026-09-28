# PS-97 Voice Processing Module

> **SIH (Smart India Hackathon) PS-97 — AI-Driven Voice Assistant for Livelihood Mapping**  
> **Module:** Multilingual Support / Voice Processing  
> **Stage:** 5 — AI-Driven Skilling Recommendation Engine & Database Persistence

---

## 1. What This Module Does

This backend module converts the multilingual original transcript into validated livelihood profile data, normalizes raw user skills into canonical skills using deterministic aliases, compares canonical skills against a target role's required skills to calculate a skill gap percentage, and generates explainable role recommendations while persisting data securely in PostgreSQL.

**Current pipeline:**
```
Voice processing
        ↓
Original transcript
        ↓
Structured livelihood extraction
        ↓
Normalized Skills
        ↓
Skill Gap & Target Role
        ↓
Recommendation Engine
        ↓
Database Persistence (PostgreSQL / SQLite testing)
```

## 2. Recommendation Architecture

We have introduced a clean `RecommendationEngine` abstraction under `app/services/recommendation` and database capabilities via SQLAlchemy in `app/db`.

```
backend/app/
├── services/recommendation/
│   ├── models.py               <- Recommendation, LearningPath 
│   └── engine.py               <- Deterministic matching and explanations
└── db/
    ├── session.py              <- AsyncSession generator, DB init
    ├── models.py               <- PostgreSQL/SQLite declarative base models
    └── repositories.py         <- Data saving layer decoupled from business logic
```

### Explanations & Transparency
No opaque AI decisions are made. The recommendation algorithm strictly compares verified canonical skills from the profile against the target role prerequisites and generates a deterministic percentage match alongside a natural language `reason`.

### Resilience
The API endpoint strictly separates calculation from persistence. If the PostgreSQL database goes offline, calculations will still succeed, returning the results with a `persistence_status="failed"` rather than crashing the system.

## 3. Database Schema

- `transcripts`
- `livelihood_profiles`
- `profile_skills`
- `recommendations`
- `skill_gaps`

The schema avoids recording sensitive identifying personal data and tracks only job-related parameters safely.

## 4. API Endpoints

### `POST /api/recommendations`

Calculates matched roles based on the input profile and immediately persists the results and gaps if the database is available.

**Example Request:**
```json
{
  "request_id": "req-999",
  "profile": {
    "occupation": "Farmer",
    "skills": ["tractor theek karta hoon"]
  }
}
```

**Example Response:**
```json
{
  "request_id": "req-999",
  "status": "success",
  "persistence_status": "saved",
  "recommendations": [
    {
      "recommendation_id": "abc-123",
      "role_id": "tractor_mechanic_demo",
      "role_name": "Tractor Mechanic",
      "match_percentage": 50.0,
      "matched_skills": ["Tractor Repair"],
      "missing_skills": ["Electrical Repair"],
      "reason": "The profile contains Tractor Repair. This role requires Electrical Repair which is missing from the profile.",
      "qualification": {
        "qualification_id": null,
        "qualification_name": null,
        "nsqf_level": null,
        "source": "unverified/development"
      },
      "data_status": "development",
      "learning_path": [
        {
          "skill": "Electrical Repair",
          "priority": "required_for_role",
          "reason": "This skill is required by the selected development role but is not present in the beneficiary profile."
        }
      ]
    }
  ]
}
```

## 5. Testing & Environment

By default, the testing environment utilizes an in-memory `sqlite+aiosqlite:///:memory:` connection so CI/CD and developer tests run instantaneously without configuring a live PostgreSQL instance.

Run tests with `pytest`:
```bash
pytest tests/ -v
```
All tests spanning Stage 1 through 5 pass smoothly (72 total tests).

## 6. Limitations and Data Governance

- **Unverified NSQF Data:** The target qualifications explicitly surface `null` for `nsqf_level` because we lack an authenticated dataset from NSDC/NCVET.
- **"Best Fit" Constraints:** The engine deliberately does not claim any job is the "perfect career". It merely calculates empirical skill matching gaps using available data.


## Mobile API Contract

The mobile app should communicate exclusively with the FastAPI backend, never directly with BHASHINI.

**Endpoint:**
`POST /api/pipeline`

**Content-Type:**
`multipart/form-data`

**Field:**
`audio` (The recorded audio file, preferably in standard formats like WAV, MP3, M4A, or WebM).

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/pipeline" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@recording.wav;type=audio/wav"
```

**Success Response (HTTP 200 OK):**
```json
{
  "request_id": "uuid",
  "language_code": "hi",
  "language_name": "Hindi",
  "language_mode": "monolingual",
  "confidence": 0.9,
  "provider": "bhashini",
  "original_text": "नमस्ते मेरा नाम राम है मैं एक किसान हूँ",
  "extracted_livelihood": {
    "current_occupation": "Farmer",
    "skills": ["Farming"],
    "experience_years": null,
    "location": null
  },
  "normalized_skills": [
    {
      "canonical_name": "Farming",
      "nsqf_level": null,
      "category": "Agriculture"
    }
  ],
  "recommendations": []
}
```

**Error Response (HTTP 4xx or 500):**
```json
{
  "error_code": "PIPELINE_ERROR",
  "message": "Detailed error message"
}
```

**CORS & Configuration:**
CORS is currently configured to allow `*` (all origins) for `POST`, `GET`, `OPTIONS`. The base URL should be configured in the mobile app environment variables.
