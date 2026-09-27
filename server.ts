import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(distPath);

  // Health check for Cloud Run
  app.get('/health', (req, res) => res.status(200).send('OK'));

  // Kytario API Proxy with robust endpoint fallbacks
  app.get('/api/proxy/kytario/:token', async (req, res) => {
    const { token } = req.params;
    const endpoints = [
      `https://kytario.com/api/songbooks/${token}/sections`,
      `https://kytario.com/api/songbooks/${token}`,
      `https://kytario.com/${token}/export`,
      `https://kytario.com/api/v1/songbooks/${token}`
    ];

    let lastError = null;
    for (const targetUrl of endpoints) {
      try {
        const response = await axios.get(targetUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Kytario-Print-Customizer'
          },
          timeout: 8000
        });
        if (response.data) {
          return res.json(response.data);
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    console.error(`Proxy error for token ${token}:`, lastError?.message);
    res.status(lastError?.response?.status || 500).json({ 
      error: 'Failed to fetch from Kytario',
      details: lastError?.message 
    });
  });

  if (!isProd) {
    console.log('Starting in development mode with Vite middleware...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to initialize Vite server:', err);
      process.exit(1);
    }
  } else {
    console.log(`Starting in production mode, serving from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found - dist/index.html missing. Run npm run build first.');
      }
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

createServer().catch(err => {
  console.error('Critical server startup error:', err);
  process.exit(1);
});

