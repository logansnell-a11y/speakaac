# Speak AAC — AWS Migration Runbook

## What this does
Replaces Netlify functions + direct Anthropic API with:
- **AWS Lambda** — serverless functions (free tier: 1M req/mo)
- **AWS API Gateway** — HTTP routing to Lambda
- **AWS Bedrock** — Claude Haiku (same model, HIPAA BAA included)

One free AWS BAA in AWS Artifact covers all of it.

---

## Step 1 — AWS Account + IAM

1. Create account at https://aws.amazon.com (free tier)
2. In the console → **IAM** → create a user `speak-deploy`
3. Attach policy: `AdministratorAccess` (tighten later)
4. Under the user → **Security credentials** → Create access key → CLI
5. Save the Access Key ID and Secret

---

## Step 2 — Install tools (one-time)

```bash
brew install awscli
brew install aws-sam-cli
```

```bash
aws configure
# AWS Access Key ID: <paste>
# AWS Secret Access Key: <paste>
# Default region: us-east-1
# Default output format: json
```

---

## Step 3 — Accept the AWS BAA (one-time, free)

1. Go to **AWS Artifact** → https://console.aws.amazon.com/artifact
2. Search "Business Associate Addendum"
3. Click **Accept** — covers Lambda, API Gateway, Bedrock, Amplify, RDS

---

## Step 4 — Enable Bedrock model (one-time)

1. Go to https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/models
2. Find **Claude Haiku** → click **Request model access** → Submit
3. Wait ~1 min for approval (usually instant)

---

## Step 5 — Store secrets (one-time)

From repo root:
```bash
bash aws/setup-secrets.sh
```

You'll be prompted for each secret. These go into AWS SSM Parameter Store — encrypted, never in code.

Values you need:
- **Supabase URL**: from your Supabase project settings
- **Supabase Service Role Key**: from Supabase → Settings → API → service_role key
- **Resend API Key**: from resend.com dashboard
- **Stripe Webhook Secret**: from Stripe → Developers → Webhooks → your endpoint → Signing secret
- **Stripe Secret Key**: from Stripe → Developers → API keys → Secret key
- **Stripe Price IDs**: from Stripe → Products → each product → Price ID (starts with `price_`)

---

## Step 6 — Deploy

```bash
bash aws/deploy.sh
```

This builds + deploys all three Lambda functions and API Gateway. Takes ~2 min.

At the end it prints a table with your endpoint URLs. Copy the **ApiBaseUrl**.

---

## Step 7 — Update app.js

```bash
bash aws/update-endpoints.sh https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
```

Then commit + push:
```bash
git add app.js
git commit -m "chore: migrate endpoints from Netlify to AWS Lambda"
git push
```

---

## Step 8 — Update Stripe webhook

1. Go to Stripe → Developers → Webhooks
2. Update the endpoint URL to:
   `https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/stripe-webhook`
3. Events to listen for: `checkout.session.completed`

---

## Step 9 — Set up AWS Amplify (replaces Netlify hosting)

1. Go to https://console.aws.amazon.com/amplify
2. **Host web app** → GitHub → select `aac-app` repo → `main` branch
3. Build settings: no build command needed (static site)
4. Deploy
5. Add custom domain: `speakaac.org` (Amplify handles SSL cert automatically)
6. Once verified, remove site from Netlify

---

## After everything is live

- Cancel Netlify Business → save $19/mo
- Cancel Supabase Pro → save $25/mo (stay on free tier until first clinic payment)
- Total savings: **$44/mo** → $0/mo

---

## Re-deploy after code changes

```bash
bash aws/deploy.sh
```

That's it. SAM handles everything.
