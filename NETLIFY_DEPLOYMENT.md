# CoolTab Netlify Deployment Guide

## Overview
CoolTab is a full-stack application. This guide covers deploying:
- **Frontend** → Netlify
- **Backend** → Heroku or Railway

## Step 1: Deploy Frontend to Netlify

### Prerequisites
- Netlify account (sign up at https://netlify.com)
- GitHub repo with CoolTab code pushed

### Option A: Deploy via Git (Recommended)
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Select your Git provider (GitHub, GitLab, etc.)
4. Authorize and select the CoolTab repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`
6. Add environment variables under "Build & deploy" → "Environment":
   - `REACT_APP_API_URL` = `https://YOUR_BACKEND_URL/api`
7. Click "Deploy site"

### Option B: Deploy via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=client/build
```

---

## Step 2: Deploy Backend

Choose one of the following:

### Option A: Deploy to Heroku

1. **Install Heroku CLI**:
   ```bash
   # Windows
   Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create Heroku app**:
   ```bash
   heroku login
   heroku create cooltab-backend
   ```

3. **Set MongoDB URI** (or use MongoDB Atlas):
   ```bash
   heroku config:set MONGODB_URI="your_mongodb_connection_string"
   ```

4. **Deploy**:
   ```bash
   cd server
   git push heroku main
   ```

### Option B: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL or MongoDB service
4. Connect your GitHub repo
5. Set environment variables
6. Deploy

### Option C: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Build command: `npm install`
5. Start command: `node index.js`
6. Add environment variables
7. Deploy

---

## Step 3: Update Frontend API Endpoint

After deploying backend, update Netlify environment variable:

1. Netlify Dashboard → Site settings → Build & deploy → Environment
2. Set `REACT_APP_API_URL` to your backend URL (e.g., `https://cooltab-backend.herokuapp.com/api`)
3. Trigger a new deploy or use "Build & deploy" → "Trigger deploy"

---

## Step 4: Configure CORS on Backend

Update [server/index.js](../server/index.js) to allow Netlify domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.netlify.app',
    'https://cooltab.netlify.app'  // your actual Netlify domain
  ]
}));
```

---

## Environment Variables Reference

### Frontend (.env.production in client/)
```
REACT_APP_API_URL=https://your-backend.herokuapp.com/api
```

### Backend (.env in server/)
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=production
```

---

## Testing Your Deployment

1. Visit your Netlify site: `https://your-site.netlify.app`
2. Verify frontend loads
3. Test creating/updating loads - should communicate with backend
4. Check browser console for API errors

---

## Troubleshooting

**CORS Errors**: 
- Ensure backend CORS is configured with Netlify domain
- Check that REACT_APP_API_URL matches backend origin

**API calls failing**:
- Verify REACT_APP_API_URL environment variable is set
- Check backend logs on Heroku/Railway/Render
- Ensure MongoDB connection is working

**Build fails**:
- Run `npm run build` locally to check for errors
- Check Netlify build logs in Dashboard → Deploys

---

## Useful Links

- [Netlify Documentation](https://docs.netlify.com/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Railway Deployment](https://docs.railway.app/)
- [Render Deployment](https://render.com/docs)
