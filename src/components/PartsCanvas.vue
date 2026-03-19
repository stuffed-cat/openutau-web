<script setup lang="ts">
import { computed } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { PartProperties } from '../types/openutau';

const { state, selectPart } = useOpenUtau();

const TRACK_HEIGHT = 64; // Same as TrackHeaderCanvas
const PIXELS_PER_TICK = 0.05; // Zoom scale simulation

function getPartStyle(part: PartProperties) {
  return {
    top: `${part.trackNo * TRACK_HEIGHT + 2}px`,
    height: `${TRACK_HEIGHT - 4}px`,
    left: `${part.position * PIXELS_PER_TICK}px`,
    width: `${Math.max(4, part.duration * PIXELS_PER_TICK)}px`
  };
}
</script>

<template>
  <div class="parts-container">
    <!-- Render track background stripes -->
    <div class="track-bg" :style="{ minHeight: `${state.tracks.length * TRACK_HEIGHT}px` }">
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
      @click="selectPart(part.partNo)"
    >
      <span class="part-name">{{ part.name || `Part ${part.partNo}` }}</span>
      <div class="part-waveform"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.parts-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto; /* Handles both X and Y scrolling */
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
