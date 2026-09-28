from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date

class QualificationRecord(BaseModel):
    qualification_id: Optional[str] = Field(None, description="Internal DB ID or unique string")
    qualification_code: Optional[str] = Field(None, description="Official NQR or QP Code")
    qualification_name: Optional[str] = Field(None, description="Official Name")
    job_role: Optional[str] = Field(None, description="Associated job role")
    nsqf_level: Optional[int] = Field(None, description="Official NSQF Level")
    awarding_body: Optional[str] = Field(None, description="e.g. NCVET, NSDC")
    sector: Optional[str] = Field(None, description="Sector Skill Council or category")
    status: Optional[str] = Field(None, description="Active, Inactive, etc.")
    validity_start: Optional[date] = None
    validity_end: Optional[date] = None
    source: Optional[str] = Field(None, description="source_type e.g. NCVET_NQR")
    source_url: Optional[str] = Field(None, description="URL to official registry")
    source_type: str = Field(..., description="OFFICIAL, DEVELOPMENT, UNVERIFIED")
    last_verified: Optional[str] = Field(None, description="Verification timestamp/date")
    data_status: str = Field(..., description="verified, unverified, development")
