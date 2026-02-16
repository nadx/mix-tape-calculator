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

## Custom Domain (Optional)

To use a custom domain:

1. Create an ACM certificate in `us-east-1` (required for CloudFront)
2. Update `variables.tf` or create a `terraform.tfvars` file:
   ```hcl
   domain_name    = "mixtape.ninjabot.net"
   certificate_arn = "arn:aws:acm:us-east-1:..."
   ```
3. Update the CloudFront distribution in `main.tf` to use the certificate and add an alias

## Variables

- `aws_region`: AWS region (default: `us-east-1`)
- `s3_bucket_name`: S3 bucket name (default: `mixtape-creator-tool`)
- `environment`: Environment name (default: `production`)
- `cloudfront_price_class`: CloudFront price class (default: `PriceClass_100`)

## Outputs

- `cloudfront_url`: The CloudFront distribution URL
- `cloudfront_domain_name`: CloudFront domain name
- `s3_bucket_name`: S3 bucket name
- `cloudfront_distribution_id`: CloudFront distribution ID

