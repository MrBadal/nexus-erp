# Redeploying NexusERP on GCP from scratch

**Status:** On 2026-10-30 every resource in GCP project `responsive-sun-462613-d0` was deleted and the billing
account unlinked (cost shutdown). The application code is in this repo; the production **data and secrets are NOT in git**.
They were saved to a local, git-excluded folder `gcp-backups/` at the repo root (database dump, `/opt/nexus/.env`, bucket
contents, offline git bundle) — ask the owner for it, or for the encrypted second copy. This document is the secret-free runbook.
The fuller version (all apps in the project, restore verification notes) lives in `gcp-backups/REDEPLOY.md`.

## What production looked like
One VM: `e2-micro`, `us-central1-a`, Debian 12, 20 GB `pd-balanced`, static IP, startup script `deploy/startup.sh`
(2 GB swap + Docker). `deploy/docker-compose.prod.yml` runs postgres 16, redis 7, api, web, caddy (automatic HTTPS on
`nexus.<ip-with-dashes>.nip.io`). Images in Artifact Registry `us-central1/nexus-erp`. GCS buckets
`nexus-erp-{public,files,backups}-<project-id>` (names are referenced by `GCS_*_BUCKET` in the compose file).
Deploys were always manual `gcloud builds submit` — there were never any Cloud Build triggers.

## Steps
1. **Re-enable billing / APIs:**
   `gcloud billing projects link <project> --billing-account=<id>`, then enable `compute`, `artifactregistry`, `cloudbuild`, `storage`.
2. **IP + registry:** `gcloud compute addresses create nexus-erp-ip --region=us-central1`;
   `gcloud artifacts repositories create nexus-erp --repository-format=docker --location=us-central1`.
   New IP `a.b.c.d` ⇒ host `nexus.a-b-c-d.nip.io`.
3. **Set the host** in `deploy/Caddyfile` (site address) and `cloudbuild-web.yaml` (`NEXT_PUBLIC_API_URL=https://<host>/api/v1`).
   The committed values point at an *older* IP; the last production values were never committed.
4. **Build from a clean tree at a recorded SHA** (see CLAUDE.md deploy rule):
   `gcloud builds submit --config=cloudbuild-api.yaml .` and `--config=cloudbuild-web.yaml .`.
5. **Buckets:** create the three buckets above (US-CENTRAL1); the public one served branding assets and must be publicly readable.
6. **VM:** create with the static IP, tags `http-server,https-server`, scope `cloud-platform`,
   `--metadata-from-file=startup-script=deploy/startup.sh`; open tcp 80/443; run `gcloud auth configure-docker us-central1-docker.pkg.dev` on it.
7. **Config on the VM** (`/opt/nexus`): `docker-compose.prod.yml`, `Caddyfile`, `backup.sh`, and `.env` with
   `HOST`, `PUBLIC_URL`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `API_IMAGE`, `WEB_IMAGE`.
   Reuse the saved `JWT_SECRET`/`POSTGRES_PASSWORD` when restoring data (the API derives its SMTP-password key from `JWT_SECRET`;
   `SMTP_ENCRYPTION_KEY` is not wired into the compose file).
8. **Data:** `docker compose ... up -d postgres redis`, then
   `docker exec -i nexus-postgres pg_restore -U postgres -d nexuserp --no-owner < final_nexuserp.dump`, then `up -d` everything.
   (A fresh install instead: `drizzle-kit migrate` from `apps/api/src/database/migrations/` builds the schema; register a tenant.)
9. **Migrations:** `0007_reconcile_role_permissions` exists in the chain but was never applied to production — apply it
   (`docker exec nexus-api sh -c 'node_modules/.bin/drizzle-kit migrate'`); the restored dump already records 0000–0006 as applied.
10. **Cron:** `30 21 * * * /opt/nexus/backup.sh` for nightly dumps to the backups bucket.

## Before you expose it publicly again
`POST /auth/register` is `@Public()` and always creates a new tenant with an instantly-active admin and a valid JWT (no email
verification, no CAPTCHA; only a 5/min/IP throttle). Decide between gating it (email verification + CAPTCHA) or disabling it in favour
of admin-only `POST /tenants`. See the CRM Phase 0 notes in `docs/crm/`.
