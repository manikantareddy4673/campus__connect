# EventHub frontend

Responsive React + Vite frontend based on the screens in `../design`.

## Run locally

First apply `backend/migrations/001_eventhub_schema.sql` in the SQL Editor for
the Supabase project configured in `backend/.env`. This creates the tables and
row-level security policies from the supplied schema diagram and synchronizes
Supabase Auth users into `public.users`.

Configure `backend/.env` using `backend/.env.example`, then start FastAPI in a
separate terminal:

```powershell
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 5000
```

Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:5000`.
Set `VITE_API_BASE_URL` in a local `.env` file when the FastAPI server runs elsewhere.
Set the backend's `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` before starting FastAPI.
If the API is unavailable, the UI uses sample events and keeps registrations in preview-only memory.

When the API is connected, signup and login use Supabase Auth through FastAPI, and
authenticated registrations are created and loaded from `public.registrations`.
The session token is kept in `sessionStorage` and is removed when signing out.
`GET /api/registrations` returns only the signed-in user's registrations;
`POST /api/registrations` creates one and requires a bearer token.
The diagram schema does not include scheduled event dates, venue, or payment
fields, so those details display as unavailable until the schema is extended.

The API also exposes `GET /`, `GET /healthz`, `GET /api/events`,
`GET /api/events/{event_id}`, `POST /api/events`, and organizer-only
`GET /api/events/{event_id}/registrations`. Assign the `organizer` role to an
account in `public.users` before using `POST /api/events`. FastAPI's interactive
API docs are available at `/docs`.

## Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel.
2. Set **Root Directory** to `frontend` and framework preset to **Vite**.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Add `VITE_API_BASE_URL` with your Render backend's public URL, without a
   trailing slash (for example, `https://your-service.onrender.com`).
5. Deploy. Copy the Vercel production domain shown after deployment.
6. In Render, set `FRONTEND_ORIGINS` to that exact origin, such as
   `https://your-project.vercel.app`. Add preview/custom domains as a
   comma-separated list if they also need API access, then save and redeploy
   the backend.
7. Open the Vercel site and test event loading, sign-in, and registration.

Do not put Supabase keys in Vercel; they belong only in the backend's Render
environment variables.

## Build

```powershell
npm run build
```
