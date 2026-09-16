/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveMonitor } from './components/LiveMonitor';
import { ScheduleGrid } from './components/ScheduleGrid';
import { NasExplorer } from './components/NasExplorer';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { DeploymentGuide } from './components/DeploymentGuide';
import { MediaItem, PlaylistItem, PlayoutStatus } from './types';
import { INITIAL_NAS_MEDIA, INITIAL_PLAYLIST } from './data/mockData';
import { cascadeRundownTimes, formatDuration } from './utils/timeFormat';

export default function App() {
  const [activeTab, setActiveTab] = useState<'regie' | 'nas' | 'diagnostics' | 'guide'>('regie');
  const [status, setStatus] = useState<PlayoutStatus>({
    status: 'ONLINE',
    mode: 'playlist',
    onAir: true,
    currentMedia: {
      title: 'Méditation Matinale - La Fidélité Divine',
      path: '/mnt/regie_videos/meditations/meditation_matin_fidelite_2026.mp4',
      category: 'meditations',
      duration: 920,
      elapsed: 142,
      remaining: 778,
      progress: 15.4,
      durationFormatted: '15:20',
      elapsedFormatted: '02:22',
      remainingFormatted: '12:58'
    },
    nextMedia: {
      title: 'Spot Jingle - Kambove TV Ident Station',
      path: '/mnt/regie_videos/pubs/jingle_kambove_tv_ident_15s.mp4',
      category: 'pubs',
      startTime: '08:15:20',
      durationFormatted: '00:15'
    },
    rtmpStatus: {
      connected: true,
      url: 'rtmp://127.0.0.1:1935/live/kambove_live',
      bitrateKbps: 2540,
      fps: 25,
      droppedFrames: 0,
      uptimeSeconds: 30954
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
    telnetLog: [
      {
        id: 'log-1',
        time: '08:29:47',
        command: 'server.version',
        response: 'Liquidsoap 2.1.4 (Ubuntu 24.04 LTS)',
        type: 'info'
      },
      {
        id: 'log-2',
        time: '08:30:47',
        command: 'tv_playlist.reload',
        response: 'OK (5 media items loaded from active_playlist.txt)',
        type: 'success'
      }
    ]
  });

  const [playlist, setPlaylist] = useState<PlaylistItem[]>(cascadeRundownTimes(INITIAL_PLAYLIST));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [nasMedia, setNasMedia] = useState<MediaItem[]>(INITIAL_NAS_MEDIA);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRefreshingNas, setIsRefreshingNas] = useState<boolean>(false);

  // Poll status from /api/status periodically
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      // Offline fallback
    }
  }, []);

  // Fetch playlist on load
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [statusRes, playlistRes, nasRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/playlist'),
          fetch('/api/nas')
        ]);

        if (statusRes.ok) {
          const sData = await statusRes.json();
          setStatus(sData);
        }
        if (playlistRes.ok) {
          const pData = await playlistRes.json();
          if (pData.playlist && pData.playlist.length > 0) {
            setPlaylist(pData.playlist);
            setCurrentIndex(pData.currentIndex || 0);
          }
        }
        if (nasRes.ok) {
          const nData = await nasRes.json();
          if (nData.items && nData.items.length > 0) {
            setNasMedia(nData.items);
          }
        }
      } catch (e) {
        // Fallback
      }
    };

    fetchInitial();

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Master controls
  const handleControl = async (action: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setStatus(data.status);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
      fetchStatus();
    }
  };

  // Save playlist
  const handleSavePlaylist = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist })
      });
      if (res.ok) {
        setSaveMessage('Programmation enregistrée avec succès dans active_playlist.txt et rechargée dans Liquidsoap !');
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (e) {
      setSaveMessage("Erreur d'enregistrement sur le serveur.");
    } finally {
      setIsSaving(false);
      fetchStatus();
    }
  };

  // Quick insert
  const handleQuickInsert = (type: 'jingle' | 'mire' | 'obs') => {
    if (type === 'obs') {
      handleControl('obs_mode');
      return;
    }

    if (type === 'mire') {
      handleControl('emergency_mire');
      return;
    }

    if (type === 'jingle') {
      const jingleItem: PlaylistItem = {
        id: `pl-quick-${Date.now()}`,
        mediaId: 'pub-01',
        title: 'Spot Jingle - Kambove TV Ident Station (15s)',
        path: '/mnt/regie_videos/pubs/jingle_kambove_tv_ident_15s.mp4',
        category: 'pubs',
        duration: 15,
        durationFormatted: '00:15',
        scheduledTime: '00:00:00',
        calculatedStartTime: '00:00:00',
        calculatedEndTime: '00:00:15',
        type: 'jingle',
        isFixedTime: false,
        status: 'pending'
      };

      // Insert right after current item
      const insertAt = Math.min(currentIndex + 1, playlist.length);
      const updated = [...playlist.slice(0, insertAt), jingleItem, ...playlist.slice(insertAt)];
      const cascaded = cascadeRundownTimes(updated);
      setPlaylist(cascaded);
    }
  };

  // Add items from NAS Explorer
  const handleAddToPlaylist = (items: MediaItem[]) => {
    const newPlaylistItems: PlaylistItem[] = items.map((item, idx) => ({
      id: `pl-${Date.now()}-${idx}`,
      mediaId: item.id,
      title: item.title,
      path: item.path,
      category: item.category,
      duration: item.duration,
      durationFormatted: item.durationFormatted,
      scheduledTime: '00:00:00',
      calculatedStartTime: '00:00:00',
      calculatedEndTime: '00:00:00',
      type: 'video',
      isFixedTime: false,
      status: 'pending'
    }));

    const updated = [...playlist, ...newPlaylistItems];
    const cascaded = cascadeRundownTimes(updated);
    setPlaylist(cascaded);
    setActiveTab('regie');
  };

  // Direct play from NAS Explorer
  const handlePlayDirectly = (item: MediaItem) => {
    const directItem: PlaylistItem = {
      id: `pl-direct-${Date.now()}`,
      mediaId: item.id,
      title: item.title,
      path: item.path,
      category: item.category,
      duration: item.duration,
      durationFormatted: item.durationFormatted,
      scheduledTime: '00:00:00',
      calculatedStartTime: '00:00:00',
      calculatedEndTime: '00:00:00',
      type: 'video',
      isFixedTime: false,
      status: 'playing'
    };

    const updated = [directItem, ...playlist];
    setPlaylist(cascadeRundownTimes(updated));
    handleControl('start');
    setActiveTab('regie');
  };

  // Send Telnet Command
  const handleSendTelnetCommand = async (command: string): Promise<string> => {
    const res = await fetch('/api/telnet/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    fetchStatus();
    return data.response || 'OK';
  };

  // Refresh NAS files
  const handleRefreshNas = async () => {
    setIsRefreshingNas(true);
    try {
      const res = await fetch('/api/nas');
      if (res.ok) {
        const data = await res.json();
        if (data.items) setNasMedia(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshingNas(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Station Master Header */}
      <Header
        status={status}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onControl={handleControl}
        isActionLoading={isActionLoading}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Live Master Playout & Schedule Rundown */}
        {activeTab === 'regie' && (
          <div className="space-y-6">
            <LiveMonitor
              status={status}
              onControl={handleControl}
              onQuickInsert={handleQuickInsert}
              isActionLoading={isActionLoading}
            />

            <ScheduleGrid
              playlist={playlist}
              currentIndex={currentIndex}
              onUpdatePlaylist={setPlaylist}
              onSavePlaylist={handleSavePlaylist}
              onOpenNasExplorer={() => setActiveTab('nas')}
              isSaving={isSaving}
              saveMessage={saveMessage}
            />
          </div>
        )}

        {/* Tab 2: NAS Video Library Explorer */}
        {activeTab === 'nas' && (
          <NasExplorer
            mediaList={nasMedia}
            onAddToPlaylist={handleAddToPlaylist}
            onPlayDirectly={handlePlayDirectly}
            onRefreshNas={handleRefreshNas}
            isRefreshing={isRefreshingNas}
          />
        )}

        {/* Tab 3: System Diagnostics & Telnet Console */}
        {activeTab === 'diagnostics' && (
          <SystemDiagnostics
            status={status}
            onSendTelnetCommand={handleSendTelnetCommand}
          />
        )}

        {/* Tab 4: Audit & Deployment Guide for Grace Ndala */}
        {activeTab === 'guide' && <DeploymentGuide />}
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 text-center text-xs text-slate-500 font-mono">
        Kambove TV Régie Master &bull; Architecture Ubuntu Playout (Liquidsoap 2.1+) &bull; Développé pour Grace Ndala
      </footer>
    </div>
  );
}
