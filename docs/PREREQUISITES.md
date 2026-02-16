# Prerequisites Checklist

Use this checklist to ensure you have everything needed before starting deployment.

## ✅ Accounts & Access

- [ ] **AWS Account**
  - Active account with billing enabled
  - Admin access or permissions for: S3, CloudFront, IAM
  - Access Key ID and Secret Access Key (or ability to create them)

- [ ] **GitHub Account**
  - Repository owner/admin access
  - Ability to create repository secrets

- [ ] **GCP Account**
  - Access to Cloud DNS or DNS management for `ninjabot.net`
  - Ability to create CNAME records

## ✅ Software Installation

- [ ] **Node.js** (v20+)
  - Check: `node --version`
  - Install: https://nodejs.org/

- [ ] **npm** (comes with Node.js)
  - Check: `npm --version`

- [ ] **Terraform** (v1.0+)
  - Check: `terraform version`
  - Install: `brew install terraform` (macOS) or https://www.terraform.io/downloads

- [ ] **AWS CLI** (v2.0+)
  - Check: `aws --version`
  - Install: `brew install awscli` (macOS) or https://aws.amazon.com/cli/

- [ ] **Git**
  - Check: `git --version`
  - Install: https://git-scm.com/

## ✅ Credentials to Obtain

- [ ] **AWS Access Keys**
  - Access Key ID
  - Secret Access Key
  - Created via: AWS Console → IAM → Users → Create User → Access Keys

- [ ] **Terraform Outputs** (after running Terraform)
  - `github_actions_access_key_id`
  - `github_actions_secret_access_key`
  - `github_actions_cloudfront_distribution_id`
  - `cloudfront_domain_name`

## ✅ Local Setup Verification

- [ ] Project dependencies installed: `npm install`
- [ ] Local build works: `npm run build`
- [ ] AWS CLI configured: `aws configure`
- [ ] AWS access verified: `aws sts get-caller-identity`
- [ ] Terraform initialized: `cd terraform && terraform init`

## ✅ Configuration Files

- [ ] `.github/workflows/deploy.yml` exists
- [ ] `terraform/main.tf` exists
- [ ] `terraform/variables.tf` exists
- [ ] `terraform/outputs.tf` exists

## Quick Verification Commands

```bash
# Check all tools are installed
node --version      # Should show v20.x or higher
npm --version       # Should show version number
terraform version   # Should show v1.0 or higher
aws --version       # Should show v2.x or higher
git --version       # Should show version number

# Verify AWS access
aws sts get-caller-identity  # Should return account info

# Verify project setup
npm install          # Should complete without errors
npm run build       # Should create build/ directory
```

## Next Steps

Once all prerequisites are checked:
1. Follow the detailed guide in [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Start with "Local Machine Setup" section
3. Proceed through AWS, GitHub, and GCP configuration

---

**Estimated Time:** 30-60 minutes for complete setup (depending on experience level)

