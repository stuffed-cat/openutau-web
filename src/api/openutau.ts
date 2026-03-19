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
  return requestJson<{ message: string }>('/api/project/management/new', {
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
  return requestJson<ProjectSummary>('/api/project/projectinfo', {
    method: 'POST',
    body: toFormData(file),
  });
}

export async function renderProject(file: File, format = 'wav') {
  return requestBlob('/api/project/render', {
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

export function renameTrack(trackNo: number, name: string) {
  return requestJson(`/api/project/track/${trackNo}/rename`, {
    method: 'POST',
    query: { name },
  });
}

export function setTrackSinger(trackNo: number, singerName: string) {
  return requestJson(`/api/project/track/${trackNo}/setsinger`, {
    method: 'POST',
    query: { singerName },
  });
}

export function setTrackColor(trackNo: number, color: string) {
  return requestJson(`/api/project/track/${trackNo}/setcolor`, {
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
