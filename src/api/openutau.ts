import { getApiBaseUrl, requestBlob, requestJson, toFormData } from './http';
import type {
  NoteProperties,
  PartProperties,
  PlaybackStatus,
  ProjectSummary,
  SystemInfo,
  TrackExpression,
  TrackFlag,
  TrackProperties,
} from '../types/openutau';

export function getBackendBaseUrl() {
  return getApiBaseUrl();
}

export function getSystemInfo() {
  return requestJson<SystemInfo>('/api/system/info');
}

export function createNewProject() {
  return requestJson<{ message: string }>('/api/project/new', {
    method: 'POST',
  });
}

export async function openProject(file: File) {
  return requestJson<{ status: string }>('/api/playback/open', {
    method: 'POST',
    body: toFormData(file),
  });
}

export async function getProjectInfo(file: File) {
  return requestJson<ProjectSummary>('/api/project/ProjectInfo', {
    method: 'POST',
    body: toFormData(file),
  });
}

export function downloadSession() {
  return requestBlob('/api/project/management/session/download');
}

export async function renderProject(file: File, format = 'wav') {
  return requestBlob('/api/project/Render/mixdown', {
    method: 'POST',
    body: toFormData(file),
    query: { format },
  });
}

export function getTrackProperties(trackNo: number) {
  return requestJson<TrackProperties>(`/api/project/track/${trackNo}/properties`);
}

export function getTrackExpressions(trackNo: number) {
  return requestJson<TrackExpression[]>(`/api/project/track/${trackNo}/expressions`);
}

export function getTrackFlags(trackNo: number) {
  return requestJson<{ trackNo: number; flags: TrackFlag[] }>(`/api/project/track/${trackNo}/flags`);
}

export function setTrackMute(trackNo: number, mute: boolean) {
  return requestJson(`/api/project/track/${trackNo}/mute`, {
    method: 'POST',
    query: { mute },
  });
}

export function setTrackSolo(trackNo: number, solo: boolean) {
  return requestJson(`/api/project/track/${trackNo}/solo`, {
    method: 'POST',
    query: { solo },
  });
}

export function setTrackPan(trackNo: number, pan: number) {
  return requestJson(`/api/project/track/${trackNo}/pan`, {
    method: 'POST',
    query: { pan },
  });
}

export function setTrackVolume(trackNo: number, volume: number) {
  return requestJson(`/api/project/track/${trackNo}/volume`, {
    method: 'POST',
    query: { volume },
  });
}

export function addPart(file: File, trackIndex: number, position: number = 0, duration: number = 7680) {
  return requestBlob('/api/project/parts/add', {
    method: 'POST',
    body: toFormData(file),
    query: { trackIndex, position, duration },
  });
}

export function movePart(file: File, partIndex: number, newTrackIndex?: number, newPosition?: number) {
  return requestBlob('/api/project/parts/move', {
    method: 'POST',
    body: toFormData(file),
    query: { partIndex, newTrackIndex, newPosition },
  });
}

export function configPart(file: File, partIndex: number, payload: { name?: string, comment?: string, duration?: number }) {
  return requestBlob('/api/project/parts/config', {
    method: 'POST',
    body: toFormData(file),
    query: { partIndex, ...payload },
  });
}

export function addTrack(file: File, trackIndex?: number) {
  return requestBlob('/api/project/tracks/add', {
    method: 'POST',
    body: toFormData(file),
    query: { trackIndex: trackIndex ?? undefined },
  });
}

export function renameTrack(trackNo: number, name: string) {
  return requestJson(`/api/project/tracks/${trackNo}/rename`, {
    method: 'POST',
    query: { name },
  });
}

export function setTrackSinger(trackNo: number, singerName: string) {
  return requestJson(`/api/project/tracks/${trackNo}/setsinger`, {
    method: 'POST',
    query: { singerName },
  });
}

export function setTrackColor(trackNo: number, color: string) {
  return requestJson(`/api/project/tracks/${trackNo}/setcolor`, {
    method: 'POST',
    query: { color },
  });
}

export function getPartProperties(partNo: number) {
  return requestJson<PartProperties>(`/api/project/part/${partNo}`);
}

export function getNoteProperties(partNo: number, noteIndex: number) {
  return requestJson<NoteProperties>(`/api/project/notes/${partNo}/${noteIndex}`);
}

