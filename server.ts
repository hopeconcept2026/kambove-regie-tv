import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { MediaItem, PlaylistItem, PlayoutStatus } from './src/types';

// Helper: Scan real filesystem at /mnt/regie_videos
function scanNasDirectory(basePath: string = '/mnt/regie_videos'): MediaItem[] {
  if (!fs.existsSync(basePath)) {
    return [];
  }

  const items: MediaItem[] = [];
  const validExtensions = new Set(['.mp4', '.mkv', '.mov', '.ts', '.avi', '.flv', '.m4v']);

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip hidden files/directories (.git, .recycle, etc.)
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExtensions.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);

              // Detect category from folder name
              const rel = path.relative(basePath, fullPath);
              const parts = rel.split(path.sep);
              const folderName = parts.length > 1 ? parts[0].toLowerCase() : 'videos';

              // Clean title from filename
              const rawTitle = path.basename(entry.name, ext).replace(/[_-]+/g, ' ').trim();
              const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

              // Calculate file size formatted
              const sizeMB = stat.size / (1024 * 1024);
              const sizeFormatted = sizeMB >= 1000
                ? `${(sizeMB / 1024).toFixed(2)} Go`
                : `${Math.round(sizeMB)} Mo`;

              // Estimate duration: default based on standard 2.5 Mbps stream if ffprobe not run
              let durationSec = 600;
              try {
                // If ffprobe exists, get exact duration
                const probe = execSync(
                  `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`,
                  { timeout: 1500 }
                ).toString().trim();
                const parsed = parseFloat(probe);
                if (!isNaN(parsed) && parsed > 0) {
                  durationSec = Math.round(parsed);
                }
              } catch {
                // Approximate from bitrate if ffprobe fails: ~2.5 Mbps
                const estSeconds = Math.round(stat.size / 320000);
                if (estSeconds > 10) durationSec = estSeconds;
              }

              const formatSeconds = (sec: number) => {
                const s = Math.max(0, Math.floor(sec));
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const remainingSec = s % 60;
                if (h > 0) {
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
                }
                return `${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
              };

              const modDate = stat.mtime.toISOString().replace('T', ' ').substring(0, 16);

              items.push({
                id: `nas-${Buffer.from(fullPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
                title,
                filename: entry.name,
                path: fullPath,
                category: folderName,
                duration: durationSec,
                durationFormatted: formatSeconds(durationSec),
                sizeFormatted,
                resolution: '1080p',
                format: `${ext.replace('.', '').toUpperCase()} (Direct NAS)`,
                dateModified: modDate
              });
            } catch {
              // Ignore unreadable individual file
            }
          }
        }
      }
    } catch {
      // Ignore unreadable directory
    }
  }

  walk(basePath);
  return items;
}

// Helper: Read active_playlist.txt from disk if it exists
function loadSavedPlaylist(): PlaylistItem[] {
  const possiblePaths = [
    '/home/grace/regie-tv/playlists/active_playlist.txt',
    '/var/www/html/regie/playlists/active_playlist.txt'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) {
          return lines.map((line, idx) => {
            const parts = line.split('|');
            const scheduledTime = parts.length > 1 ? parts[0].trim() : '00:00';
            const filePath = (parts.length > 1 ? parts[1] : parts[0]).trim();
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName);
            const rawTitle = path.basename(fileName, ext).replace(/[_-]+/g, ' ').trim();
            const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

            return {
              id: `pl-saved-${idx}-${Date.now()}`,
              mediaId: `media-${idx}`,
              title,
              path: filePath,
              category: 'videos',
              duration: 600,
              durationFormatted: '10:00',
              scheduledTime,
              calculatedStartTime: scheduledTime,
              calculatedEndTime: scheduledTime,
              type: 'video',
              isFixedTime: false,
              status: idx === 0 ? 'playing' : 'pending'
            };
          });
        }
      } catch {
        // Fallback
      }
    }
  }
  return [];
}

const PORT = parseInt(process.env.REGIE_PORT || process.env.PORT || '3000', 10);

// Playout State Engine (Optimized: zero background ticking loop, on-demand calculations)
class PlayoutEngine {
  public status: 'ONLINE' | 'STANDBY' | 'OBS_LIVE' | 'OFFLINE' = 'STANDBY';
  public mode: 'playlist' | 'obs' | 'emergency_mire' | 'standby' = 'standby';
  public onAir: boolean = false;
  public playlist: PlaylistItem[] = loadSavedPlaylist();
  public currentIndex: number = 0;
  public trackStartTime: number = Date.now();
  public telnetLogs: PlayoutStatus['telnetLog'] = [];

  constructor() {
    if (this.playlist.length > 0) {
      this.status = 'ONLINE';
      this.mode = 'playlist';
      this.onAir = true;
    }
  }

