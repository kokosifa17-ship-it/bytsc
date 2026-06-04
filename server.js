const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const port = process.env.PORT || 10000;
const sessionDir = process.env.SESSION_DIR || path.join(__dirname, 'whatsapp-session');

// FUNGSI PEMBERSIH OTOMATIS (Mencegah error 'Already Running')
function forceCleanup() {
    const dir = path.join(sessionDir, 'session-wa-check');
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file.includes('Singleton')) {
                try {
                    fs.unlinkSync(path.join(dir, file));
                    console.log('✓ Menghapus file lock:', file);
                } catch (e) {}
            }
        });
    }
}

// Jalankan pembersihan saat startup
forceCleanup();

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

client.on('ready', () => console.log('✓ WhatsApp Client SIAP!'));
client.initialize();

app.get('/api/status', (req, res) => res.json({ ready: client.info !== undefined }));
app.listen(port, () => console.log(`Server running on ${port}`));
