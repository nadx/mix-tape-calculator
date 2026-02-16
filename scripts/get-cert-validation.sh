#!/bin/bash

# Script to get ACM certificate DNS validation records

CERT_ARN="arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1"
REGION="us-east-1"

echo "Getting DNS validation records for certificate..."
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
echo "Add this CNAME record to GCP DNS:"
echo "  Name: [The 'Name' value above, without the domain]"
echo "  Type: CNAME"
echo "  Value: [The 'Value' value above]"
echo ""
echo "Then check validation status with:"
echo "  aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION --query 'Certificate.Status'"



