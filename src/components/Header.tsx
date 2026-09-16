import React, { useState, useEffect } from 'react';
import {
  Radio,
  Tv,
  Play,
  Square,
  SkipForward,
  RotateCcw,
  AlertOctagon,
  HardDrive,
  Cpu,
  Activity,
  Layers,
  FileCode2,
  Clock
} from 'lucide-react';
import { PlayoutStatus } from '../types';

interface HeaderProps {
  status: PlayoutStatus;
  activeTab: 'regie' | 'nas' | 'diagnostics' | 'guide';
  onTabChange: (tab: 'regie' | 'nas' | 'diagnostics' | 'guide') => void;
  onControl: (action: string) => void;
  isActionLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  activeTab,
  onTabChange,
  onControl,
  isActionLoading
}) => {
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR'));
      setCurrentDate(
        now.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (status.status) {
      case 'ONLINE':
        return (
          <div id="badge-status-onair" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ON AIR • DIFFUSION
          </div>
        );
      case 'OBS_LIVE':
        return (
          <div id="badge-status-obs" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            DIRECT OBS STUDIO
          </div>
        );
      case 'STANDBY':
        return (
          <div id="badge-status-standby" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700/50 border border-slate-600 text-slate-300 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            STANDBY / VEILLE
          </div>
        );
      default:
        return (
          <div id="badge-status-alert" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-900/40 border border-red-700 text-red-300 text-xs font-bold tracking-wider">
            HORS LIGNE
          </div>
        );
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100 select-none">
      {/* Top Bar: Identity, Master Clock, Live Telemetry and Master Playout Controls */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-widest uppercase bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Kambove TV
              </h1>
              <span className="text-[10px] font-semibold tracking-wider text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded bg-indigo-950/40">
                RÉGIE MASTER
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              Serveur Ubuntu Playout &bull; Stockage NAS
            </p>
          </div>
          <div className="ml-2 pl-3 border-l border-slate-800 hidden sm:block">
            {getStatusBadge()}
          </div>
        </div>

        {/* Center: Studio Master Clock */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-1.5 shadow-inner">
          <Clock className="w-4 h-4 text-indigo-400" />
          <div className="flex flex-col text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">{currentDate}</span>
            <span className="text-lg font-mono font-bold tracking-widest text-emerald-400 leading-none">
              {currentTime}
            </span>
          </div>
        </div>

        {/* Right: Master Control Actions */}
        <div className="flex items-center gap-2">
          {status.onAir ? (
            <button
              id="btn-master-standby"
              onClick={() => onControl('standby')}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Mettre la régie en pause / veille"
            >
              <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Standby</span>
            </button>
          ) : (
            <button
              id="btn-master-onair"
              onClick={() => onControl('start')}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition border border-rose-500/50"
              title="Démarrer la diffusion en direct (On-Air)"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Lancer On-Air</span>
            </button>
          )}

          <button
            id="btn-master-skip"
            onClick={() => onControl('skip')}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition active:scale-95"
            title="Sauter au média suivant (Liquidsoap skip)"
          >
            <SkipForward className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Suivant</span>
          </button>

          <button
            id="btn-master-reload"
            onClick={() => onControl('reload')}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition"
            title="Recharger la playlist active (tv_playlist.reload)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Recharger</span>
          </button>

          <button
            id="btn-master-obs"
            onClick={() => onControl('obs_mode')}
            disabled={isActionLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition ${
              status.mode === 'obs'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
            }`}
            title="Bascule vers le flux OBS Studio en direct (Culte direct)"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Direct OBS</span>
          </button>

          <button
            id="btn-master-mire"
            onClick={() => onControl('emergency_mire')}
            disabled={isActionLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 transition"
            title="Activer la mire de secours immédiatement en cas de problème"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden lg:inline">Mire</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar & Quick Telemetry Ribbon */}
      <div className="bg-slate-900 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <nav className="flex space-x-1 py-1" aria-label="Tabs">
            <button
              id="tab-regie"
              onClick={() => onTabChange('regie')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'regie'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Régie & Grille de Diffusion</span>
            </button>

            <button
              id="tab-nas"
              onClick={() => onTabChange('nas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'nas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Médiathèque NAS (/mnt)</span>
            </button>

            <button
              id="tab-diagnostics"
              onClick={() => onTabChange('diagnostics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'diagnostics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostics Ubuntu & Telnet</span>
            </button>

            <button
              id="tab-guide"
              onClick={() => onTabChange('guide')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Guide & Scripts Régie</span>
            </button>
          </nav>

          {/* Quick Telemetry Vitals */}
          <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400 py-1 font-mono">
            <div className="flex items-center gap-1.5" title="Montage NAS /mnt/regie_videos">
              <span className={`w-2 h-2 rounded-full ${status.nasStatus.mounted ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>{status.nasStatus.mounted ? `NAS: ${status.nasStatus.freeSpaceGB} Go libres` : 'NAS: Non monté (/mnt/regie_videos)'}</span>
            </div>

            <div className="flex items-center gap-1.5" title="Port Telnet Liquidsoap 1234">
              <span className={`w-2 h-2 rounded-full ${status.serverStatus.telnetConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>Telnet 1234: {status.serverStatus.telnetConnected ? 'Actif' : 'En attente'}</span>
            </div>

            <div className="flex items-center gap-1.5" title="Débit flux RTMP vers Owncast">
              <Radio className="w-3 h-3 text-indigo-400" />
              <span>RTMP: {status.rtmpStatus.connected ? `${status.rtmpStatus.bitrateKbps} kbps` : 'Veille'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
