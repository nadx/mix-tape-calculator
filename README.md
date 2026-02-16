# Mixtape Creator Tool

This is a code bundle for Mixtape Creator Tool. The original project is available at https://www.figma.com/design/oSc6MfUdABJO6C0t9EDudY/Mixtape-Creator-Tool.

A simple site that connects to Spotify via Supabase to allow users to query for songs and get song lengths as they create a mixtape.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Features

- **Spotify Integration**: Search for songs and automatically fetch duration from Spotify
- **Mixtape Planning**: Create mixtapes with 60 or 90-minute tape lengths
- **Side A/B Management**: Organize songs across two sides of a tape
- **OAuth Redirect Page**: `/redirect` endpoint for Spotify OAuth callbacks

## Deployment

**📋 Start here:** [docs/PREREQUISITES.md](./docs/PREREQUISITES.md) - Quick checklist of everything you need

**📘 Full guide:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Complete step-by-step deployment instructions

The deployment guide includes:
- Complete prerequisites checklist
- Step-by-step instructions for AWS, GitHub, and GCP setup
- Expected outcomes for each step
- Troubleshooting guide

**Additional Documentation:**
- [docs/CERTIFICATE_SETUP.md](./docs/CERTIFICATE_SETUP.md) - SSL certificate setup
- [docs/FIX_S3_PERMISSIONS.md](./docs/FIX_S3_PERMISSIONS.md) - S3/CloudFront troubleshooting
- [docs/FIX_CUSTOM_DOMAIN.md](./docs/FIX_CUSTOM_DOMAIN.md) - Custom domain configuration
- [docs/IMMEDIATE_FIXES.md](./docs/IMMEDIATE_FIXES.md) - Quick fixes for common issues

### Quick Start

### AWS Infrastructure Setup

1. **Install Terraform** (if not already installed):
   ```bash
   # macOS
   brew install terraform
   ```

2. **Initialize and apply Terraform**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Configure GitHub Secrets**:
   After running `terraform apply`, you'll get outputs that need to be added to GitHub Secrets:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`: From Terraform output `github_actions_access_key_id`
     - `AWS_SECRET_ACCESS_KEY`: From Terraform output `github_actions_secret_access_key`
     - `CLOUDFRONT_DISTRIBUTION_ID`: From Terraform output `github_actions_cloudfront_distribution_id`

4. **Update GitHub Actions workflow** (if needed):
   Edit `.github/workflows/deploy.yml` and update:
   - `S3_BUCKET`: Your S3 bucket name
   - `AWS_REGION`: Your AWS region

### GCP Subdomain Setup

1. **Create a CNAME record** in GCP DNS:
   - Name: `mixtape`
   - Type: `CNAME`
   - Value: Your CloudFront distribution domain (from Terraform output `cloudfront_domain_name`)

2. The subdomain `mixtape.ninjabot.net` will now redirect to your AWS-hosted site.

### Automatic Deployment

The GitHub Actions workflow automatically deploys to AWS when you push to `main` or `master` branch:

- Builds the React application
- Uploads to S3
- Invalidates CloudFront cache

You can also trigger manual deployments from the GitHub Actions tab.

## Project Structure

- `src/`: React application source code
- `src/pages/Redirect.tsx`: Spotify OAuth redirect handler
- `.github/workflows/`: GitHub Actions deployment workflows
- `terraform/`: AWS infrastructure as code
  