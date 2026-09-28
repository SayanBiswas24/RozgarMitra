from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .session import Base

class TranscriptDB(Base):
    __tablename__ = "transcripts"
    request_id = Column(String, primary_key=True)
    original_text = Column(String, nullable=False)
    language_code = Column(String, nullable=False)
    language_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LivelihoodProfileDB(Base):
    __tablename__ = "livelihood_profiles"
    id = Column(String, primary_key=True)
    occupation = Column(String, nullable=True)
    experience_years = Column(Float, nullable=True)
    work_description = Column(String, nullable=True)
    education = Column(String, nullable=True)
    employment_preference = Column(String, nullable=True)
    source_transcript_id = Column(String, ForeignKey("transcripts.request_id"), nullable=True)
    
    # We will store skills in a separate table for normalized matching
    profile_skills = relationship("ProfileSkillDB", back_populates="profile", cascade="all, delete-orphan")

class ProfileSkillDB(Base):
    __tablename__ = "profile_skills"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(String, ForeignKey("livelihood_profiles.id"), nullable=False)
    raw_skill = Column(String, nullable=False)
    canonical_name = Column(String, nullable=True)
    normalization_method = Column(String, nullable=True)
    
    profile = relationship("LivelihoodProfileDB", back_populates="profile_skills")

class RecommendationDB(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True)
    profile_id = Column(String, ForeignKey("livelihood_profiles.id"), nullable=False)
    role_id = Column(String, nullable=False)
    match_percentage = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    skill_gaps = relationship("SkillGapDB", back_populates="recommendation", cascade="all, delete-orphan")

class SkillGapDB(Base):
    __tablename__ = "skill_gaps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    skill_name = Column(String, nullable=False)
    gap_status = Column(String, nullable=False) # 'matched' or 'missing'
    
    recommendation = relationship("RecommendationDB", back_populates="skill_gaps")

class QualificationDB(Base):
    __tablename__ = "qualifications"
    id = Column(String, primary_key=True)
    qualification_code = Column(String, nullable=True)
    qualification_name = Column(String, nullable=True)
    job_role = Column(String, nullable=True)
    nsqf_level = Column(Integer, nullable=True)
    awarding_body = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    status = Column(String, nullable=True)
    source_type = Column(String, nullable=False)
    data_status = Column(String, nullable=False)
    last_verified = Column(String, nullable=True)
