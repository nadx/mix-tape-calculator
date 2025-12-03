# Configuration Guide

This guide explains how to configure the Mixtape Creator Tool for your own environment.

## Overview

The application requires configuration in three areas:
1. **Frontend** - Environment variables for the React app
2. **Backend** - Supabase Edge Functions environment variables
3. **Infrastructure** - Terraform variables for AWS deployment

---

## Frontend Configuration

### Step 1: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 2: Configure Supabase

1. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`
   - Find your **Project URL** and **anon/public key**

2. **Update `.env` file:**
   ```env
   VITE_SUPABASE_PROJECT_ID=your-project-id-here
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   **Note:** The project ID is the part between `https://` and `.supabase.co` in your project URL.
   
   Example: If your URL is `https://abcdefghijklmnop.supabase.co`, then `abcdefghijklmnop` is your project ID.

### Step 3: Configure Honeycomb (Optional)

If you want to enable telemetry tracking:

1. **Get your Honeycomb API key:**
   - Sign up at https://ui.honeycomb.io/
   - Navigate to Settings → API Keys
   - Create a new API key

2. **Update `.env` file:**
   ```env
   VITE_HONEYCOMB_API_KEY=your-honeycomb-api-key-here
   ```

   **Note:** If you don't set this, telemetry will be disabled and the app will work normally.

### Step 4: Restart Development Server

After updating `.env`, restart your development server:

```bash
npm run dev
```

---

## Backend Configuration (Supabase Edge Functions)

The backend runs as Supabase Edge Functions and requires environment variables to be set in the Supabase dashboard.

### Required Environment Variables

1. **SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://YOUR_PROJECT_ID.supabase.co`
   - Found in: Project Settings → API → Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   - ⚠️ **Keep this secret!** This is a service role key with elevated permissions
   - Found in: Project Settings → API → Service Role Key
   - **Never expose this in client-side code**

3. **SPOTIFY_CLIENT_ID**
   - Your Spotify App Client ID
   - Get from: https://developer.spotify.com/dashboard
   - Create an app if you don't have one

4. **SPOTIFY_CLIENT_SECRET**
   - Your Spotify App Client Secret
   - ⚠️ **Keep this secret!**
   - Found in: Spotify Dashboard → Your App → Settings

### How to Set Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Scroll to **Environment Variables**
4. Add each variable:
   - Click **Add new variable**
   - Enter the variable name (e.g., `SPOTIFY_CLIENT_ID`)
   - Enter the value
   - Click **Save**

### Edge Function: `make-server-20b8aa27`

This function handles Spotify track searches. Make sure all four environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

---

## Infrastructure Configuration (Terraform)

Infrastructure configuration is handled through Terraform variables. See `terraform/variables.tf` for all available options.

### Quick Setup

1. **Use default values** (recommended for first-time setup):
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Customize via `terraform.tfvars`** (optional):
   ```hcl
   aws_region            = "us-east-1"
   s3_bucket_name       = "my-mixtape-tool"
   environment          = "production"
   cloudfront_price_class = "PriceClass_100"
   ```

### Available Variables

- `aws_region` - AWS region (default: `us-east-1`)
- `s3_bucket_name` - S3 bucket name (default: `mixtape-creator-tool`)
- `environment` - Environment name (default: `production`)
- `cloudfront_price_class` - CloudFront price class (default: `PriceClass_100`)
- `domain_name` - Custom domain (optional, default: `""`)
- `certificate_arn` - ACM certificate ARN for custom domain (optional, default: `""`)

See `terraform/README.md` for more details.

---

## Configuration Checklist

### Frontend
- [ ] Created `.env` file from `.env.example`
- [ ] Set `VITE_SUPABASE_PROJECT_ID`
- [ ] Set `VITE_SUPABASE_ANON_KEY`
- [ ] (Optional) Set `VITE_HONEYCOMB_API_KEY`
- [ ] Restarted development server

### Backend
- [ ] Set `SUPABASE_URL` in Supabase Edge Functions settings
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Functions settings
- [ ] Set `SPOTIFY_CLIENT_ID` in Supabase Edge Functions settings
- [ ] Set `SPOTIFY_CLIENT_SECRET` in Supabase Edge Functions settings

### Infrastructure
- [ ] Configured AWS CLI (`aws configure`)
- [ ] Initialized Terraform (`terraform init`)
- [ ] Reviewed/updated Terraform variables if needed
- [ ] Applied Terraform configuration (`terraform apply`)

---

## Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Never expose service role keys** - Only use anon keys in frontend code
3. **Rotate keys regularly** - Especially if they've been exposed
4. **Use environment-specific values** - Different values for dev/staging/production
5. **Review Supabase RLS policies** - Ensure proper access control

---

## Troubleshooting

### Frontend Issues

**Problem:** App can't connect to Supabase
- **Solution:** Check that `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY` are set correctly
- **Verify:** Check browser console for errors

**Problem:** Telemetry not working
- **Solution:** Check that `VITE_HONEYCOMB_API_KEY` is set (if you want telemetry)
- **Note:** Telemetry is optional - the app works without it

### Backend Issues

**Problem:** Spotify search returns "credentials not configured"
- **Solution:** Verify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set in Supabase Edge Functions settings
- **Verify:** Check Edge Function logs in Supabase dashboard

**Problem:** Edge Function can't access database
- **Solution:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- **Note:** Service role key bypasses RLS policies - use with caution

### Infrastructure Issues

**Problem:** Terraform apply fails
- **Solution:** Check AWS credentials are configured (`aws sts get-caller-identity`)
- **Solution:** Verify you have permissions for S3, CloudFront, and IAM

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the deployment documentation: `docs/DEPLOYMENT.md`
3. Check Supabase Edge Function logs in the dashboard
4. Verify all environment variables are set correctly

