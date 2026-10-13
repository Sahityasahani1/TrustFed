"""
TrustFed: Domain-specific Pydantic V2 Request Schemas & Input Validation.
Enforces strict boundary checking, type coercion, and finite number validation
across Banks (PaySim), Lenders (Credit Fraud / Default Risk), and Insurers (Claims).
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator


class PaySimInput(BaseModel):
    """Schema for Banks (PaySim transaction evaluation)."""
    model_config = {"extra": "allow"}

    step: Optional[float] = Field(default=1.0, ge=0.0, description="1 step = 1 hour of simulation time")
    type: str = Field(..., description="Transaction type (PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN)")
    amount: float = Field(..., ge=0.0, le=1e12, description="Transaction amount in currency units")
    oldbalanceOrg: float = Field(default=0.0, ge=0.0, le=1e12, description="Sender balance before transaction")
    oldbalanceDest: float = Field(default=0.0, ge=0.0, le=1e12, description="Recipient balance before transaction")
    newbalanceOrig: Optional[float] = Field(default=None, ge=0.0, le=1e12, description="Sender balance after transaction")
    newbalanceDest: Optional[float] = Field(default=None, ge=0.0, le=1e12, description="Recipient balance after transaction")
    transaction_id: Optional[str] = Field(default="TX-PAY-0001", description="Client reference ID")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        clean = v.strip().upper()
        allowed = {"CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"}
        if clean not in allowed:
            raise ValueError(f"Invalid transaction type '{v}'. Must be one of: {', '.join(sorted(allowed))}")
        return clean


class CreditFraudInput(BaseModel):
    """Schema for Lenders (Credit Default & Fraud Risk evaluation)."""
    model_config = {"extra": "allow", "populate_by_name": True}

    applicant_id: Optional[str] = Field(default="APP-CF-0001", description="Applicant identifier")
    amt_income_total: float = Field(default=270000.0, ge=0.0, le=1e12, alias="AMT_INCOME_TOTAL")
    amt_credit: float = Field(default=1031053.5, ge=0.0, le=1e12, alias="AMT_CREDIT")
    amt_annuity: float = Field(default=34204.5, ge=0.0, le=1e12, alias="AMT_ANNUITY")
    amt_goods_price: Optional[float] = Field(default=None, ge=0.0, le=1e12, alias="AMT_GOODS_PRICE")
    ext_source_2: float = Field(default=0.55, ge=0.0, le=1.0, alias="EXT_SOURCE_2")
    ext_source_3: float = Field(default=0.45, ge=0.0, le=1.0, alias="EXT_SOURCE_3")
    days_birth: float = Field(default=-14500.0, le=0.0, ge=-40000.0, alias="DAYS_BIRTH")
    days_employed: float = Field(default=-2500.0, le=400000.0, ge=-40000.0, alias="DAYS_EMPLOYED")
    contract_type: str = Field(default="Cash loans", alias="NAME_CONTRACT_TYPE")
    code_gender: str = Field(default="M", alias="CODE_GENDER")

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize lowercase to uppercase aliases if provided
            mapping = {
                "amt_income_total": "AMT_INCOME_TOTAL",
                "amt_credit": "AMT_CREDIT",
                "amt_annuity": "AMT_ANNUITY",
                "amt_goods_price": "AMT_GOODS_PRICE",
                "ext_source_2": "EXT_SOURCE_2",
                "ext_source_3": "EXT_SOURCE_3",
                "days_birth": "DAYS_BIRTH",
                "days_employed": "DAYS_EMPLOYED",
                "contract_type": "NAME_CONTRACT_TYPE",
                "code_gender": "CODE_GENDER",
            }
            res = dict(data)
            for low, up in mapping.items():
                if low in res and up not in res:
                    res[up] = res[low]
            return res
        return data


class InsuranceClaimInput(BaseModel):
    """Schema for Insurers (Claims Fraud Risk evaluation)."""
    model_config = {"extra": "allow"}

    claim_id: Optional[str] = Field(default="CLM-INS-0001", description="Claim reference ID")
    claim_type: str = Field(default="home", max_length=50, description="Policy category: home, auto, property, renters")
    state: str = Field(default="ID", max_length=10, description="US State abbreviation")
    policyholder_tenure_years: float = Field(default=0.2, ge=0.0, le=100.0, description="Tenure in years")
    previous_claims_count: float = Field(default=0.0, ge=0.0, le=100.0, description="Count of prior claims filed")
    claim_amount: float = Field(default=23607.73, ge=0.0, le=1e10, description="Claim dollar value")
    deductible: float = Field(default=2500.0, ge=0.0, le=1e8, description="Policy deductible")
    incident_date: Optional[str] = Field(default=None, description="ISO date of incident (YYYY-MM-DD)")
    claim_filed_date: Optional[str] = Field(default=None, description="ISO date claim was filed (YYYY-MM-DD)")
    filing_delay_days: Optional[float] = Field(default=6.0, ge=0.0, le=3650.0, description="Days between incident and filing")


def validate_input_for_domain(domain: str, raw_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates arbitrary dictionary payload against the appropriate domain schema.
    Returns cleaned, validated dictionary.
    Raises ValueError on validation failure.
    """
    d = domain.lower()
    if not isinstance(raw_input, dict):
        raise ValueError("Payload must be a valid JSON object.")

    if d in ("banks", "paysim"):
        validated = PaySimInput(**raw_input)
        return validated.model_dump(exclude_none=True)
    elif d in ("creditfraud", "lenders"):
        validated = CreditFraudInput(**raw_input)
        return validated.model_dump(by_alias=True, exclude_none=True)
    elif d in ("insurance", "insurers"):
        validated = InsuranceClaimInput(**raw_input)
        return validated.model_dump(exclude_none=True)
    else:
        raise ValueError(f"Unknown domain '{domain}'. Must be one of: banks, lenders/creditfraud, insurers/insurance.")
