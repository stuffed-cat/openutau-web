<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { VoiceNoteSummary } from '../types/openutau';

const { state, closePianoRoll, performDrawLinearCurve, performUpdateCurve } = useOpenUtau();

const NOTE_HEIGHT = 20; // Official defaults to slightly varying height, but let's use 20 usually
const PIXELS_PER_TICK = 0.05;
const KEYS = 128;
const TICKS_PER_BEAT = 480;
const BEATS_PER_MEASURE = 4;
const TICKS_PER_MEASURE = TICKS_PER_BEAT * BEATS_PER_MEASURE;
const visibleMeasures = 100; // Mock 100 measures for the timeline

const selectedNotes = computed<VoiceNoteSummary[]>(() => {
  const part = state.parts.find(p => p.partNo === state.selectedPartNo);
  return part?.notes || [];
});

const isBlackKey = (index: number) => [1, 3, 6, 8, 10].includes(index % 12);
const getKeyName = (index: number) => {
  if (index % 12 === 0) {
    return `C${Math.floor(index / 12) - 1}`;
  }
  return '';
};

function getNoteStyle(note: VoiceNoteSummary) {
  return {
    top: `${(KEYS - 1 - note.tone) * NOTE_HEIGHT}px`,
    height: `${NOTE_HEIGHT - 1}px`,
    left: `${note.position * PIXELS_PER_TICK}px`,
    width: `${Math.max(4, note.duration * PIXELS_PER_TICK)}px`
  };
}

const isWindowMaximized = ref(false);

const timelineRef = ref<HTMLElement | null>(null);
const keyboardRef = ref<HTMLElement | null>(null);
const expCanvasRef = ref<HTMLElement | null>(null);
const prNotesAreaRef = ref<HTMLElement | null>(null);

const activeTool = ref('select');

// --- Pitch Drawing Logic ---
const pitchIsDrawing = ref(false);
const pitchDrawPoints = ref<{x: number, y: number}[]>([]);
const pitchDrawnPaths = ref<{x: number, y: number}[][]>([]);

function getNotesLocalCoords(e: MouseEvent) {
  const el = prNotesAreaRef.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  return { 
    x: e.clientX - rect.left + el.scrollLeft, 
    y: e.clientY - rect.top + el.scrollTop 
  };
}

function startPitchDraw(e: MouseEvent) {
  if (activeTool.value !== 'draw_pitch') return;
  pitchIsDrawing.value = true;
  pitchDrawPoints.value = [getNotesLocalCoords(e)];
}

function drawPitch(e: MouseEvent) {
  if (!pitchIsDrawing.value) return;
  pitchDrawPoints.value.push(getNotesLocalCoords(e));
}

function stopPitchDraw() {
  if (pitchIsDrawing.value) {
    if (pitchDrawPoints.value.length > 1) {
      const points = [...pitchDrawPoints.value];
      
      points.sort((a, b) => a.x - b.x);
      let minX = Math.round(points[0].x / PIXELS_PER_TICK);
      let maxX = Math.round(points[points.length - 1].x / PIXELS_PER_TICK);
      minX = Math.floor(minX / 5) * 5;
      maxX = Math.ceil(maxX / 5) * 5;

      const xs: number[] = [];
      const ys: number[] = [];

      for (let t = minX; t <= maxX; t += 5) {
        const px = t * PIXELS_PER_TICK;
        let y_screen = points[0].y;
        
        if (px <= points[0].x) {
          y_screen = points[0].y;
        } else if (px >= points[points.length - 1].x) {
          y_screen = points[points.length - 1].y;
        } else {
          for (let j = 0; j < points.length - 1; j++) {
            if (px >= points[j].x && px <= points[j+1].x) {
              const ratio = (points[j+1].x === points[j].x) ? 0 : (px - points[j].x) / (points[j+1].x - points[j].x);
              y_screen = points[j].y + ratio * (points[j+1].y - points[j].y);
              break;
            }
          }
        }
        
        // Convert Screen Y to Tone Curve (-1000 to 1000 approx)
        const val = Math.round((KEYS * NOTE_HEIGHT - y_screen) * 10);
        xs.push(t);
        ys.push(val);
      }

      performUpdateCurve(state.selectedPartNo, 'pitd', xs, ys);
    }
    pitchDrawPoints.value = [];
    pitchIsDrawing.value = false;
  }
}

