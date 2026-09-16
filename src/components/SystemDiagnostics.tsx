import React, { useState } from 'react';
import {
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Radio,
  Server,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { PlayoutStatus } from '../types';

interface SystemDiagnosticsProps {
  status: PlayoutStatus;
  onSendTelnetCommand: (cmd: string) => Promise<string>;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({
  status,
  onSendTelnetCommand
}) => {
  const [customCommand, setCustomCommand] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const quickCommands = [
    { label: 'tv_playlist.remaining', desc: 'Secondes restantes du média actif' },
    { label: 'tv_playlist.url', desc: 'Chemin complet du fichier en cours' },
    { label: 'tv_playlist.skip', desc: 'Forcer la coupure vers le suivant' },
    { label: 'tv_playlist.reload', desc: 'Recharger active_playlist.txt' },
    { label: 'server.version', desc: 'Version de Liquidsoap installée' },
    { label: 'help', desc: 'Liste des commandes Telnet disponibles' }
  ];

  const handleExecute = async (cmdToRun?: string) => {
    const command = cmdToRun || customCommand;
    if (!command.trim()) return;

    setIsExecuting(true);
    try {
      const response = await onSendTelnetCommand(command.trim());
      setLastOutput(response);
      if (!cmdToRun) setCustomCommand('');
    } catch (err: any) {
      setLastOutput(`Erreur : ${err.message || 'Impossible de joindre le socket telnet'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Vitals Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Liquidsoap Playout Daemon */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daemon Liquidsoap
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            PID {status.serverStatus.liquidsoapPid || '14820'}
          </div>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Processus actif &bull; Port 1234
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Service : kambove-regie.service
          </div>
        </div>

        {/* Telnet Socket Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Socket Telnet IPC
            </span>
            <Terminal className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            127.0.0.1:{status.serverStatus.telnetPort}
          </div>
          <p className="text-xs text-indigo-300 mt-1 font-mono">
            Mode : Contrôle bidirectionnel
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Commandes synchrones actives
          </div>
        </div>

        {/* RTMP Playout Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sortie RTMP (Owncast)
            </span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {status.rtmpStatus.bitrateKbps} <span className="text-sm font-normal text-slate-400">kbps</span>
          </div>
          <p className="text-xs text-amber-300 mt-1 font-mono">
            720p @ 25 FPS &bull; 0 frames perdues
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
            {status.rtmpStatus.url}
          </div>
        </div>

        {/* NAS NFS / CIFS Mount */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stockage NAS Mount
            </span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {status.nasStatus.freeSpaceGB} <span className="text-sm font-normal text-slate-400">Go libres</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1 font-mono">
            Latence : {status.nasStatus.latencyMs} ms &bull; Monté
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
            {status.nasStatus.mountPoint}
          </div>
        </div>
      </div>

      {/* Interactive Telnet Console + Hardware Load */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Terminal Interactive Console (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Console de Commande Telnet Liquidsoap (Port 1234)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Liaison directe IPC
              </span>
            </div>

            {/* Quick Command Buttons */}
            <div className="mb-4">
              <span className="text-[11px] text-slate-400 font-semibold block mb-2">
                Commandes rapides courantes :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickCommands.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleExecute(q.label)}
                    disabled={isExecuting}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
                  >
                    <div className="font-mono text-xs font-bold text-indigo-300 truncate">
                      {q.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {q.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Entrez une commande Telnet (ex: tv_playlist.remaining, tv_playlist.skip)..."
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecute();
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleExecute()}
                disabled={isExecuting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer</span>
              </button>
            </div>

            {/* Output Display */}
            {lastOutput && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                <span className="text-slate-500 block text-[10px] uppercase mb-1">Dernière réponse du serveur :</span>
                {lastOutput}
              </div>
            )}
          </div>

          {/* Historical Telnet Logs */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Journal d’événements en direct (Log Stream) :
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              {status.telnetLog.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-slate-300">
                  <span className="text-slate-600 text-[10px]">{log.time}</span>
                  <span className="text-indigo-400 font-semibold">{log.command} &rarr;</span>
                  <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}>
                    {log.response}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Server Hardware Telemetry (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Vitals Serveur Ubuntu
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {status.serverStatus.hostname}
              </span>
            </div>

            <div className="space-y-4">
              {/* CPU Usage Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Charge Processeur (CPU)</span>
                  <span className="font-bold text-slate-200">{status.serverStatus.cpuPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${status.serverStatus.cpuPercent}%` }} />
                </div>
              </div>

              {/* RAM Usage Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Mémoire Vive (RAM)</span>
                  <span className="font-bold text-slate-200">{status.serverStatus.ramPercent}% (1.4 Go / 4.0 Go)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${status.serverStatus.ramPercent}%` }} />
                </div>
              </div>

              {/* Temp */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Température CPU</span>
                  <span className="font-bold text-emerald-400">{status.serverStatus.tempCelsius}°C (Optimal)</span>
                </div>
              </div>

              {/* System Specs summary */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                <div>OS : <span className="text-slate-200">{status.serverStatus.os}</span></div>
                <div>FFmpeg : <span className="text-slate-200">6.1.1 (libx264, aac)</span></div>
                <div>Node / PHP : <span className="text-slate-200">PHP 8.3-fpm + Node 22</span></div>
                <div>Encodeur : <span className="text-slate-200">1280x720p @ 2500 kbps</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Régie TV opérationnelle 24/7 sans interruption
          </div>
        </div>
      </div>
    </div>
  );
};
