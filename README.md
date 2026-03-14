# NarrativaX

NarrativaX is a production-ready online novel reading platform (Kindle/Webnovel-style) with SEO-first Next.js frontend and Express + MongoDB backend.

## Architecture
- `frontend`: Next.js + Tailwind CSS + SSR pages + reader UI + SEO + GA + AdSense placeholders.
- `backend`: Express REST API + MongoDB models + auth + admin CRUD + trending/search.

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment files:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
3. Seed sample data:
   ```bash
   npm run seed --workspace backend
   ```
4. Run both apps:
   ```bash
   npm run dev
   ```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:5000`

## Deployment
### Option A: Cloud (recommended)
- Deploy frontend on Vercel.
- Deploy backend on Render/Railway.
- Host MongoDB on MongoDB Atlas.

### Option B: VPS (Docker)
1. Build frontend and backend containers.
2. Run behind Nginx reverse proxy.
3. Enable HTTPS with Let's Encrypt.

Detailed setup in `docs/DEPLOYMENT.md`.