// --- Expression Drawing Logic ---
const activeExpAbbr = ref('vel');

const expIsDrawing = ref(false);
const expDrawPoints = ref<{x: number, y: number}[]>([]);

function getExpLocalCoords(e: MouseEvent) {
  const el = expCanvasRef.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  return { 
    x: e.clientX - rect.left + el.scrollLeft, 
    y: e.clientY - rect.top 
  };
}

function startExpDraw(e: MouseEvent) {
  expIsDrawing.value = true;
  expDrawPoints.value = [getExpLocalCoords(e)];
}

function drawExp(e: MouseEvent) {
  if (!expIsDrawing.value) return;
  expDrawPoints.value.push(getExpLocalCoords(e));
}

const currentExpDescriptor = computed(() => state.expressions?.find(e => e.abbr.toLowerCase() === activeExpAbbr.value.toLowerCase()));

const defaultExpY = computed(() => {
  const desc = currentExpDescriptor.value;
  const height = 150;
  if (!desc) return height / 2;
  const range = desc.max - desc.min;
  if (range === 0) return height / 2;
  return Math.round(height - height * (desc.defaultValue - desc.min) / range);
});

function stopExpDraw() {
  if (expIsDrawing.value) {
    if (expDrawPoints.value.length > 1) {
      const points = [...expDrawPoints.value];
      const desc = currentExpDescriptor.value;

      if (desc) {
        const range = desc.max - desc.min;
        const el = expCanvasRef.value;
        const height = el ? el.clientHeight : 150;

        points.sort((a, b) => a.x - b.x);
        let minX = Math.round(points[0].x / PIXELS_PER_TICK);
        let maxX = Math.round(points[points.length - 1].x / PIXELS_PER_TICK);
        // snap to closest 5 interval
        minX = Math.floor(minX / 5) * 5;
        maxX = Math.ceil(maxX / 5) * 5;

        // Generate points exactly like freehand
        const xs: number[] = [];
        const ys: number[] = [];

        for (let t = minX; t <= maxX; t += 5) {
          const px = t * PIXELS_PER_TICK;
          let y_screen = points[0].y;
          
          if (px <= points[0].x) {
            y_screen = points[0].y;
          } else if (px >= points[points.length - 1].x) {
            y_screen = points[points.length - 1].y;
          } else {
            for (let j = 0; j < points.length - 1; j++) {
              if (px >= points[j].x && px <= points[j+1].x) {
                const ratio = (points[j+1].x === points[j].x) ? 0 : (px - points[j].x) / (points[j+1].x - points[j].x);
                y_screen = points[j].y + ratio * (points[j+1].y - points[j].y);
                break;
              }
            }
          }
          
          let val = Math.round(desc.min + ((height - y_screen) / height) * range);
          // clamp it within bounds
          if (val < desc.min) val = desc.min;
          if (val > desc.max) val = desc.max;
          
          xs.push(t);
          ys.push(val);
        }

        performUpdateCurve(state.selectedPartNo, activeExpAbbr.value, xs, ys);
      }
    }
    expDrawPoints.value = [];
    expIsDrawing.value = false;
  }
}

function pointsToSvgPath(points: {x: number, y: number}[]) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

const currentPitchPath = computed(() => pointsToSvgPath(pitchDrawPoints.value));

const activeExpCurvePath = computed(() => {
  const part = state.parts.find(p => p.partNo === state.selectedPartNo);
  const curve = part?.curves?.find(c => c.abbr.toLowerCase() === activeExpAbbr.value.toLowerCase());
  const desc = currentExpDescriptor.value;
  const height = 150;
  
  if (!desc) return '';
  const range = desc.max - desc.min;
  if (range === 0) return '';
  
  const defY = defaultExpY.value;
  const maxW = visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK;
  
  if (!curve || !curve.xs || curve.xs.length === 0) {
    return `M 0 ${defY} L ${maxW} ${defY}`;
  }
  
  let d = `M 0 ${defY} `;
  let firstPointX = curve.xs[0] * PIXELS_PER_TICK;
  d += `L ${firstPointX} ${defY} `; // connect default base line to first point
  
  for (let i = 0; i < curve.xs.length; i++) {
    const x = curve.xs[i] * PIXELS_PER_TICK;
    const y = Math.round(height - height * (curve.ys![i] - desc.min) / range);
    d += `L ${x} ${y} `;
  }
  
  let lastPointX = curve.xs[curve.xs.length - 1] * PIXELS_PER_TICK;
  d += `L ${lastPointX} ${defY} `; // connect back from last point to base line
  d += `L ${maxW} ${defY}`;

  return d;
});

