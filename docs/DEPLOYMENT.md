# Deployment Guide

## Environment Variables
### Backend
- `PORT=10000` *(Render injects this automatically; keep the app bound to `process.env.PORT`.)*
- `MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority`
- `JWT_SECRET=<generate-a-long-random-secret>`
- `CLIENT_URL=https://your-frontend-domain.onrender.com` *(comma-separated if you need multiple origins)*
- `CACHE_TTL_SECONDS=60`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=300`
- `DB_CONNECT_RETRY_MS=5000`

### Frontend
- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-service.onrender.com/api`
- `NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com`
- `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx`

## Cloud Setup
1. **MongoDB Atlas**: Create a cluster, create a database user, and allow Render's outbound IPs or use `0.0.0.0/0` if you accept the tradeoff.
2. **Backend (Render/Railway)**:
   - Preferred root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
   - Required environment variables: `MONGO_URI`, `JWT_SECRET`
   - Recommended environment variable: `CLIENT_URL`
3. **Frontend (Vercel/Render Static Site)**:
   - Root: `frontend`
   - Build: `npm run build`
   - Output: `.next`
4. Configure DNS:
   - `www.yourdomain.com` -> frontend
   - `api.yourdomain.com` -> backend

## Render Notes
- Do **not** deploy the backend service from the monorepo root unless your Render service is explicitly configured for the `backend` workspace.
- If Render is pointing at the repository root, either change the service root directory to `backend` or use the included `render.yaml` blueprint.
- The backend now starts listening immediately, exposes `/healthz` and `/api/health`, and retries MongoDB connections instead of exiting on the first failed attempt.

## VPS Setup (Ubuntu)
1. Install Node.js 20+, Nginx, PM2, MongoDB.
2. Clone repo and install dependencies:
   ```bash
   npm install
   npm run build
   ```
3. Start services with PM2:
   ```bash
   pm2 start npm --name narrativax-api -- run start --workspace backend
   pm2 start npm --name narrativax-web -- run start --workspace frontend
   pm2 save
   ```
4. Configure Nginx reverse proxy and SSL.

## AdSense Integration
1. Add your AdSense client ID into `frontend/.env.local`.
2. Replace placeholder ad slot IDs in `frontend/components/AdSlot.js`.
3. Verify policy compliance (content quality, no accidental clicks).

## Google Analytics
1. Create GA4 property and set `NEXT_PUBLIC_GA_ID`.
2. Analytics script is loaded from `_app.js`.
3. Validate events in GA DebugView.
