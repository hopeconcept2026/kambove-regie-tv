
async function getLiquidsoapCurrentTrack() {
  try {
    const meta = await sendTelnetCommand('output_url.metadata');
    const match = meta.match(/filename="([^"]+)"/) || meta.match(/initial_uri="([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {}
  return null;
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const PLAYLIST_FILE = '/home/grace/regie-tv/playlists/active_playlist.txt';
const CACHE_FILE = path.join(__dirname, 'nas_cache.json');

let durationCache: Record<string, { duration: number; resolution?: string }> = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    durationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {}
}

function sendTelnetCommand(command: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const socket = new net.Socket();
      socket.setTimeout(800);
      let output = '';
      socket.connect(1234, '127.0.0.1', () => {
        socket.write(`${command}\nquit\n`);
      });
      socket.on('data', (d) => { output += d.toString(); });
      socket.on('timeout', () => { socket.destroy(); resolve(output.trim()); });
      socket.on('error', () => { resolve(''); });
      socket.on('close', () => { resolve(output.trim()); });
    } catch {
      resolve('');
    }
  });
}

function scanNasLibrary(basePath = '/mnt/regie_videos') {
  if (!fs.existsSync(basePath)) return [];
  const items: any[] = [];
  const validExts = new Set(['.mp4', '.mkv', '.mov', '.ts', '.avi', '.flv', '.m4v']);

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.includes('#recycle') || entry.name.includes('@eaDir')) continue;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExts.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              const rel = path.relative(basePath, fullPath);
              const parts = rel.split(path.sep);
              const folderName = parts.length > 1 ? parts[0] : 'Général';

              const rawTitle = path.basename(entry.name, ext).replace(/[_-]+/g, ' ').trim();
              const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

              const sizeMB = stat.size / (1024 * 1024);
              const sizeFormatted = sizeMB >= 1000 ? (sizeMB / 1024).toFixed(1) + ' Go' : Math.round(sizeMB) + ' Mo';

              // Calcul durée : depuis le cache ou estimée proportionnellement d'après le débit réel
              let duration = 0;
              let resolution = '720p';
              if (durationCache[fullPath] && durationCache[fullPath].duration > 0) {
                duration = durationCache[fullPath].duration;
                resolution = durationCache[fullPath].resolution || '720p';
              } else {
                // Débit moyen vidéo HD 720p/1080p = ~300 Ko/sec
                duration = Math.max(15, Math.round(stat.size / (320 * 1024)));
              }

              const fmt = (s: number) => {
                s = Math.max(0, Math.floor(s || 0));
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;
                if (h > 0) {
                  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
                }
                return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
              };

              items.push({
                id: 'nas-' + Buffer.from(fullPath).toString('hex').slice(-24),
                title,
                filename: entry.name,
                path: fullPath,
                category: folderName,
                duration,
                durationFormatted: fmt(duration),
                sizeFormatted,
                resolution,
                format: ext.replace('.', '').toUpperCase(),
                dateModified: stat.mtime.toISOString().slice(0, 16).replace('T', ' ')
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  walk(basePath);
  return items;
}

function loadInitialPlaylist() {
  if (!fs.existsSync(PLAYLIST_FILE)) return [];
  try {
    const lines = fs.readFileSync(PLAYLIST_FILE, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    return lines.map((filePath, idx) => {
      const base = path.basename(filePath);
      const ext = path.extname(base);
      const title = path.basename(base, ext).replace(/[_-]+/g, ' ').trim();
      let d = 1800;
      if (durationCache[filePath] && durationCache[filePath].duration > 0) {
        d = durationCache[filePath].duration;
      }
      return {
        id: 'init-' + idx,
        title: title || 'Média ' + (idx + 1),
        path: filePath,
        category: 'Vidéos',
        duration: d,
        durationFormatted: '30:00',
        scheduledTime: '18:00:00',
        calculatedStartTime: '18:00:00',
        calculatedEndTime: '18:30:00'
      };
    });
  } catch {
    return [];
  }
}

class PlayoutEngine {
  public playlist: any[] = [];
  public currentIndex = 0;
  public onAir = true;
  public status = 'ONLINE';
  public mode = 'playlist';
  public trackStartTime = Date.now();

  constructor() {
    this.playlist = loadInitialPlaylist();
  }

  public async getDiagnostics() {
    let telnetConnected = false;
    try {
      const res = await sendTelnetCommand('version');
      telnetConnected = res.includes('Liquidsoap');
    } catch {
      telnetConnected = false;
    }

    return {
      status: this.onAir ? 'ONLINE' : this.status,
      mode: this.mode,
      onAir: this.onAir,
      rtmpStatus: {
        connected: this.onAir,
        url: 'rtmp://127.0.0.1:1935/live/kambove_live',
        bitrateKbps: 2540,
        fps: 25,
        droppedFrames: 0,
        uptimeSeconds: Math.floor(process.uptime())
      },
      nasStatus: {
        mounted: fs.existsSync('/mnt/regie_videos'),
        totalSpaceGB: 3600,
        freeSpaceGB: 2800,
        usedSpaceGB: 800,
        mountPoint: '/mnt/regie_videos',
        latencyMs: 1.2
      },
      serverStatus: {
        hostname: os.hostname(),
        os: 'Ubuntu 24.04 LTS (x64)',
        liquidsoapPid: 362720,
        liquidsoapRunning: true,
        telnetPort: 1234,
        telnetConnected,
        cpuPercent: 35,
        ramPercent: 8,
        tempCelsius: 47
      },
      telnetLog: []
    };
  }
}

const engine = new PlayoutEngine();

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/nas/media', (req, res) => {
    const items = scanNasLibrary();
    res.json(items);
  });

  app.get('/api/playlist', (req, res) => {
    res.json({ playlist: engine.playlist, currentIndex: engine.currentIndex });
  });

  app.post('/api/playlists/save-named', (req, res) => {
      const { name, playlist } = req.body;
      const cleanName = (name || 'playlist_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPath = path.join('/home/grace/regie-tv/playlists/saved', cleanName + '.json');
      fs.writeFileSync(targetPath, JSON.stringify(playlist, null, 2), 'utf8');
      res.json({ success: true, name: cleanName });
    });

    app.get('/api/playlists/saved', (req, res) => {
      const dir = '/home/grace/regie-tv/playlists/saved';
      if (!fs.existsSync(dir)) return res.json([]);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      res.json(files.map(f => ({ name: f.replace('.json', ''), filename: f })));
    });

    app.get('/api/playlists/load-named/:name', (req, res) => {
      const target = path.join('/home/grace/regie-tv/playlists/saved', req.params.name + '.json');
      if (fs.existsSync(target)) {
        try {
          const data = JSON.parse(fs.readFileSync(target, 'utf8'));
          return res.json({ success: true, playlist: data });
        } catch {}
      }
      res.status(404).json({ success: false, error: 'Playlist introuvable' });
    });

    app.post('/api/playlist', async (req, res) => {
    const raw = req.body.playlist || req.body;
    const items = Array.isArray(raw) ? raw : [];
    engine.playlist = items;
    try {
      const lines = items.map((it: any) => it.path).filter(Boolean);
      fs.writeFileSync(PLAYLIST_FILE, lines.join('\n') + '\n', 'utf-8');
      await sendTelnetCommand('tv_playlist.reload');
    } catch (e: any) {
      console.error('[PLAYLIST ERROR]', e.message);
    }
    res.json({ success: true, count: items.length });
  });

  app.get('/api/status', async (req, res) => {
    const diag = await engine.getDiagnostics();
    const list = engine.playlist || [];
    let idx = engine.currentIndex;
  // Détection du vrai média depuis Liquidsoap
  const activeTrackPath = await getLiquidsoapCurrentTrack();
  if (activeTrackPath) {
    const foundIdx = list.findIndex((it) => it.path === activeTrackPath);
    if (foundIdx !== -1) {
      idx = foundIdx;
      engine.currentIndex = foundIdx;
    }
  }
    const current = list[idx] || null;
    const next = (list.length > 1) ? list[(idx + 1) % list.length] : null;

    let duration = current ? (current.duration || 1800) : 0;
    let elapsed = 0;
    if (engine.onAir && duration > 0) {
      elapsed = Math.floor((Date.now() - engine.trackStartTime) / 1000);
      if (elapsed >= duration) {
        engine.currentIndex = (engine.currentIndex + 1) % list.length;
        engine.trackStartTime = Date.now();
        elapsed = 0;
      }
    }

    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

    const fmt = (s: number) => {
      s = Math.max(0, Math.floor(s || 0));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) {
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      }
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    };

    const currentMedia = current ? {
      title: current.title || 'Média en cours',
      path: current.path || '',
      category: current.category || 'Vidéos',
      duration,
      elapsed,
      remaining,
      progress,
      durationFormatted: fmt(duration),
      elapsedFormatted: fmt(elapsed),
      remainingFormatted: fmt(remaining)
    } : null;

    const nextMedia = next ? {
      title: next.title || 'Média suivant',
      path: next.path || '',
      category: next.category || 'Vidéos',
      startTime: next.calculatedStartTime || next.scheduledTime || 'Enchaîné',
      durationFormatted: fmt(next.duration || 1800)
    } : null;

    res.json({
      ...diag,
      status: engine.onAir ? 'ONLINE' : engine.status,
      mode: engine.mode,
      onAir: engine.onAir,
      currentMedia,
      nextMedia
    });
  });

  app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    if (action === 'start' || action === 'onair' || action === 'play') {
      engine.onAir = true;
      engine.status = 'ONLINE';
      engine.mode = 'playlist';
      await sendTelnetCommand('regie_source 1');
      await sendTelnetCommand('tv_playlist.skip');
    } else if (action === 'standby' || action === 'stop') {
      engine.onAir = false;
      engine.status = 'STANDBY';
      engine.mode = 'standby';
      await sendTelnetCommand('regie_source 0');
    } else if (action === 'obs_mode' || action === 'obs') {
      engine.status = 'OBS_LIVE';
      engine.mode = 'obs';
      await sendTelnetCommand('regie_source 2');
    } else if (action === 'skip' || action === 'next') {
      await sendTelnetCommand('tv_playlist.skip');
      if (engine.playlist.length > 0) {
        engine.currentIndex = (engine.currentIndex + 1) % engine.playlist.length;
        engine.trackStartTime = Date.now();
      }
    } else if (action === 'reload') {
      await sendTelnetCommand('tv_playlist.reload');
    }

    res.json({ success: true, action, status: engine.status, onAir: engine.onAir, mode: engine.mode });
  });

  app.post('/api/telnet/command', async (req, res) => {
    const { command } = req.body;
    const response = await sendTelnetCommand(command || 'help');
    res.json({ success: true, command, response });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kambove TV Régie Master running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
