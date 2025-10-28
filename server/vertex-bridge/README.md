# Vertex Bridge (Cloud Run)

A minimal Express service that proxies requests to Google Vertex AI using Application Default Credentials (ADC) from your Google Cloud project/workspace. No secrets are stored in the browser.

## Deploy (Cloud Run)
1. Ensure you have `gcloud` authenticated with a Workspace account that has access to the GCP project.
2. Set env vars at deploy (replace values):
   - `GCP_PROJECT=your-project-id`
   - `GCP_LOCATION=us-central1`
   - `VERTEX_MODEL=gemini-1.5-flash-001`
3. Deploy:
```bash
gcloud run deploy vertex-bridge \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT=your-project-id,GCP_LOCATION=us-central1,VERTEX_MODEL=gemini-1.5-flash-001
```
4. Note the service URL and set it as `VERTEX_BRIDGE_URL` in your app environment.

## API
- `GET /healthz` → status
- `POST /generate` → { contents[], config? } → Vertex `generateContent` proxy

## Notes
- Keep requests modest (flash for day-to-day). Use Pro selectively for heavy synthesis.
- Add Auth (IAP/JWT) later if you want to restrict callers beyond CORS.
