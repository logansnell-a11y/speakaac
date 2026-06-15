#!/bin/bash
# Run this ONCE to store secrets in AWS Parameter Store (SSM).
# These get pulled automatically at deploy time — never stored in code.
#
# Prerequisites: aws CLI installed + aws configure done (or IAM role)
# Usage: bash aws/setup-secrets.sh

set -e

REGION="us-east-1"  # Change if you deploy to a different region

prompt_secret() {
  local name=$1
  local path=$2
  echo -n "Enter $name: "
  read -s value
  echo
  aws ssm put-parameter \
    --region "$REGION" \
    --name "$path" \
    --value "$value" \
    --type SecureString \
    --overwrite \
    --no-cli-pager
  echo "  ✓ Stored $path"
}

echo "=== Speak AAC — AWS SSM Parameter Store Setup ==="
echo "These are encrypted at rest and never touch your code."
echo

prompt_secret "Supabase URL"               "/speak/SUPABASE_URL"
prompt_secret "Supabase Service Role Key"  "/speak/SUPABASE_SERVICE_ROLE_KEY"
prompt_secret "Resend API Key"             "/speak/RESEND_API_KEY"
prompt_secret "Stripe Webhook Secret"      "/speak/STRIPE_WEBHOOK_SECRET"
prompt_secret "Stripe Secret Key"          "/speak/STRIPE_SECRET_KEY"
prompt_secret "Stripe Price ID — Family"      "/speak/STRIPE_PRICE_FAMILY"
prompt_secret "Stripe Price ID — Clinic"      "/speak/STRIPE_PRICE_CLINIC"
prompt_secret "Stripe Price ID — Institution" "/speak/STRIPE_PRICE_INSTITUTION"
prompt_secret "Stripe Price ID — Lifetime"    "/speak/STRIPE_PRICE_LIFETIME"

echo
echo "=== All secrets stored. Run 'bash aws/deploy.sh' next. ==="
