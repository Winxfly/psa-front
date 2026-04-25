import http from 'node:http';
import https from 'node:https';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PROXY_TARGET = 'http://localhost:8080';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;
  const isHttpsProxyTarget = apiProxyTarget.startsWith('https://');
  const proxyUrl = new URL(apiProxyTarget);
  const shouldUseLocalhostTlsWorkaround =
    proxyUrl.protocol === 'https:' && proxyUrl.hostname === 'host.docker.internal';

  const proxyHeaders = shouldUseLocalhostTlsWorkaround
    ? { host: 'localhost' }
    : undefined;

  const proxyAgent = shouldUseLocalhostTlsWorkaround
    ? new https.Agent({
        rejectUnauthorized: false,
        servername: 'localhost',
      })
    : undefined;

  const requestModule = proxyUrl.protocol === 'https:' ? https : http;

  const localCaddyProxyPlugin = shouldUseLocalhostTlsWorkaround
    ? {
        name: 'local-caddy-api-proxy',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith('/api/')) {
              next();
              return;
            }

            const upstreamRequest = requestModule.request(
              {
                protocol: proxyUrl.protocol,
                hostname: proxyUrl.hostname,
                port: proxyUrl.port || 443,
                method: req.method,
                path: req.url,
                headers: {
                  ...req.headers,
                  host: 'localhost',
                },
                rejectUnauthorized: false,
                servername: 'localhost',
              },
              (upstreamResponse) => {
                res.writeHead(
                  upstreamResponse.statusCode || 502,
                  upstreamResponse.statusMessage,
                  upstreamResponse.headers
                );
                upstreamResponse.pipe(res);
              }
            );

            upstreamRequest.on('error', (error) => {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(`Local API proxy error: ${error.message}`);
            });

            req.pipe(upstreamRequest);
          });
        },
      }
    : null;

  return {
    plugins: localCaddyProxyPlugin ? [localCaddyProxyPlugin] : [],
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        ...(shouldUseLocalhostTlsWorkaround
          ? {}
          : {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
                // Local development may proxy to host Caddy with a self-signed cert.
                secure: !isHttpsProxyTarget ? true : false,
                headers: proxyHeaders,
                agent: proxyAgent,
              },
            }),
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  };
});
