import { PlaylistItem } from '../types';

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remainingSec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
}

export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60;
  }
  return 0;
}

export function secondsToTimeString(totalSeconds: number, includeSeconds: boolean = true): string {
  const normalized = ((totalSeconds % 86400) + 86400) % 86400;
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  const s = normalized % 60;
  if (includeSeconds) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function cascadeRundownTimes(
  items: PlaylistItem[],
  defaultStart: string = '08:00:00'
): PlaylistItem[] {
  if (items.length === 0) return [];

  let currentSec = timeStringToSeconds(items[0]?.scheduledTime || defaultStart);

  return items.map((item, index) => {
    let startSec = currentSec;

    // If item has a fixed time constraint and it's later, we adjust
    if (item.isFixedTime && item.scheduledTime) {
      const fixedSec = timeStringToSeconds(item.scheduledTime);
      startSec = fixedSec;
    }

    const endSec = startSec + item.duration;
    const startFormatted = secondsToTimeString(startSec);
    const endFormatted = secondsToTimeString(endSec);

    currentSec = endSec;

    return {
      ...item,
      calculatedStartTime: startFormatted,
      calculatedEndTime: endFormatted
    };
  });
}
