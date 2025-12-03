# Immediate Fixes for Current Issues

## Issue 1: ACM Certificate Validation

You've requested the certificate. Here are the immediate next steps:

### Step 1: Get DNS Validation Records

**Use the helper script:**
```bash
./scripts/get-cert-validation.sh "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
```

**Or use AWS CLI directly:**
```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Expected Output:**
```json
{
    "Name": "_abc123def456.yourdomain.com",
    "Type": "CNAME",
    "Value": "_xyz789.abcdef.acm-validations.aws."
}
```

### Step 2: Add CNAME Record to DNS

1. Go to your DNS provider (GCP Cloud DNS, Route53, etc.)
2. Add a new CNAME record:
   - **Name**: Extract the subdomain from the `Name` field (e.g., if Name is `_abc123def456.yourdomain.com`, use `_abc123def456`)
   - **Type**: `CNAME`
   - **TTL**: `300`
   - **Data/Value**: The exact value from the `Value` field (including trailing dot if present)

### Step 3: Wait for Validation

Check status:
```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID" \
  --region us-east-1 \
  --query 'Certificate.Status'
```

Wait until it returns `"ISSUED"` (usually 5-30 minutes).

### Step 4: Update Terraform (After Validation)

Once status is `"ISSUED"`, create `terraform/terraform.tfvars`:

```hcl
aws_region = "us-east-1"
s3_bucket_name = "mixtape-creator-tool"
environment = "production"
cloudfront_price_class = "PriceClass_100"
domain_name = "yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
```

Then apply:
```bash
cd terraform
terraform plan
terraform apply
```

---

## Issue 2: S3 Access Denied / CloudFront 403

The 403 errors are because **your S3 bucket is empty** - no files have been deployed yet.

### Quick Fix: Deploy Files Now

**Option A: Check Current Status First**

```bash
./scripts/check-deployment.sh
```

This will show you what's wrong.

**Option B: Deploy Immediately**

```bash
# 1. Build the application
npm run build

# 2. Get your bucket name and distribution ID
cd terraform
BUCKET=$(terraform output -raw s3_bucket_name)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
cd ..

# 3. Deploy to S3
aws s3 sync build/ s3://$BUCKET/ --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

**Expected Outcome:**
- Files uploaded to S3
- CloudFront cache invalidated
- Wait 2-5 minutes, then test your CloudFront URL or custom domain

### Verify It Worked

```bash
# Check S3 has files
aws s3 ls s3://mixtape-creator-tool/

# Should see:
# index.html
# assets/ (directory)
```

Then test in browser:
- Your CloudFront URL (from `terraform output cloudfront_url`) - Should work now
- Your custom domain (if configured) - Should work now

---

## Summary: What to Do Right Now

1. **For Certificate (can do in parallel):**
   - Get DNS validation records
   - Add CNAME to GCP DNS
   - Wait for validation
   - Update Terraform after validation

2. **For 403 Error (do this first):**
   - Run `npm run build`
   - Deploy to S3 (see commands above)
   - Invalidate CloudFront
   - Test in 2-5 minutes

3. **After Both Are Fixed:**
   - Site should work at your CloudFront URL or custom domain
   - SSL certificate will be valid (if using custom domain)
   - `/redirect` page will work

---

## Still Having Issues?

See detailed guides:
- **Certificate Setup**: [CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md)
- **S3 Permissions**: [FIX_S3_PERMISSIONS.md](./FIX_S3_PERMISSIONS.md)



