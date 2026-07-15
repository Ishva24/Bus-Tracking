import { Router } from 'express';
import { buildOpenApiSpec } from '../services/openapi';

const router = Router();

router.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.get('host') ?? `localhost:${process.env.PORT ?? '3000'}`;
  const spec = buildOpenApiSpec(`${protocol}://${host}`);

  res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>BusTrack API Docs</title>
    <style>
      body { font-family: Consolas, monospace; margin: 2rem; color: #111827; }
      pre { white-space: pre-wrap; background: #f3f4f6; padding: 1rem; border-radius: 8px; }
      a { color: #0f766e; }
    </style>
  </head>
  <body>
    <h1>BusTrack API Docs</h1>
    <p>Machine-readable OpenAPI spec: <a href="/docs/openapi.json">/docs/openapi.json</a></p>
    <pre>${JSON.stringify(spec, null, 2)}</pre>
  </body>
</html>`);
});

router.get('/openapi.json', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.get('host') ?? `localhost:${process.env.PORT ?? '3000'}`;
  res.json(buildOpenApiSpec(`${protocol}://${host}`));
});

export default router;
