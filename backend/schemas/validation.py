"""
Pydantic request/response validation schemas for UDHBHA API.
All incoming request bodies are validated against these schemas
before any business logic is executed.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
import re


# ============ Auth Schemas ============

class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        return v.strip()


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return v.lower().strip()


class AuthResponse(BaseModel):
    token: str
    user: dict


# ============ Submission Schemas ============

VALID_STATUSES = {'DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'AUDIT_PASSED', 'AUDIT_FAILED'}
VALID_CHANGE_KINDS = {
    'ADD_FLOOR', 'GEOMETRY_CORRECTION', 'DEACTIVATE_COMPONENT',
    'MERGE_COMPONENTS', 'MISC', 'BASELINE', 'TOPOLOGY_ONLY',
    'RIGHTS_ONLY', 'TOPOLOGY_AND_RIGHTS', 'DOCUMENT_UPDATE', 'AUTO'
}


class SubmissionMeta(BaseModel):
    submission_id: str = Field(..., min_length=1, max_length=128)
    status: str = Field(default='DRAFT')
    created_by: str = Field(default='')
    schema_version: str = Field(default='v1')
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    return_comment: Optional[str] = None
    parent_submission_id: Optional[str] = None
    change_kind: Optional[str] = None
    change_note: Optional[str] = None
    revision_number: Optional[int] = Field(default=1, ge=1)
    locked: Optional[bool] = False
    audit_trail: Optional[List[dict]] = Field(default_factory=list)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f'Invalid status: {v}. Must be one of: {VALID_STATUSES}')
        return v


class SubmissionCreateRequest(BaseModel):
    """Schema for creating or updating a submission."""
    meta: SubmissionMeta
    parcel: Optional[dict] = None
    buildings: Optional[List[dict]] = Field(default_factory=list)
    floors: Optional[List[dict]] = Field(default_factory=list)
    components: Optional[List[dict]] = Field(default_factory=list)
    claims: Optional[List[dict]] = Field(default_factory=list)
    rights_events: Optional[List[dict]] = Field(default_factory=list)
    claims_current: Optional[dict] = None
    topology_events: Optional[List[dict]] = Field(default_factory=list)
    geometry_store: Optional[Dict[str, Any]] = Field(default_factory=dict)
    documents: Optional[List[dict]] = Field(default_factory=list)
    documents_index: Optional[Dict[str, Any]] = Field(default_factory=dict)


# ============ Audit Schemas ============

VALID_DECISIONS = {'PASS', 'RETURNED', 'FAIL'}


class AuditReportRequest(BaseModel):
    """Schema for saving an audit report."""
    submission_id: str = Field(..., min_length=1)
    audit_id: Optional[str] = None
    parent_submission_id: Optional[str] = None
    auditor_id: Optional[str] = None
    audited_at: Optional[str] = None
    decision: Optional[str] = None
    change_kind_detected: Optional[str] = None
    summary: Optional[dict] = None
    checks: Optional[dict] = None
    reasons: Optional[List[dict]] = Field(default_factory=list)
    notes: Optional[dict] = None
    integrity: Optional[dict] = None
    fix_hints: Optional[dict] = None

    @field_validator('decision')
    @classmethod
    def validate_decision(cls, v):
        if v is not None and v not in VALID_DECISIONS:
            raise ValueError(f'Invalid decision: {v}. Must be one of: {VALID_DECISIONS}')
        return v


class RegistrarRecordRequest(BaseModel):
    """Schema for saving a registrar record."""
    submission_id: str = Field(..., min_length=1)
    # Allow additional fields dynamically
    model_config = {"extra": "allow"}


class TransparencyBundleRequest(BaseModel):
    """Schema for saving a transparency bundle."""
    transparency_bundle: dict

    @field_validator('transparency_bundle')
    @classmethod
    def validate_has_submission_id(cls, v):
        if 'submission_id' not in v:
            raise ValueError('transparency_bundle must contain submission_id')
        return v


class BlockchainAnchorRequest(BaseModel):
    """Schema for blockchain anchoring."""
    bundle_data: dict
    submission_id: str = Field(..., min_length=1)


# ============ Validation Helper ============

def validate_request(schema_class, data: dict):
    """
    Validate request data against a Pydantic schema.
    
    Returns:
        (parsed_data, None) on success
        (None, error_response) on failure
    """
    try:
        parsed = schema_class(**data)
        return parsed, None
    except Exception as e:
        errors = []
        if hasattr(e, 'errors'):
            for err in e.errors():
                field = '.'.join(str(loc) for loc in err['loc'])
                errors.append({
                    'field': field,
                    'message': err['msg'],
                    'type': err['type']
                })
        else:
            errors.append({'field': 'unknown', 'message': str(e)})
        
        return None, {
            'error': 'Validation failed',
            'details': errors
        }
