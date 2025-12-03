# Terraform Variables Reference

This document explains all available Terraform variables for configuring the Mixtape Creator Tool infrastructure.

## Quick Start

1. **Copy the example file:**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your values (see sections below)

3. **Apply the configuration:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

⚠️ **Important:** The `terraform.tfvars` file is gitignored and should NEVER be committed to version control. It may contain sensitive information like AWS account IDs and certificate ARNs.

---

## Required Variables

All variables have defaults, so technically none are required. However, you should review and customize them for your environment.

---

## Variable Descriptions

### `aws_region`

- **Type:** `string`
- **Default:** `"us-east-1"`
- **Description:** AWS region where all resources will be created
- **Example:**
  ```hcl
  aws_region = "us-east-1"
  ```
- **Notes:**
  - CloudFront certificates must be in `us-east-1` (even if your other resources are elsewhere)
  - S3 bucket names are globally unique, not region-specific
  - Common regions: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-southeast-1`

---

### `s3_bucket_name`

- **Type:** `string`
- **Default:** `"mixtape-creator-tool"`
- **Description:** Name of the S3 bucket for hosting the static website
- **Example:**
  ```hcl
  s3_bucket_name = "my-mixtape-tool"
  ```
- **Notes:**
  - Must be globally unique across all AWS accounts
  - Must be lowercase and can contain only letters, numbers, hyphens, and periods
  - Must be between 3 and 63 characters long
  - If the bucket name is taken, Terraform will fail

---

### `environment`

- **Type:** `string`
- **Default:** `"production"`
- **Description:** Environment name used for tagging resources
- **Example:**
  ```hcl
  environment = "production"
  ```
- **Common Values:**
  - `production` - Production environment
  - `staging` - Staging environment
  - `development` - Development environment
- **Notes:**
  - Used for resource tagging
  - Helps organize resources in AWS Console
  - Can be used to create separate environments (production, staging, etc.)

---

### `cloudfront_price_class`

- **Type:** `string`
- **Default:** `"PriceClass_100"`
- **Description:** CloudFront price class determines which edge locations serve content
- **Options:**
  - `PriceClass_100` - US, Canada, and Europe (cheapest)
  - `PriceClass_200` - Adds Asia, Middle East, and Africa
  - `PriceClass_All` - All CloudFront edge locations worldwide (most expensive)
- **Example:**
  ```hcl
  cloudfront_price_class = "PriceClass_100"
  ```
- **Notes:**
  - Choose based on your target audience
  - `PriceClass_100` is sufficient for most use cases
  - You can change this later, but it requires recreating the distribution

---

### `domain_name` (Optional)

- **Type:** `string`
- **Default:** `""` (empty string)
- **Description:** Custom domain name for your CloudFront distribution
- **Example:**
  ```hcl
  domain_name = "mixtape.yourdomain.com"
  ```
- **Notes:**
  - Leave empty (`""`) if not using a custom domain
  - Must match a certificate in ACM (see `certificate_arn`)
  - CloudFront will use its default domain if left empty
  - You'll need to configure DNS separately (create a CNAME pointing to CloudFront)

---

### `certificate_arn` (Optional)

- **Type:** `string`
- **Default:** `""` (empty string)
- **Description:** AWS Certificate Manager (ACM) certificate ARN for custom domain SSL/TLS
- **Example:**
  ```hcl
  certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  ```
- **Notes:**
  - ⚠️ **Contains sensitive data** (AWS account ID) - never commit this to git
  - Required if using a custom domain (`domain_name` is set)
  - Certificate must be in `us-east-1` region (CloudFront requirement)
  - Leave empty (`""`) if not using a custom domain
  - Get the ARN from: AWS Console → Certificate Manager → Your Certificate

---

## Configuration Examples

### Basic Setup (No Custom Domain)

```hcl
aws_region = "us-east-1"
s3_bucket_name = "my-mixtape-tool"
environment = "production"
cloudfront_price_class = "PriceClass_100"
domain_name = ""
certificate_arn = ""
```

### Production with Custom Domain

```hcl
aws_region = "us-east-1"
s3_bucket_name = "mixtape-production"
environment = "production"
cloudfront_price_class = "PriceClass_100"
domain_name = "mixtape.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc123..."
```

### Staging Environment

```hcl
aws_region = "us-east-1"
s3_bucket_name = "mixtape-staging"
environment = "staging"
cloudfront_price_class = "PriceClass_100"
domain_name = ""
certificate_arn = ""
```

---

## Setting Up a Custom Domain

If you want to use a custom domain, follow these steps:

### Step 1: Request an ACM Certificate

1. Go to AWS Console → Certificate Manager
2. **Important:** Select region `us-east-1` (CloudFront requirement)
3. Click "Request a certificate"
4. Choose "Request a public certificate"
5. Enter your domain name (e.g., `mixtape.yourdomain.com`)
6. Choose DNS validation (recommended) or email validation
7. Complete validation (add DNS records or click email link)
8. Wait for certificate to be issued (status: "Issued")

### Step 2: Get the Certificate ARN

1. In Certificate Manager, click on your certificate
2. Copy the ARN (starts with `arn:aws:acm:us-east-1:...`)

### Step 3: Update terraform.tfvars

```hcl
domain_name = "mixtape.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
```

### Step 4: Apply Terraform

```bash
terraform plan
terraform apply
```

### Step 5: Configure DNS

After Terraform creates the CloudFront distribution:

1. Get the CloudFront domain name:
   ```bash
   terraform output cloudfront_domain_name
   ```

2. Create a CNAME record in your DNS provider:
   - **Name:** `mixtape` (or your subdomain)
   - **Type:** `CNAME`
   - **Value:** The CloudFront domain name from step 1
   - **TTL:** 300 (or your provider's default)

3. Wait for DNS propagation (can take up to 48 hours, usually much faster)

---

## Security Best Practices

1. **Never commit `terraform.tfvars`** - It's already in `.gitignore`
2. **Rotate credentials regularly** - Especially IAM access keys
3. **Use least privilege** - The IAM user created has minimal permissions
4. **Review outputs carefully** - Some outputs contain sensitive data
5. **Use separate accounts** - Consider separate AWS accounts for different environments

---

## Troubleshooting

### Error: S3 bucket name already taken

**Solution:** Choose a different bucket name. Bucket names are globally unique.

```hcl
s3_bucket_name = "my-unique-mixtape-tool-12345"
```

### Error: Certificate not found

**Solution:** 
- Verify certificate is in `us-east-1` region
- Check the ARN is correct (copy from Certificate Manager)
- Ensure certificate status is "Issued"

### Error: Invalid domain name

**Solution:**
- Domain name must match the certificate exactly
- Check for typos
- Ensure DNS is configured correctly

### Error: CloudFront distribution already exists

**Solution:**
- You may have a distribution with the same name
- Either delete the old distribution or use a different bucket name

---

## Related Documentation

- [Terraform README](./README.md) - General Terraform usage
- [CONFIGURATION.md](../CONFIGURATION.md) - Overall configuration guide
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)

---

## Need Help?

- Check the troubleshooting section above
- Review Terraform plan output: `terraform plan`
- Check AWS Console for resource status
- Verify all variables are set correctly in `terraform.tfvars`

