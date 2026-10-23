"""Small, auditable access-risk API for the Abscissa hackathon demo."""

import base64
import json
import os
import secrets
from datetime import datetime, timezone

import boto3

s3 = boto3.client("s3")
sns = boto3.client("sns")
bedrock = boto3.client("bedrock-runtime")


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json", "cache-control": "no-store"},
        "body": json.dumps(body),
    }


def _explanation(findings):
    high = [item for item in findings if item.get("severity") in {"Critical", "High"}]
    ids = ", ".join(item.get("id", "unknown") for item in high[:4]) or "none"
    return f"{len(findings)} access signals were reviewed. {len(high)} are high priority ({ids}). Validate the evidence with each resource owner before changing access."


def _bedrock_explanation(findings):
    model_id = os.environ.get("BEDROCK_MODEL_ID")
    if not model_id:
        return _explanation(findings), "rules"
    evidence = [{
        "id": item.get("id"),
        "severity": item.get("severity"),
        "category": item.get("category"),
        "app": item.get("app"),
        "role": item.get("role"),
        "evidence": item.get("evidence", [])[:5],
        "recommendation": item.get("recommendation"),
    } for item in findings]
    prompt = (
        "Summarize these access-risk findings in at most 90 words. Use only supplied evidence. "
        "Separate observed facts from suggested checks. Never claim access was revoked, never invent facts, "
        "and never recommend automatic revocation. Findings JSON: " + json.dumps(evidence, separators=(",", ":"))
    )
    try:
        result = bedrock.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({"schemaVersion": "messages-v1", "messages": [{"role": "user", "content": [{"text": prompt}]}], "inferenceConfig": {"maxTokens": 180, "temperature": 0.1}}),
        )
        decoded = json.loads(result["body"].read())
        text = decoded.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "")
        return (text.strip()[:1200], "bedrock") if text else (_explanation(findings), "rules")
    except Exception:
        # The deterministic evidence-based review remains available if Bedrock isn't enabled.
        return _explanation(findings), "rules"


def handler(event, _context):
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
    expected = os.environ.get("ACCESS_RISK_API_KEY", "")
    supplied = headers.get("x-api-key", "")
    if len(expected) < 32 or not secrets.compare_digest(supplied, expected):
        return _response(401, {"error": "Unauthorized"})

    try:
        body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body).decode("utf-8")
        payload = json.loads(body)
        findings = payload.get("findings")
        if payload.get("action") != "analyze" or not isinstance(findings, list) or not 1 <= len(findings) <= 30:
            return _response(400, {"error": "Expected analyze action and 1 to 30 findings."})
        if any(not isinstance(item, dict) or not isinstance(item.get("id"), str) or not isinstance(item.get("evidence"), list) for item in findings):
            return _response(400, {"error": "Each finding must include an id and evidence list."})
    except (ValueError, TypeError, UnicodeDecodeError):
        return _response(400, {"error": "Invalid JSON request."})

    now = datetime.now(timezone.utc)
    run_id = f"{now.strftime('%Y%m%dT%H%M%SZ')}-{secrets.token_hex(4)}"
    explanation, explanation_source = _bedrock_explanation(findings)
    report = {"runId": run_id, "createdAt": now.isoformat(), "provider": "aws", "findings": findings, "explanation": explanation, "explanationSource": explanation_source}
    try:
        s3.put_object(
            Bucket=os.environ["ACCESS_RISK_BUCKET"],
            Key=f"reviews/{now:%Y/%m/%d}/{run_id}.json",
            Body=json.dumps(report, separators=(",", ":")).encode("utf-8"),
            ContentType="application/json",
            ServerSideEncryption="aws:kms",
            SSEKMSKeyId="alias/aws/s3",
        )
    except Exception:
        return _response(503, {"error": "Could not persist the review evidence to encrypted storage."})

    urgent = [item for item in findings if item.get("severity") == "Critical"]
    if urgent:
        try:
            sns.publish(TopicArn=os.environ["ACCESS_RISK_TOPIC"], Subject="Critical SaaS access finding needs review", Message=json.dumps({"runId": run_id, "findings": [item.get("id") for item in urgent]}))
        except Exception:
            # The review is stored even if optional alert delivery is not configured.
            pass
    return _response(200, report)
