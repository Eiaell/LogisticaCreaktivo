const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 3001;
const OUTPUT_DIR = path.join(__dirname, 'videos');
const PREVIEW_DIR = path.join(__dirname, 'previews');

[OUTPUT_DIR, PREVIEW_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Limpiar previews viejos (>1 hora)
setInterval(() => {
  const now = Date.now();
  fs.readdirSync(PREVIEW_DIR).forEach(file => {
    const filepath = path.join(PREVIEW_DIR, file);
    const stat = fs.statSync(filepath);
    if (now - stat.mtimeMs > 3600000) {
      fs.unlinkSync(filepath);
    }
  });
}, 600000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Página principal
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Servir videos
  if (parsedUrl.pathname.startsWith('/videos/')) {
    const filename = path.basename(parsedUrl.pathname);
    const filepath = path.join(OUTPUT_DIR, filename);
    serveVideo(filepath, res);
    return;
  }

  // Servir previews
  if (parsedUrl.pathname.startsWith('/previews/')) {
    const filename = path.basename(parsedUrl.pathname);
    const filepath = path.join(PREVIEW_DIR, filename);
    serveVideo(filepath, res);
    return;
  }

  // Generar preview de video
  if (parsedUrl.pathname === '/preview-video' && req.method === 'POST') {
    handlePreviewVideo(req, res);
    return;
  }

  // Generar video final
  if (parsedUrl.pathname === '/generate' && req.method === 'POST') {
    handleGenerate(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function serveVideo(filepath, res) {
  if (!fs.existsSync(filepath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const stat = fs.statSync(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'video/mp4',
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filepath).pipe(res);
}

function handlePreviewVideo(req, res) {
  let body = [];
  req.on('data', chunk => body.push(chunk));

  req.on('end', () => {
    try {
      const bodyStr = Buffer.concat(body).toString('utf8');
      const config = JSON.parse(bodyStr);
      const timestamp = Date.now();
      const outputFilename = `preview_${timestamp}.webm`;
      const outputPath = path.join(PREVIEW_DIR, outputFilename);

      const pythonConfig = {
        text: config.text,
        wpm: config.wpm || 300,
        output: outputPath,
        width: config.width || 1080,
        height: config.height || 1920,
        fontSize: config.fontSize || 120,
        maxWords: config.maxWords || 25,
        bgColor: config.bgColor || [0, 0, 0],
        textColor: config.textColor || [255, 255, 255],
        focusColor: config.focusColor || [255, 59, 48],
        sentences: config.sentences || null
      };

      console.log(`Generando preview: ${outputFilename}`);

      const python = spawn('python', [
        path.join(__dirname, 'generate_video.py'),
        '--preview-video'
      ]);

      let stdout = '';
      let stderr = '';

      python.stdin.write(JSON.stringify(pythonConfig), 'utf8');
      python.stdin.end();

      python.stdout.on('data', data => stdout += data.toString('utf8'));
      python.stderr.on('data', data => {
        stderr += data.toString('utf8');
        console.log(`  [Preview] ${data.toString().trim()}`);
      });

      python.on('close', code => {
        // Buscar archivo generado (puede ser .webm o .mp4)
        let finalFile = outputFilename;
        if (!fs.existsSync(outputPath)) {
          const mp4Path = outputPath.replace('.webm', '.mp4');
          if (fs.existsSync(mp4Path)) {
            finalFile = outputFilename.replace('.webm', '.mp4');
          }
        }

        const finalPath = path.join(PREVIEW_DIR, finalFile);

        if (fs.existsSync(finalPath)) {
          console.log(`Preview listo: ${finalFile}`);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            previewUrl: `/previews/${finalFile}`
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: stderr || 'Error generando preview' }));
        }
      });

    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

function handleGenerate(req, res) {
  let body = [];
  req.on('data', chunk => body.push(chunk));

  req.on('end', () => {
    try {
      const bodyStr = Buffer.concat(body).toString('utf8');
      const config = JSON.parse(bodyStr);
      const timestamp = Date.now();
      const outputFilename = `focus_${timestamp}.mp4`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);

      const pythonConfig = {
        text: config.text,
        wpm: config.wpm || 300,
        output: outputPath,
        width: config.width || 1080,
        height: config.height || 1920,
        fontSize: config.fontSize || 120,
        bgColor: config.bgColor || [0, 0, 0],
        textColor: config.textColor || [255, 255, 255],
        focusColor: config.focusColor || [255, 59, 48],
        sentences: config.sentences || null
      };

      console.log(`Generando: ${outputFilename} (${config.text.split(/\s+/).filter(w=>w).length} palabras)`);

      const python = spawn('python', [
        path.join(__dirname, 'generate_video.py'),
        '--json'
      ]);

      let stdout = '';
      let stderr = '';

      python.stdin.write(JSON.stringify(pythonConfig), 'utf8');
      python.stdin.end();

      python.stdout.on('data', data => stdout += data.toString('utf8'));
      python.stderr.on('data', data => {
        stderr += data.toString('utf8');
        console.log(`  [Gen] ${data.toString().trim()}`);
      });

      python.on('close', code => {
        if (code === 0 && fs.existsSync(outputPath)) {
          console.log(`Listo: ${outputFilename}`);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            filename: outputFilename,
            downloadUrl: `/videos/${outputFilename}`
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: stderr || 'Error' }));
        }
      });

    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Focus Video Generator`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