const currentExpDrawingPath = computed(() => pointsToSvgPath(expDrawPoints.value));

function handleNotesScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (timelineRef.value) timelineRef.value.scrollLeft = target.scrollLeft;
  if (expCanvasRef.value) expCanvasRef.value.scrollLeft = target.scrollLeft;
  if (keyboardRef.value) keyboardRef.value.scrollTop = target.scrollTop;
}
</script>

<template>
  <div class="modal-overlay" v-if="state.showPianoRoll" @click.self="closePianoRoll()">
    <!-- Emulate Avalonia Window Header -->
    <div class="piano-roll-window" :class="{ 'maximized': isWindowMaximized }">
      <div class="window-titlebar" @dblclick="isWindowMaximized = !isWindowMaximized">
        <div class="window-title">
          OpenUtau - Piano Roll
        </div>
        <div class="window-controls">
          <button class="win-btn" @click="isWindowMaximized = false">_</button>
          <button class="win-btn" @click="isWindowMaximized = !isWindowMaximized">□</button>
          <button class="win-btn close" @click="closePianoRoll()">×</button>
        </div>
      </div>

      <div class="pr-grid">
        <!-- Row 0: Toolbar -->
        <div class="pr-toolbar pr-row-0 pr-col-span">
          <div class="menu-items">
            <span>编辑(E)</span>
            <span>视图(V)</span>
            <span>批处理(B)</span>
            <span>歌词编辑(L)</span>
            <span>音符默认(N)</span>
          </div>
          <div class="toolbar-tools">
            <button class="tool-btn" title="提示 (Tips)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><text x="12" y="18"
                  text-anchor="middle" font-weight="bold" font-size="18">?</text></svg>
            </button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn" :class="{ active: activeTool === 'select' }" @click="activeTool = 'select'" title="选择工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M10.07,14.27C10.57,14.03 11.16,14.25 11.4,14.75L13.7,19.74L15.5,18.89L13.19,13.91C12.95,13.41 13.17,12.81 13.67,12.58L13.95,12.5L16.25,12.05L8,5.12V15.9L9.82,14.43L10.07,14.27M13.64,21.97C13.14,22.21 12.54,22 12.31,21.5L10.13,16.76L7.62,18.78C7.45,18.92 7.24,19 7,19A1,1 0 0,1 6,18V3A1,1 0 0,1 7,2C7.24,2 7.47,2.09 7.64,2.23L7.65,2.22L19.14,11.86C19.57,12.22 19.62,12.85 19.27,13.27C19.12,13.45 18.91,13.57 18.7,13.61L15.54,14.23L17.74,18.96C18,19.46 17.76,20.05 17.26,20.28L13.64,21.97Z" />
              </svg>
            </button>
            <button class="tool-btn" title="画笔工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" />
              </svg>
            </button>
            <button class="tool-btn" title="笔+工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M14.1,9L15,9.9L5.9,19H5V18.1L14.1,9M17.7,3C17.5,3 17.2,3.1 17,3.3L15.2,5.1L18.9,8.9L20.7,7C21.1,6.6 21.1,6 20.7,5.6L18.4,3.3C18.2,3.1 17.9,3 17.7,3M14.1,6.2L3,17.2V21H6.8L17.8,9.9L14.1,6.2M7,2V5H10V7H7V10H5V7H2V5H5V2H7Z" />
              </svg>
            </button>
            <button class="tool-btn" title="橡皮擦工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
              </svg>
            </button>
            <button class="tool-btn" :class="{ active: activeTool === 'draw_pitch' }" @click="activeTool = 'draw_pitch'" title="绘制音高工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M9.75 20.85C11.53 20.15 11.14 18.22 10.24 17C9.35 15.75 8.12 14.89 6.88 14.06C6 13.5 5.19 12.8 4.54 12C4.26 11.67 3.69 11.06 4.27 10.94C4.86 10.82 5.88 11.4 6.4 11.62C7.31 12 8.21 12.44 9.05 12.96L10.06 11.26C8.5 10.23 6.5 9.32 4.64 9.05C3.58 8.89 2.46 9.11 2.1 10.26C1.78 11.25 2.29 12.25 2.87 13.03C4.24 14.86 6.37 15.74 7.96 17.32C8.3 17.65 8.71 18.04 8.91 18.5C9.12 18.94 9.07 18.97 8.6 18.97C7.36 18.97 5.81 18 4.8 17.36L3.79 19.06C5.32 20 7.88 21.47 9.75 20.85M20.84 5.25C21.06 5.03 21.06 4.67 20.84 4.46L19.54 3.16C19.33 2.95 18.97 2.95 18.76 3.16L17.74 4.18L19.82 6.26M11 10.92V13H13.08L19.23 6.85L17.15 4.77L11 10.92Z" />
              </svg>
            </button>
            <button class="tool-btn" title="覆盖音高工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M 19.540126 3.1598821 C 19.330126 2.9498825 18.969979 2.9502481 18.759981 3.1602475 L 17.740128 4.1801 L 19.820028 6.2599998 L 20.840246 5.2500134 C 21.060246 5.0300138 21.060246 4.6700018 20.840246 4.4600022 L 19.540126 3.1598821 Z  M 17.149995 4.7702332 L 11.000186 10.920042 L 11.000186 12.999942 L 13.080086 12.999942 L 19.229895 6.8501331 L 17.149995 4.7702332 Z  M 19.879589 13.222841 L 17.879714 13.222475 L 17.879714 16.222471 L 14.879718 16.222471 L 14.879718 18.222712 L 17.879714 18.222712 L 17.879714 21.222708 L 19.879955 21.222708 L 19.879955 18.222712 L 22.879951 18.222712 L 22.879585 16.222837 L 19.879589 16.222837 L 19.879589 13.222841 Z  M 10.059992 11.260237 C 8.4999952 10.230239 6.499898 9.3198861 4.6399018 9.0498865 C 3.5799038 8.8898869 2.4599531 9.1097532 2.0999539 10.259751 C 1.7799545 11.249749 2.2898688 12.249906 2.8698676 13.029906 C 4.2398648 14.859902 6.369998 15.739794 7.9599948 17.31979 C 8.2999942 17.64979 8.7100549 18.040057 8.9100545 18.500057 C 9.1200541 18.940055 9.0701879 18.969971 8.6001889 18.969971 C 7.3601913 18.969971 5.8099483 17.999985 4.7999503 17.359985 L 3.7899638 19.059861 C 5.3199608 19.999859 7.8801301 21.469991 9.7501265 20.849993 C 11.530123 20.149993 11.139771 18.220057 10.239773 17.000059 C 9.349774 15.750061 8.1202131 14.889988 6.8802155 14.05999 C 6.0002173 13.49999 5.1901443 12.79982 4.5401455 11.999822 C 4.2601461 11.669822 3.6901105 11.059774 4.2701093 10.939774 C 4.8601081 10.819776 5.880071 11.399798 6.40007 11.619798 C 7.3100682 11.999798 8.2100072 12.440113 9.0500056 12.960113 L 10.059992 11.260237 Z" />
              </svg>
            </button>
            <button class="tool-btn" title="直线音高工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="m 1.9654432,15.883124 a 0.74547489,0.74547489 0 0 0 -0.00284,1.052361 l 4.9071522,4.946703 a 0.74547489,0.74547489 0 0 0 1.0555507,0.0035 L 22.513776,7.3542255 a 0.74547489,0.74547489 0 0 0 0.0024,-1.053823 L 17.585453,1.3481852 a 0.74547489,0.74547489 0 0 0 -1.05524,-0.00189 L 13.795097,4.077798 a 0.74547489,0.74547489 0 0 0 -0.01235,0.00583 l -2.970023,2.9664092 a 0.74547489,0.74547489 0 0 0 -0.0019,0.00148 L 7.8078572,10.05092 a 0.74547489,0.74547489 0 0 0 -4.549e-4,7.9e-5 l -2.9880739,2.98446 a 0.74547489,0.74547489 0 0 0 5.6e-5,3.19e-4 0.74547489,0.74547489 0 0 0 -8.034e-4,2.32e-4 z" />
              </svg>
            </button>
            <button class="tool-btn" title="覆盖直线音高">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="m 19.9854,15.8242 -1.9957,-0.0048 0.0066,2.9938 -2.9938,-0.0066 0.0044,1.9961 2.9938,0.0066 0.0066,2.9938 1.9961,0.0044 -0.0066,-2.9938 2.9938,0.0066 -0.0048,-1.9957 -2.9938,-0.0066 z" />
              </svg>
            </button>
            <button class="tool-btn" title="切刀工具">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M7.22,11.91C6.89,12.24 6.71,12.65 6.66,13.08L12.17,15.44L20.66,6.96C21.44,6.17 21.44,4.91 20.66,4.13L19.24,2.71C18.46,1.93 17.2,1.93 16.41,2.71L7.22,11.91M5,16V21.75L10.81,16.53L5.81,14.53L5,16M17.12,4.83C17.5,4.44 18.15,4.44 18.54,4.83C18.93,5.23 18.93,5.86 18.54,6.25C18.15,6.64 17.5,6.64 17.12,6.25C16.73,5.86 16.73,5.23 17.12,4.83Z" />
              </svg>
            </button>
            <div class="toolbar-divider"></div>
            <!-- View toggles etc -->
            <button class="tool-btn">Tone</button>
            <button class="tool-btn">Vib</button>
            <button class="tool-btn">Pit</button>
            <button class="tool-btn">Wave</button>
            <button class="tool-btn">Phn</button>
            <button class="tool-btn active">Exp</button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn">Snap: 1/4</button>
            <button class="tool-btn">Key: C (Do)</button>
          </div>
          <div class="toolbar-right">
            <button class="tool-btn" title="Show Note Params">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path
                  d="M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Row 1: Left block (Avatar) + HScrollBar -->
        <div class="pr-row-1-to-2 pr-col-0 pr-track-info-area">
          <div class="track-color-band"></div>
          <div class="singer-avatar"></div>
        </div>
        <div class="pr-row-1 pr-col-1 pr-hscrollbar-area">
          <div class="scrollbar-thumb-h"></div>
        </div>

        <!-- Row 2: Timeline -->
        <div class="pr-row-2 pr-col-1 pr-timeline-canvas" ref="timelineRef">
          <div class="timeline-ticks-container" :style="{ width: `${visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK}px` }">
            <template v-for="m in visibleMeasures" :key="m">
              <!-- Measure marker -->
              <div class="timeline-measure" :style="{ left: `${(m - 1) * TICKS_PER_MEASURE * PIXELS_PER_TICK}px` }">
                <span class="measure-num">{{ m }}</span>
                <div class="measure-line"></div>
              </div>
              <!-- Beat markers -->
              <template v-for="b in (BEATS_PER_MEASURE - 1)" :key="b">
                <div class="timeline-beat" :style="{ left: `${((m - 1) * TICKS_PER_MEASURE + b * TICKS_PER_BEAT) * PIXELS_PER_TICK}px` }"></div>
              </template>
            </template>
          </div>
        </div>
        <div class="pr-row-2 pr-col-2 pr-view-scaler">
          <div class="vscaler-thumb"></div>
        </div>

        <!-- Row 3: Main Piano/Notes -->
        <div class="pr-row-3 pr-col-0 pr-keyboard-area" ref="keyboardRef">
          <div class="keys-container">
            <div v-for="i in KEYS" :key="i" class="piano-key"
              :class="{ 'black-key': isBlackKey(KEYS - i), 'white-key': !isBlackKey(KEYS - i) }"
              :style="{ height: `${NOTE_HEIGHT}px` }">
              <span class="key-name" v-if="getKeyName(KEYS - i)">{{ getKeyName(KEYS - i) }}</span>
            </div>
          </div>
        </div>

        <div class="pr-row-3 pr-col-1 pr-notes-area" ref="prNotesAreaRef" @scroll="handleNotesScroll"
             @mousedown="startPitchDraw" @mousemove="drawPitch" @mouseup="stopPitchDraw" @mouseleave="stopPitchDraw">
          <div class="notes-bg" :style="{ width: `${visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK}px`, height: `${KEYS * NOTE_HEIGHT}px` }">
            <div v-for="i in KEYS" :key="i" class="note-row-bg" :class="{ 'black-key-row': isBlackKey(KEYS - i) }"
              :style="{ height: `${NOTE_HEIGHT}px` }"></div>
            <!-- Grid columns (ticks) -->
            <div class="notes-bg-ticks">
              <template v-for="m in visibleMeasures" :key="'m'+m">
                <div class="tick-measure" :style="{ left: `${(m - 1) * TICKS_PER_MEASURE * PIXELS_PER_TICK}px` }"></div>
                <template v-for="b in (BEATS_PER_MEASURE - 1)" :key="'b'+b">
                  <div class="tick-beat" :style="{ left: `${((m - 1) * TICKS_PER_MEASURE + b * TICKS_PER_BEAT) * PIXELS_PER_TICK}px` }"></div>
                </template>
              </template>
            </div>
          </div>
          <div class="notes-layer">
            <div v-for="note in selectedNotes" :key="note.noteIndex" class="note-block"
              :class="{ selected: state.selectedNoteIndex === note.noteIndex }" :style="getNoteStyle(note)">
              <span class="note-lyric">{{ note.lyric }}</span>
            </div>
          </div>
          <svg class="pitch-draw-layer" :style="{ width: `${visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK}px`, height: `${KEYS * NOTE_HEIGHT}px` }">
            <path v-for="(pathD, i) in pitchDrawnPaths.map(pointsToSvgPath)" :key="'p'+i" :d="pathD" stroke="#ff7c7c" stroke-width="2" fill="none" opacity="0.8" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="currentPitchPath" :d="currentPitchPath" stroke="#ff7c7c" stroke-width="2" fill="none" opacity="0.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <div class="pr-row-3 pr-col-2 pr-vscrollbar-area">
          <div class="scrollbar-thumb-v"></div>
        </div>

        <!-- Row 4: Horizontal Splitter -->
        <div class="pr-row-4 pr-col-span pr-h-splitter"></div>

        <!-- Row 5: Expressions Section -->
        <div class="pr-row-5 pr-col-0 pr-exp-list">
          <div class="exp-item" :class="{active: activeExpAbbr === 'vel'}" @click="activeExpAbbr = 'vel'">VEL (Velocity)</div>
          <div class="exp-item" :class="{active: activeExpAbbr === 'vol'}" @click="activeExpAbbr = 'vol'">VOL (Volume)</div>
          <div class="exp-item" :class="{active: activeExpAbbr === 'mod'}" @click="activeExpAbbr = 'mod'">MOD (Modulation)</div>
          <div class="exp-item" :class="{active: activeExpAbbr === 'pitd'}" @click="activeExpAbbr = 'pitd'">PITD (Pitch Deviation)</div>
          <div class="exp-item" :class="{active: activeExpAbbr === 'clr'}" @click="activeExpAbbr = 'clr'">CLR (Voice Color)</div>
        </div>
        <div class="pr-row-5 pr-col-1 pr-exp-canvas" ref="expCanvasRef"
             @mousedown="startExpDraw" @mousemove="drawExp" @mouseup="stopExpDraw" @mouseleave="stopExpDraw">
          <!-- Expression canvas background -->
          <div class="exp-ticks" :style="{ width: `${visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK}px` }">
            <template v-for="m in visibleMeasures" :key="'exp-m'+m">
              <div class="tick-measure" :style="{ left: `${(m - 1) * TICKS_PER_MEASURE * PIXELS_PER_TICK}px` }"></div>
              <template v-for="b in (BEATS_PER_MEASURE - 1)" :key="'exp-b'+b">
                <div class="tick-beat" :style="{ left: `${((m - 1) * TICKS_PER_MEASURE + b * TICKS_PER_BEAT) * PIXELS_PER_TICK}px` }"></div>
              </template>
            </template>
          </div>
          <svg class="exp-draw-layer" :style="{ width: `${visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK}px`, height: '100%' }">
            <line x1="0" :y1="defaultExpY" :x2="visibleMeasures * TICKS_PER_MEASURE * PIXELS_PER_TICK" :y2="defaultExpY" stroke="#60a0cf" stroke-width="1" stroke-dasharray="4 4" opacity="0.5" />
            <path v-if="activeExpCurvePath" :d="activeExpCurvePath" stroke="#60a0cf" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="currentExpDrawingPath" :d="currentExpDrawingPath" stroke="#60a0cf" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
          </svg>
        </div>
        <div class="pr-row-5 pr-col-2 pr-exp-vscrollbar">
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  pointer-events: auto;
  /* Dim backend */
  background: rgba(0, 0, 0, 0.4);
}

