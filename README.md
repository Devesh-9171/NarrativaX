# ReadNovaX

ReadNovaX is a production-ready online novel reading platform with SEO-first Next.js frontend and Express + MongoDB backend.

## Architecture
- `frontend`: Next.js + Tailwind CSS + SSR pages + reader UI + SEO + GA + AdSense placeholders.
- `backend`: Express REST API + MongoDB models + auth + admin CRUD + trending/search.

## Quick Start
1. Clone the repository and move into the project folder (required before running npm commands):
   ```bash
   git clone <your-repo-url> NarrativaX
   cd NarrativaX
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment files:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
4. Seed sample data:
   ```bash
   npm run seed --workspace backend
   ```
5. Run both apps:
   ```bash
   npm run dev
   ```

## Troubleshooting
### `npm ERR! enoent Could not read package.json`
If you see an error like:

```text
npm ERR! enoent Could not read package.json: Error: ENOENT: no such file or directory
```

you are running `npm` outside this repository folder. Verify your location first:

```bash
pwd
```

Then move to the project root (the folder that contains `package.json`) and rerun:

```bash
cd NarrativaX
npm install
npm run dev
```

Frontend: `https://readnovax.in`  
Backend: `https://readnovax.onrender.com`

## Deployment
### Option A: Cloud (recommended)
- Deploy frontend on Vercel.
- Deploy backend on Render/Railway using the `backend` root directory or the included `render.yaml` blueprint.
- Host MongoDB on MongoDB Atlas.
- For Render backend health checks, use `/api/health`.

### Option B: VPS (Docker)
1. Build frontend and backend containers.
2. Run behind Nginx reverse proxy.
3. Enable HTTPS with Let's Encrypt.

Detailed setup in `docs/DEPLOYMENT.md`.
