# Deployment Guide

This guide explains how to deploy CineLens to GitHub Pages with full Gemini API functionality.

## Prerequisites

- A GitHub account
- A forked or cloned copy of this repository
- A Gemini API key (free from [Google AI Studio](https://aistudio.google.com/))

## Step-by-Step Deployment Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** in the top navigation bar
3. In the left sidebar, click **Pages**
4. Under **Build and deployment**, select:
   - **Source**: GitHub Actions
5. Click **Save**

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API Key** or **Create API Key**
4. Copy the generated API key (it will look like `AIzaSy...`)
5. Keep this key secure - you'll need it in the next step

### 3. Add API Key as GitHub Secret

1. In your GitHub repository, click **Settings**
2. In the left sidebar, expand **Secrets and variables**
3. Click **Actions**
4. Click the **New repository secret** button (green button in the top right)
5. Fill in the secret details:
   - **Name**: `VITE_API_KEY` (must be exactly this name)
   - **Secret**: Paste your Gemini API key
6. Click **Add secret**

### 4. Trigger Deployment

The deployment happens automatically when you push to the `main` branch. To trigger it manually:

1. Go to the **Actions** tab in your repository
2. Click on **Deploy to GitHub Pages** workflow in the left sidebar
3. Click **Run workflow** dropdown (top right)
4. Select the `main` branch
5. Click **Run workflow** button

The deployment typically takes 2-3 minutes. Once complete, your site will be available at:
```
https://<your-username>.github.io/cine-lens/
```

### 5. Verify Deployment

1. Visit your deployed site
2. Record a short video clip of a movie scene
3. Click **Identify Movie**
4. If configured correctly, the Gemini API will analyze the frames

If you see "Gemini API key not configured" error:
- Double-check the secret name is exactly `VITE_API_KEY`
- Ensure the deployment ran after adding the secret
- Check the Actions tab for any build errors

## Using Local AI Mode

If you don't want to use the Gemini API, CineLens also supports a Local AI mode:

- Toggle the switch in the header to "Local AI"
- No API key required
- Completely private (runs in your browser)
- First use downloads ~200MB of models
- Lower accuracy than Gemini but works offline

## Security Notes

- ✅ Your API key is stored securely in GitHub Secrets
- ✅ The key is only used during the build process
- ✅ The key is NOT exposed in the deployed application code
- ✅ Each API request is made directly from the user's browser to Google's servers
- ⚠️ Never commit your API key to the repository
- ⚠️ Never share your API key publicly

## Troubleshooting

### "Gemini API key not configured" error

**Problem**: The deployed site shows this error when trying to identify movies.

**Solutions**:
1. Verify the GitHub secret is named exactly `VITE_API_KEY` (case-sensitive)
2. Ensure the secret value is your actual Gemini API key
3. Check that the deployment ran successfully after adding the secret
4. Try re-running the deployment workflow manually
5. Check the Actions tab for build errors

### Build fails in GitHub Actions

**Problem**: The deployment workflow fails with an error.

**Solutions**:
1. Check the Actions tab for detailed error logs
2. Ensure `pnpm-lock.yaml` is committed to the repository
3. Verify `package.json` has all required dependencies
4. Try running `pnpm install && pnpm build` locally first

### API key quota exceeded

**Problem**: Requests fail with quota errors.

**Solutions**:
1. Check your API usage in [Google AI Studio](https://aistudio.google.com/)
2. The free tier has rate limits - wait and try again
3. Consider using Local AI mode as a fallback
4. Upgrade your API plan if needed

## Local Development

For local development, you don't need to use GitHub secrets:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   VITE_API_KEY=your_actual_api_key_here
   ```

3. The `.env` file is automatically ignored by git

4. Run the development server:
   ```bash
   pnpm dev
   ```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Google AI Studio](https://aistudio.google.com/)
