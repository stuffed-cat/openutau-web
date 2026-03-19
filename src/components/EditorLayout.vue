<script setup lang="ts">
import { useOpenUtau } from '../composables/useOpenUtau';
import TrackHeaderCanvas from './TrackHeaderCanvas.vue';
import PartsCanvas from './PartsCanvas.vue';
import PianoRollWindow from './PianoRollWindow.vue';

const { state, playProject, pauseProject, stopProjectPlayback, exportMixdown } = useOpenUtau();
</script>

<template>
  <div class="main-page-container">
    <!-- Row 0: Top Scrollbar area (Placeholder) -->
    <div class="h-scrollbar r0 c1"></div>

    <!-- Row 1: Toolbar / Timeuler -->
    <div class="toolbar r1 c0">
      <div class="playback-controls">
        <button @click="stopProjectPlayback">⏹</button>
        <button @click="playProject">▶</button>
        <button @click="pauseProject">⏸</button>
        <div class="bpm-display">120.00</div>
      </div>
    </div>
    <div class="timeline-canvas r1 c1">
      <div class="timeline-ticks"></div>
    </div>
    <div class="view-scaler r1 c2"></div>

    <!-- Row 2: Tracks & Parts -->
    <div class="track-headers r2 c0">
      <TrackHeaderCanvas />
    </div>
    <div class="parts-canvas r2 c1">
      <!-- Tracks background (Zebra stripes overlay) inside PartsCanvas -->
      <PartsCanvas />
    </div>
    <div class="v-scrollbar r2 c2"></div>

    <!-- Row 3: Splitter -->
    <div class="grid-splitter r3 c0-span"></div>

    <!-- Row 4: Piano Roll Container -->
    <div class="piano-roll-container r4 c0-span">
      <PianoRollWindow />
    </div>

    <!-- Row 5: Status text -->
    <div class="status-bar r5 c0-span">
      <span>{{ state.busy ? 'Rendering/Loading...' : 'Ready' }}</span>
      <span v-if="state.systemInfo" style="margin-left: 10px; color: #777;">
        v{{ state.systemInfo.version.openUtau }}
      </span>
    </div>

    <!-- Row 6: Progress bar -->
    <div class="progress-bar r6 c0-span">
      <div class="progress-fill" :style="{ width: state.busy ? '100%' : '0%' }"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.main-page-container {
  display: grid;
  grid-template-columns: 260px 1fr 24px;
  grid-template-rows: 24px 24px 1fr 6px 1fr 20px 4px;
  height: 100%;
  width: 100%;
  background: var(--ou-bg);
}

/* Grid placing utility classes */
.r0 { grid-row: 1; }
.r1 { grid-row: 2; }
.r2 { grid-row: 3; }
.r3 { grid-row: 4; }
.r4 { grid-row: 5; }
.r5 { grid-row: 6; }
.r6 { grid-row: 7; }

.c0 { grid-column: 1; }
.c1 { grid-column: 2; }
.c2 { grid-column: 3; }
.c0-span { grid-column: 1 / -1; }

.h-scrollbar {
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
}

.toolbar {
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
  border-right: 1px solid var(--ou-border);
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.playback-controls {
  display: flex;
  gap: 2px;
  height: 100%;
  align-items: center;
}

.playback-controls button {
  width: 24px;
  height: 24px;
  font-size: 14px;
  border-radius: 2px;
}

.bpm-display {
  margin-left: 8px;
  font-family: monospace;
  font-size: 12px;
  color: var(--ou-fg);
}

.timeline-canvas {
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
  position: relative;
  overflow: hidden;
}

.timeline-ticks {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: repeating-linear-gradient(90deg, transparent, transparent 49px, var(--ou-tick-line) 49px, var(--ou-tick-line) 50px);
}

.view-scaler {
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
  border-left: 1px solid var(--ou-border);
}

.track-headers {
  background: var(--ou-bg-alt);
  border-right: 1px solid var(--ou-border);
  overflow: hidden;
}

.parts-canvas {
  background: var(--ou-bg);
  position: relative;
  overflow: hidden;
}

.v-scrollbar {
  background: var(--ou-bg);
  border-left: 1px solid var(--ou-border);
}

.grid-splitter {
  background: var(--ou-bg);
  cursor: row-resize;
  border-top: 1px solid var(--ou-border);
  border-bottom: 1px solid var(--ou-border);
}

.piano-roll-container {
  background: var(--ou-bg);
  min-height: 0; /* Important for grid */
}

.status-bar {
  background: var(--ou-bg);
  border-top: 1px solid var(--ou-border);
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
}

.progress-bar {
  background: var(--ou-bg-alt);
}

.progress-fill {
  height: 100%;
  background: var(--ou-accent);
  transition: width 0.2s ease;
}
</style>
