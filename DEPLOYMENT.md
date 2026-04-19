# NoidaPulse Deployment Guide

## Prerequisites

1. **GitHub Account** - https://github.com
2. **MongoDB Atlas Account** (Free) - https://www.mongodb.com/cloud/atlas
3. **Netlify** OR **Vercel** Account
4. **OMDb API Key** - https://www.omdbapi.com/apikey.aspx

---

## Step 1: Set Up MongoDB Atlas (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (choose FREE tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Add `/noidapulse` before the `?` to specify database name

---

## Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NoidaPulse"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/noidapulse.git
git branch -M main
git push -u origin main
```

---

## Step 3A: Deploy to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repo
4. Configure build settings:
   - Build command: `yarn build`
   - Publish directory: `.next`
5. Add Environment Variables:
   - `MONGO_URL` = Your MongoDB Atlas connection string
   - `DB_NAME` = `noidapulse`
   - `OMDB_API_KEY` = Your OMDb API key
6. Click "Deploy site"

---

## Step 3B: Deploy to Vercel (Recommended)

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Add Environment Variables:
   - `MONGO_URL` = Your MongoDB Atlas connection string
   - `DB_NAME` = `noidapulse`
   - `OMDB_API_KEY` = Your OMDb API key
5. Click "Deploy"

---

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|--------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/noidapulse` |
| `DB_NAME` | Database name | `noidapulse` |
| `OMDB_API_KEY` | OMDb API key | `8dbf8969` |

---

## Troubleshooting

### MongoDB Connection Issues
- Make sure to whitelist `0.0.0.0/0` in MongoDB Atlas Network Access
- Check if username/password are correct
- Ensure database name is in the connection string

### Build Failures
- Check Node.js version (use 18+)
- Run `yarn build` locally first to catch errors

### API Not Working
- Verify environment variables are set correctly
- Check Netlify/Vercel function logs

---

## Features Included

- 📺 240 shows/movies database
- 🔍 Fuzzy search with spelling correction
- 📍 143 Noida sectors
- 📱 Device tracking (Mobile, Laptop, Tablet, TV)
- 📅 Date range filtering
- ⏰ Time of day filtering
- 📺 Season tracking (S1-S6+)
- 📤 WhatsApp sharing
- 🖼️ Auto poster fetching from OMDb

---

## Support

For issues, create a GitHub issue in your repo.
