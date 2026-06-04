const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const port = process.env.PORT || 10000;
const sessionDir = process.env.SESSION_DIR || path.join(__dirname, 'whatsapp-session');

// FUNGSI PEMBERSIH LOCK: Menghapus file lock agar tidak error "already running"
function clearBrowserLock() {
  const lockFiles = [
    path.join(sessionDir, 'session-wa-check', 'SingletonLock'),
    path.join(sessionDir, 'session-wa-check', 'SingletonCookie'),
    path.join(sessionDir, 'session-wa-check', 'SingletonSocket')
  ];
  
  lockFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`✓ File lock dihapus: ${path.basename(file)}`);
      } catch (e) {
        console.log(`! Tidak bisa hapus lock: ${e.message}`);
      }
    }
  });
}

// Jalankan pembersihan sebelum inisialisasi
clearBrowserLock();

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'wa-check',
    dataPath: sessionDir,
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  },
});

let isClientReady = false;
let clientInitError = null;

client.on('ready', () => {
  console.log('✓ WhatsApp Client SIAP!');
  isClientReady = true;
});

client.on('error', (err) => console.error('Error:', err.message));

// Inisialisasi
client.initialize().catch(err => {
    console.error('Gagal init:', err.message);
    // Jika masih gagal, coba clear lock dan restart setelah 5 detik
    setTimeout(() => process.exit(1), 5000); 
});

app.get('/api/status', (req, res) => res.json({ ready: isClientReady }));
app.listen(port, () => console.log(`Server running on ${port}`));
