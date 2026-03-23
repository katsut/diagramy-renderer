// Express server for SSR rendering
// POST /render  { diagram_type, data, title?, design? } → SVG string

import express from 'express';
import { render, type RenderRequest } from './index.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/render', (req, res) => {
  try {
    const body = req.body as RenderRequest;
    const svg = render(body);
    res.type('image/svg+xml').send(svg);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', renderer: 'js' });
});

const port = parseInt(process.env['RENDERER_PORT'] ?? '3001', 10);
app.listen(port, () => {
  console.log(`JS renderer listening on :${port}`);
});
