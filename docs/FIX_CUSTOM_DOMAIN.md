# Fix Custom Domain 403 Error

## Problem

- ✅ CloudFront URL works: `https://d1hirkdjxalrbh.cloudfront.net`
- ❌ Custom domain 403: `https://mixtape.ninjabot.net`

## Root Cause

CloudFront distribution is not configured to accept requests for the custom domain. Even though:
- ✅ CNAME record is set up correctly
- ✅ Certificate is validated (ISSUED)
- ✅ terraform.tfvars is configured

The CloudFront distribution needs to be **updated** to include the custom domain alias and certificate.

## Solution

Apply Terraform to update the CloudFront distribution:

```bash
cd terraform
terraform plan
terraform apply
```

**Expected Changes:**
- CloudFront distribution will be updated
- Custom domain alias will be added
- SSL certificate will be attached
- Distribution will be redeployed (takes 15-20 minutes)

## After Applying

1. **Wait 15-20 minutes** for CloudFront distribution to fully update
2. Check status:
   ```bash
   DIST_ID=$(terraform output -raw cloudfront_distribution_id)
   aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'
   ```
   Wait until it shows `"Deployed"`

3. **Test the custom domain:**
   ```bash
   curl -I https://mixtape.ninjabot.net
   ```
   Should return `200 OK` (not 403)

4. **Verify SSL certificate:**
   - Visit `https://mixtape.ninjabot.net` in browser
   - Check the lock icon - should show valid certificate

## Troubleshooting

### Still Getting 403 After Apply

- Wait longer (CloudFront updates can take up to 20 minutes)
- Check distribution status is "Deployed"
- Verify CNAME is still correct: `dig mixtape.ninjabot.net`
- Clear browser cache or try incognito mode

### Certificate Errors

- Verify certificate is in `us-east-1` region (required for CloudFront)
- Check certificate status is "ISSUED"
- Ensure domain name in terraform.tfvars matches exactly

### Distribution Not Updating

- Check Terraform apply completed successfully
- Verify no errors in Terraform output
- Try `terraform refresh` then `terraform apply` again