.piano-roll-window {
  width: 1000px;
  height: 680px;
  background: #2b2d30;
  /* OpenUtau Dark Theme Background */
  color: #ddd;
  border: 1px solid #1e1e1e;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;

  &.maximized {
    width: 100vw;
    height: 100vh;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }
}

.window-titlebar {
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #3c3f41;
  user-select: none;

  .window-title {
    font-size: 13px;
    color: #bababa;
    padding-left: 14px;
  }

  .window-controls {
    display: flex;
    height: 100%;

    .win-btn {
      background: transparent;
      border: none;
      width: 46px;
      height: 100%;
      color: #ccc;
      cursor: pointer;
      font-size: 14px;
      font-family: "Segoe UI", sans-serif;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.close:hover {
        background: #e81123;
        color: white;
      }
    }
  }
}

.pr-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  /* Cols: Keyboard(60) | Notes Canvas(*) | VScrollBar(24) | Properties(0) */
  grid-template-columns: 60px 1fr 24px 0px;
  /* Rows: Menu(24) | ScrollH(24) | Timeline(24) | Notes(*) | Splitter(6) | Expressions(150) */
  grid-template-rows: 24px 24px 24px 1fr 6px 150px;
  background: #2b2d30;
}

.pr-col-0 {
  grid-column: 1;
}

