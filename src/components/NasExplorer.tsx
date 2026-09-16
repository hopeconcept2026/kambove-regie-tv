import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Search,
  Folder,
  Plus,
  Play,
  Film,
  Info,
  Check,
  CheckCheck,
  Clock,
  Filter,
  RefreshCw,
  FileVideo,
  ArrowRight
} from 'lucide-react';
import { MediaItem, PlaylistItem } from '../types';

interface NasExplorerProps {
  mediaList: MediaItem[];
  onAddToPlaylist: (items: MediaItem[]) => void;
  onPlayDirectly: (item: MediaItem) => void;
  onRefreshNas: () => void;
  isRefreshing: boolean;
}

export const NasExplorer: React.FC<NasExplorerProps> = ({
  mediaList,
  onAddToPlaylist,
  onPlayDirectly,
  onRefreshNas,
  isRefreshing
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectItem, setInspectItem] = useState<MediaItem | null>(null);

  // Categories list
  const categories = [
    { id: 'all', label: 'Toutes les vidéos', icon: Folder, count: mediaList.length },
    { id: 'meditations', label: 'Méditations', path: '/mnt/regie_videos/meditations', count: mediaList.filter(m => m.category === 'meditations').length },
    { id: 'predications', label: 'Prédications & Cultes', path: '/mnt/regie_videos/predications', count: mediaList.filter(m => m.category === 'predications').length },
    { id: 'louange', label: 'Louange & Musique', path: '/mnt/regie_videos/louange', count: mediaList.filter(m => m.category === 'louange').length },
    { id: 'emissions', label: 'Émissions Spéciales', path: '/mnt/regie_videos/emissions', count: mediaList.filter(m => m.category === 'emissions').length },
    { id: 'pubs', label: 'Jingles & Annonces', path: '/mnt/regie_videos/pubs', count: mediaList.filter(m => m.category === 'pubs').length },
    { id: 'archives', label: 'Archives Kambove', path: '/mnt/regie_videos/archives', count: mediaList.filter(m => m.category === 'archives').length }
  ];

  // Filtered media
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [mediaList, selectedCategory, searchQuery]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select all visible
  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredMedia.length && filteredMedia.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map((m) => m.id)));
    }
  };

  // Add selected to playlist
  const handleAddSelected = () => {
    const items = mediaList.filter((m) => selectedIds.has(m.id));
    if (items.length > 0) {
      onAddToPlaylist(items);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header with NAS Storage Vitals */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Explorateur NAS Vidéos
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                Point de montage : /mnt/regie_videos/
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Accès direct aux vidéos stockées sur le serveur NAS distant
            </p>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="flex items-center gap-4 bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Stockage NAS</span>
            <span className="font-mono font-bold text-slate-200">
              1.85 To libres <span className="text-slate-500 font-normal">/ 4.00 To</span>
            </span>
          </div>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '53.7%' }} />
          </div>
          <button
            onClick={onRefreshNas}
            disabled={isRefreshing}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Rafraîchir les fichiers du NAS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main layout: Category Sidebar + Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
        {/* Left Category Nav (3 cols) */}
        <div className="md:col-span-3 bg-slate-950/50 border-r border-slate-800 p-3 space-y-1">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Dossiers du NAS
          </div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{cat.label}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}

          {/* Tips for Grace */}
          <div className="mt-6 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Organisation des médias :
            </div>
            <p className="leading-relaxed">
              Pour une diffusion sans accroc, encodez vos vidéos en <b className="text-slate-200">1280x720 H.264 / AAC</b> et déposez-les dans les sous-dossiers correspondants sur le NAS.
            </p>
          </div>
        </div>

        {/* Right Media Content (9 cols) */}
        <div className="md:col-span-9 p-4 flex flex-col justify-between">
          <div>
            {/* Search and Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, fichier ou chemin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                >
                  {selectedIds.size === filteredMedia.length && filteredMedia.length > 0
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleAddSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter ({selectedIds.size}) à la grille</span>
                  </button>
                )}
              </div>
            </div>

            {/* Media Items Table / List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredMedia.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Aucune vidéo trouvée dans cette catégorie ou correspondant à votre recherche.
                </div>
              ) : (
                filteredMedia.map((item) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-600/70 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox & File Info */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-100">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                              {item.resolution}
                            </span>
                          </div>

                          <p className="text-[11px] font-mono text-slate-400 truncate max-w-lg mt-0.5">
                            {item.path}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-1">
                            <span>Durée : <b className="text-slate-300">{item.durationFormatted}</b></span>
                            <span>&bull;</span>
                            <span>Taille : {item.sizeFormatted}</span>
                            <span>&bull;</span>
                            <span>Format : {item.format}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => setInspectItem(item)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                          title="Inspecter les métadonnées FFprobe"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onAddToPlaylist([item])}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
                          title="Ajouter ce média à la fin de la programmation"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom quick stats */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Affichage de {filteredMedia.length} fichiers vidéo</span>
            <span className="font-mono text-slate-500">Scan automatique Liquidsoap actif</span>
          </div>
        </div>
      </div>

      {/* FFprobe Metadata Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-indigo-400" />
                Inspection Métadonnées Vidéo (FFprobe)
              </h4>
              <button
                onClick={() => setInspectItem(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Titre</span>
                <span className="font-bold text-white text-sm">{inspectItem.title}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Chemin physique NAS :</span>
                  <span className="text-indigo-300 truncate max-w-xs">{inspectItem.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Durée exacte :</span>
                  <span className="text-emerald-400">{inspectItem.durationFormatted} ({inspectItem.duration}s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Codec Vidéo :</span>
                  <span>H.264 / AVC (High Profile)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Résolution :</span>
                  <span>{inspectItem.resolution} (16:9 Broadcast)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Codec Audio :</span>
                  <span>AAC Stereo 44.1 kHz 128 kbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taille du fichier :</span>
                  <span>{inspectItem.sizeFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dernière modification :</span>
                  <span>{inspectItem.dateModified}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  onAddToPlaylist([inspectItem]);
                  setInspectItem(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter à la grille
              </button>
              <button
                onClick={() => setInspectItem(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
