output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "github_actions_access_key_id" {
  description = "AWS Access Key ID for GitHub Actions (add to GitHub Secrets as AWS_ACCESS_KEY_ID)"
  value       = aws_iam_access_key.github_actions.id
  sensitive   = true
}

output "github_actions_secret_access_key" {
  description = "AWS Secret Access Key for GitHub Actions (add to GitHub Secrets as AWS_SECRET_ACCESS_KEY)"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}

output "github_actions_cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (add to GitHub Secrets as CLOUDFRONT_DISTRIBUTION_ID)"
  value       = aws_cloudfront_distribution.website.id
}

