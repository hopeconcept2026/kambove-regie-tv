import { RundownTemplate } from '../types';

export const SCHEDULE_TEMPLATES: RundownTemplate[] = [
  {
    id: 'tpl-dimanche',
    name: 'Dimanche Culte & Adoration (Matin)',
    description: 'Structure type du dimanche matin : accueil/méditation, louanges, transition jingle, culte principal et annonces.',
    itemsCount: 4,
    totalDuration: '02h 45m',
    items: [
      {
        mediaId: 'med-01',
        title: 'Méditation Matinale - Accueil',
        path: '/mnt/regie_videos/meditations/meditation_matin.mp4',
        category: 'meditations',
        duration: 900,
        durationFormatted: '15:00',
        scheduledTime: '08:30:00',
        calculatedStartTime: '08:30:00',
        calculatedEndTime: '08:45:00',
        type: 'video',
        isFixedTime: true,
        status: 'pending'
      },
      {
        mediaId: 'pub-01',
        title: 'Jingle Station Kambove TV',
        path: '/mnt/regie_videos/pubs/jingle_station.mp4',
        category: 'pubs',
        duration: 15,
        durationFormatted: '00:15',
        scheduledTime: '08:45:00',
        calculatedStartTime: '08:45:00',
        calculatedEndTime: '08:45:15',
        type: 'jingle',
        isFixedTime: false,
        status: 'pending'
      },
      {
        mediaId: 'lou-01',
        title: 'Concert de Louange & Adoration',
        path: '/mnt/regie_videos/louange/concert_louange.mp4',
        category: 'louange',
        duration: 1800,
        durationFormatted: '30:00',
        scheduledTime: '08:45:15',
        calculatedStartTime: '08:45:15',
        calculatedEndTime: '09:15:15',
        type: 'video',
        isFixedTime: false,
        status: 'pending'
      },
      {
        mediaId: 'pred-01',
        title: 'Culte Dominical Principal',
        path: '/mnt/regie_videos/predications/culte_dominical.mp4',
        category: 'predications',
        duration: 3600,
        durationFormatted: '01:00:00',
        scheduledTime: '09:15:15',
        calculatedStartTime: '09:15:15',
        calculatedEndTime: '10:15:15',
        type: 'video',
        isFixedTime: false,
        status: 'pending'
      }
    ]
  },
  {
    id: 'tpl-semaine',
    name: 'Programme Soirée Semaine (19h - 22h)',
    description: 'Structure type de soirée : temps de prière, magazine foi & société et rediffusion prédication.',
    itemsCount: 3,
    totalDuration: '02h 15m',
    items: [
      {
        mediaId: 'med-02',
        title: 'Instant de Prière du Soir',
        path: '/mnt/regie_videos/meditations/priere_soir.mp4',
        category: 'meditations',
        duration: 600,
        durationFormatted: '10:00',
        scheduledTime: '19:00:00',
        calculatedStartTime: '19:00:00',
        calculatedEndTime: '19:10:00',
        type: 'video',
        isFixedTime: true,
        status: 'pending'
      },
      {
        mediaId: 'emi-01',
        title: 'Émission Magazine - Foi & Société',
        path: '/mnt/regie_videos/emissions/magazine_societe.mp4',
        category: 'emissions',
        duration: 2400,
        durationFormatted: '40:00',
        scheduledTime: '19:10:00',
        calculatedStartTime: '19:10:00',
        calculatedEndTime: '19:50:00',
        type: 'video',
        isFixedTime: false,
        status: 'pending'
      },
      {
        mediaId: 'pred-02',
        title: 'Prédication d’Enseignement',
        path: '/mnt/regie_videos/predications/enseignement.mp4',
        category: 'predications',
        duration: 2700,
        durationFormatted: '45:00',
        scheduledTime: '19:50:00',
        calculatedStartTime: '19:50:00',
        calculatedEndTime: '20:35:00',
        type: 'video',
        isFixedTime: false,
        status: 'pending'
      }
    ]
  }
];
