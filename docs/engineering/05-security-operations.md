# Security and Operations

## Credentials

- `.env` is ignored and remains local.
- The Mapbox public token may be present in the built browser app; restrict it by permitted URLs in the Mapbox console.
- Do not create a server-side secret token for this static prototype.
- If a backend is added, store credentials in a secret manager and rotate keys before launch.

## Deployment

- Use GitHub Actions to build and publish only from the protected default branch.
- Configure the production Mapbox allowlist with the final GitHub Pages URL.
- Use content-hashed static assets to prevent stale graph/shade bundles.
- Add a visible build/version identifier to the About page.

## Observability

For the prototype, use browser-console diagnostics in development and a lightweight error boundary. Do not add behavioral analytics or persist location inputs.

## Cost controls

- Keep Mapbox on its free/research allowance and configure usage notifications.
- Keep data preprocessing local until artifact size or runtime requires cloud compute.
- Avoid external API calls for weather by serving versioned cached scenario files.

## Incident response

If a token is exposed outside the intended client bundle, revoke it in Mapbox, create a new restricted token, update local configuration, and redeploy. Record the event without storing the token value.
