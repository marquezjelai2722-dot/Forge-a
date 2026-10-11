# Forge Connected Project

This bundle wires the existing Forge dark UI to a Node.js API and Supabase email/password authentication. It is prepared source code, not a deployed or end-to-end-tested service. You must add your own service URLs and secret values.

## Files
- `frontend/index.html` — Forge interface, sign-up/sign-in, personality settings, real API request to `/v1/chat`.
- `backend/server.js` — API server; validates Supabase sessions and keeps the AI provider key server-side.
- `backend/package.json` — Node 20+ server dependencies.
- `backend/.env.example` — variable names and examples only.

## IMPORTANT: keep the OpenAI key private
Never paste the OpenAI API key into ChatGPT, the frontend HTML, a public GitHub repo, or an APK. Add it only as a private environment variable in the backend hosting dashboard. API usage is billed separately from ChatGPT.

## Setup checklist (mobile-friendly)

### 1. Create a Supabase project
1. Open the official Supabase site and create a project.
2. In the project dashboard, open **Project Settings → API** (the wording may vary).
3. Copy the **Project URL** and the **publishable/anon key**. These are used by the frontend and backend.
4. Open **Authentication → Providers → Email** and ensure email/password sign-in is enabled.
5. If email confirmation is enabled, users need to confirm their email before they can sign in.

### 2. Put the code on GitHub
1. Create a new private GitHub repository named `forge-connected-project`.
2. Upload the contents of this ZIP (upload the files inside the folder, not an extra enclosing folder).
3. Do not create or upload a real `.env` file. `.env.example` contains placeholders only.

### 3. Deploy the backend
1. Create a Web Service on a Node-compatible host such as Render and connect the GitHub repository.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add these Environment Variables in the host dashboard:
   - `SUPABASE_URL` = your Supabase Project URL
   - `SUPABASE_ANON_KEY` = your Supabase publishable/anon key
   - `AI_BASE_URL` = `https://api.openai.com/v1`
   - `AI_API_KEY` = your OpenAI API key (secret; only in host settings)
   - `AI_MODEL` = `gpt-4o-mini` (change only if your API account supports a different model)
   - `APP_ORIGIN` = the exact HTTPS origin where you host the frontend, e.g. `https://your-site.pages.dev`
   - `MAX_OUTPUT_TOKENS` = `800`
   The host provides a public backend URL after deployment. Check `https://YOUR-BACKEND-URL/health`; it should return JSON with `ok: true`.

### 4. Configure the frontend
Open `frontend/index.html` in a text editor and find these three constants near the top of its script:
- `API_BASE_URL` = your backend URL (no trailing slash)
- `SUPABASE_URL` = your Supabase Project URL
- `SUPABASE_ANON_KEY` = your Supabase publishable/anon key

The Supabase publishable/anon key is designed for frontend use; it is not your OpenAI secret. Never put the OpenAI key here.

### 5. Host the frontend
Host `frontend/index.html` on a static HTTPS host (for example, Cloudflare Pages or GitHub Pages). For GitHub Pages, put `index.html` in the repository root or configure the deployment directory to `frontend`. Copy the resulting site origin into the backend's `APP_ORIGIN` environment variable, then redeploy/restart the backend.

### 6. Test
1. Open the hosted frontend.
2. Create an account with an email you can access.
3. Confirm the email if requested, then sign in.
4. Send a simple message. The header should show Connected after a successful reply.
5. If it fails, check the backend host logs and verify all environment variables. `/health` only confirms the server is running; it does not verify the AI key.

## Troubleshooting
- **Setup needed**: one of the three frontend constants still has a placeholder.
- **Sign-in required / invalid session**: verify the Supabase URL and publishable/anon key match the same project.
- **CORS error**: `APP_ORIGIN` must exactly match the frontend origin, including `https://` and without a path.
- **AI provider could not complete the request**: verify `AI_API_KEY` and `AI_MODEL` in the backend environment settings and check API billing/limits.
- **No replies while first opening the site**: some free hosting services sleep when idle; wait a little and retry.

This is a starter, not a guarantee of free AI usage or permanent free hosting. Hosting limits and OpenAI API charges may apply.
