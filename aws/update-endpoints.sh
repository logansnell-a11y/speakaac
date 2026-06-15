#!/bin/bash
# Run AFTER deploy.sh — updates app.js to point at AWS Lambda instead of Netlify.
# Usage: bash aws/update-endpoints.sh https://abc123.execute-api.us-east-1.amazonaws.com/prod

set -e

if [ -z "$1" ]; then
  echo "Usage: bash aws/update-endpoints.sh <ApiBaseUrl>"
  echo "  Get ApiBaseUrl from the deploy.sh output table."
  exit 1
fi

BASE_URL="${1%/}"  # strip trailing slash

sed -i '' \
  "s|/.netlify/functions/ai-sentence|${BASE_URL}/ai-sentence|g" \
  app.js

sed -i '' \
  "s|/.netlify/functions/send-safety-alert|${BASE_URL}/send-safety-alert|g" \
  app.js

echo "✓ app.js updated:"
grep -n "execute-api\|ai-sentence\|send-safety-alert" app.js | head -10
echo
echo "Next: commit + push → Amplify auto-deploys."
echo "Then update your Stripe webhook endpoint in the Stripe dashboard to:"
echo "  ${BASE_URL}/stripe-webhook"
