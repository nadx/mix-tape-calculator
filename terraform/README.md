# Terraform Infrastructure for Mixtape Creator Tool

This Terraform configuration sets up AWS infrastructure for hosting the Mixtape Creator Tool:

- **S3 Bucket**: Static website hosting
- **CloudFront Distribution**: CDN for fast global delivery
- **IAM User**: For GitHub Actions deployment

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0 installed
3. Appropriate AWS permissions to create S3, CloudFront, and IAM resources

## Usage

1. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

2. **Review the plan**:
   ```bash
   terraform plan
   ```

3. **Apply the configuration**:
   ```bash
   terraform apply
   ```

4. **Get outputs** (including GitHub Secrets values):
   ```bash
   terraform output
   ```

## GitHub Secrets Setup

After running `terraform apply`, you'll get outputs that need to be added to GitHub Secrets:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: From `github_actions_access_key_id` output
   - `AWS_SECRET_ACCESS_KEY`: From `github_actions_secret_access_key` output
   - `CLOUDFRONT_DISTRIBUTION_ID`: From `github_actions_cloudfront_distribution_id` output

## Configuration

### Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your values (see [VARIABLES.md](./VARIABLES.md) for details)

3. **Initialize and apply:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

⚠️ **Important:** The `terraform.tfvars` file contains sensitive data and is gitignored. Never commit it to version control.

### Custom Domain (Optional)

To use a custom domain:

1. Create an ACM certificate in `us-east-1` (required for CloudFront)
2. Update `terraform.tfvars`:
   ```hcl
   domain_name    = "mixtape.yourdomain.com"
   certificate_arn = "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
   ```
3. Apply Terraform: `terraform apply`
4. Configure DNS: Create a CNAME pointing to the CloudFront domain

See [VARIABLES.md](./VARIABLES.md) for detailed instructions and all available variables.

## Variables

See [VARIABLES.md](./VARIABLES.md) for complete variable documentation.

Quick reference:
- `aws_region`: AWS region (default: `us-east-1`)
- `s3_bucket_name`: S3 bucket name (default: `mixtape-creator-tool`)
- `environment`: Environment name (default: `production`)
- `cloudfront_price_class`: CloudFront price class (default: `PriceClass_100`)
- `domain_name`: Custom domain name (optional, default: `""`)
- `certificate_arn`: ACM certificate ARN for custom domain (optional, default: `""`)

## Outputs

- `cloudfront_url`: The CloudFront distribution URL
- `cloudfront_domain_name`: CloudFront domain name
- `s3_bucket_name`: S3 bucket name
- `cloudfront_distribution_id`: CloudFront distribution ID

