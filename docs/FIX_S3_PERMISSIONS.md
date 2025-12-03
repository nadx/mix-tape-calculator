# Fixing S3 Access Denied / CloudFront 403 Errors

## Problem Diagnosis

You're seeing:
- **403 ERROR** from CloudFront when accessing your site URL
- **Access Denied** XML from S3 when accessing CloudFront directly

This typically means:
1. **S3 bucket is empty** (no files deployed yet) - MOST LIKELY
2. S3 bucket policy needs to be reapplied
3. CloudFront distribution needs files to serve

## Solution Steps

### Step 1: Check if S3 Bucket Has Files

```bash
# Replace with your actual bucket name
aws s3 ls s3://mixtape-creator-tool/
```

**Expected Outcome:**
- If empty: You'll see nothing (this is the problem!)
- If has files: You'll see `index.html`, `assets/`, etc.

### Step 2: Deploy Files to S3

If the bucket is empty, you need to deploy your built application:

**Option A: Deploy via GitHub Actions (Recommended)**

1. Make sure GitHub Secrets are configured (see DEPLOYMENT.md)
2. Push to main branch:
   ```bash
   git add .
   git commit -m "Trigger deployment"
   git push origin main
   ```
3. Check GitHub Actions tab - workflow should deploy files

**Option B: Manual Deployment (Quick Fix)**

```bash
# Build the application
npm run build

# Deploy to S3 (replace bucket name if different)
aws s3 sync build/ s3://mixtape-creator-tool/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**Replace `E1234567890ABC` with your actual CloudFront distribution ID**

Get your distribution ID:
```bash
terraform output cloudfront_distribution_id
```

### Step 3: Verify S3 Bucket Policy

Check if the bucket policy exists and is correct:

```bash
aws s3api get-bucket-policy --bucket mixtape-creator-tool
```

**Expected Outcome:**
- Should return a JSON policy with CloudFront service principal
- If it fails or returns empty, the policy needs to be reapplied

**Fix: Reapply Terraform**

```bash
cd terraform
terraform apply
```

This will ensure the S3 bucket policy is correctly configured.

### Step 4: Verify CloudFront Distribution Status

```bash
# Get distribution ID
DIST_ID=$(terraform output -raw cloudfront_distribution_id)

# Check status
aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'
```

**Expected Outcome:**
- Should return `"Deployed"`
- If it says `"InProgress"`, wait a few minutes

### Step 5: Test After Deployment

1. **Wait 2-5 minutes** for CloudFront to propagate
2. Test CloudFront URL directly:
   ```bash
   curl -I https://d1hirkdjxalrbh.cloudfront.net
   ```
   Should return `200 OK` (not 403)

3. Test custom domain:
   ```bash
   curl -I https://your-cloudfront-domain.cloudfront.net
   ```
   Should return `200 OK`

## Common Issues & Fixes

### Issue: "Access Denied" from S3

**Cause:** S3 bucket policy not allowing CloudFront access

**Fix:**
```bash
cd terraform
terraform apply
```

This will recreate/update the S3 bucket policy with the correct CloudFront ARN.

### Issue: CloudFront 403 but S3 has files

**Cause:** CloudFront cache or distribution not fully deployed

**Fix:**
1. Wait 5-10 minutes for CloudFront to fully deploy
2. Create cache invalidation:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id $(terraform output -raw cloudfront_distribution_id) \
     --paths "/*"
   ```

### Issue: Files in S3 but still 403

**Cause:** Bucket policy might have wrong CloudFront ARN

**Fix:**
1. Get current CloudFront ARN:
   ```bash
   terraform output cloudfront_distribution_id
   aws cloudfront get-distribution --id [DIST_ID] --query 'Distribution.ARN'
   ```

2. Reapply Terraform to update bucket policy:
   ```bash
   cd terraform
   terraform apply
   ```

## Quick Fix Script

Run this to deploy and fix everything:

```bash
#!/bin/bash

# Build
echo "Building application..."
npm run build

# Get bucket name and distribution ID
BUCKET=$(cd terraform && terraform output -raw s3_bucket_name)
DIST_ID=$(cd terraform && terraform output -raw cloudfront_distribution_id)

# Deploy to S3
echo "Deploying to S3..."
aws s3 sync build/ s3://$BUCKET/ --delete

# Invalidate CloudFront
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

echo "Done! Wait 2-5 minutes for CloudFront to update."
echo "Test: https://your-cloudfront-domain.cloudfront.net"
```

Save as `deploy.sh`, make executable (`chmod +x deploy.sh`), and run it.

## Verification Checklist

After fixing, verify:

- [ ] S3 bucket has files: `aws s3 ls s3://[bucket-name]/`
- [ ] CloudFront distribution status is "Deployed"
- [ ] Can access CloudFront URL directly (not 403)
- [ ] Can access custom domain (not 403)
- [ ] Home page loads correctly
- [ ] `/redirect` page loads correctly

## Still Having Issues?

1. **Check CloudFront logs** (if enabled)
2. **Check S3 bucket policy** matches CloudFront ARN
3. **Verify OAC (Origin Access Control)** is configured in CloudFront
4. **Check browser console** for specific errors
5. **Try incognito/private browsing** to avoid cache issues



