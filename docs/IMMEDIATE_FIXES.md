# Immediate Fixes for Current Issues

## Issue 1: ACM Certificate Validation

You've requested the certificate. Here are the immediate next steps:

### Step 1: Get DNS Validation Records

Run this command:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1 \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Or use the helper script:**
```bash
./scripts/get-cert-validation.sh
```

**Expected Output:**
```json
{
    "Name": "_abc123def456.mixtape.ninjabot.net",
    "Type": "CNAME",
    "Value": "_xyz789.abcdef.acm-validations.aws."
}
```

### Step 2: Add CNAME Record to GCP DNS

1. Go to GCP Cloud DNS (or your DNS provider for ninjabot.net)
2. Add a new CNAME record:
   - **Name**: `_abc123def456.mixtape` (the part before `.ninjabot.net`)
   - **Type**: `CNAME`
   - **TTL**: `300`
   - **Data/Value**: `_xyz789.abcdef.acm-validations.aws.` (exact value from output, including trailing dot)

### Step 3: Wait for Validation

Check status:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1 \
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
domain_name = "mixtape.ninjabot.net"
certificate_arn = "arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1"
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
- Wait 2-5 minutes, then test: `https://mixtape.ninjabot.net`

### Verify It Worked

```bash
# Check S3 has files
aws s3 ls s3://mixtape-creator-tool/

# Should see:
# index.html
# assets/ (directory)
```

Then test in browser:
- `https://d1hirkdjxalrbh.cloudfront.net` - Should work now
- `https://mixtape.ninjabot.net` - Should work now

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
   - Site should work at `https://mixtape.ninjabot.net`
   - SSL certificate will be valid
   - `/redirect` page will work

---

## Still Having Issues?

See detailed guides:
- **Certificate Setup**: [CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md)
- **S3 Permissions**: [FIX_S3_PERMISSIONS.md](./FIX_S3_PERMISSIONS.md)



