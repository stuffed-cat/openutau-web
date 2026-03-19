import { computed, reactive, ref, watch } from 'vue';
import {
  addNote,
  createNewProject,
  getNoteProperties,
  getPartProperties,
  getProjectInfo,
  getSystemInfo,
  getTrackExpressions,
  getTrackFlags,
  getTrackProperties,
  openProject,
  pause,
  play,
  removeNote,
  renderProject,
  renameTrack,
  seek,
  setTrackColor,
  setTrackMute,
  setTrackPan,
  setTrackSinger,
  setTrackSolo,
  setTrackVolume,
  stop,
  updateNote,
} from '../api/openutau';
import type {
  NoteProperties,
  OpenUtauAppState,
  PartProperties,
  ProjectSummary,
  SystemInfo,
  TrackFlag,
  TrackProperties,
} from '../types/openutau';

function createState(): OpenUtauAppState {
  return reactive({
    apiReady: false,
    busy: false,
    error: null,
    systemInfo: null,
    projectInfo: null,
    tracks: [],
    parts: [],
    selectedTrackNo: -1,
    selectedPartNo: -1,
    selectedNoteIndex: -1,
    currentFile: null,
    projectLoaded: false,
  });
}

const globalState = createState();
const globalSelectedTrack = ref<TrackProperties | null>(null);
const globalSelectedPart = ref<PartProperties | null>(null);
const globalSelectedNote = ref<NoteProperties | null>(null);
const globalSelectedTrackFlags = ref<TrackFlag[]>([]);
const globalSelectedTrackExpressions = ref<Array<{ name: string; abbr: string; type: string; min: number; max: number; defaultValue: number; isFlag: boolean; flag?: string | null }>>([]);