.pr-col-1 {
  grid-column: 2;
}

.pr-col-2 {
  grid-column: 3;
}

.pr-col-span {
  grid-column: 1 / -1;
}

.pr-row-0 {
  grid-row: 1;
}

.pr-row-1 {
  grid-row: 2;
}

.pr-row-2 {
  grid-row: 3;
}

.pr-row-3 {
  grid-row: 4;
}

.pr-row-4 {
  grid-row: 5;
}

.pr-row-5 {
  grid-row: 6;
}

.pr-row-1-to-2 {
  grid-row: 2 / 4;
}

/* Menus & Toolbar */
.pr-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #3c3f41;
  /* AltHighBrush */
  padding: 0 4px;

  .menu-items {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #bbb;
    cursor: pointer;

    span {
      padding: 1px;
      border-radius: 3px;
    }

    span:hover {
      background: #4b4d4f;
      color: #fff;
    }
  }

  .toolbar-tools {
    display: flex;
    gap: 2px;
    align-items: center;

    .tool-btn {
      background: transparent;
      color: #aaa;
      border: 1px solid transparent;
      height: 22px;
      min-width: 24px;
      padding: 0 4px;
      border-radius: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;

      &.active {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    }

    .toolbar-divider {
      width: 1px;
      height: 14px;
      background: rgba(255, 255, 255, 0.15);
      margin: 0 6px;
    }
  }

  .toolbar-right {
    display: flex;
  }
}

