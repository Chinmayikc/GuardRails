# GuardRails Access Risk AWS API

This SAM stack provides the demo's AWS-backed review path.

## What it provisions

- API Gateway `POST /v1/risk/run`, protected by a random shared server-to-server secret.
- Python 3.12 Lambda that validates the request and returns a deterministic evidence-based summary. Bedrock explanations are opt-in and disabled by default.
- Private S3 bucket with KMS encryption, public access blocks, and a 30-day lifecycle for demo review records.
- SNS topic for notifications when a review contains a critical finding.
- Throttling on the API stage and narrowly scoped Lambda permissions, including S3-scoped KMS data-key access for encrypted writes.

## Deploy

From this directory, with AWS SAM CLI and an authenticated AWS profile available:

```bash
sam build --template-file template.yaml
sam deploy --guided --template-file .aws-sam/build/template.yaml
```

Use a unique random `ApiSharedSecret` of at least 32 characters. Leave `BedrockModelId` empty to avoid model inference and use the deterministic rules-only summary. Save the stack output `AccessRiskApiUrl` and configure both `ACCESS_RISK_AWS_API_URL` and the exact same secret as `ACCESS_RISK_AWS_API_KEY` in Vercel. Keep the API key server-side. The browser never receives it.

To opt into Bedrock later, set `BedrockModelId` to a model available to the account and region, then redeploy. This adds `bedrock:InvokeModel` permission to the Lambda role and can consume Free Tier credits or incur charges, so keep it disabled unless you deliberately choose that tradeoff.

## Data and safety boundaries

The current UI sends only the included demo findings. Reviews are stored in S3 with a 30-day expiration. Critical results publish an identifier-only message to SNS. The stack does not create an email subscription, connect to a customer SaaS tenant, or revoke access. Those steps require a real source connector, explicit tenant consent, and a human approval workflow.
