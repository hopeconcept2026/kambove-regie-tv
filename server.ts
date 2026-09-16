import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { createServer as createViteServer } from 'vite';
import { INITIAL_NAS_MEDIA, INITIAL_PLAYLIST } from './src/data/mockData';
import { PlaylistItem, PlayoutStatus } from './src/types';

const PORT = 3000;

// Playout State Engine
class PlayoutEngine {
  public status: 'ONLINE' | 'STANDBY' | 'OBS_LIVE' | 'OFFLINE' = 'ONLINE';
  public mode: 'playlist' | 'obs' | 'emergency_mire' | 'standby' = 'playlist';
  public onAir: boolean = true;
  public playlist: PlaylistItem[] = [...INITIAL_PLAYLIST];
  public currentIndex: number = 0;
  public elapsedSeconds: number = 142; // Simulated playhead
  public lastTickTime: number = Date.now();
  public telnetLogs: PlayoutStatus['telnetLog'] = [
    {
      id: 'log-1',
      time: new Date(Date.now() - 360000).toLocaleTimeString('fr-FR'),
      command: 'server.version',
      response: 'Liquidsoap 2.1.4 (Ubuntu 24.04 LTS)',
      type: 'info'
    },
    {
      id: 'log-2',
      time: new Date(Date.now() - 300000).toLocaleTimeString('fr-FR'),
      command: 'tv_playlist.reload',
      response: 'OK (5 media items loaded from /home/grace/regie-tv/playlists/active_playlist.txt)',
      type: 'success'
    },
    {
      id: 'log-3',
      time: new Date(Date.now() - 142000).toLocaleTimeString('fr-FR'),
      command: 'tv_playlist.url',
      response: '/mnt/regie_videos/meditations/meditation_matin_fidelite_2026.mp4',
      type: 'info'
    }
  ];

  constructor() {
    // Playout clock ticker every second
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (!this.onAir || this.mode !== 'playlist') return;
    if (this.playlist.length === 0) return;

    const currentItem = this.playlist[this.currentIndex];
    if (!currentItem) return;

    this.elapsedSeconds += 1;

    // Transition to next media automatically if finished
    if (this.elapsedSeconds >= currentItem.duration) {
      this.nextTrack(true);
    }
  }

  public nextTrack(auto: boolean = false) {
    if (this.playlist.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.elapsedSeconds = 0;

    const nextItem = this.playlist[this.currentIndex];
    this.addLog(
      auto ? 'auto_transition' : 'tv_playlist.skip',
      `Switched to track #${this.currentIndex + 1}: ${nextItem ? nextItem.title : 'None'}`,
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
    if (this.telnetLogs.length > 50) {
      this.telnetLogs.pop();
    }
  }

  public getPlayoutStatus(): PlayoutStatus {
    const current = this.playlist[this.currentIndex] || null;
    const next = this.playlist[(this.currentIndex + 1) % this.playlist.length] || null;

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

    const duration = current ? current.duration : 0;
    const elapsed = Math.min(this.elapsedSeconds, duration);
    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

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
        connected: this.onAir,
        url: 'rtmp://127.0.0.1:1935/live/kambove_live',
        bitrateKbps: this.onAir ? 2540 : 0,
        fps: this.onAir ? 25 : 0,
        droppedFrames: 0,
        uptimeSeconds: Math.floor(Date.now() / 1000) % 86400
      },
      nasStatus: {
        mounted: true,
        mountPoint: '/mnt/regie_videos',
        totalSpaceGB: 4000,
        freeSpaceGB: 1850,
        usedSpaceGB: 2150,
        latencyMs: 1.4
      },
      serverStatus: {
        hostname: 'ubuntu-regie-kambove',
        os: 'Ubuntu 24.04 LTS (x86_64)',
        liquidsoapPid: 14820,
        liquidsoapRunning: true,
        telnetPort: 1234,
        telnetConnected: true,
        cpuPercent: 18.5,
        ramPercent: 34.2,
        tempCelsius: 41.0
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
    // If real /mnt/regie_videos exists on server, we can query it
    const nasPath = '/mnt/regie_videos';
    if (fs.existsSync(nasPath)) {
      try {
        const files: any[] = [];
        // recursive or folder scan
        res.json({
          available: true,
          path: nasPath,
          items: INITIAL_NAS_MEDIA
        });
        return;
      } catch (e) {
        // fallback
      }
    }

    // Default rich media
    res.json({
      available: true,
      path: '/mnt/regie_videos',
      items: INITIAL_NAS_MEDIA
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