/* Track Info Area */
.pr-track-info-area {
  background: #2b2d30;
  display: flex;
  align-items: center;
  position: relative;

  .track-color-band {
    width: 8px;
    height: 100%;
    background: #60a0cf;
    position: absolute;
    left: 0;
  }

  .singer-avatar {
    width: 36px;
    height: 36px;
    margin-left: 14px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
}

/* Scrollbars */
.pr-hscrollbar-area {
  background: #252526;
  border-bottom: 1px solid #3c3f41;
  position: relative;

  .scrollbar-thumb-h {
    height: 12px;
    width: 30%;
    background: #4a4d50;
    position: absolute;
    bottom: 6px;
    left: 10px;
    border-radius: 6px;
  }
}

.pr-vscrollbar-area {
  background: #252526;
  border-left: 1px solid #3c3f41;
  position: relative;

  .scrollbar-thumb-v {
    width: 12px;
    height: 30%;
    background: #4a4d50;
    position: absolute;
    right: 6px;
    top: 10px;
    border-radius: 6px;
  }
}

.pr-view-scaler {
  background: #252526;
  border-left: 1px solid #3c3f41;
  border-bottom: 1px solid #3c3f41;
  display: flex;
  align-items: center;
  justify-content: center;

  .vscaler-thumb {
    width: 8px;
    height: 14px;
    background: #60a0cf;
    border-radius: 2px;
  }
}

.pr-exp-vscrollbar {
  background: #252526;
  border-left: 1px solid #3c3f41;
}

/* Timeline */
.pr-timeline-canvas {
  background: #2b2d30;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  .timeline-ticks-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .timeline-measure {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.3); /* Match the previous repeating gradient */

    .measure-num {
      position: absolute;
      top: 2px;
      left: 4px;
      color: #999;
      font-size: 10px;
    }
    
    .measure-line {
      position: absolute;
      bottom: 0;
      width: 1px;
      height: 6px;
      background: #aaa;
    }
  }

  .timeline-beat {
    position: absolute;
    bottom: 0;
    width: 1px;
    height: 4px;
    background: rgba(255, 255, 255, 0.15);
  }
}

