// Learn more: https://docs.expo.dev/guides/customizing-metro
const http = require('http');
const https = require('https');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Development only: the web app calls its own origin for /api/ and this forwards the request to
 * EXPO_PUBLIC_API_URL. The backend sends no CORS headers, so a browser on localhost can't call it
 * directly. Native apps call the backend directly and don't use this.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
if (apiUrl) {
  const target = new URL(apiUrl);
  const transport = target.protocol === 'https:' ? https : http;
  const previous = config.server?.enhanceMiddleware;
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
      const next = previous ? previous(middleware, server) : middleware;
      return (req, res, done) => {
        if (!req.url?.startsWith('/api/')) return next(req, res, done);
        const headers = { ...req.headers, host: target.host };
        delete headers.origin;
        delete headers.referer;
        const upstream = transport.request(
          { protocol: target.protocol, hostname: target.hostname, port: target.port || undefined, method: req.method, path: req.url, headers },
          (response) => {
            res.writeHead(response.statusCode ?? 502, response.headers);
            response.pipe(res);
          },
        );
        upstream.on('error', (error) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `API proxy couldn't reach ${target.origin}: ${error.message}` }));
        });
        req.pipe(upstream);
      };
    },
  };
}

module.exports = config;
