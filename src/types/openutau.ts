export interface SystemInfo {
  dataPath: string;
  cachePath: string;
  version: {
    api: string;
    core: string;
    openUtau: string;
  };
  runtime: {
    osDescription: string;
    osArchitecture: string;
    processArchitecture: string;
    frameworkDescription: string;
    dotNetVersion: string;
    machineName: string;
  };
  loaded: {
    phonemizers: number;
    renderers: number;
    renderersBySingerType: Record<string, number>;
  };
  message: string;
}

export interface ProjectSummary {
  tracks: TrackSummary[];
  parts: PartSummary[];
}

export interface TrackSummary {
  singer?: string | null;
  phonemizer?: string | null;
  renderer?: string | null;
}

export interface PartSummary {
  name?: string | null;
  trackNo?: number | null;
  duration?: number | null;
}

export interface TrackProperties {
  trackNo: number;
  trackName: string;
  singer?: string | null;
  phonemizer?: string | null;
  renderer?: string | null;
  rendererSettings?: unknown;
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  voiceColorNames?: string[];
}

export interface TrackExpression {
  name: string;
  abbr: string;
  type: string;
  min: number;
  max: number;
  defaultValue: number;
  isFlag: boolean;
  flag?: string | null;
}

export interface TrackFlag {
  name: string;
  abbr: string;
  flag: string;
  type: string;
  value?: number | null;
  option?: string | null;
}

export interface VoiceNoteSummary {
  noteIndex: number;
  position: number;
  duration: number;
  lyric: string;
  tone: number;
  pitchPoints?: NotePitchPoint[];
  vibrato?: NoteVibrato;
}

export interface PartProperties {
  partNo: number;
  trackNo: number;
  position: number;
  duration: number;
  name: string;
  notes?: VoiceNoteSummary[];
  curves?: Array<{
    abbr: string;
    name?: string | null;
    xs?: number[];
    ys?: number[];
  }>;
  filePath?: string | null;
  fileDurationMs?: number | null;
}

export interface NotePitchPoint {
  x: number;
  y: number;
  shape: string;
}

export interface NoteVibrato {
  length: number;
  fadeIn?: number;
  fadeOut?: number;
  depth?: number;
  period?: number;
  shift?: number;
  drift?: number;
  volumeLink?: boolean;
}

export interface NoteProperties {
  position: number;
  duration: number;
  tone: number;
  lyric: string;
  phoneticHint?: string | null;
  pitchPoints: NotePitchPoint[];
  vibrato: NoteVibrato;
  phonemeExpressions: Array<{ index: number; abbr: string; value: number }>;
  phonemeOverrides: Array<{
    index: number;
    phoneme: string;
    offset: number;
    preutterDelta: number;
    overlapDelta: number;
  }>;
  expressions: Record<string, number>;
}

export interface PlaybackStatus {
  status?: string;
  tick?: number;
}

export interface OpenUtauAppState {
  apiReady: boolean;
  busy: boolean;
  error: string | null;
  systemInfo: SystemInfo | null;
  projectInfo: ProjectSummary | null;
  tracks: TrackProperties[];
  parts: PartProperties[];
  selectedTrackNo: number;
  selectedPartNo: number;
  scrollX: number;
  scrollY: number;
  selectedNoteIndex: number;
  currentFile: File | null;
  projectLoaded: boolean;
  showSingerManager: boolean;
  expressions: TrackExpression[];
  showPianoRoll: boolean;
}

export interface USinger {
  id: string;
  name: string;
  author?: string;
  version?: string;
  singerType?: string;
  subbanks?: string[];
}
