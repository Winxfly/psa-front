import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PROXY_TARGET = 'http://host.docker.internal';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;
  const apiProxyHostHeader = env.API_PROXY_HOST_HEADER?.trim();

  return {
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          // Local development may proxy to host Caddy with a self-signed cert.
          secure: false,
          ...(apiProxyHostHeader
            ? {
                headers: {
                  Host: apiProxyHostHeader,
                },
              }
            : {}),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  };
});
