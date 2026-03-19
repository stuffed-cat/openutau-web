<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { PartProperties } from '../types/openutau';

const { state, selectPart, addPartToTrack, openPartEditor } = useOpenUtau();

const TRACK_HEIGHT = 105; // Match OpenUtau TrackHeight default
const PIXELS_PER_TICK = 0.05; // Zoom scale simulation
const partsScroll = ref<HTMLDivElement | null>(null);

const contentWidth = computed(() => {
  const maxEnd = state.parts.reduce((max, part) => Math.max(max, part.position + part.duration), 0);
  return Math.max(2000, Math.ceil(maxEnd * PIXELS_PER_TICK) + 400);
});

const contentHeight = computed(() => Math.max(state.tracks.length, 1) * TRACK_HEIGHT);

function getPartStyle(part: PartProperties) {
  return {
    top: `${part.trackNo * TRACK_HEIGHT + 2}px`,
    height: `${TRACK_HEIGHT - 4}px`,
    left: `${part.position * PIXELS_PER_TICK}px`,
    width: `${Math.max(4, part.duration * PIXELS_PER_TICK)}px`
  };
}

async function handleBackgroundClick(event: MouseEvent) {
  if (event.target !== event.currentTarget) return;
  const container = partsScroll.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left + container.scrollLeft;
  const y = event.clientY - rect.top + container.scrollTop;
  const trackNo = Math.floor(y / TRACK_HEIGHT);
  if (trackNo < 0 || trackNo >= state.tracks.length) return;
  const position = Math.max(0, Math.floor(x / PIXELS_PER_TICK));
  await addPartToTrack(trackNo, position);
}

function handlePartClick(part: PartProperties) {
  void selectPart(part.partNo);
}

function handlePartDoubleClick(part: PartProperties) {
  void openPartEditor(part.partNo);
}
</script>

<template>
  <div class="parts-scroll" ref="partsScroll">
    <div
      class="parts-canvas"
      :style="{ width: `${contentWidth}px`, height: `${contentHeight}px` }"
      @click="handleBackgroundClick"
    >
      <!-- Render track background stripes -->
      <div class="track-bg">
        <div
          v-for="i in Math.max(state.tracks.length, 20)"
          :key="i"
          class="track-stripe"
          :style="{ height: `${TRACK_HEIGHT}px` }"
        ></div>
      </div>

      <!-- Render Parts -->
      <div
        v-for="part in state.parts"
        :key="part.partNo"
        class="part-block"
        :class="{ selected: state.selectedPartNo === part.partNo }"
        :style="getPartStyle(part)"
        @click.stop="handlePartClick(part)"
        @dblclick.stop="handlePartDoubleClick(part)"
      >
        <span class="part-name">{{ part.name || `Part ${part.partNo}` }}</span>
        <div class="part-waveform"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.parts-scroll {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto; /* Handles both X and Y scrolling */
}

.parts-canvas {
  position: relative;
  min-width: 100%;
}

.track-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.track-stripe {
  border-bottom: 1px solid var(--ou-border);
  box-sizing: border-box;
}
.track-stripe:nth-child(even) {
  background: var(--ou-bg-alt);
}
.track-stripe:nth-child(odd) {
  background: var(--ou-bg);
}

.part-block {
  position: absolute;
  background: rgba(78, 166, 234, 0.2);
  border: 1px solid rgba(78, 166, 234, 0.4);
  color: var(--ou-fg);
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.part-block:hover {
  background: rgba(78, 166, 234, 0.3);
}

.part-block.selected {
  border: 1px solid #FFFFFF;
  background: rgba(78, 166, 234, 0.4);
}

.part-name {
  font-size: 11px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.part-waveform {
  flex: 1;
  /* Fake placeholder for actual notes/waveform draw inside logic */
  opacity: 0.5;
  background: repeating-linear-gradient(90deg, transparent, transparent 4px, var(--ou-accent) 4px, var(--ou-accent) 5px);
  margin-top: 2px;
}
</style>
