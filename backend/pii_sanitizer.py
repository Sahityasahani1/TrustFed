"""
TrustFed: PII (Personally Identifiable Information) Sanitizer & Data Redaction Engine.
Protects sensitive financial and consumer data:
- SSNs and Tax IDs
- Primary Account Numbers (PAN / Credit Cards)
- Phone Numbers
- Email Addresses
- Passwords, Secret Keys & Tokens
- Full Names and Addresses
Applies recursive sanitization to arbitrary nested structures (dicts, lists, strings)
before persisting to audit logs or diagnostic telemetries.
"""

import re
from typing import Any, Dict, List, Set, Union

# Regex patterns for sensitive text sequences
EMAIL_REGEX = re.compile(r"([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
SSN_REGEX = re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b")
CARD_REGEX = re.compile(r"\b(?:\d[ -]?){13,19}\b")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")

# Keys whose values should always be masked or redacted
SENSITIVE_EXACT_KEYS: Set[str] = {
    "password",
    "secret",
    "token",
    "api_key",
    "ssn",
    "social_security",
    "tax_id",
    "sin",
    "cvv",
    "cvc",
    "card_number",
    "pan",
    "account_number",
    "routing_number",
    "pin",
}

SENSITIVE_PARTIAL_KEYS: Set[str] = {
    "password",
    "secret",
    "token",
    "apikey",
    "auth",
    "credential",
    "private_key",
}


def mask_email(email: str) -> str:
    """Masks email: user@example.com -> u***r@example.com"""
    match = EMAIL_REGEX.match(email.strip())
    if not match:
        return "[REDACTED_EMAIL]"
    user, domain = match.groups()
    if len(user) <= 2:
        masked_user = "*".ljust(len(user), "*")
    else:
        masked_user = user[0] + "*" * (len(user) - 2) + user[-1]
    return f"{masked_user}@{domain}"


def mask_card_number(card: str) -> str:
    """Masks credit card / account number: preserves last 4 digits."""
    digits = re.sub(r"\D", "", card)
    if len(digits) < 4:
        return "[REDACTED_CARD]"
    return "****-****-****-" + digits[-4:]


def mask_ssn(ssn: str) -> str:
    """Masks SSN: preserves last 4 digits: ***-**-1234"""
    digits = re.sub(r"\D", "", ssn)
    if len(digits) == 9:
        return f"***-**-{digits[-4:]}"
    return "[REDACTED_SSN]"


def mask_phone(phone: str) -> str:
    """Masks phone number: ***-***-1234"""
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "[REDACTED_PHONE]"


def mask_string_patterns(text: str) -> str:
    """Scans free-form text and masks embedded SSNs, cards, phones, and emails."""
    if not isinstance(text, str):
        return text

    # Mask SSNs
    text = SSN_REGEX.sub(lambda m: mask_ssn(m.group(0)), text)

    # Mask Card Numbers
    text = CARD_REGEX.sub(lambda m: mask_card_number(m.group(0)), text)

    # Mask Emails
    text = EMAIL_REGEX.sub(lambda m: mask_email(m.group(0)), text)

    # Mask Phones
    text = PHONE_REGEX.sub(lambda m: mask_phone(m.group(0)), text)

    return text


def sanitize_payload(obj: Any) -> Any:
    """
    Recursively sanitizes arbitrary Python objects (dicts, lists, strings).
    Redacts sensitive key-value pairs and masks pattern matches.
    Safe for JSON serialization.
    """
    if isinstance(obj, dict):
        sanitized: Dict[str, Any] = {}
        for key, value in obj.items():
            k_lower = str(key).strip().lower()

            if k_lower in ("ssn", "social_security", "tax_id", "sin"):
                sanitized[key] = mask_ssn(str(value)) if value else value
            elif k_lower in ("card_number", "pan", "credit_card"):
                sanitized[key] = mask_card_number(str(value)) if value else value
            elif k_lower in ("account_number", "routing_number"):
                digits = re.sub(r"\D", "", str(value))
                sanitized[key] = f"****{digits[-4:]}" if len(digits) >= 4 else "[REDACTED]"
            elif k_lower in SENSITIVE_EXACT_KEYS or any(p in k_lower for p in SENSITIVE_PARTIAL_KEYS):
                sanitized[key] = "[REDACTED]"
            elif k_lower in ("email", "mail", "user_email"):
                sanitized[key] = mask_email(str(value)) if value else value
            elif k_lower in ("phone", "telephone", "mobile"):
                sanitized[key] = mask_phone(str(value)) if value else value
            elif k_lower in ("name", "full_name", "customer_name", "applicant_name", "policyholder_name"):
                sanitized[key] = "[REDACTED_NAME]"
            else:
                sanitized[key] = sanitize_payload(value)
        return sanitized


    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]

    elif isinstance(obj, tuple):
        return tuple(sanitize_payload(item) for item in obj)

    elif isinstance(obj, str):
        return mask_string_patterns(obj)

    return obj
