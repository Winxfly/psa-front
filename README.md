# psa-front

Standalone frontend for PSA. The project is prepared to be deployed independently from the backend and to talk to the API through same-origin `/api/v1`.

## API configuration

The browser-side frontend uses `/api/v1` by default in both local and production modes. This keeps requests same-origin and avoids shipping environment-specific API URLs into the client bundle.

- Production: the public reverse proxy must route `/api/*` to the backend and everything else to the frontend container.
- Local development: the bundled Vite dev server proxies `/api/*` to the backend running on the host.

Runtime config is loaded from `public/runtime-config.js`. If you ever need a non-default API base URL, override `window.__PSA_CONFIG__.apiBaseUrl` there at deploy time. For the standard same-origin setup, nothing needs to be changed.

## Environment

The frontend does not require a `.env` file for production.

Optional local-only environment:

- `API_PROXY_TARGET`: backend origin for the Dockerized Vite dev proxy. Default is `http://host.docker.internal`.
- `API_PROXY_HOST_HEADER`: optional `Host` header override for local reverse proxies that route by host name.

Example file: `.env.example`

## Local development

Requirements:

- Docker / Docker Compose
- backend available on the host, typically through Caddy on port `80`

Start dev mode:

```bash
make local
```

Open [http://localhost:3000](http://localhost:3000).

If the backend is not available through `http://host.docker.internal`, create `.env` from `.env.example` and override the proxy settings.

Common local cases:

- Backend exposed through local Caddy on the host: `API_PROXY_TARGET=http://host.docker.internal`
- Backend exposed through local Caddy with `localhost` site block matching: `API_PROXY_TARGET=http://host.docker.internal` and `API_PROXY_HOST_HEADER=localhost`
- Backend exposed directly on a custom host port: set `API_PROXY_TARGET` accordingly

The Compose file maps `host.docker.internal` to the Docker host via `host-gateway`, so this flow works on Linux VMs as well as Docker Desktop environments.

## Production image

Production contract:

- The frontend remains a separate service/container.
- TLS and certificates are terminated by an external reverse proxy, not by the frontend container.
- The frontend container is internal-only in production and should not publish its port directly to the public Internet.
- The frontend container serves only static files.
- Browser API calls stay same-origin and use `/api/v1`.

Build the image:

```bash
make build
```

Run the container locally:

```bash
make run
```

The container serves only frontend static assets. It intentionally does not proxy `/api/*`.

Smoke-check the production image locally:

```bash
make smoke
```

This smoke-check is local-only. It temporarily publishes the container on `127.0.0.1` to verify the image before deployment; that is not part of the production deployment contract.

## Reverse proxy scheme

The frontend repo should describe only this reverse proxy contract:

1. `GET /` and static assets -> frontend container
2. `GET/POST /api/*` -> backend service
3. Browser requests from the frontend -> `/api/v1/...`

This keeps frontend and backend fully separate while preserving same-origin behavior in the browser. The reverse proxy implementation itself lives outside this repository.
