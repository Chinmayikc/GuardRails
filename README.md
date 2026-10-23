# GuardRails — SaaS Access Risk

Standalone hackathon demo for reviewing SaaS access risk. It includes a Next.js dashboard, the scanner runtime, and an AWS deployment template for evidence-backed review runs.

## Run the web application

The Next.js application is in `IDE_Scanner_web`. Use Node.js 22 as required by its package configuration.

```powershell
cd IDE_Scanner_web
npm ci
npm run dev
```

Open [`/access-risk`](https://guardrails-hackathon.vercel.app/access-risk) to explore the seeded demo workspace. Sample data is clearly identified. The AWS stack is not connected until it has been deployed and its outputs are configured in Vercel:

```text
ACCESS_RISK_AWS_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/v1/risk/run
ACCESS_RISK_AWS_API_KEY=<same random secret passed to the AWS deployment>
```

Do not prefix these values with `NEXT_PUBLIC_`.

## AWS review service

See [`aws/access-risk/README.md`](aws/access-risk/README.md) for the SAM deployment, AWS service map, permissions, and demo limitations. The template provisions an API Gateway endpoint, a Lambda reviewer, encrypted S3 evidence storage with a 30-day lifecycle, optional Bedrock explanation, and SNS alerts for critical findings.

The demo uses a seeded fictional dataset and does not connect to a live SaaS tenant or revoke permissions. A SaaS OAuth connector requires an agreed scope set and a dedicated test tenant.

## Vercel

The project is deployed at [guardrails-hackathon.vercel.app](https://guardrails-hackathon.vercel.app), with `IDE_Scanner_web` as its Root Directory and Node.js 22 as its runtime. Configure the two server-side AWS variables above to enable AWS-backed reviews.

## Included components

- `IDE_Scanner_web/` — Next.js dashboard and Access Risk experience.
- `IDE_Scanner/` — Python scanner runtime and related tooling.