export function updateNote(file: File, payload: {
  partIndex: number;
  matchPosition: number;
  newPosition?: number | null;
  newDuration?: number | null;
  newTone?: number | null;
  newLyric?: string | null;
  newPhoneticHint?: string | null;
  vibratoJson?: string | null;
  expressionsJson?: string | null;
}) {
  return requestBlob('/api/project/notes/update', {
    method: 'POST',
    body: toFormData(file),
    query: {
      partIndex: payload.partIndex,
      matchPosition: payload.matchPosition,
      newPosition: payload.newPosition ?? undefined,
      newDuration: payload.newDuration ?? undefined,
      newTone: payload.newTone ?? undefined,
      newLyric: payload.newLyric ?? undefined,
      newPhoneticHint: payload.newPhoneticHint ?? undefined,
      vibratoJson: payload.vibratoJson ?? undefined,
      expressionsJson: payload.expressionsJson ?? undefined,
    },
  });
}

export function drawPitchCurve(partNo: number, abbr: string, startX: number, endX: number, startY: number, endY: number, interval = 5) {
  return requestJson<{ message: string; pointCount: number }>(`/api/project/parts/${partNo}/curves/${abbr}/linear`, {
    method: 'POST',
    body: JSON.stringify({
      startX, endX, startY, endY, interval
    }),
    headers: { 'Content-Type': 'application/json' }
  });
}

export function addNote(file: File, payload: {
  partIndex: number;
  position: number;
  duration: number;
  tone: number;
  lyric: string;
}) {
  return requestBlob('/api/project/notes/add', {
    method: 'POST',
    body: toFormData(file),
    query: payload,
  });
}

export function removeNote(file: File, payload: {
  partIndex: number;
  matchPosition: number;
}) {
  return requestBlob('/api/project/notes/remove', {
    method: 'POST',
    body: toFormData(file),
    query: payload,
  });
}

// ============== HISTORY =================

export function undo() {
  return requestJson<{ message: string }>('/api/history/undo', { method: 'POST' });
}

export function redo() {
  return requestJson<{ message: string }>('/api/history/redo', { method: 'POST' });
}

// ============== PLAYBACK =================

export function play(tick?: number, endTick?: number, trackNo?: number) {
  return requestJson<PlaybackStatus>('/api/playback/play', {
    method: 'POST',
    query: { tick: tick ?? -1, endTick: endTick ?? -1, trackNo: trackNo ?? -1 },
  });
}

export function pause() {
  return requestJson<PlaybackStatus>('/api/playback/pause', { method: 'POST' });
}

export function stop() {
  return requestJson<PlaybackStatus>('/api/playback/stop', { method: 'POST' });
}

export function seek(tick: number) {
  return requestJson<{ tick: number }>('/api/playback/seek', {
    method: 'POST',
    query: { tick },
  });
}

// ============== SINGERS & DEPENDENCIES =================

export function getSingers() {
  return requestJson<any>('/api/singers');
}

export function getSingerInfo(id: string) {
  return requestJson<any>(`/api/singers/${encodeURIComponent(id)}/info`);
}

export function getSingerOtos(id: string) {
  return requestJson<any[]>(`/api/singers/${encodeURIComponent(id)}/otos`);
}

export function installPackage(file: File, exeType?: 'wavtool' | 'resampler' | '') {
  const fd = new FormData();
  fd.append('file', file);
  if (exeType) {
    fd.append('exeType', exeType);
  }
  return requestJson<{ message: string }>('/api/packages/install', {
    method: 'POST',
    body: fd,
  });
}

export function getOtoSampleFile(id: string, set: string, alias: string) {
  return requestBlob(`/api/singers/${encodeURIComponent(id)}/otos/sample`, {
    query: { set, alias }
  });
}

export function analyzeWaveform(file: Blob, points = 1000) {
  const fd = new FormData();
  fd.append('file', file, 'sample.wav');
  return requestJson<any>('/api/analysis/waveform', {
    method: 'POST',
    body: fd,
    query: { points }
  });
}

export function analyzeSpectrogram(file: Blob, fftSize = 1024, hopSize = 512) {
  const fd = new FormData();
  fd.append('file', file, 'sample.wav');
  return requestJson<any>('/api/analysis/spectrogram', {
    method: 'POST',
    body: fd,
    query: { fftSize, hopSize }
  });
}

// ============== CURVES & EXPRESSIONS =================

export function drawLinearCurve(partNo: number, abbr: string, startX: number, endX: number, startY: number, endY: number, interval = 5) {
  return requestJson<{ message: string; pointCount: number }>(`/api/project/parts/${partNo}/curves/${abbr}/linear`, {
    method: 'POST',
    body: JSON.stringify({
      startX, endX, startY, endY, interval
    }),
    headers: { 'Content-Type': 'application/json' }
  });
}
