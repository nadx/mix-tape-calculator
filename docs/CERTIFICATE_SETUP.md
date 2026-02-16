# ACM Certificate Setup & Custom Domain Configuration

## Step 1: Get DNS Validation Records

After requesting the certificate, you need to get the DNS validation records:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1 \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Expected Output:**
```json
{
    "Name": "_abc123def456.mixtape.ninjabot.net",
    "Type": "CNAME",
    "Value": "_xyz789.abcdef.acm-validations.aws."
}
```

## Step 2: Add DNS Validation Record to GCP

1. Go to GCP Cloud DNS (or your DNS provider)
2. Add a CNAME record:
   - **Name**: `_abc123def456.mixtape` (the value from the `Name` field, without the domain)
   - **Type**: `CNAME`
   - **TTL**: `300` (or default)
   - **Data**: `_xyz789.abcdef.acm-validations.aws.` (the value from the `Value` field)

**Note:** The name will be something like `_abc123def456.mixtape` - you need to add it as a subdomain of `ninjabot.net`

## Step 3: Wait for Validation

Check validation status:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1 \
  --region us-east-1 \
  --query 'Certificate.Status'
```

Wait until it returns `"ISSUED"` (can take 5-30 minutes).

## Step 4: Update Terraform Configuration

Once validated, update Terraform to use the certificate.

### Create terraform.tfvars

Create or update `terraform/terraform.tfvars`:

```hcl
aws_region = "us-east-1"
s3_bucket_name = "mixtape-creator-tool"
environment = "production"
cloudfront_price_class = "PriceClass_100"
domain_name = "mixtape.ninjabot.net"
certificate_arn = "arn:aws:acm:us-east-1:088878892064:certificate/66f5a53f-6188-48a2-9fd3-50496a4eeaa1"
```

### Apply Terraform Changes

```bash
cd terraform
terraform plan  # Review changes
terraform apply # Apply changes
```

**Expected Changes:**
- CloudFront distribution will be updated to use the certificate
- Custom domain alias will be added
- Distribution will be recreated (takes 15-20 minutes)

**Important:** CloudFront distribution updates can take 15-20 minutes to complete.

### Verify Custom Domain

After Terraform apply completes:

1. Wait 5-10 minutes for changes to propagate
2. Test HTTPS:
   ```bash
   curl -I https://mixtape.ninjabot.net
   ```
   Should return `200 OK` with valid SSL certificate

3. Check certificate in browser:
   - Visit `https://mixtape.ninjabot.net`
   - Click the lock icon in browser
   - Should show valid certificate for `mixtape.ninjabot.net`

## Troubleshooting

### Certificate Not Validating

- Check DNS record is correct in GCP
- Wait up to 30 minutes for DNS propagation
- Verify record name and value match exactly (including trailing dots)

### CloudFront Still Using Default Certificate

- Verify certificate status is "ISSUED" before applying Terraform
- Check Terraform applied successfully
- Wait for CloudFront distribution to fully update (15-20 minutes)

### SSL Certificate Errors

- Ensure certificate is in `us-east-1` region (required for CloudFront)
- Verify domain name matches exactly
- Check certificate includes the domain (not just wildcard)