export function useOpenUtau() {
  const state = globalState;
  const selectedTrack = globalSelectedTrack;
  const selectedPart = globalSelectedPart;
  const selectedNote = globalSelectedNote;
  const selectedTrackFlags = globalSelectedTrackFlags;
  const selectedTrackExpressions = globalSelectedTrackExpressions;

  const projectTitle = computed(() => state.currentFile?.name ?? (state.projectLoaded ? '新工程' : '未打开工程'));
  const hasProject = computed(() => state.projectLoaded);
  const selectedTrackSummary = computed(() => state.tracks[state.selectedTrackNo] ?? null);
  const selectedPartSummary = computed(() => state.parts[state.selectedPartNo] ?? null);

  async function init() {
    state.busy = true;
    state.error = null;
    try {
      state.systemInfo = await getSystemInfo();
      state.apiReady = true;
    } catch (error) {
      state.apiReady = false;
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function refreshSystemInfo() {
    try {
      state.systemInfo = await getSystemInfo();
      state.apiReady = true;
    } catch (error) {
      state.error = toMessage(error);
      state.apiReady = false;
    }
  }

  async function loadProjectSummary(file: File) {
    const summary = await getProjectInfo(file);
    state.projectInfo = normalizeProjectSummary(summary);
    state.tracks = await loadTrackDetails(state.projectInfo.tracks.length);
    state.parts = await loadPartDetails(state.projectInfo.parts.length);
    if (state.tracks.length > 0 && state.selectedTrackNo < 0) {
      state.selectedTrackNo = 0;
    }
    if (state.parts.length > 0 && state.selectedPartNo < 0) {
      state.selectedPartNo = 0;
    }
  }

  async function openProjectFile(file: File) {
    state.busy = true;
    state.error = null;
    try {
      state.currentFile = file;
      state.selectedTrackNo = -1;
      state.selectedPartNo = -1;
      state.selectedNoteIndex = -1;
      await openProject(file);
      await loadProjectSummary(file);
      await refreshSelection();
      state.projectLoaded = true;
    } catch (error) {
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function createProjectSession() {
    state.busy = true;
    state.error = null;
    try {
      await createNewProject();
      state.currentFile = null;
      state.projectInfo = null;
      state.tracks = [];
      state.parts = [];
      selectedTrack.value = null;
      selectedPart.value = null;
      selectedNote.value = null;
      selectedTrackFlags.value = [];
      selectedTrackExpressions.value = [];
      state.selectedTrackNo = -1;
      state.selectedPartNo = -1;
      state.selectedNoteIndex = -1;
      state.projectLoaded = true;
    } catch (error) {
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function reloadProject() {
    if (!state.currentFile) return;
    await openProjectFile(state.currentFile);
  }

  async function refreshSelection() {
    await Promise.allSettled([loadSelectedTrack(), loadSelectedPart(), loadSelectedNote()]);
  }

  async function selectTrack(trackNo: number) {
    state.selectedTrackNo = trackNo;
    await loadSelectedTrack();
  }

  async function selectPart(partNo: number) {
    state.selectedPartNo = partNo;
    state.selectedNoteIndex = -1;
    await loadSelectedPart();
    await loadSelectedNote();
  }

  async function selectNote(noteIndex: number) {
    state.selectedNoteIndex = noteIndex;
    await loadSelectedNote();
  }

  async function loadSelectedTrack() {
    if (state.selectedTrackNo < 0) {
      selectedTrack.value = null;
      selectedTrackFlags.value = [];
      selectedTrackExpressions.value = [];
      return;
    }
    try {
      selectedTrack.value = await getTrackProperties(state.selectedTrackNo);
      selectedTrackFlags.value = (await getTrackFlags(state.selectedTrackNo)).flags;
      selectedTrackExpressions.value = await loadTrackExpressions(state.selectedTrackNo);
    } catch (error) {
      state.error = toMessage(error);
    }
  }

  async function loadSelectedPart() {
    if (state.selectedPartNo < 0) {
      selectedPart.value = null;
      return;
    }
    try {
      selectedPart.value = await getPartProperties(state.selectedPartNo);
      if (selectedPart.value?.notes?.length && state.selectedNoteIndex < 0) {
        state.selectedNoteIndex = 0;
      }
    } catch (error) {
      state.error = toMessage(error);
    }
  }

  async function loadSelectedNote() {
    if (state.selectedPartNo < 0 || state.selectedNoteIndex < 0) {
      selectedNote.value = null;
      return;
    }
    try {
      selectedNote.value = await getNoteProperties(state.selectedPartNo, state.selectedNoteIndex);
    } catch (error) {
      selectedNote.value = null;
      state.error = toMessage(error);
    }
  }

  async function loadTrackDetails(count: number): Promise<TrackProperties[]> {
    const result: TrackProperties[] = [];
    for (let index = 0; index < count; index += 1) {
      try {
        result.push(await getTrackProperties(index));
      } catch {
        // ignore individual failures so the UI can still render remaining tracks
      }
    }
    return result;
  }

  async function loadPartDetails(count: number): Promise<PartProperties[]> {
    const result: PartProperties[] = [];
    for (let index = 0; index < count; index += 1) {
      try {
        result.push(await getPartProperties(index));
      } catch {
        // ignore individual failures so the UI can still render remaining parts
      }
    }
    return result;
  }

  async function loadTrackExpressions(trackNo: number) {
    try {
      return await getTrackExpressions(trackNo);
    } catch {
      return [];
    }
  }

  async function toggleMute(trackNo: number, mute: boolean) {
    await setTrackMute(trackNo, mute);
    await loadSelectedTrack();
  }

  async function toggleSolo(trackNo: number, solo: boolean) {
    await setTrackSolo(trackNo, solo);
    await loadSelectedTrack();
  }

  async function updatePan(trackNo: number, pan: number) {
    await setTrackPan(trackNo, pan);
    await loadSelectedTrack();
  }

  async function updateVolume(trackNo: number, volume: number) {
    await setTrackVolume(trackNo, volume);
    await loadSelectedTrack();
  }

  async function updateSinger(trackNo: number, singer: string) {
    await setTrackSinger(trackNo, singer);
    await reloadProject();
  }

  async function updateColor(trackNo: number, color: string) {
    await setTrackColor(trackNo, color);
    await reloadProject();
  }

  async function renameSelectedTrack(name: string) {
    if (state.selectedTrackNo < 0) return;
    await renameTrack(state.selectedTrackNo, name);
    await reloadProject();
  }

  async function saveCurrentNote(patch: {
    duration?: number;
    tone?: number;
    lyric?: string;
    phoneticHint?: string | null;
  }) {
    if (!state.currentFile || !selectedNote.value || state.selectedPartNo < 0) return;
    state.busy = true;
    try {
      const blob = await updateNote(state.currentFile, {
        partIndex: state.selectedPartNo,
        matchPosition: selectedNote.value.position,
        newDuration: patch.duration ?? selectedNote.value.duration,
        newTone: patch.tone ?? selectedNote.value.tone,
        newLyric: patch.lyric ?? selectedNote.value.lyric,
        newPhoneticHint: patch.phoneticHint ?? selectedNote.value.phoneticHint ?? null,
      });
      state.currentFile = blobToFile(blob, state.currentFile.name.replace(/\.ustx$/i, '.ustx'));
      await reloadProject();
      await loadSelectedPart();
      await loadSelectedNote();
    } catch (error) {
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function insertNote(payload: { position: number; duration: number; tone: number; lyric: string }) {
    if (!state.currentFile || state.selectedPartNo < 0) return;
    state.busy = true;
    try {
      const blob = await addNote(state.currentFile, {
        partIndex: state.selectedPartNo,
        ...payload,
      });
      state.currentFile = blobToFile(blob, state.currentFile.name);
      await reloadProject();
    } catch (error) {
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function deleteCurrentNote() {
    if (!state.currentFile || !selectedNote.value || state.selectedPartNo < 0) return;
    state.busy = true;
    try {
      const blob = await removeNote(state.currentFile, {
        partIndex: state.selectedPartNo,
        matchPosition: selectedNote.value.position,
      });
      state.currentFile = blobToFile(blob, state.currentFile.name);
      state.selectedNoteIndex = Math.max(0, state.selectedNoteIndex - 1);
      await reloadProject();
      await loadSelectedPart();
      await loadSelectedNote();
    } catch (error) {
      state.error = toMessage(error);
    } finally {
      state.busy = false;
    }
  }

  async function exportMixdown(format = 'wav') {
    if (!state.currentFile) return null;
    state.busy = true;
    try {
      const blob = await renderProject(state.currentFile, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openutau-render.${format.replace(/^\./, '')}`;
      a.click();
      URL.revokeObjectURL(url);
      return blob;
    } catch (error) {
      state.error = toMessage(error);
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function playProject() {
    await play();
  }

  async function pauseProject() {
    await pause();
  }

  async function stopProjectPlayback() {
    await stop();
  }

  async function seekProject(tick: number) {
    await seek(tick);
  }

  watch(
    () => state.selectedTrackNo,
    () => {
      void loadSelectedTrack();
    },
  );

  watch(
    () => state.selectedPartNo,
    () => {
      void loadSelectedPart();
    },
  );

  watch(
    () => state.selectedNoteIndex,
    () => {
      void loadSelectedNote();
    },
  );

  return {
    state,
    selectedTrack,
    selectedPart,
    selectedNote,
    selectedTrackFlags,
    selectedTrackExpressions,
    projectTitle,
    hasProject,
    selectedTrackSummary,
    selectedPartSummary,
    init,
    refreshSystemInfo,
    openProjectFile,
    createProjectSession,
    reloadProject,
    refreshSelection,
    selectTrack,
    selectPart,
    selectNote,
    toggleMute,
    toggleSolo,
    updatePan,
    updateVolume,
    updateSinger,
    updateColor,
    renameSelectedTrack,
    saveCurrentNote,
    insertNote,
    deleteCurrentNote,
    exportMixdown,
    playProject,
    pauseProject,
    stopProjectPlayback,
    seekProject,
  };
}

function normalizeProjectSummary(summary: ProjectSummary) {
  return {
    tracks: summary.tracks ?? [],
    parts: summary.parts ?? [],
  } as ProjectSummary;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function blobToFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
}