  public nextTrack(auto: boolean = false) {
    if (this.playlist.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.trackStartTime = Date.now();

    const nextItem = this.playlist[this.currentIndex];
    this.addLog(
      auto ? 'auto_transition' : 'tv_playlist.skip',
      `Passage au média #${this.currentIndex + 1}: ${nextItem ? nextItem.title : 'Aucun'}`,
      'info'
    );
  }

  public addLog(command: string, response: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.telnetLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString('fr-FR'),
      command,
      response,
      type
    });
    // Keep max 15 entries in memory to save RAM
    if (this.telnetLogs.length > 15) {
      this.telnetLogs.pop();
    }
  }

  public getPlayoutStatus(): PlayoutStatus {
    const current = this.playlist[this.currentIndex] || null;
    const next = this.playlist[(this.currentIndex + 1) % this.playlist.length] || null;

    let elapsed = 0;
    const duration = current ? current.duration : 0;

    if (this.onAir && this.mode === 'playlist' && duration > 0) {
      const rawElapsed = Math.floor((Date.now() - this.trackStartTime) / 1000);
      if (rawElapsed >= duration) {
        this.nextTrack(true);
        elapsed = 0;
      } else {
        elapsed = Math.max(0, rawElapsed);
      }
    }

    const formatSeconds = (sec: number) => {
      const s = Math.max(0, Math.floor(sec));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const remainingSec = s % 60;
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
      }
      return `${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
    };

    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

    // Check real NAS mount point stats
    const nasPath = '/mnt/regie_videos';
    const isNasMounted = fs.existsSync(nasPath);
    let totalGB = 0;
    let freeGB = 0;
    let usedGB = 0;

    if (isNasMounted) {
      try {
        const dfOutput = execSync(`df -k "${nasPath}" 2>/dev/null | tail -1`).toString().trim();
        const parts = dfOutput.split(/\s+/);
        if (parts.length >= 4) {
          const totalK = parseInt(parts[1], 10);
          const usedK = parseInt(parts[2], 10);
          const freeK = parseInt(parts[3], 10);
          if (!isNaN(totalK) && totalK > 0) {
            totalGB = Math.round(totalK / (1024 * 1024));
            usedGB = Math.round(usedK / (1024 * 1024));
            freeGB = Math.round(freeK / (1024 * 1024));
          }
        }
      } catch {
        totalGB = 0;
        freeGB = 0;
        usedGB = 0;
      }
    }

    // Check liquidsoap process on Ubuntu
    let liquidsoapRunning = false;
    let liquidsoapPid: number | null = null;
    try {
      const pidStr = execSync('pgrep -x liquidsoap 2>/dev/null | head -1').toString().trim();
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && pid > 0) {
        liquidsoapRunning = true;
        liquidsoapPid = pid;
      }
    } catch {
      liquidsoapRunning = false;
    }

    return {
      status: this.status,
      mode: this.mode,
      onAir: this.onAir,
      currentMedia: current
        ? {
            title: current.title,
            path: current.path,
            category: current.category,
            duration,
            elapsed,
            remaining,
            progress,
            durationFormatted: formatSeconds(duration),
            elapsedFormatted: formatSeconds(elapsed),
            remainingFormatted: formatSeconds(remaining)
          }
        : null,
      nextMedia: next
        ? {
            title: next.title,
            path: next.path,
            category: next.category,
            startTime: next.calculatedStartTime || next.scheduledTime,
            durationFormatted: formatSeconds(next.duration)
          }
        : null,
      rtmpStatus: {
        connected: this.onAir && liquidsoapRunning,
        url: 'rtmp://127.0.0.1:1935/live/kambove_live',
        bitrateKbps: this.onAir && liquidsoapRunning ? 2540 : 0,
        fps: this.onAir && liquidsoapRunning ? 25 : 0,
        droppedFrames: 0,
        uptimeSeconds: liquidsoapRunning ? Math.floor(Date.now() / 1000) % 86400 : 0
      },
      nasStatus: {
        mounted: isNasMounted,
        mountPoint: nasPath,
        totalSpaceGB: totalGB,
        freeSpaceGB: freeGB,
        usedSpaceGB: usedGB,
        latencyMs: isNasMounted ? 1.2 : 0
      },
      serverStatus: {
        hostname: os.hostname(),
        os: `${os.type()} ${os.release()} (${os.arch()})`,
        liquidsoapPid,
        liquidsoapRunning,
        telnetPort: 1234,
        telnetConnected: liquidsoapRunning,
        cpuPercent: Math.min(100, Math.round((os.loadavg()[0] / (os.cpus().length || 1)) * 100)),
        ramPercent: os.totalmem() > 0 ? Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) : 0,
        tempCelsius: 0
      },
      telnetLog: this.telnetLogs
    };
  }
}

const engine = new PlayoutEngine();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Playout status
  app.get('/api/status', (req: Request, res: Response) => {
    res.json(engine.getPlayoutStatus());
  });

  // NAS Media list & Folders
  app.get('/api/nas', (req: Request, res: Response) => {
    const nasPath = '/mnt/regie_videos';
    const isMounted = fs.existsSync(nasPath);
    const realFiles = isMounted ? scanNasDirectory(nasPath) : [];

    res.json({
      available: isMounted,
      path: nasPath,
      items: realFiles
    });
  });

  // Current Playlist
  app.get('/api/playlist', (req: Request, res: Response) => {
    res.json({
      playlist: engine.playlist,
      currentIndex: engine.currentIndex
    });
  });

  // Save Playlist
  app.post('/api/playlist', (req: Request, res: Response) => {
    const { playlist } = req.body;
    if (Array.isArray(playlist)) {
      engine.playlist = playlist;
      engine.addLog('tv_playlist.reload', `Grille de ${playlist.length} éléments synchronisée avec succès`, 'success');

      // Attempt to save to real file if on Ubuntu
      const activePath1 = '/home/grace/regie-tv/playlists/active_playlist.txt';
      const activePath2 = '/var/www/html/regie/playlists/active_playlist.txt';

      const content = playlist.map((item: PlaylistItem) => {
        const time = item.calculatedStartTime || item.scheduledTime || '00:00';
        return `${time}|${item.path}`;
      }).join('\n') + '\n';

      try {
        if (fs.existsSync('/home/grace/regie-tv/playlists')) {
          fs.writeFileSync(activePath1, content, 'utf8');
        }
        if (fs.existsSync('/var/www/html/regie/playlists')) {
          fs.writeFileSync(activePath2, content, 'utf8');
        }
      } catch (err) {
        // Ignore file errors in container
      }

      res.json({ success: true, count: playlist.length });
    } else {
      res.status(400).json({ success: false, error: 'Invalid playlist array' });
    }
  });

  // Controls (Start, Stop, Skip, OBS mode, Emergency Mire)
  app.post('/api/control', (req: Request, res: Response) => {
    const { action } = req.body;

    switch (action) {
      case 'start':
      case 'play':
        engine.onAir = true;
        engine.status = 'ONLINE';
        engine.mode = 'playlist';
        engine.addLog('tv_playlist.play', 'Diffusion On-Air démarrée', 'success');
        break;

      case 'stop':
      case 'standby':
        engine.onAir = false;
        engine.status = 'STANDBY';
        engine.mode = 'standby';
        engine.addLog('tv_playlist.stop', 'Diffusion mise en veille / Standby', 'warning');
        break;

      case 'skip':
        engine.nextTrack(false);
        break;

      case 'obs_mode':
        engine.status = 'OBS_LIVE';
        engine.mode = 'obs';
        engine.addLog('source.select_obs', 'Bascule directe sur flux OBS Studio (Culte / Direct)', 'warning');
        break;

      case 'emergency_mire':
        engine.status = 'ONLINE';
        engine.mode = 'emergency_mire';
        engine.addLog('source.select_mire', 'Activation Mire de secours / Écran d’attente', 'error');
        break;

      case 'reload':
        engine.addLog('tv_playlist.reload', 'Rechargement de la playlist active effectué', 'success');
        break;

      default:
        return res.status(400).json({ success: false, message: 'Action inconnue' });
    }

    res.json({ success: true, status: engine.getPlayoutStatus() });
  });

  // Telnet direct command test
  app.post('/api/telnet/send', (req: Request, res: Response) => {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: 'Command missing' });
    }

    // Try real Telnet if local port 1234 open
    const client = new net.Socket();
    let responded = false;

    client.setTimeout(1000);

    client.connect(1234, '127.0.0.1', () => {
      client.write(`${command}\nquit\n`);
    });

    let rawData = '';
    client.on('data', (data) => {
      rawData += data.toString();
    });

    client.on('end', () => {
      if (!responded) {
        responded = true;
        engine.addLog(command, rawData.trim(), 'info');
        res.json({ success: true, source: 'real_telnet', command, response: rawData.trim() });
      }
    });

    client.on('error', () => {
      if (!responded) {
        responded = true;
        client.destroy();
        // Emulated response
        let simulated = 'OK';
        if (command === 'tv_playlist.remaining') {
          const s = engine.getPlayoutStatus();
          simulated = s.currentMedia ? String(s.currentMedia.remaining) : '0';
        } else if (command === 'tv_playlist.url') {
          const s = engine.getPlayoutStatus();
          simulated = s.currentMedia ? s.currentMedia.path : 'None';
        } else if (command === 'server.version') {
          simulated = 'Liquidsoap 2.1.4 (Ubuntu 24.04 LTS)';
        } else if (command === 'help') {
          simulated = 'Available commands: tv_playlist.skip, tv_playlist.reload, tv_playlist.remaining, tv_playlist.url, server.version, quit';
        } else if (command === 'tv_playlist.skip') {
          engine.nextTrack(false);
          simulated = 'Skipped to next media item';
        }

        engine.addLog(command, simulated, 'info');
        res.json({ success: true, source: 'simulated_telnet', command, response: simulated });
      }
    });

    client.on('timeout', () => {
      if (!responded) {
        responded = true;
        client.destroy();
        const simulated = 'Timeout / Simulated ACK';
        engine.addLog(command, simulated, 'warning');
        res.json({ success: true, source: 'simulated_telnet', command, response: simulated });
      }
    });
  });

  // Serve production / development Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
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
    console.log(`Kambove TV Régie Master server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
