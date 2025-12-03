#!/bin/bash

# Script to check deployment status and diagnose issues

echo "=== Checking Deployment Status ==="
echo ""

# Get values from Terraform
cd terraform 2>/dev/null || { echo "Error: terraform directory not found"; exit 1; }

BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null)
DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null)
DIST_DOMAIN=$(terraform output -raw cloudfront_domain_name 2>/dev/null)

if [ -z "$BUCKET" ] || [ -z "$DIST_ID" ]; then
    echo "Error: Could not get Terraform outputs. Make sure terraform apply has been run."
    exit 1
fi

echo "S3 Bucket: $BUCKET"
echo "CloudFront Distribution ID: $DIST_ID"
echo "CloudFront Domain: $DIST_DOMAIN"
echo ""

# Check S3 bucket contents
echo "=== S3 Bucket Contents ==="
aws s3 ls s3://$BUCKET/ 2>&1
echo ""

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Cannot access S3 bucket. Check AWS credentials."
    exit 1
fi

FILE_COUNT=$(aws s3 ls s3://$BUCKET/ | wc -l | tr -d ' ')
if [ "$FILE_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: S3 bucket is EMPTY! This is why you're getting 403 errors."
    echo ""
    echo "To fix, deploy files:"
    echo "  1. Build: npm run build"
    echo "  2. Deploy: aws s3 sync build/ s3://$BUCKET/ --delete"
    echo "  3. Invalidate: aws cloudfront create-invalidation --distribution-id $DIST_ID --paths '/*'"
else
    echo "✅ S3 bucket has files ($FILE_COUNT items)"
fi

echo ""
echo "=== CloudFront Distribution Status ==="
STATUS=$(aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status' --output text 2>/dev/null)
echo "Status: $STATUS"

if [ "$STATUS" = "Deployed" ]; then
    echo "✅ CloudFront distribution is deployed"
else
    echo "⏳ CloudFront distribution is still deploying..."
fi

echo ""
echo "=== Testing URLs ==="
echo "CloudFront URL: https://$DIST_DOMAIN"
echo ""
echo "Test with:"
echo "  curl -I https://$DIST_DOMAIN"
echo ""
echo "If you have a custom domain configured, test it with:"
echo "  curl -I https://yourdomain.com"



