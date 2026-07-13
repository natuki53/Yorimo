# Yorimo presentation deployment

## One-time preparation

1. Create a Google Cloud project dedicated to the presentation and enable only Maps JavaScript API and Places API (New).
2. Create separate browser and server keys. Restrict the browser key to Maps JavaScript API and `https://yorimo.mu-natuki.com/*`; restrict the server key to Places API (New).
3. Set the relevant Places methods to 600 requests/minute and, when the console exposes a daily quota, 2,000 requests/day. Add budget notifications at 50%, 90%, and 100% of JPY 3,000.
4. In Cloudflare, create the remotely managed tunnel `yorimo-prototype`, but do not add the public route until the application passes its local checks.

## Server files

Clone the repository into `/home/natuki/services/yorimo`, then create the production environment and tunnel secret:

```bash
cp .env.production.example .env.production
mkdir -p secrets
printf '%s' '<CLOUDFLARE_TUNNEL_TOKEN>' > secrets/cloudflared-token
chmod 600 .env.production secrets/cloudflared-token
```

Generate `POSTGRES_PASSWORD` with `openssl rand -hex 32` and `JWT_SECRET` with `openssl rand -hex 64`. Fill in both Google keys. Never commit these files.

Before the first build, reclaim only unused build cache if the root filesystem has less than 20 GB free:

```bash
docker builder prune --force
df -h /
```

Do not prune images or volumes belonging to other services.

## Deploy and publish

```bash
bash scripts/deploy-production.sh
```

Confirm that `http://127.0.0.1:8085/`, `/health`, and `/ready` work. The API documentation paths must return 404.

Run the 30-session smoke load before publishing:

```bash
node scripts/load-smoke.mjs
```

All sessions must complete without HTTP 429 and recommendation p95 must be at most 8 seconds.

In Cloudflare, add a Published application route to `yorimo-prototype`:

- Hostname: `yorimo.mu-natuki.com`
- Service URL: `http://app:4000`
- Cloudflare Access: disabled

Then start the dedicated connector:

```bash
bash scripts/start-public.sh
```

Thirty minutes before the presentation, run a reset, complete the smoke tests, then reset once more:

```bash
bash scripts/reset-demo.sh
```

The presentation QR code must point directly to `https://yorimo.mu-natuki.com/`.

## Monitoring and emergency stop

```bash
docker compose --env-file .env.production -f compose.production.yml --profile public ps
docker compose --env-file .env.production -f compose.production.yml --profile public logs --tail=100 app cloudflared
curl --fail http://127.0.0.1:8085/ready
```

To stop public access immediately, remove the Published application route in Cloudflare first, then run:

```bash
bash scripts/stop-public.sh
```

## End of presentation

After removing the Cloudflare route and deleting the `yorimo-prototype` tunnel, delete both Google API keys and disable the two APIs. Then destroy the presentation data and remove secrets:

```bash
docker compose --env-file .env.production -f compose.production.yml --profile public down --volumes
rm -f .env.production secrets/cloudflared-token
```

Keep the source checkout and image only if a later presentation is planned. The existing systemd `cloudflared` service and all unrelated containers remain untouched.
