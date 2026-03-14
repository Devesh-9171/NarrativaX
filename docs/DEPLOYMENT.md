# Deployment Guide

## Environment Variables
### Backend
- `PORT=5000`
- `MONGO_URI=mongodb://localhost:27017/narrativax`
- `JWT_SECRET=change-me`
- `CLIENT_URL=https://your-frontend-domain`

### Frontend
- `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api`
- `NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com`
- `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx`

## Cloud Setup
1. **MongoDB Atlas**: Create cluster and whitelist app IPs.
2. **Backend (Render/Railway)**:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
3. **Frontend (Vercel)**:
   - Root: `frontend`
   - Build: `npm run build`
   - Output: `.next`
4. Configure DNS:
   - `www.yourdomain.com` -> frontend
   - `api.yourdomain.com` -> backend

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
