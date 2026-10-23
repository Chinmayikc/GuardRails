import importlib.util
import json
import pathlib
import sys
import types
import unittest


class Client:
    def __init__(self, failure=None):
        self.failure = failure
        self.calls = []

    def put_object(self, **kwargs):
        if self.failure:
            raise self.failure
        self.calls.append(kwargs)

    def publish(self, **kwargs):
        self.calls.append(kwargs)

    def invoke_model(self, **kwargs):
        if self.failure:
            raise self.failure
        return {"body": types.SimpleNamespace(read=lambda: b'{"output":{"message":{"content":[{"text":"Bedrock summary"}]}}}')}


_clients = {"s3": Client(), "sns": Client(), "bedrock-runtime": Client(RuntimeError("not configured"))}
fake_boto3 = types.ModuleType("boto3")
fake_boto3.client = lambda name: _clients[name]
sys.modules["boto3"] = fake_boto3

source = pathlib.Path(__file__).parents[1] / "src" / "app.py"
spec = importlib.util.spec_from_file_location("access_risk_app", source)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)


class AccessRiskHandlerTests(unittest.TestCase):
    def setUp(self):
        for client in _clients.values():
            client.calls.clear()
        app.os.environ["ACCESS_RISK_API_KEY"] = "x" * 40
        app.os.environ["ACCESS_RISK_BUCKET"] = "test-evidence"
        app.os.environ["ACCESS_RISK_TOPIC"] = "arn:aws:sns:region:account:test"
        app.os.environ.pop("BEDROCK_MODEL_ID", None)

    def invoke(self, payload, headers=None):
        return app.handler({
            "headers": headers or {"x-api-key": "x" * 40},
            "body": json.dumps(payload),
        }, None)

    def test_rejects_unauthorized_request(self):
        response = self.invoke({"action": "analyze", "findings": []}, {"x-api-key": "wrong"})
        self.assertEqual(response["statusCode"], 401)

    def test_rejects_invalid_finding_shape(self):
        response = self.invoke({"action": "analyze", "findings": [{"id": "AR-1", "evidence": "not-a-list"}]})
        self.assertEqual(response["statusCode"], 400)

    def test_saves_encrypted_report_and_notifies_critical_finding(self):
        response = self.invoke({"action": "analyze", "findings": [{"id": "AR-1", "severity": "Critical", "evidence": ["synthetic fact"]}]})
        payload = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(payload["provider"], "aws")
        self.assertEqual(payload["explanationSource"], "rules")
        self.assertEqual(_clients["s3"].calls[0]["ServerSideEncryption"], "aws:kms")
        self.assertEqual(len(_clients["sns"].calls), 1)

    def test_bedrock_failure_uses_disclosed_rules_fallback(self):
        app.os.environ["BEDROCK_MODEL_ID"] = "test-model"
        explanation, source_name = app._bedrock_explanation([{"id": "AR-1", "severity": "High", "evidence": []}])
        self.assertEqual(source_name, "rules")
        self.assertIn("high priority", explanation)


if __name__ == "__main__":
    unittest.main()
