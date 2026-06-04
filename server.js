const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const port = process.env.PORT || 10000;
const sessionDir = process.env.SESSION_DIR || path.join(__dirname, 'whatsapp-session');

// Inisialisasi Client dengan konfigurasi yang kompatibel dengan Render/Linux
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'wa-check',
    dataPath: sessionDir,
  }),
  puppeteer: {
    headless: true, // WAJIB TRUE
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
    // Menghapus executablePath agar Puppeteer menggunakan download-an otomatisnya sendiri
  },
});

let isClientReady = false;
let clientInitError = null;
let latestQRCode = null;

client.on('ready', () => {
  console.log('✓ WhatsApp Client SIAP!');
  isClientReady = true;
  clientInitError = null;
});

client.on('qr', (qr) => {
  latestQRCode = qr;
});

client.on('error', (error) => {
  console.error('✗ WhatsApp error:', error.message);
  clientInitError = error.message;
});

function initializeWhatsAppClient() {
  console.log('Menginisialisasi WhatsApp Client...');
  client.initialize().catch(err => {
    clientInitError = err.message;
    console.error('Gagal init:', err.message);
  });
}

// Jalankan init
initializeWhatsAppClient();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/status', (req, res) => {
  res.json({ ready: isClientReady, error: clientInitError, qr: latestQRCode });
});

app.post('/api/initialize', (req, res) => {
  if (isClientReady) return res.json({ status: 'ready' });
  initializeWhatsAppClient();
  res.json({ status: 'initializing' });
});

// Endpoint Cek Nomor (disederhanakan)
app.post('/api/check-numbers', async (req, res) => {
  if (!isClientReady) return res.status(400).json({ error: 'WhatsApp belum siap' });
  const { numbers } = req.body;
  const results = [];
  for (const number of numbers) {
    try {
      const id = await client.getNumberId(String(number).replace(/[^0-9]/g, ''));
      results.push({ input: number, registered: !!id });
    } catch {
      results.push({ input: number, registered: false });
    }
  }
  res.json({ success: true, results });
});

app.listen(port, () => console.log(`Backend berjalan di http://localhost:${port}`));
