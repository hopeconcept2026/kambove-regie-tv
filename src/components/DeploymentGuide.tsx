import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  AlertTriangle,
  Download,
  Terminal,
  Server,
  Layers,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';

export const DeploymentGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Code snippets
  const radioLiqCode = `# ==============================================================================
# KAMBOVE TV - REGIE PLUTO & MASTER PLAYOUT ENGINE
# Fichier: /home/grace/regie-tv/radio.liq
# Compatible Liquidsoap 2.1+ / Ubuntu 24.04 LTS
# ==============================================================================

# 1. PARAMÈTRES SYSTÈME ET LOGS
settings.init.daemon.set(false)
settings.init.daemon.pidfile.path.set("/home/grace/regie-tv/radio.pid")
settings.init.allow_root.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# 2. CONTRÔLE TELNET POUR L'APPLICATION WEB (RÉGIE MASTER)
settings.server.telnet.set(true)
settings.server.telnet.bind_addr.set("127.0.0.1")
settings.server.telnet.port.set(1234)

# 3. VIDÉO DE SECOURS (MIRE / ATTENTE)
# Si le NAS est indisponible ou la playlist vide, cette vidéo tourne en boucle continue
mire_secours = single("/home/grace/regie-tv/attente.mp4")

# 4. PLAYLIST ACTIVE DU NAS (AVEC ID UNIQUE "tv_playlist")
# reload_mode="watch" détecte instantanément les modifications de active_playlist.txt
playlist_tv = playlist(
  id="tv_playlist",
  reload_mode="watch",
  "/home/grace/regie-tv/playlists/active_playlist.txt"
)

# 5. SÉCURISATION (FALLBACK IMMÉDIAT ZÉRO ÉCRAN NOIR)
# Si la playlist est vide ou finit, Liquidsoap bascule immédiatement sur la mire
flux_securise = fallback(
  track_sensitive=false,
  [playlist_tv, mire_secours]
)

# 6. NORMALISATION VIDÉO HD ET AUDIO STEREO
flux_securise = stereo(flux_securise)
flux_securise = video.resize(width=1280, height=720, flux_securise)

# 7. SÉCURISATION GLOBALE DU FLUX
diffusion = mksafe(flux_securise)

# 8. SORTIE PRINCIPALE RTMP VERS OWNCAST / YOUTUBE / OBS
output.url(
  url="rtmp://127.0.0.1:1935/live/kambove_live",
  %ffmpeg(
    format="flv",
    %video(
      codec="libx264",
      pixel_format="yuv420p",
      b="2500k",
      preset="veryfast",
      g=50
    ),
    %audio(
      codec="aac",
      samplerate=44100,
      b="128k"
    )
  ),
  diffusion
)
`;

  const systemdCode = `[Unit]
Description=Kambove TV - Playout Daemon (Liquidsoap)
After=network.target mnt-regie_videos.mount
Wants=network.target

[Service]
Type=simple
User=grace
WorkingDirectory=/home/grace/regie-tv
ExecStart=/usr/bin/liquidsoap /home/grace/regie-tv/radio.liq
Restart=always
RestartSec=5
StandardOutput=append:/var/log/kambove-tv.log
StandardError=append:/var/log/kambove-tv.log

[Install]
WantedBy=multi-user.target
`;

  const fstabCode = `# Montage persistant du serveur NAS vidéo Kambove dans /etc/fstab
# Remplacez 192.168.1.100 par l'IP de votre NAS et renseignez les identifiants
//192.168.1.100/regie_videos /mnt/regie_videos cifs credentials=/home/grace/.nascredentials,iocharset=utf8,_netdev,x-systemd.automount 0 0
`;

  const gitCleanCode = `# Commandes pour lier ce projet à votre dépôt GitHub gracendala/kambove-regie-tv
# Option A : Initialiser ou pousser depuis votre PC / dossier local :
cd /chemin/vers/votre/projet
git init
git remote add origin https://github.com/gracendala/kambove-regie-tv.git
git add .
git commit -m "Feat: Interface Regie TV Master - Liquidsoap & NAS Control"
git branch -M main
git push -u origin main --force
`;

  const serverDeployCode = `# 1. Cloner votre dépôt sur votre serveur Ubuntu :
cd /home/grace
git clone https://github.com/gracendala/kambove-regie-tv.git regie-web
cd /home/grace/regie-web

# 2. Installer les dépendances et compiler le projet :
npm install
npm run build

# 3. Lancer en arrière-plan avec PM2 (démarrage automatique) :
sudo npm install -g pm2
pm2 start dist/server.cjs --name "kambove-regie"
pm2 save
pm2 startup
`;

  const serverUpdateCode = `# À chaque modification ou commit sur GitHub, sur votre serveur Ubuntu :
cd /home/grace/regie-web
git pull origin main
npm install
npm run build
pm2 restart kambove-regie
`;

  const webhookScriptCode = `#!/bin/bash
# Script de mise à jour automatique en 1 clic : /home/grace/update-regie.sh
cd /home/grace/regie-web
echo "[+] Récupération des dernières corrections depuis GitHub..."
git pull origin main
echo "[+] Compilation..."
npm run build
echo "[+] Redémarrage de la régie..."
pm2 restart kambove-regie
echo "[✓] Régie TV mise à jour avec succès !"
`;

  return (
    <div className="space-y-6">
      {/* Introduction Audit & Diagnostic Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-4">
          <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Diagnostic & Audit Détaillé du Projet Kambove TV
            </h3>
            <p className="text-xs text-slate-400">
              Analyse complète du code source GitHub (<code className="text-indigo-300">gracendala/kambove-regie-tv</code>) et recommandations d'optimisation.
            </p>
          </div>
        </div>

        {/* Audit Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Issue 1 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>1. Erreur de nom de dossier Windows dans Git</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Le dossier <code className="text-rose-400 font-mono text-[11px]">%USERPROFILE%Desktopregie-web</code> a été commit suite à une commande Git sous Windows. Sous Ubuntu Linux, les antislashs créent un nom de dossier littéral difficile à manipuler.
            </p>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800">
              &rarr; Solution : Exécuter <code className="text-white">git rm -r --cached</code> pour remettre les fichiers à la racine du projet.
            </div>
          </div>

          {/* Issue 2 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>2. Bug d'identifiant dans skip.php</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Dans <code className="text-indigo-300 font-mono text-[11px]">radio.liq</code>, la playlist est identifiée par <code className="text-indigo-300 font-mono text-[11px]">id="tv_playlist"</code>, mais <code className="text-indigo-300 font-mono text-[11px]">skip.php</code> exécutait <code className="text-rose-400 font-mono text-[11px]">var_playlist.skip()</code>. Le bouton "Suivant" ne répondait donc pas.
            </p>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800">
              &rarr; Solution : Connexion Telnet port 1234 avec <code className="text-white">tv_playlist.skip</code>.
            </div>
          </div>

          {/* Issue 3 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>3. Risque d'écran noir (Pas de Fallback Mire)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Si une vidéo sur le NAS est corrompue, supprimée ou si la playlist atteint sa fin, Liquidsoap coupait le flux RTMP sans transition.
            </p>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800">
              &rarr; Solution : Boucle de secours avec <code className="text-white">fallback([playlist, mire])</code>.
            </div>
          </div>

          {/* Issue 4 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>4. Absence de Daemon Systemd (Auto-Restart)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Actuellement, Liquidsoap tourne en session manuelle. En cas de coupure de courant ou redémarrage d'Ubuntu, la chaîne TV reste coupée jusqu'à intervention manuelle.
            </p>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800">
              &rarr; Solution : Fichier unit systemd avec relance automatique en 5s.
            </div>
          </div>
        </div>
      </div>

      {/* Code Snips & Configurations */}
      <div className="space-y-4">
        {/* 1. radio.liq optimisé */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1. radio.liq Corrigé & Sécurisé (/home/grace/regie-tv/radio.liq)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(radioLiqCode, 'radio.liq')}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
              >
                {copiedKey === 'radio.liq' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
              <button
                onClick={() => downloadFile('radio.liq', radioLiqCode)}
                className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-950/80 font-mono text-xs text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
            {radioLiqCode}
          </pre>
        </div>

        {/* 2. kambove-regie.service */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Service Systemd (/etc/systemd/system/kambove-regie.service)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(systemdCode, 'service')}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
              >
                {copiedKey === 'service' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
              <button
                onClick={() => downloadFile('kambove-regie.service', systemdCode)}
                className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-950/80 font-mono text-xs text-slate-200 overflow-x-auto max-h-60 leading-relaxed">
            {systemdCode}
          </pre>
          <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            Activation sous Ubuntu : <code className="text-white">sudo systemctl daemon-reload && sudo systemctl enable --now kambove-regie</code>
          </div>
        </div>

        {/* 3. Montage NAS fstab & Nettoyage Git */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NAS Fstab */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <h5 className="text-xs font-bold uppercase text-slate-200">
                  Montage NAS Persistant (/etc/fstab)
                </h5>
              </div>
              <button
                onClick={() => copyToClipboard(fstabCode, 'fstab')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {copiedKey === 'fstab' ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {fstabCode}
            </pre>
          </div>

          {/* Git sync */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h5 className="text-xs font-bold uppercase text-slate-200">
                  Étape 1 : Pousser vers GitHub (gracendala/kambove-regie-tv)
                </h5>
              </div>
              <button
                onClick={() => copyToClipboard(gitCleanCode, 'git')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {copiedKey === 'git' ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {gitCleanCode}
            </pre>
          </div>
        </div>

        {/* 4. Workflow CI/CD GitHub vers Ubuntu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h5 className="text-xs font-bold uppercase text-slate-200">
                Étape 2 & 3 : Déploiement & Mises à Jour en 1 commande sur Ubuntu
              </h5>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(serverDeployCode, 'serverDeploy')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {copiedKey === 'serverDeploy' ? 'Copié !' : 'Copier Déploiement'}
              </button>
              <button
                onClick={() => copyToClipboard(serverUpdateCode, 'serverUpdate')}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {copiedKey === 'serverUpdate' ? 'Copié !' : 'Copier MàJ Rapide'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Installation initiale sur Ubuntu :</span>
              <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {serverDeployCode}
              </pre>
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Mise à jour après chaque commit GitHub :</span>
              <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {serverUpdateCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
