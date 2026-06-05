from sqlalchemy import Column, BigInteger, String, JSON, DECIMAL, DateTime, Enum, ForeignKey, Boolean
from .database import Base
import enum

class MatchStatus(str, enum.Enum):
    pushed = "pushed"
    viewed = "viewed"
    confirmed = "confirmed"
    done = "done"
    invalid = "invalid"

class ResourceStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    inactive = "inactive"
    rejected = "rejected"

class Resource(Base):
    __tablename__ = "resources"
    resource_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger)
    tags = Column(JSON)
    area_code = Column(String(20))
    price_range = Column(JSON)
    status = Column(String(20), default="pending")

class Match(Base):
    __tablename__ = "matches"
    match_id = Column(BigInteger, primary_key=True, index=True)
    need_id = Column(BigInteger)
    resource_id = Column(BigInteger, ForeignKey("resources.resource_id"))
    match_score = Column(DECIMAL(5, 2))
    status = Column(String(20))
    push_time = Column(DateTime)


class Opportunity(Base):
    __tablename__ = "opportunities"
    opportunity_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, nullable=False)
    title = Column(String(200), nullable=False)
    company_name = Column(String(120), nullable=False)
    industry = Column(String(60), nullable=False)
    logo_gradient = Column(String(100), nullable=False)
    recruitment_type = Column(String(60), nullable=False)
    location = Column(String(60), nullable=False)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    no_written_test = Column(Boolean, nullable=False, default=False)
    position = Column(String(120), nullable=False)
    announcement_url = Column(String(500), nullable=False)
    apply_url = Column(String(500), nullable=False)
    source_type = Column(String(30), nullable=False)
    created_at = Column(DateTime)