/* Keyboard */
.pr-keyboard-area {
  background: #2b2d30;
  border-right: 1px solid #111;
  position: relative;
  overflow: hidden;

  .keys-container {
    position: absolute;
    top: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    /* ensure proper scroll height mapping matching keys * note_height */
    height: calc(128 * 20px);
  }

  .piano-key {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 4px;

    &.white-key {
      background: #dfdfdf;
      border-bottom: 1px solid #c0c0c0;
    }

    &.black-key {
      background: #222;
      border-bottom: 1px solid #000;
    }

    .key-name {
      font-size: 10px;
      color: #333;
      font-weight: 500;
    }

    &.black-key .key-name {
      color: #888;
    }
  }
}

/* Notes Canvas */
.pr-notes-area {
  background: #202122;
  /* Notes area darker */
  position: relative;
  overflow: auto;
}

.notes-bg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;

  .note-row-bg {
    box-sizing: border-box;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);

    &.black-key-row {
      background: rgba(0, 0, 0, 0.25);
    }
  }

  .notes-bg-ticks {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    .tick-measure {
      position: absolute; top: 0; bottom: 0; width: 1px;
      background: rgba(255, 255, 255, 0.1);
    }
    .tick-beat {
      position: absolute; top: 0; bottom: 0; width: 0;
      border-left: 1px dashed rgba(255, 255, 255, 0.1);
    }
  }
}

