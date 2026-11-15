"""Pure, fail-closed policy evaluation primitives for ASH Nexus.

This module deliberately has no database, network, authentication, or PHI access.
It evaluates one operation against one explicit approval record.
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass
from enum import Enum
from typing import FrozenSet


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DecisionCode(str, Enum):
    APPROVED = "approved"
    APPROVAL_REQUIRED = "approval_required"
    APPROVAL_REJECTED = "approval_rejected"
    APPROVAL_EXPIRED = "approval_expired"
    SELF_APPROVAL = "self_approval_prohibited"
    OPERATION_MISMATCH = "operation_mismatch"
    TARGET_MISMATCH = "target_mismatch"
    REQUESTER_MISMATCH = "requester_mismatch"
    SCOPE_MISMATCH = "scope_mismatch"


def _required_identifier(name: str, value: str) -> None:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{name} must be a non-empty, trimmed string")


def _validate_scope(scope: FrozenSet[str]) -> None:
    if not isinstance(scope, frozenset):
        raise TypeError("scope must be an immutable frozenset")
    if not scope:
        raise ValueError("scope must contain at least one explicit permission")
    for item in scope:
        _required_identifier("scope item", item)


@dataclass(frozen=True, slots=True)
class PolicyOperation:
    operation_id: str
    action: str
    target: str
    requester_id: str
    scope: FrozenSet[str]
    risk: RiskLevel

    def __post_init__(self) -> None:
        _required_identifier("operation_id", self.operation_id)
        _required_identifier("action", self.action)
        _required_identifier("target", self.target)
        _required_identifier("requester_id", self.requester_id)
        _validate_scope(self.scope)
        if not isinstance(self.risk, RiskLevel):
            raise TypeError("risk must be a RiskLevel")


@dataclass(frozen=True, slots=True)
class ApprovalRequest:
    approval_id: str
    operation_id: str
    action: str
    target: str
    requester_id: str
    approver_id: str
    scope: FrozenSet[str]
    approved: bool
    expires_at: int

    def __post_init__(self) -> None:
        _required_identifier("approval_id", self.approval_id)
        _required_identifier("operation_id", self.operation_id)
        _required_identifier("action", self.action)
        _required_identifier("target", self.target)
        _required_identifier("requester_id", self.requester_id)
        _required_identifier("approver_id", self.approver_id)
        _validate_scope(self.scope)
        if type(self.approved) is not bool:
            raise TypeError("approved must be a boolean")
        if type(self.expires_at) is not int or self.expires_at <= 0:
            raise ValueError("expires_at must be a positive Unix timestamp")


@dataclass(frozen=True, slots=True)
class PolicyDecision:
    allowed: bool
    code: DecisionCode
    risk: RiskLevel
    approval_id: str | None = None


def _deny(
    operation: PolicyOperation,
    code: DecisionCode,
    approval: ApprovalRequest | None,
) -> PolicyDecision:
    return PolicyDecision(
        allowed=False,
        code=code,
        risk=operation.risk,
        approval_id=approval.approval_id if approval is not None else None,
    )


def evaluate_operation(
    operation: PolicyOperation,
    approval: ApprovalRequest | None,
    *,
    now: int | float | None = None,
) -> PolicyDecision:
    """Evaluate exact, time-bounded, independent approval; default is deny."""
    if not isinstance(operation, PolicyOperation):
        raise TypeError("operation must be a PolicyOperation")
    if approval is not None and not isinstance(approval, ApprovalRequest):
        raise TypeError("approval must be an ApprovalRequest or None")

    current_time = time.time() if now is None else now
    if type(current_time) not in (int, float) or not math.isfinite(current_time):
        raise ValueError("now must be a finite Unix timestamp")

    if approval is None:
        return _deny(operation, DecisionCode.APPROVAL_REQUIRED, None)

    if (
        approval.operation_id != operation.operation_id
        or approval.action != operation.action
    ):
        return _deny(operation, DecisionCode.OPERATION_MISMATCH, approval)

    if approval.target != operation.target:
        return _deny(operation, DecisionCode.TARGET_MISMATCH, approval)

    if approval.requester_id != operation.requester_id:
        return _deny(operation, DecisionCode.REQUESTER_MISMATCH, approval)

    if approval.scope != operation.scope:
        return _deny(operation, DecisionCode.SCOPE_MISMATCH, approval)

    if approval.approver_id == operation.requester_id:
        return _deny(operation, DecisionCode.SELF_APPROVAL, approval)

    if not approval.approved:
        return _deny(operation, DecisionCode.APPROVAL_REJECTED, approval)

    if current_time >= approval.expires_at:
        return _deny(operation, DecisionCode.APPROVAL_EXPIRED, approval)

    return PolicyDecision(
        allowed=True,
        code=DecisionCode.APPROVED,
        risk=operation.risk,
        approval_id=approval.approval_id,
    )
