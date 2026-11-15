"""Unit tests for the pure ASH Policy & Approval Engine."""
import pytest

from backend.app.policy_engine import (
    ApprovalRequest,
    DecisionCode,
    PolicyOperation,
    RiskLevel,
    evaluate_operation,
)


def operation(**overrides):
    values = dict(
        operation_id="op-001",
        action="patient.export",
        target="tenant:aybek",
        requester_id="user-17",
        scope=frozenset({"records:summary", "tenant:aybek"}),
        risk=RiskLevel.HIGH,
    )
    values.update(overrides)
    return PolicyOperation(**values)


def approval(**overrides):
    values = dict(
        approval_id="approval-001",
        operation_id="op-001",
        action="patient.export",
        target="tenant:aybek",
        requester_id="user-17",
        approver_id="user-23",
        scope=frozenset({"records:summary", "tenant:aybek"}),
        approved=True,
        expires_at=200,
    )
    values.update(overrides)
    return ApprovalRequest(**values)


def test_allows_only_an_exact_valid_approval():
    result = evaluate_operation(operation(), approval(), now=100)
    assert result.allowed is True
    assert result.code is DecisionCode.APPROVED
    assert result.risk is RiskLevel.HIGH
    assert result.approval_id == "approval-001"


def test_denies_when_approval_is_missing():
    result = evaluate_operation(operation(), None, now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.APPROVAL_REQUIRED


def test_denies_an_explicitly_rejected_approval():
    result = evaluate_operation(operation(), approval(approved=False), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.APPROVAL_REJECTED


def test_denies_expired_approval_at_the_expiry_boundary():
    result = evaluate_operation(operation(), approval(expires_at=100), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.APPROVAL_EXPIRED


def test_denies_scope_expansion_or_reduction():
    result = evaluate_operation(
        operation(),
        approval(scope=frozenset({"records:summary", "tenant:aybek", "records:full"})),
        now=100,
    )
    assert result.allowed is False
    assert result.code is DecisionCode.SCOPE_MISMATCH


def test_denies_operation_id_or_action_mismatch():
    result = evaluate_operation(operation(), approval(action="patient.delete"), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.OPERATION_MISMATCH


def test_denies_target_mismatch():
    result = evaluate_operation(operation(), approval(target="tenant:other"), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.TARGET_MISMATCH


def test_denies_requester_mismatch():
    result = evaluate_operation(operation(), approval(requester_id="user-99"), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.REQUESTER_MISMATCH


def test_prohibits_self_approval():
    result = evaluate_operation(operation(), approval(approver_id="user-17"), now=100)
    assert result.allowed is False
    assert result.code is DecisionCode.SELF_APPROVAL


def test_rejects_empty_or_mutable_scope_inputs():
    with pytest.raises(ValueError):
        operation(scope=frozenset())
    with pytest.raises(TypeError):
        operation(scope={"records:summary"})
