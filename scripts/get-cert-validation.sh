#!/bin/bash

# Script to get ACM certificate DNS validation records
# 
# Usage:
#   ./scripts/get-cert-validation.sh <CERTIFICATE_ARN>
#
# Example:
#   ./scripts/get-cert-validation.sh "arn:aws:acm:us-east-1:123456789012:certificate/abc123..."

if [ -z "$1" ]; then
  echo "Error: Certificate ARN is required"
  echo ""
  echo "Usage: $0 <CERTIFICATE_ARN>"
  echo ""
  echo "Example:"
  echo "  $0 \"arn:aws:acm:us-east-1:123456789012:certificate/abc123...\""
  exit 1
fi

CERT_ARN="$1"
REGION="us-east-1"

echo "Getting DNS validation records for certificate..."
echo "Certificate ARN: $CERT_ARN"
echo ""

# Get validation records
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json

echo ""
echo "---"
echo ""
echo "Add this CNAME record to your DNS provider:"
echo "  Name: [The 'Name' value above, without the domain]"
echo "  Type: CNAME"
echo "  Value: [The 'Value' value above]"
echo ""
echo "Then check validation status with:"
echo "  aws acm describe-certificate --certificate-arn \"$CERT_ARN\" --region $REGION --query 'Certificate.Status'"



