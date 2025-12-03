terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for hosting the static site
resource "aws_s3_bucket" "website" {
  bucket = var.s3_bucket_name

  tags = {
    Name        = "Mixtape Creator Tool"
    Environment = var.environment
  }
}

# Block public access (CloudFront will access via OAI)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Identity (OAI) - deprecated but still works
# Using Origin Access Control (OAC) for new distributions
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.s3_bucket_name}-oac"
  description                       = "OAC for ${var.s3_bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                   = "sigv4"
}

# S3 bucket policy to allow CloudFront access
data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.website.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.website.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.s3_policy.json
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Mixtape Creator Tool Distribution"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Cache behavior for HTML files (no cache)
  ordered_cache_behavior {
    path_pattern     = "*.html"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method       = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = var.certificate_arn != "" ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
  }

  aliases = var.domain_name != "" ? [var.domain_name] : []

  tags = {
    Name        = "Mixtape Creator Tool"
    Environment = var.environment
  }
}

# IAM user for GitHub Actions deployment
resource "aws_iam_user" "github_actions" {
  name = "${var.s3_bucket_name}-github-actions"
  tags = {
    Name        = "GitHub Actions Deployer"
    Environment = var.environment
  }
}

# IAM policy for GitHub Actions to deploy to S3 and invalidate CloudFront
data "aws_iam_policy_document" "github_actions" {
  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:PutObjectAcl"
    ]
    resources = [
      aws_s3_bucket.website.arn,
      "${aws_s3_bucket.website.arn}/*"
    ]
  }

  statement {
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations"
    ]
    resources = ["${aws_cloudfront_distribution.website.arn}/*"]
  }
}

resource "aws_iam_user_policy" "github_actions" {
  name   = "${var.s3_bucket_name}-github-actions-policy"
  user   = aws_iam_user.github_actions.name
  policy = data.aws_iam_policy_document.github_actions.json
}

# Generate access keys for GitHub Actions (store these in GitHub Secrets)
resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}