.notes-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.pitch-draw-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.note-block {
  position: absolute;
  background: #60a0cf;
  border: 1px solid #236596;
  border-radius: 2px;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  box-sizing: border-box;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    filter: brightness(1.1);
  }

  &.selected {
    border-color: #fff;
    filter: brightness(1.2);
  }

  .note-lyric {
    white-space: nowrap;
    line-height: 1;
    margin-top: -1px;
  }
}

/* Splitter */
.pr-h-splitter {
  background: #3c3f41;
  cursor: row-resize;
}

/* Expressions */
.pr-exp-list {
  background: #2b2d30;
  overflow-y: auto;
  border-right: 1px solid #111;
  display: flex;
  flex-direction: column;

  .exp-item {
    font-size: 11px;
    color: #a0a0a0;
    padding: 4px 8px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &.active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-left: 3px solid #60a0cf;
      padding-left: 5px;
    }
  }
}

.pr-exp-canvas {
  background: #202122;
  position: relative;
  overflow: hidden;

  .exp-draw-layer {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 10;
  }

  .exp-ticks {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    .tick-measure {
      position: absolute; top: 0; bottom: 0; width: 1px;
      background: rgba(255, 255, 255, 0.1);
    }
    .tick-beat {
      position: absolute; top: 0; bottom: 0; width: 0;
      border-left: 1px dashed rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
