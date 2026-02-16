# Complete Deployment Guide

This guide walks you through deploying the Mixtape Creator Tool to AWS with GitHub Actions automation and GCP subdomain configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Machine Setup](#local-machine-setup)
3. [AWS Setup](#aws-setup)
4. [GitHub Configuration](#github-configuration)
5. [GCP DNS Configuration](#gcp-dns-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Access

1. **AWS Account**
   - Active AWS account with billing enabled
   - AWS account with permissions to create:
     - S3 buckets
     - CloudFront distributions
     - IAM users and policies
     - Route53 (if using custom domain)

2. **GitHub Account**
   - Repository access (owner or admin)
   - Ability to create repository secrets

3. **GCP Account**
   - Google Cloud Platform account
   - Access to Cloud DNS or DNS management for `ninjabot.net` domain

### Required Software & Tools

Install the following on your local machine:

1. **Node.js & npm**
   - Version: Node.js 20.x or later
   - Check: `node --version` and `npm --version`
   - Install: https://nodejs.org/

2. **Terraform**
   - Version: >= 1.0
   - Check: `terraform version`
   - Install:
     ```bash
     # macOS
     brew install terraform
     
     # Linux
     wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
     unzip terraform_1.6.0_linux_amd64.zip
     sudo mv terraform /usr/local/bin/
     
     # Windows (using Chocolatey)
     choco install terraform
     ```

3. **AWS CLI**
   - Version: >= 2.0
   - Check: `aws --version`
   - Install:
     ```bash
     # macOS
     brew install awscli
     
     # Linux
     curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
     unzip awscliv2.zip
     sudo ./aws/install
     
     # Windows
     # Download from: https://aws.amazon.com/cli/
     ```

4. **Git**
   - Check: `git --version`
   - Install: https://git-scm.com/

### Required Credentials & Keys

You'll need to obtain or create:

1. **AWS Access Keys** (for initial Terraform setup)
   - AWS Access Key ID
   - AWS Secret Access Key
   - Created via AWS IAM Console (see AWS Setup section)

2. **GitHub Personal Access Token** (optional, for automation)
   - Not required for basic deployment
   - Only needed if automating GitHub operations

3. **GCP Service Account Key** (if using GCP API)
   - Not required if manually configuring DNS
   - Only needed for automated DNS management

---

## Local Machine Setup

### Step 1: Clone and Install Dependencies

**Action:**
```bash
# Navigate to project directory
cd /Users/draven/Projects/git/Mixtapecreatortool

# Install Node.js dependencies
npm install
```

**Expected Outcome:**
- All npm packages installed in `node_modules/`
- No errors in console
- `package-lock.json` updated

**Verification:**
```bash
npm list --depth=0
# Should show all dependencies without errors
```

### Step 2: Configure AWS CLI

**Action:**
```bash
aws configure
```

**Inputs Required:**
- AWS Access Key ID: `[Your AWS Access Key]`
- AWS Secret Access Key: `[Your AWS Secret Key]`
- Default region: `us-east-1` (or your preferred region)
- Default output format: `json`

**Expected Outcome:**
- AWS CLI configured successfully
- Credentials stored in `~/.aws/credentials`
- Configuration stored in `~/.aws/config`

**Verification:**
```bash
aws sts get-caller-identity
# Should return your AWS account ID and user ARN
```

### Step 3: Test Local Build

**Action:**
```bash
npm run build
```

**Expected Outcome:**
- Build completes without errors
- `build/` directory created with:
  - `index.html`
  - `assets/` folder with bundled JS/CSS
  - All static files

**Verification:**
```bash
ls -la build/
# Should show index.html and assets directory
```

---

## AWS Setup

### Step 1: Create AWS IAM User for Terraform

**Action:**
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: `terraform-deployer` (or your preferred name)
4. Select "Provide user access to the AWS Management Console" (optional) OR "Access key - Programmatic access"
5. Click "Next"

**Permissions:**
- Attach policies directly:
  - `AmazonS3FullAccess` (or create custom policy with S3 permissions)
  - `CloudFrontFullAccess` (or create custom policy with CloudFront permissions)
  - `IAMFullAccess` (or create custom policy for IAM user creation)

**Expected Outcome:**
- IAM user created
- Access Key ID and Secret Access Key generated
- **IMPORTANT:** Save these credentials securely - you'll need them for `aws configure`

**Alternative: Use Existing Admin Credentials**
- If you already have AWS admin credentials, you can use those
- Ensure they have permissions for S3, CloudFront, and IAM

### Step 2: Verify AWS Permissions

**Action:**
```bash
# Test S3 access
aws s3 ls

# Test CloudFront access
aws cloudfront list-distributions

# Test IAM access
aws iam list-users
```

**Expected Outcome:**
- All commands execute successfully
- No "Access Denied" errors

**If Errors Occur:**
- Check IAM user permissions
- Verify AWS credentials are correct
- Ensure region is set correctly

### Step 3: Initialize Terraform

**Action:**
```bash
cd terraform
terraform init
```

**Expected Outcome:**
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws x.x.x...
...
Terraform has been successfully initialized!
```

**Verification:**
```bash
ls -la .terraform/
# Should show provider plugins
```

### Step 4: Review Terraform Plan

**Action:**
```bash
terraform plan
```

**Expected Outcome:**
- Plan shows resources to be created:
  - 1 S3 bucket
  - 1 CloudFront distribution
  - 1 IAM user (for GitHub Actions)
  - 1 IAM access key
  - 1 IAM user policy
  - 1 CloudFront origin access control
  - 1 S3 bucket policy
- No errors or warnings

**Review the plan carefully:**
- Check S3 bucket name (default: `mixtape-creator-tool`)
- Verify region (default: `us-east-1`)
- Note the resources that will be created

### Step 5: Apply Terraform Configuration

**Action:**
```bash
terraform apply
```

**Input:**
- Type `yes` when prompted

**Expected Outcome:**
```
Apply complete! Resources: X added, 0 changed, 0 destroyed.

Outputs:

cloudfront_domain_name = "d1234567890abc.cloudfront.net"
cloudfront_distribution_id = "E1234567890ABC"
cloudfront_url = "https://d1234567890abc.cloudfront.net"
github_actions_access_key_id = "AKIAIOSFODNN7EXAMPLE"
github_actions_secret_access_key = <sensitive>
github_actions_cloudfront_distribution_id = "E1234567890ABC"
s3_bucket_name = "mixtape-creator-tool"
```

**IMPORTANT:** Save these outputs! You'll need them for:
- GitHub Secrets configuration
- GCP DNS CNAME setup

**Verification:**
```bash
# Check S3 bucket
aws s3 ls | grep mixtape-creator-tool

# Check CloudFront distribution
aws cloudfront list-distributions --query "DistributionList.Items[?Id=='E1234567890ABC']"
# Replace with your actual distribution ID
```

### Step 6: (Optional) Customize Terraform Variables

**Action:**
Create `terraform/terraform.tfvars`:
```hcl
aws_region = "us-east-1"
s3_bucket_name = "mixtape-creator-tool"
environment = "production"
cloudfront_price_class = "PriceClass_100"
```

**Expected Outcome:**
- Variables file created
- Future `terraform apply` commands will use these values

---

## GitHub Configuration

### Step 1: Navigate to Repository Settings

**Action:**
1. Go to your GitHub repository
2. Click "Settings" tab
3. Navigate to "Secrets and variables" → "Actions"

**Expected Outcome:**
- You're on the Secrets page
- You can see "New repository secret" button

### Step 2: Add AWS Access Key ID Secret

**Action:**
1. Click "New repository secret"
2. Name: `AWS_ACCESS_KEY_ID`
3. Value: Copy from Terraform output `github_actions_access_key_id`
4. Click "Add secret"

**Expected Outcome:**
- Secret created successfully
- Secret name appears in the list (value is hidden)

**Verification:**
- Secret appears in the secrets list
- Value is masked (shows as `***`)

### Step 3: Add AWS Secret Access Key

**Action:**
1. Click "New repository secret"
2. Name: `AWS_SECRET_ACCESS_KEY`
3. Value: Copy from Terraform output `github_actions_secret_access_key`
   - **Note:** This is marked as `<sensitive>` in Terraform output
   - Run: `terraform output -raw github_actions_secret_access_key`
4. Click "Add secret"

**Expected Outcome:**
- Secret created successfully
- Secret name appears in the list

**Verification:**
- Both AWS secrets are now configured

### Step 4: Add CloudFront Distribution ID

**Action:**
1. Click "New repository secret"
2. Name: `CLOUDFRONT_DISTRIBUTION_ID`
3. Value: Copy from Terraform output `github_actions_cloudfront_distribution_id`
4. Click "Add secret"

**Expected Outcome:**
- Secret created successfully
- All three secrets are configured

**Verification:**
- Secrets list shows:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `CLOUDFRONT_DISTRIBUTION_ID`

### Step 5: Update GitHub Actions Workflow (if needed)

**Action:**
1. Open `.github/workflows/deploy.yml`
2. Review and update if necessary:
   - `S3_BUCKET`: Should match your Terraform S3 bucket name
   - `AWS_REGION`: Should match your Terraform region

**Expected Outcome:**
- Workflow file matches your Terraform configuration
- No syntax errors

**Verification:**
```bash
# Check workflow file
cat .github/workflows/deploy.yml
# Verify S3_BUCKET and AWS_REGION match Terraform outputs
```

### Step 6: Test GitHub Actions Workflow

**Action:**
1. Commit and push changes to trigger workflow:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```
2. Go to GitHub → Actions tab
3. Watch the workflow run

**Expected Outcome:**
- Workflow starts automatically
- All steps complete successfully:
  - ✅ Checkout code
  - ✅ Setup Node.js
  - ✅ Install dependencies
  - ✅ Build application
  - ✅ Configure AWS credentials
  - ✅ Deploy to S3
  - ✅ Invalidate CloudFront cache
  - ✅ Deployment summary

**Verification:**
- Workflow shows green checkmark
- Site is accessible at CloudFront URL
- Check CloudFront URL in browser

**If Workflow Fails:**
- Check error messages in Actions log
- Verify GitHub Secrets are correct
- Verify AWS credentials have proper permissions
- Check S3 bucket name matches

---

## GCP DNS Configuration

### Step 1: Access GCP Cloud DNS

**Action:**
1. Go to Google Cloud Console
2. Navigate to "Cloud DNS" or your DNS management interface
3. Select the zone for `ninjabot.net`

**Expected Outcome:**
- You're viewing DNS records for `ninjabot.net`
- You can see existing DNS records

### Step 2: Create CNAME Record

**Action:**
1. Click "Create Record Set" or "Add Record"
2. Configure:
   - **Name:** `mixtape` (or `mixtape.ninjabot.net` depending on interface)
   - **Type:** `CNAME`
   - **TTL:** `300` (or your preferred value)
   - **Data/Value:** Your CloudFront domain name from Terraform output
     - Example: `d1234567890abc.cloudfront.net`
     - Get it with: `terraform output cloudfront_domain_name`

**Expected Outcome:**
- CNAME record created
- Record appears in DNS zone
- Status shows as active

**Verification:**
```bash
# Test DNS resolution (may take a few minutes to propagate)
dig mixtape.ninjabot.net
# or
nslookup mixtape.ninjabot.net

# Should resolve to CloudFront domain
```

### Step 3: Wait for DNS Propagation

**Action:**
- Wait 5-15 minutes for DNS propagation

**Expected Outcome:**
- DNS record propagates globally
- Subdomain resolves to CloudFront

**Verification:**
```bash
# Check from multiple locations
dig @8.8.8.8 mixtape.ninjabot.net
dig @1.1.1.1 mixtape.ninjabot.net
```

### Step 4: (Optional) Configure CloudFront for Custom Domain

**Note:** This step is optional. The CNAME will work, but for HTTPS with custom domain, you need:

1. **Request ACM Certificate** (in `us-east-1` region):
   ```bash
   aws acm request-certificate \
     --domain-name mixtape.ninjabot.net \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate:**
   - Add DNS validation records to GCP DNS
   - Wait for validation

3. **Update Terraform:**
   - Add certificate ARN to `terraform.tfvars`
   - Update `main.tf` to use certificate
   - Run `terraform apply`

**Expected Outcome:**
- Custom domain with HTTPS working
- Certificate validated

---

## Deployment Steps

### Step 1: Verify Everything is Ready

**Checklist:**
- [ ] Node.js dependencies installed
- [ ] AWS CLI configured
- [ ] Terraform initialized
- [ ] AWS infrastructure created (S3, CloudFront)
- [ ] GitHub Secrets configured
- [ ] GCP CNAME record created
- [ ] Local build works (`npm run build`)

### Step 2: Deploy via GitHub Actions

**Action:**
```bash
# Make a small change to trigger deployment
git add .
git commit -m "Trigger deployment"
git push origin main
```

**Expected Outcome:**
- GitHub Actions workflow runs
- Deployment completes successfully
- Site accessible at CloudFront URL

### Step 3: Verify Deployment

**Action:**
1. Visit CloudFront URL: `https://[your-cloudfront-domain].cloudfront.net`
2. Visit custom domain: `https://mixtape.ninjabot.net`
3. Test `/redirect` endpoint: `https://mixtape.ninjabot.net/redirect`

**Expected Outcome:**
- Home page loads correctly
- `/redirect` page loads correctly
- All assets load (images, CSS, JS)
- No console errors

---

## Verification

### Step 1: Test Home Page

**Action:**
- Visit `https://mixtape.ninjabot.net`

**Expected Outcome:**
- Page loads with mixtape interface
- Can search for songs
- UI is functional

### Step 2: Test Redirect Page

**Action:**
- Visit `https://mixtape.ninjabot.net/redirect`
- Visit `https://mixtape.ninjabot.net/redirect?code=test123`
- Visit `https://mixtape.ninjabot.net/redirect?error=access_denied`

**Expected Outcome:**
- Page loads correctly
- Shows appropriate status based on URL parameters
- Handles OAuth callback scenarios

### Step 3: Test Spotify Integration

**Action:**
- Use the song search feature
- Search for a song name

**Expected Outcome:**
- Song search works
- Duration is fetched from Spotify
- Song is added to mixtape

### Step 4: Check CloudFront Cache

**Action:**
```bash
# Check CloudFront distribution status
aws cloudfront get-distribution --id [DISTRIBUTION_ID]
```

**Expected Outcome:**
- Distribution status: `Deployed`
- All origins healthy
- Cache behaviors configured correctly

---

## Troubleshooting

### Issue: Terraform Apply Fails

**Symptoms:**
- Error: "Access Denied" or permission errors

**Solution:**
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check IAM user has required permissions
3. Verify region is correct

### Issue: GitHub Actions Deployment Fails

**Symptoms:**
- Workflow fails at "Deploy to S3" step

**Solution:**
1. Verify GitHub Secrets are correct:
   - Check `AWS_ACCESS_KEY_ID`
   - Check `AWS_SECRET_ACCESS_KEY`
   - Check `CLOUDFRONT_DISTRIBUTION_ID`
2. Verify S3 bucket name in workflow matches Terraform output
3. Check AWS credentials haven't expired

### Issue: Site Not Accessible

**Symptoms:**
- 404 errors or site doesn't load

**Solution:**
1. Check S3 bucket has files:
   ```bash
   aws s3 ls s3://[bucket-name]/
   ```
2. Check CloudFront distribution status
3. Verify custom error responses are configured (404 → index.html)
4. Clear browser cache

### Issue: DNS Not Resolving

**Symptoms:**
- `mixtape.ninjabot.net` doesn't resolve

**Solution:**
1. Verify CNAME record in GCP DNS
2. Check CNAME points to correct CloudFront domain
3. Wait for DNS propagation (can take up to 48 hours, usually 5-15 minutes)
4. Test with: `dig mixtape.ninjabot.net`

### Issue: Redirect Page Not Working

**Symptoms:**
- `/redirect` shows 404

**Solution:**
1. Verify React Router is configured in `main.tsx`
2. Check CloudFront custom error responses (404 → index.html)
3. Verify build includes routing
4. Check browser console for errors

### Issue: Build Fails Locally

**Symptoms:**
- `npm run build` fails

**Solution:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Check Node.js version: `node --version` (should be 20+)
4. Check for TypeScript errors: `npm run build` shows specific errors

---

## Quick Reference

### Get Terraform Outputs
```bash
cd terraform
terraform output
terraform output -raw github_actions_secret_access_key
```

### Manual S3 Deployment (for testing)
```bash
npm run build
aws s3 sync build/ s3://[bucket-name]/ --delete
aws cloudfront create-invalidation --distribution-id [id] --paths "/*"
```

### Check GitHub Secrets
- Repository → Settings → Secrets and variables → Actions

### Check CloudFront Status
```bash
aws cloudfront get-distribution --id [DISTRIBUTION_ID] --query "Distribution.Status"
```

### Test DNS Resolution
```bash
dig mixtape.ninjabot.net
nslookup mixtape.ninjabot.net
```

---

## Summary Checklist

Before deployment, ensure:
- [ ] AWS account active with billing enabled
- [ ] AWS CLI installed and configured
- [ ] Terraform installed
- [ ] Node.js 20+ installed
- [ ] GitHub repository access
- [ ] GCP DNS access for ninjabot.net
- [ ] All prerequisites met

After deployment, verify:
- [ ] Terraform infrastructure created
- [ ] GitHub Secrets configured
- [ ] GCP CNAME record created
- [ ] GitHub Actions workflow successful
- [ ] Site accessible at CloudFront URL
- [ ] Site accessible at custom domain
- [ ] `/redirect` page works
- [ ] Spotify integration works

---

## Next Steps

Once deployment is complete:
1. Monitor GitHub Actions for future deployments
2. Set up CloudWatch alarms for CloudFront (optional)
3. Configure custom domain with SSL certificate (optional)
4. Set up monitoring and logging (optional)

For questions or issues, refer to the troubleshooting section or check the logs in:
- GitHub Actions: Repository → Actions tab
- AWS CloudWatch: CloudFront distribution logs
- Terraform: `terraform show` for current state

