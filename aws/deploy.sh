#!/bin/bash
# Deploys all three Lambda functions + API Gateway using AWS SAM.
# Run from the repo root: bash aws/deploy.sh
#
# Prerequisites:
#   1. AWS CLI installed: brew install awscli
#   2. SAM CLI installed: brew install aws-sam-cli
#   3. Configured: aws configure  (us-east-1, your Access Key + Secret)
#   4. Secrets stored: bash aws/setup-secrets.sh
#   5. Bedrock model enabled in AWS console:
#      https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/models
#      → Enable: Claude Haiku 4.5

set -e

STACK_NAME="speak-aac"
REGION="us-east-1"
S3_BUCKET="speak-sam-deploy-$(aws sts get-caller-identity --query Account --output text --region $REGION)"

# Create S3 bucket for SAM artifacts if it doesn't exist
aws s3 mb "s3://$S3_BUCKET" --region "$REGION" 2>/dev/null || true

echo "=== Installing Lambda dependencies ==="
(cd aws/functions/ai-sentence && npm install --production)

echo "=== Building SAM template ==="
sam build --template aws/template.yaml --build-dir aws/.aws-sam/build

echo "=== Deploying to AWS ($REGION) ==="
sam deploy \
  --template-file aws/.aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$S3_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo
echo "=== Deployment complete! Endpoint URLs: ==="
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table \
  --no-cli-pager

echo
echo "Next: copy the ApiBaseUrl above and update app.js endpoint URLs."
