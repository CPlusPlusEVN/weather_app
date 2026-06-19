# Weather App

A single-page weather app. The frontend is plain HTML/CSS/JS served as a static
site; a Netlify Function proxies WeatherAPI.com so the API key never reaches the
browser.

## Project structure
public/

index.html              # the SPA (search box, button, results card)

netlify/

functions/

weather.js            # serverless proxy -> WeatherAPI.com

netlify.toml              # publish dir, functions dir, /api/weather rewrite

.env.example              # template for the API key

.gitignore

README.md

## How it works

The browser calls `/api/weather?city=...` on this same site. `netlify.toml`
rewrites that path to the `weather` function, which reads `WEATHERAPI_KEY` from
the environment, calls WeatherAPI.com server-side, and returns normalized JSON.
The key is never sent to the client.

## Prerequisites

- A free WeatherAPI.com account and API key: https://www.weatherapi.com/
- Node.js 18 or newer (the function uses the built-in global `fetch`).
- Netlify CLI:

```bash
  npm install -g netlify-cli
```

## Run locally

1. Create a `.env` file from the template and add your key:

```bash
   cp .env.example .env
   # then edit .env and set WEATHERAPI_KEY=...
```

2. Start the local dev server (it loads `.env`, serves `public/`, and runs the
   function with the `/api/weather` rewrite applied):

```bash
   netlify dev
```

3. Open the URL it prints (usually http://localhost:8888) and search for a city.

> `netlify dev` automatically picks up variables from `.env`. Do not commit
> `.env` — it's gitignored.

## Deploy to Netlify

### Option A — connect a Git repo (recommended)

1. Push this folder to GitHub/GitLab/Bitbucket.
2. In the Netlify dashboard: **Add new site → Import an existing project**, then
   pick your repo.
3. Netlify reads `netlify.toml`, so the publish dir (`public`) and functions
   dir (`netlify/functions`) are configured automatically. No build command is
   needed.
4. Set the API key (see below), then deploy.

### Option B — deploy from the CLI

```bash
netlify deploy --prod
```

## Set WEATHERAPI_KEY in the Netlify UI

The key must exist in your site's environment so the deployed function can read
it:

1. Go to your site in the Netlify dashboard.
2. **Site configuration → Environment variables → Add a variable.**
3. Key: `WEATHERAPI_KEY` — Value: your WeatherAPI.com key.
4. Save, then trigger a redeploy (**Deploys → Trigger deploy → Deploy site**)
   so the new variable is picked up.

## Error handling

- **Empty input** → friendly prompt, no request sent.
- **Unknown city** → WeatherAPI returns HTTP 400 / `error.code 1006`; the
  function normalizes this to a clean **404** with a readable message.
- **Network/upstream failure** → returned as **502** with a friendly message.
- **Missing key on the server** → **500** with a configuration message.
